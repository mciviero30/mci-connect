import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * JOB DUPLICATE PREVENTION - Pre-Creation Validation
 * 
 * PHASE 3 FIX: Prevent auto-creation of duplicate jobs
 * 
 * Triggered BEFORE Job.create() via entity automation
 * Blocks creation if:
 * - Job with same name + customer_id already exists
 * - Provides existing job_id for linking
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process Job creation events
    if (event.type !== 'create' || event.entity_name !== 'Job') {
      return Response.json({ success: true, message: 'Not a Job creation event' });
    }

    const newJob = data;

    // Check for duplicates by name + customer
    const duplicateCheck = await base44.asServiceRole.entities.Job.filter({
      name: newJob.name,
      customer_id: newJob.customer_id
    });

    if (duplicateCheck.length > 0) {
      const existingJob = duplicateCheck[0];
      
      console.error('[JOB DUPLICATE BLOCK] 🚫 Duplicate job creation prevented', {
        new_job_name: newJob.name,
        existing_job_id: existingJob.id,
        existing_job_number: existingJob.job_number,
        customer_id: newJob.customer_id
      });

      // Return error with existing job info
      return Response.json({
        success: false,
        error: 'DUPLICATE_JOB_DETECTED',
        message: `Job "${newJob.name}" for customer already exists`,
        existing_job: {
          id: existingJob.id,
          job_number: existingJob.job_number,
          name: existingJob.name,
          status: existingJob.status
        },
        resolution: 'Use existing job_id instead of creating new job'
      }, { status: 400 });
    }

    // No duplicate - allow creation
    return Response.json({
      success: true,
      duplicate_check_passed: true,
      job_name: newJob.name
    });

  } catch (error) {
    console.error('[JOB DUPLICATE BLOCK] Error:', error.message);
    // Allow creation on validation error (fail open)
    return Response.json({
      success: true,
      error: error.message,
      validation_skipped: true
    }, { status: 200 });
  }
});