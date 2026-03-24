import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * FASE 4: DAILY RECONCILIATION - STRICT ROLE ENFORCEMENT
 * 
 * CRITICAL SECURITY:
 * - Admin/CEO only (no exceptions, no legacy bypasses)
 * - Validates enum roles strictly before data operations
 * - Rejects invalid role values
 * 
 * Finds all EmployeeInvitations that are still "pending" but the user
 * has already registered (User exists with that email), then creates
 * the missing EmployeeProfile and marks the invitation as "accepted".
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // FASE 4: STRICT ADMIN-ONLY ACCESS (no legacy bypasses)
    const caller = await base44.auth.me();
    if (!caller) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // FASE 4: Enforce strict enum roles
    const VALID_ADMIN_ROLES = ['admin', 'ceo'];
    if (!VALID_ADMIN_ROLES.includes(caller.role)) {
      console.warn(`[FASE 4] Access denied: User ${caller.email} with role "${caller.role}" attempted admin function`);
      return Response.json({ 
        error: 'Forbidden: Admin or CEO access required',
        user_role: caller.role 
      }, { status: 403 });
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

        // FASE 4: STRICT ROLE VALIDATION (reject invalid enum values)
        const VALID_USER_ROLES = ['admin', 'ceo', 'manager', 'supervisor', 'foreman', 'employee'];
        if (user.role && !VALID_USER_ROLES.includes(user.role)) {
          console.error(`[FASE 4] SKIPPED: User ${user.email} has invalid role: "${user.role}"`);
          errors++;
          continue;
        }

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

        // FASE 4: Strict profile data (no permissive legacy defaults)
        const profileData = {
          user_id: user.id,
          first_name: invitation.first_name || user.full_name?.split(' ')[0] || '',
          last_name: invitation.last_name || user.full_name?.split(' ')[1] || '',
          full_name: fullName,
          position: invitation.position || null,  // FASE 4: Explicit null
          department: invitation.department || null,  // FASE 4: Explicit null
          phone: invitation.phone || null,  // FASE 4: Explicit null
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
          payroll_sync_status: 'not_synced',
          // FASE 4: Audit trail
          created_by_function: 'reconcileEmployeeProfiles',
          reconciled_at: new Date().toISOString()
        };

        await base44.asServiceRole.entities.EmployeeProfile.create(profileData);

        console.log(`[FASE 4] Profile created: ${email} | User role: ${user.role}`);

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
            sync_source: 'reconcile_function',  // FASE 4: Audit trail
            last_synced_at: new Date().toISOString()
          });
        }

        fixed++;
        fixedEmployees.push({ email, role: user.role });  // FASE 4: Include role in audit
        console.log(`[FASE 4] Reconciled: ${email} → EmployeeProfile created | Role: ${user.role}`);

      } catch (err) {
        console.error(`[FASE 4] Error processing invitation ${invitation.email}:`, err.message);
        errors++;
      }
    }

    console.log(`[FASE 4] Reconciliation complete. Fixed: ${fixed}, Skipped: ${skipped}, Errors: ${errors}`);

    return Response.json({
      success: true,
      phase: 'FASE_4_STRICT_ENFORCEMENT',
      summary: { fixed, skipped, errors },
      fixed_employees: fixedEmployees,
      enforced_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[FASE 4] Fatal error:', error);
    return Response.json({ 
      error: error.message,
      phase: 'FASE_4_STRICT_ENFORCEMENT'
    }, { status: 500 });
  }
});