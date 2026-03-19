import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AUTO-GENERATE JOB NUMBER ON JOB CREATION
 * Entity automation triggered on Job creation
 * Automatically assigns job_number if missing
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process create events
    if (event.type !== 'create') {
      return Response.json({ skipped: true, reason: 'Not a create event' });
    }

    const job = data;

    // Skip if job_number already exists
    if (job.job_number) {
      return Response.json({ skipped: true, reason: 'Job already has job_number' });
    }

    // DECISION A: Assign number always (removed field_accepted_at requirement)
    console.log(`[AutoJobNumber] Generating number for job ${job.id} - ${job.name}`);

    // Get existing job numbers to determine next sequence
    const existingJobs = await base44.asServiceRole.entities.Job.filter(
      { job_number: { $exists: true, $ne: null } },
      '-job_number',
      1
    );

    let nextNumber = 1;
    if (existingJobs.length > 0 && existingJobs[0].job_number) {
      const lastNumber = existingJobs[0].job_number.replace('JOB-', '');
      nextNumber = parseInt(lastNumber, 10) + 1;
    }

    const formattedNumber = `JOB-${String(nextNumber).padStart(5, '0')}`;

    // Update job with generated number
    await base44.asServiceRole.entities.Job.update(job.id, { 
      job_number: formattedNumber 
    });

    return Response.json({ 
      success: true,
      job_number: formattedNumber,
      job_id: job.id
    });
  } catch (error) {
    console.error('❌ Auto-generate job number failed:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});