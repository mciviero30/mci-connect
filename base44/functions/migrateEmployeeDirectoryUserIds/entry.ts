import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all EmployeeDirectory records without user_id
    const allDirectory = await base44.asServiceRole.entities.EmployeeDirectory.filter({});
    const needsMigration = allDirectory.filter(d => !d.user_id && d.employee_email);

    console.log(`Found ${needsMigration.length} records needing migration`);

    const results = {
      total: needsMigration.length,
      migrated: 0,
      failed: 0,
      errors: []
    };

    for (const dirRecord of needsMigration) {
      try {
        // Find matching User by email
        const users = await base44.asServiceRole.entities.User.filter({ 
          email: dirRecord.employee_email 
        });

        if (users.length === 0) {
          console.log(`No user found for ${dirRecord.employee_email}`);
          results.failed++;
          results.errors.push(`No user: ${dirRecord.employee_email}`);
          continue;
        }

        const matchedUser = users[0];

        // Update EmployeeDirectory with user_id
        await base44.asServiceRole.entities.EmployeeDirectory.update(dirRecord.id, {
          user_id: matchedUser.id
        });

        console.log(`✅ Migrated ${dirRecord.employee_email} → ${matchedUser.id}`);
        results.migrated++;

      } catch (error) {
        console.error(`Error migrating ${dirRecord.employee_email}:`, error);
        results.failed++;
        results.errors.push(`${dirRecord.employee_email}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      message: `Migration complete: ${results.migrated} migrated, ${results.failed} failed`,
      results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});