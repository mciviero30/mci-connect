import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Parse Connecteam payroll Excel file
 * Expected format: rows with job_name and hours columns
 * Returns: { success, data: { employee_name, period, jobs: [{name, hours}, ...], total_hours } }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url, file_name } = body;

    if (!file_url) {
      return Response.json({ error: 'file_url required' }, { status: 400 });
    }

    // Parse the file using ExtractDataFromUploadedFile
    const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            job_name: { type: 'string' },
            hours: { type: 'number' }
          }
        }
      }
    });

    if (extractResult.status !== 'success' || !extractResult.output) {
      return Response.json({
        success: false,
        error: 'Failed to parse file: ' + (extractResult.details || 'Unknown error')
      }, { status: 400 });
    }

    const rows = extractResult.output || [];

    // Group by job_name and sum hours
    const jobMap = new Map();
    for (const row of rows) {
      if (row.job_name && row.hours) {
        const key = row.job_name.toLowerCase().trim();
        const current = jobMap.get(key) || { name: row.job_name, hours: 0 };
        current.hours += parseFloat(row.hours) || 0;
        jobMap.set(key, current);
      }
    }

    const jobs = Array.from(jobMap.values());
    const total_hours = jobs.reduce((sum, j) => sum + j.hours, 0);

    if (total_hours === 0) {
      return Response.json({
        success: false,
        error: 'No hours found in file'
      }, { status: 400 });
    }

    console.log(`✅ Parsed ${file_name}: ${jobs.length} jobs, ${total_hours} total hours`);

    return Response.json({
      success: true,
      data: {
        jobs,
        total_hours,
        job_count: jobs.length
      }
    });
  } catch (error) {
    console.error('❌ parsePayrollExcel error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to parse payroll file'
    }, { status: 500 });
  }
});