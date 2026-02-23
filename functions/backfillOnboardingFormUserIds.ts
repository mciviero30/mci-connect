import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ONBOARDING FORM BACKFILL: Populate user_id from employee_email
 * Only updates OnboardingForm entity.
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
      updated_records: 0,
      remaining_missing_user_id: 0,
      unmatched_emails: [],
      updated_ids: [],
      status: 'success'
    };

    try {
      // Fetch all OnboardingForm records
      const forms = await base44.entities.OnboardingForm.list('', 1000);
      results.total_records = forms.length;

      if (forms.length === 0) {
        console.log('✅ No OnboardingForm records to process');
        return Response.json(results);
      }

      // Fetch all users for lookup
      const users = await base44.entities.User.list('', 1000);
      const usersByEmail = {};
      users.forEach(u => {
        if (u.email) {
          usersByEmail[u.email.toLowerCase()] = u.id;
        }
      });

      // Process each form
      for (const form of forms) {
        // Skip if already has user_id
        if (form.user_id) {
          continue;
        }

        // Try to find user by email
        if (form.employee_email) {
          const userId = usersByEmail[form.employee_email.toLowerCase()];
          
          if (userId) {
            // Update the form with user_id
            await base44.entities.OnboardingForm.update(form.id, {
              user_id: userId
            });
            
            results.updated_records++;
            results.updated_ids.push({
              form_id: form.id,
              user_id: userId,
              email: form.employee_email
            });
          } else {
            // Email not found in users
            results.unmatched_emails.push(form.employee_email);
          }
        }
      }

      // Count remaining records without user_id
      const updatedForms = await base44.entities.OnboardingForm.list('', 1000);
      results.remaining_missing_user_id = updatedForms.filter(f => !f.user_id).length;

      const emoji = results.remaining_missing_user_id === 0 ? '✅' : '⚠️';
      console.log(`${emoji} OnboardingForm backfill: ${results.updated_records}/${results.total_records} updated`);

      return Response.json(results);

    } catch (err) {
      console.error('❌ Backfill failed:', err);
      results.status = 'error';
      results.error = err.message;
      return Response.json(results, { status: 500 });
    }

  } catch (err) {
    console.error('Auth error:', err);
    return Response.json({ error: 'Authentication failed' }, { status: 401 });
  }
});