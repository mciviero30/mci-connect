import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ONBOARDING FORM VALIDATION: Verify user_id migration complete
 * Admin-only.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      entity: 'OnboardingForm',
      total_records: 0,
      with_user_id: 0,
      with_email_fk_only: 0,
      migration_complete: false,
      safe_for_phase1_reset: false,
      status: 'success'
    };

    try {
      const forms = await base44.entities.OnboardingForm.list('', 1000);
      results.total_records = forms.length;

      let withUserId = 0;
      let withEmailOnly = 0;

      forms.forEach(form => {
        if (form.user_id) {
          withUserId++;
        } else if (form.employee_email) {
          withEmailOnly++;
        }
      });

      results.with_user_id = withUserId;
      results.with_email_fk_only = withEmailOnly;
      results.migration_complete = withEmailOnly === 0;
      results.safe_for_phase1_reset = withEmailOnly === 0;

      const emoji = results.safe_for_phase1_reset ? '✅' : '❌';
      console.log(`${emoji} OnboardingForm validation: ${withUserId}/${results.total_records} have user_id`);

      return Response.json(results);

    } catch (err) {
      console.error('❌ Validation failed:', err);
      results.status = 'error';
      results.error = err.message;
      return Response.json(results, { status: 500 });
    }

  } catch (err) {
    console.error('Auth error:', err);
    return Response.json({ error: 'Authentication failed' }, { status: 401 });
  }
});