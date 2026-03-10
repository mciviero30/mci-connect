import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Migration: Move all plans with purpose='measurement' to purpose='job_final'
// so they appear in Field. Run once.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Find all plans with purpose='measurement'
    const measurementPlans = await base44.asServiceRole.entities.Plan.filter({ 
      purpose: 'measurement' 
    });

    console.log(`Found ${measurementPlans.length} plans with purpose='measurement' to migrate`);

    let migrated = 0;
    let errors = 0;

    for (const plan of measurementPlans) {
      try {
        await base44.asServiceRole.entities.Plan.update(plan.id, { 
          purpose: 'job_final' 
        });
        migrated++;
        console.log(`Migrated plan ${plan.id} (${plan.name}) for job ${plan.job_id}`);
      } catch (err) {
        console.error(`Failed to migrate plan ${plan.id}:`, err.message);
        errors++;
      }
    }

    return Response.json({
      success: true,
      total_found: measurementPlans.length,
      migrated,
      errors,
      message: `Migration complete: ${migrated} plans moved to Field (job_final)`
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});