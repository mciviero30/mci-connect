import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * ONBOARDINGFORM MIGRATION: Backfill user_id from employee_email
 * Admin-only. Atomic updates only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all users to create email-to-ID map
    const allUsers = await base44.asServiceRole.entities.User.list('', 10000);
    const emailToUserId = new Map();

    for (const u of allUsers) {
      if (u.email) {
        emailToUserId.set(u.email.toLowerCase(), u.id);
      }
    }

    // Fetch all OnboardingForm records
    const forms = await base44.asServiceRole.entities.OnboardingForm.list('', 10000);

    let updated = 0;
    let unmatched = [];

    for (const form of forms) {
      // Skip if already has user_id
      if (form.user_id) {
        continue;
      }

      // Must have employee_email
      if (!form.employee_email) {
        unmatched.push({ form_id: form.id, reason: 'missing_email' });
        continue;
      }

      // Look up user by email
      const matchedUserId = emailToUserId.get(form.employee_email.toLowerCase());

      if (!matchedUserId) {
        unmatched.push({ form_id: form.id, email: form.employee_email, reason: 'no_user_match' });
        continue;
      }

      // Update with user_id
      await base44.asServiceRole.entities.OnboardingForm.update(form.id, {
        user_id: matchedUserId
      });

      updated++;
    }

    const result = {
      timestamp: new Date().toISOString(),
      total_records: forms.length,
      updated_records: updated,
      remaining_missing_user_id: forms.length - updated - updated,
      unmatched_emails: unmatched,
      status: unmatched.length === 0 ? 'success' : 'partial'
    };

    console.log('✅ OnboardingForm backfill result:', result);
    return Response.json(result);

  } catch (err) {
    console.error('❌ Backfill failed:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});