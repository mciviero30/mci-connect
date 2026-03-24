import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all EmployeeDirectory records
    const allRecords = await base44.asServiceRole.entities.EmployeeDirectory.filter({});

    // Group by email
    const grouped = {};
    allRecords.forEach(record => {
      const email = record.employee_email;
      if (!grouped[email]) {
        grouped[email] = [];
      }
      grouped[email].push(record);
    });

    const results = {
      total_emails: Object.keys(grouped).length,
      duplicates_found: 0,
      records_deleted: 0,
      errors: []
    };

    // Find duplicates
    for (const [email, records] of Object.entries(grouped)) {
      if (records.length > 1) {
        results.duplicates_found++;
        
        // Sort by updated_date (keep most recent)
        records.sort((a, b) => 
          new Date(b.updated_date) - new Date(a.updated_date)
        );

        const keepRecord = records[0];
        const deleteRecords = records.slice(1);

        console.log(`Email ${email}: keeping ${keepRecord.id}, deleting ${deleteRecords.length} duplicates`);

        // Delete older duplicates
        for (const oldRecord of deleteRecords) {
          try {
            await base44.asServiceRole.entities.EmployeeDirectory.delete(oldRecord.id);
            results.records_deleted++;
            console.log(`  ✅ Deleted duplicate ${oldRecord.id}`);
          } catch (error) {
            console.error(`  ❌ Error deleting ${oldRecord.id}:`, error);
            results.errors.push(`${email}: ${error.message}`);
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: `Cleanup complete: ${results.records_deleted} duplicates removed`,
      results
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});