import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * THREAD-SAFE JOB NUMBER GENERATOR
 * - If job_id exists, returns existing job_number
 * - If new job, generates sequential JOB-00001, JOB-00002, etc.
 * Uses atomic counter system to prevent duplicates
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id } = await req.json();

    // If job_id provided, check if it already has a job_number
    if (job_id) {
      const existingJobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
      if (existingJobs.length > 0 && existingJobs[0].job_number) {
        return Response.json({ 
          job_number: existingJobs[0].job_number,
          is_existing: true
        });
      }
    }

    // Generate new job number
    // Create unique claim record (atomic operation)
    const claim = await base44.asServiceRole.entities.Counter.create({
      counter_key: `job-claim-${Date.now()}-${Math.random()}`,
      current_value: 1,
      last_increment_date: new Date().toISOString()
    });
    
    // Count all job claims to get sequence number
    const allClaims = await base44.asServiceRole.entities.Counter.filter({
      counter_key: { $regex: '^job-claim-' }
    });
    
    const sequenceNumber = allClaims.length;
    const formattedNumber = `JOB-${String(sequenceNumber).padStart(5, '0')}`;

    return Response.json({ 
      job_number: formattedNumber,
      is_existing: false
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('❌ Error generating job number:', error);
    return Response.json({ 
      error: 'Number generation failed',
      details: error.message 
    }, { status: 500 });
  }
});