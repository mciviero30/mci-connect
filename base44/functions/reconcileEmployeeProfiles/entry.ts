import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * DAILY RECONCILIATION - Auto-fix missing EmployeeProfiles
 * 
 * Finds all EmployeeInvitations that are still "pending" but the user
 * has already registered (User exists with that email), then creates
 * the missing EmployeeProfile and marks the invitation as "accepted".
 * 
 * This prevents the manual intervention problem.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECURITY: Verify admin access
    const caller = await base44.auth.me();
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (caller.role !== 'admin' && caller.role !== 'ceo') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // 1. Get all pending/invited invitations
    const pendingInvitations = await base44.asServiceRole.entities.EmployeeInvitation.filter(
      { status: 'pending' },
      '',
      100
    );

    console.log(`[Reconcile] Found ${pendingInvitations.length} pending invitations to check`);

    let fixed = 0;
    let skipped = 0;
    let errors = 0;
    const fixedEmployees = [];

    for (const invitation of pendingInvitations) {
      try {
        const email = invitation.email?.toLowerCase();
        if (!email) { skipped++; continue; }

        // 2. Check if a User with this email exists (already registered)
        const users = await base44.asServiceRole.entities.User?.filter(
          { email },
          '',
          1
        ).catch(() => null);

        // If User entity not available via filter, skip (handled by frontend)
        if (!users) { skipped++; continue; }
        if (users.length === 0) { skipped++; continue; }

        const user = users[0];

        // 3. Check if EmployeeProfile already exists for this user
        const existingProfiles = await base44.asServiceRole.entities.EmployeeProfile.filter(
          { user_id: user.id },
          '',
          1
        );

        if (existingProfiles.length > 0) {
          // Profile already exists - just make sure invitation is marked accepted
          await base44.asServiceRole.entities.EmployeeInvitation.update(invitation.id, {
            status: 'accepted',
            accepted_date: new Date().toISOString()
          });
          skipped++;
          continue;
        }

        // 4. No profile found - create it from invitation data
        const hireDate = invitation.hire_date || new Date().toISOString().split('T')[0];
        const fullName = invitation.first_name && invitation.last_name
          ? `${invitation.first_name} ${invitation.last_name}`.trim()
          : user.full_name || email;

        const profileData = {
          user_id: user.id,
          first_name: invitation.first_name || user.full_name?.split(' ')[0] || '',
          last_name: invitation.last_name || user.full_name?.split(' ')[1] || '',
          full_name: fullName,
          position: invitation.position || null,
          department: invitation.department || null,
          phone: invitation.phone || null,
          address_line_1: invitation.address || null,
          date_of_birth: invitation.dob || null,
          ssn_encrypted: invitation.ssn_tax_id || null,
          team_id: invitation.team_id || null,
          team_name: invitation.team_name || null,
          hourly_rate: invitation.hourly_rate || null,
          hire_date: hireDate,
          employment_status: 'active',
          is_active: true,
          employment_type: 'full_time',
          pay_type: 'hourly',
          overtime_eligible: true,
          overtime_multiplier: 1.5,
          profile_completed: false,
          i9_completed: false,
          background_check_completed: false,
          drug_test_completed: false,
          osha_certified: false,
          external_payroll_provider: 'none',
          payroll_sync_status: 'not_synced'
        };

        await base44.asServiceRole.entities.EmployeeProfile.create(profileData);

        // 5. Mark invitation as accepted
        await base44.asServiceRole.entities.EmployeeInvitation.update(invitation.id, {
          status: 'accepted',
          accepted_date: new Date().toISOString()
        });

        // 6. Update EmployeeDirectory to active
        const dirEntries = await base44.asServiceRole.entities.EmployeeDirectory.filter(
          { employee_email: email },
          '',
          1
        );
        if (dirEntries.length > 0) {
          await base44.asServiceRole.entities.EmployeeDirectory.update(dirEntries[0].id, {
            status: 'active',
            user_id: user.id,
            last_synced_at: new Date().toISOString()
          });
        }

        fixed++;
        fixedEmployees.push(email);
        console.log(`[Reconcile] Fixed: ${email} → EmployeeProfile created`);

      } catch (err) {
        console.error(`[Reconcile] Error processing invitation ${invitation.email}:`, err.message);
        console.error(`[Reconcile] Full error stack:`, err);
        console.error(`[Reconcile] Invitation data:`, JSON.stringify(invitation, null, 2));
        errors++;
      }
    }

    console.log(`[Reconcile] Done. Fixed: ${fixed}, Skipped: ${skipped}, Errors: ${errors}`);

    return Response.json({
      success: true,
      summary: { fixed, skipped, errors },
      fixed_employees: fixedEmployees
    });

  } catch (error) {
    console.error('[Reconcile] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});