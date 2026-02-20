import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

/**
 * Parse Connecteam payroll Excel file - Row Format
 * 
 * Expected format (row-based, single sheet "All Employees"):
 *   Columns: First name, Last name, Total hours, Total paid hours, Pay type, Type, Sub-job
 *   - Each row = one employee + one job entry
 *   - "Type" column = job name
 *   - "Total hours" = hours in "HH:MM" format
 * 
 * Output: {
 *   success: true,
 *   data: {
 *     employees: [{ name, jobs: [{name, hours}], total_hours }],
 *     all_jobs: [{name, hours}],  // aggregated across all employees
 *     total_hours: number
 *   }
 * }
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

    // Download the Excel file
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json({ error: 'Failed to download file' }, { status: 400 });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

    // Use first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`📄 Parsing "${file_name}" - ${rows.length} rows, sheet: "${sheetName}"`);

    if (rows.length === 0) {
      return Response.json({ success: false, error: 'No data found in file' }, { status: 400 });
    }

    // Helper: parse "HH:MM" or "HH:MM:SS" to decimal hours
    const parseHours = (val) => {
      if (!val) return 0;
      const str = String(val).trim();
      if (!str) return 0;
      // Handle numeric (Excel stores times as fractions of a day sometimes)
      if (!isNaN(str)) return parseFloat(str) * 24;
      const parts = str.split(':');
      if (parts.length >= 2) {
        const h = parseInt(parts[0]) || 0;
        const m = parseInt(parts[1]) || 0;
        return h + m / 60;
      }
      return 0;
    };

    // Parse rows - group by employee, then by job
    // employeeMap: key = "First Last" → { name, jobMap: Map<jobName, hours> }
    const employeeMap = new Map();

    // Skip-list for non-job "Type" values
    const skipTypes = new Set(['lunch break', 'rest break', 'no sub-job', '']);

    for (const row of rows) {
      const firstName = String(row['First name'] || '').trim();
      const lastName = String(row['Last name'] || '').trim();
      if (!firstName && !lastName) continue;

      const employeeName = `${firstName} ${lastName}`.trim();
      const jobName = String(row['Type'] || '').trim();
      const hoursRaw = row['Total hours'] || row['Total paid hours'] || '';
      const hours = parseHours(hoursRaw);

      // Skip lunch/rest breaks and zero-hour rows
      if (skipTypes.has(jobName.toLowerCase()) || hours === 0) continue;

      if (!employeeMap.has(employeeName)) {
        employeeMap.set(employeeName, { name: employeeName, jobMap: new Map() });
      }

      const emp = employeeMap.get(employeeName);
      const jobKey = jobName.toLowerCase();
      const current = emp.jobMap.get(jobKey) || { name: jobName, hours: 0 };
      current.hours = Math.round((current.hours + hours) * 100) / 100;
      emp.jobMap.set(jobKey, current);
    }

    // Convert to array structure
    const employees = Array.from(employeeMap.values()).map(emp => {
      const jobs = Array.from(emp.jobMap.values());
      const total_hours = Math.round(jobs.reduce((sum, j) => sum + j.hours, 0) * 100) / 100;
      return { name: emp.name, jobs, total_hours };
    });

    // Also aggregate all jobs across all employees (for single-employee import)
    const allJobMap = new Map();
    for (const emp of employees) {
      for (const job of emp.jobs) {
        const key = job.name.toLowerCase();
        const current = allJobMap.get(key) || { name: job.name, hours: 0 };
        current.hours = Math.round((current.hours + job.hours) * 100) / 100;
        allJobMap.set(key, current);
      }
    }
    const all_jobs = Array.from(allJobMap.values());
    const total_hours = Math.round(all_jobs.reduce((sum, j) => sum + j.hours, 0) * 100) / 100;

    if (total_hours === 0) {
      return Response.json({ success: false, error: 'No hours found in file' }, { status: 400 });
    }

    console.log(`✅ Parsed ${employees.length} employees, ${all_jobs.length} unique jobs, ${total_hours} total hours`);

    // Return in the format the UI expects: { jobs, total_hours }
    // Also include employees for future multi-employee support
    return Response.json({
      success: true,
      data: {
        jobs: all_jobs,           // aggregated - used by current single-employee flow
        total_hours,
        job_count: all_jobs.length,
        employees,                // per-employee breakdown for future use
        employee_count: employees.length
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