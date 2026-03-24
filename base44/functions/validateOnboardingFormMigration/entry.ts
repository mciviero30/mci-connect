import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ONBOARDINGFORM MIGRATION: Validate user_id population
 * Admin-only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const forms = await base44.asServiceRole.entities.OnboardingForm.list('', 10000);

    let withUserId = 0;
    let withEmailFkOnly = 0;

    for (const form of forms) {
      if (form.user_id) {
        withUserId++;
      } else if (form.employee_email && !form.user_id) {
        withEmailFkOnly++;
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      total_records: forms.length,
      with_user_id: withUserId,
      with_email_fk_only: withEmailFkOnly,
      migration_complete: withEmailFkOnly === 0,
      safe_for_phase1_reset: withEmailFkOnly === 0,
      status: withEmailFkOnly === 0 ? 'ready_for_phase1' : 'migration_incomplete'
    };

    console.log('✅ OnboardingForm validation result:', result);
    return Response.json(result);

  } catch (err) {
    console.error('❌ Validation failed:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});