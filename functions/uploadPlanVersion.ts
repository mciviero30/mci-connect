import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * FASE A2.1: Blueprint Versioning
 * 
 * Handles uploading a new version of a plan
 * - Detects existing active plan
 * - Sets version_number incrementally
 * - Marks previous as inactive
 * - Maintains backward compatibility
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id, name, file_url, folder, order } = await req.json();

    // Validate inputs
    if (!job_id || !name || !file_url) {
      return Response.json(
        { error: 'Missing required fields: job_id, name, file_url' },
        { status: 400 }
      );
    }

    // FASE A2.1: Get all active plans for this job
    const existingPlans = await base44.entities.Plan.filter({ 
      job_id,
      is_active: true 
    });

    let versionNumber = 1;
    let previousPlanId = null;

    if (existingPlans.length > 0) {
      // Get the current active plan
      const activePlan = existingPlans[0];
      previousPlanId = activePlan.id;
      versionNumber = (activePlan.version_number || activePlan.version || 1) + 1;

      // Mark previous plan as inactive
      await base44.entities.Plan.update(activePlan.id, {
        is_active: false,
        is_latest: false
      });
    }

    // Create new plan version
    const newPlan = await base44.entities.Plan.create({
      job_id,
      name,
      file_url,
      folder,
      order: order ?? 0,
      version: versionNumber, // Keep for backward compatibility
      is_latest: true,
      is_active: true,
      version_number: versionNumber,
      previous_plan_id: previousPlanId,
      version_created_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      plan: newPlan,
      version_number: versionNumber,
      previous_plan_id: previousPlanId,
      message: `Plan version ${versionNumber} created successfully`
    });

  } catch (error) {
    console.error('[uploadPlanVersion] Error:', error);
    return Response.json(
      { error: error.message || 'Failed to upload plan version' },
      { status: 500 }
    );
  }
});