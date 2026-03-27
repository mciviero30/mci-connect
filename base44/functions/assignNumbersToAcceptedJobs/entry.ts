import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * REPAIR: Assign job_number to accepted jobs that don't have one
 * 
 * Only assigns numbers to jobs where:
 * - field_accepted_at is set (client accepted)
 * - job_number is missing
 * - status is active (not deleted/archived)
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Find accepted jobs without numbers
    const allJobs = await base44.asServiceRole.entities.Job.list();
    
    const jobsNeedingNumber = allJobs.filter(job => 
      job.field_accepted_at && // Client accepted
      !job.job_number && // No number yet
      job.status === 'active' && // Active
      !job.deleted_at // Not deleted
    );

    const results = {
      total_accepted_jobs_without_number: jobsNeedingNumber.length,
      assigned: 0,
      errors: []
    };

    // Get or create job_number counter
    let counter = await base44.asServiceRole.entities.Counter.filter({ 
      counter_key: 'job_number' 
    });

    if (counter.length === 0) {
      counter = await base44.asServiceRole.entities.Counter.create({
        counter_key: 'job_number',
        current_value: 0,
        last_increment_date: new Date().toISOString()
      });
      counter = [counter];
    }

    let currentNumber = counter[0].current_value;

    // Assign numbers sequentially
    for (const job of jobsNeedingNumber) {
      try {
        currentNumber++;
        const formattedNumber = `JOB-${String(currentNumber).padStart(5, '0')}`;

        await base44.asServiceRole.entities.Job.update(job.id, {
          job_number: formattedNumber
        });

        results.assigned++;
      } catch (error) {
        results.errors.push({
          job_id: job.id,
          job_name: job.name,
          error: error.message
        });
      }
    }

    // Update counter
    if (results.assigned > 0) {
      await base44.asServiceRole.entities.Counter.update(counter[0].id, {
        current_value: currentNumber,
        last_increment_date: new Date().toISOString()
      });
    }

    return Response.json({
      success: true,
      message: `Assigned ${results.assigned} job numbers to accepted jobs`,
      results
    });

  } catch (error) {
    console.error('Assign numbers to accepted jobs failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});