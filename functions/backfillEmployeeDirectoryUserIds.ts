import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 1: DATA INTEGRITY - Backfill user_id in EmployeeDirectory
 * Populates user_id for ALL EmployeeDirectory records by matching employee_email to User.email
 * IDEMPOTENT: Safe to run multiple times
 * NON-DESTRUCTIVE: No deletions, only updates
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ADMIN CHECK
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = {
      total_records: 0,
      already_had_user_id: 0,
      user_id_assigned: 0,
      no_user_match: 0,
      errors: [],
      details: []
    };

    // Get all EmployeeDirectory records
    const allDirectory = await base44.asServiceRole.entities.EmployeeDirectory.list();
    results.total_records = allDirectory.length;

    // Get all Users for matching
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userEmailMap = {};
    allUsers.forEach(u => {
      if (u.email) {
        userEmailMap[u.email.toLowerCase().trim()] = u;
      }
    });

    console.log(`📊 Starting backfill: ${allDirectory.length} directory records, ${allUsers.length} users`);

    // Process each directory record
    for (const record of allDirectory) {
      try {
        const email = record.employee_email?.toLowerCase().trim();
        
        if (!email) {
          results.errors.push({ id: record.id, reason: 'Missing employee_email' });
          continue;
        }

        // Skip if already has user_id
        if (record.user_id) {
          results.already_had_user_id++;
          continue;
        }

        // Find matching User
        const matchingUser = userEmailMap[email];
        
        if (!matchingUser) {
          results.no_user_match++;
          results.details.push({
            email: record.employee_email,
            status: 'no_user_found',
            action: 'skipped'
          });
          continue;
        }

        // Update with user_id
        await base44.asServiceRole.entities.EmployeeDirectory.update(record.id, {
          user_id: matchingUser.id,
          last_synced_at: new Date().toISOString(),
          sync_source: 'backfill'
        });

        results.user_id_assigned++;
        results.details.push({
          email: record.employee_email,
          user_id: matchingUser.id,
          status: 'success',
          action: 'user_id_assigned'
        });

        console.log(`✅ Assigned user_id to ${record.employee_email}`);

      } catch (error) {
        results.errors.push({
          id: record.id,
          email: record.employee_email,
          error: error.message
        });
      }
    }

    console.log('📊 Backfill complete:', results);

    return Response.json({
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
    });

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});