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

    // Generate job number using atomic counter
    const claim = await base44.asServiceRole.entities.Counter.create({
      counter_key: `job-claim-${Date.now()}-${Math.random()}`,
      current_value: 1,
      last_increment_date: new Date().toISOString()
    });
    
    const allClaims = await base44.asServiceRole.entities.Counter.filter({
      counter_key: { $regex: '^job-claim-' }
    });
    
    const sequenceNumber = allClaims.length;
    const formattedNumber = `JOB-${String(sequenceNumber).padStart(5, '0')}`;

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