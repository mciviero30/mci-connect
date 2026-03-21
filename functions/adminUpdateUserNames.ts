import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { updates } = await req.json();

    if (!updates || !Array.isArray(updates)) {
      return Response.json({ error: 'Invalid payload - updates array required' }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Use Base44 API directly with service role
    const BASE44_SERVICE_TOKEN = Deno.env.get('BASE44_SERVICE_ROLE_KEY');
    const APP_ID = Deno.env.get('BASE44_APP_ID');

    for (const update of updates) {
      try {
        const response = await fetch(
          `https://base44.app/api/apps/${APP_ID}/users/${update.user_id}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${BASE44_SERVICE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ full_name: update.new_name })
          }
        );

        if (response.ok) {
          results.push({
            user_id: update.user_id,
            email: update.email,
            old_name: update.old_name,
            new_name: update.new_name,
            status: 'updated'
          });
        } else {
          const errorData = await response.json();
          errors.push({
            user_id: update.user_id,
            email: update.email,
            error: errorData.message || 'Update failed'
          });
        }
      } catch (error) {
        errors.push({
          user_id: update.user_id,
          email: update.email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      updated_count: results.length,
      results,
      errors_count: errors.length,
      errors
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});