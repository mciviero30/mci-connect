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

    for (const update of updates) {
      try {
        // Update using asServiceRole to bypass readonly restrictions
        await base44.asServiceRole.entities.User.update(update.user_id, {
          full_name: update.new_name
        });

        results.push({
          user_id: update.user_id,
          email: update.email,
          old_name: update.old_name,
          new_name: update.new_name,
          status: 'updated'
        });
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