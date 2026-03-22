import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      total_records: 0,
      already_had_user_id: 0,
      user_id_assigned: 0,
      no_user_match: 0,
      errors: [],
      details: []
    };

    const directory = await base44.asServiceRole.entities.EmployeeDirectory.list();
    const users = await base44.asServiceRole.entities.User.list();

    results.total_records = directory.length;

    const userEmailMap = {};
    for (const u of users) {
      if (u.email) {
        userEmailMap[u.email.toLowerCase().trim()] = u;
      }
    }

    console.log(`📊 Starting: ${directory.length} records, ${users.length} users`);

    for (const record of directory) {
      try {
        const email = record.employee_email?.toLowerCase()?.trim();

        if (!email) {
          results.errors.push({ id: record.id, reason: 'Missing employee_email' });
          continue;
        }

        if (record.user_id) {
          results.already_had_user_id++;
          continue;
        }

        const matchingUser = userEmailMap[email];

        if (!matchingUser) {
          results.no_user_match++;
          results.details.push({ email, status: 'no_user_found' });
          continue;
        }

        await base44.asServiceRole.entities.EmployeeDirectory.update(record.id, {
          user_id: matchingUser.id,
          last_synced_at: new Date().toISOString(),
          sync_source: 'backfill'
        });

        results.user_id_assigned++;
        results.details.push({ email, user_id: matchingUser.id, status: 'success' });

        console.log(`✅ ${email}`);
      } catch (err) {
        results.errors.push({ id: record.id, email: record.employee_email, error: err.message });
      }
    }

    console.log('📊 Complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_records: results.total_records,
          already_had_user_id: results.already_had_user_id,
          user_id_assigned: results.user_id_assigned,
          no_user_match: results.no_user_match,
          errors_count: results.errors.length
        },
        details: results.details,
        errors: results.errors
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});