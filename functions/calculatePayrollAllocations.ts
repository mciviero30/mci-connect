import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calculate payroll allocations from parsed jobs data
 * 
 * INPUT: {
 *   total_paid: number (total amount to distribute)
 *   jobs: [{name: string, hours: number}, ...]
 * }
 * 
 * OUTPUT: {
 *   allocations: [{
 *     job_id: string,
 *     job_name: string,
 *     allocated_amount: number (exact to cents),
 *     allocation_percentage: number,
 *     hours_worked: number
 *   }, ...]
 * }
 * 
 * ROUNDING RULE:
 * - All amounts rounded to cents
 * - Last job absorbs rounding delta to ensure sum = total_paid exactly
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { total_paid, jobs } = body;

    if (!total_paid || !jobs || !Array.isArray(jobs) || jobs.length === 0) {
      return Response.json({
        error: 'total_paid and jobs array are required'
      }, { status: 400 });
    }

    // Get all jobs to find IDs and names
    const allJobs = await base44.entities.Job.list();
    const jobMap = new Map();
    for (const job of allJobs) {
      jobMap.set(job.name.toLowerCase().trim(), job);
    }

    // Calculate allocations proportionally
    const total_hours = jobs.reduce((sum, j) => sum + j.hours, 0);
    if (total_hours === 0) {
      return Response.json({
        error: 'Total hours must be greater than 0'
      }, { status: 400 });
    }

    const allocations = [];
    let sumAllocated = 0;

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const percentage = (job.hours / total_hours) * 100;
      
      let allocated_amount;
      if (i === jobs.length - 1) {
        // LAST JOB: Absorb rounding delta
        allocated_amount = total_paid - sumAllocated;
      } else {
        // Regular jobs: Round to cents
        allocated_amount = Math.round((job.hours / total_hours) * total_paid * 100) / 100;
      }

      sumAllocated += allocated_amount;

      // Find matching job in DB
      const matchedJob = jobMap.get(job.name.toLowerCase().trim());

      // If not found, create a placeholder Job
      let jobId = matchedJob?.id || '';
      let isPlaceholder = false;
      if (!matchedJob) {
        try {
          const newJob = await base44.entities.Job.create({
            name: job.name,
            customer_name: 'Unknown (Payroll Import)',
            authorization_id: 'payroll-placeholder',
            status: 'payroll_placeholder',
            backfill_source: 'auto_generated',
            notes: `Auto-created from payroll import. Needs to be linked to the real job.`
          });
          jobId = newJob.id;
          isPlaceholder = true;
          console.log(`🆕 Created placeholder Job "${job.name}" → ${newJob.id}`);
        } catch (err) {
          console.warn(`⚠️ Failed to create placeholder Job for "${job.name}":`, err.message);
        }
      }
      
      allocations.push({
        job_id: jobId,
        job_name: job.name,
        allocated_amount: Math.round(allocated_amount * 100) / 100,
        allocation_percentage: Math.round(percentage * 100) / 100,
        hours_worked: job.hours,
        is_rounding_adjustment: i === jobs.length - 1,
        rounding_delta: i === jobs.length - 1 ? 
          (Math.round(allocated_amount * 100) / 100) - 
          (Math.round((job.hours / total_hours) * total_paid * 100) / 100)
          : 0,
        job_found: !!matchedJob,
        is_placeholder: isPlaceholder,
        placeholder_job_id: isPlaceholder ? jobId : undefined
      });
    }

    // Validate sum
    const finalSum = allocations.reduce((sum, a) => sum + a.allocated_amount, 0);
    const roundingError = Math.abs(finalSum - total_paid);
    
    if (roundingError > 0.01) {
      return Response.json({
        error: `Allocation rounding error too large: ${roundingError.toFixed(4)}`,
        debug: { finalSum, total_paid }
      }, { status: 400 });
    }

    console.log(`✅ Calculated allocations for ${jobs.length} jobs`);
    console.log(`   Total: $${total_paid.toFixed(2)}, Sum: $${finalSum.toFixed(2)}`);

    return Response.json({
      success: true,
      allocations,
      total_hours,
      total_paid,
      final_sum: Math.round(finalSum * 100) / 100,
      rounding_error: Math.round(roundingError * 10000) / 10000,
      unmatched_jobs: allocations.filter(a => !a.job_found).map(a => a.job_name)
    });
  } catch (error) {
    console.error('❌ calculatePayrollAllocations error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to calculate allocations'
    }, { status: 500 });
  }
});