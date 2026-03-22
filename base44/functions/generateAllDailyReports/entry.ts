import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin-only check
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all active jobs
    const activeJobs = await base44.asServiceRole.entities.Job.filter({ 
      status: 'active' 
    });

    const today = new Date().toISOString().split('T')[0];
    const results = [];
    const errors = [];

    // Generate report for each job
    for (const job of activeJobs) {
      try {
        // Call the report generation function
        const result = await base44.asServiceRole.functions.invoke('generateDailyFieldReport', {
          job_id: job.id,
          report_date: today,
          generated_by: 'auto'
        });
        
        results.push({
          job_id: job.id,
          job_name: job.job_name_field || job.name,
          status: 'success',
          report: result.data?.report
        });
      } catch (error) {
        errors.push({
          job_id: job.id,
          job_name: job.job_name_field || job.name,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      date: today,
      total_jobs: activeJobs.length,
      reports_generated: results.length,
      errors: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error('Error generating daily reports:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});