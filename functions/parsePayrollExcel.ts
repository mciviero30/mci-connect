import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

/**
 * Parse Connecteam payroll Excel - "Timesheet Overview" format
 * 
 * Expected: Sheet "All Employees" with columns:
 *   First name, Last name, SSN, Address, Title, Employment Start Date,
 *   Birthday, T-SHIRT SIZE, Type (job name), Shift hours, Total pay, ...
 * 
 * Structure: Employee header row (has First name, Last name, SSN, Total pay)
 *            followed by job detail rows (empty First/Last, has Type + Shift hours)
 * 
 * Output per employee:
 *   { connecteam_name, first_name, last_name, ssn, total_pay, jobs: [{name, hours}], total_hours }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url, file_base64, file_name } = body;

    if (!file_url && !file_base64) {
      return Response.json({ error: 'file_url or file_base64 required (v2)' }, { status: 400 });
    }

    let arrayBuffer;
    if (file_base64) {
      // Decode base64 directly — no integration credits needed
      const binaryStr = atob(file_base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      arrayBuffer = bytes.buffer;
    } else {
      const fileResponse = await fetch(file_url);
      if (!fileResponse.ok) {
        return Response.json({ error: 'Failed to download file' }, { status: 400 });
      }
      arrayBuffer = await fileResponse.arrayBuffer();
    }

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });

    // Use "All Employees" sheet if available, else first sheet
    const sheetName = workbook.SheetNames.includes('All Employees')
      ? 'All Employees'
      : workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`📄 Parsing "${file_name}" - ${rows.length} rows from sheet "${sheetName}"`);

    if (rows.length === 0) {
      return Response.json({ success: false, error: 'No data found in file' }, { status: 400 });
    }

    // Helper: parse "HH:MM" or numeric to decimal hours
    const parseHours = (val) => {
      if (!val && val !== 0) return 0;
      const str = String(val).trim();
      if (!str) return 0;
      if (!isNaN(str)) return parseFloat(str) * 24; // Excel time fraction
      const parts = str.split(':');
      if (parts.length >= 2) {
        return (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60;
      }
      return 0;
    };

    const round2 = (n) => Math.round(n * 100) / 100;

    // Skip-list for non-job entries
    const skipTypes = new Set(['lunch break', 'rest break', 'no records for this day', 'no sub-job', '']);

    // Parse: employee header rows have First name populated
    // Job detail rows have empty First name but have Type + Shift hours
    const employees = [];
    let currentEmployee = null;

    for (const row of rows) {
      const firstName = String(row['First name'] || '').trim();
      const lastName = String(row['Last name'] || '').trim();
      const hasName = firstName || lastName;

      if (hasName) {
        // This is an employee header row
        const ssnRaw = row['SSN'];
        const ssn = ssnRaw ? String(ssnRaw).trim().replace(/\D/g, '') : '';
        const totalPayRaw = row['Total pay'];
        const totalPay = totalPayRaw ? parseFloat(totalPayRaw) || 0 : 0;
        const hourlyRate = row['Hourly rate (USD)'] ? parseFloat(row['Hourly rate (USD)']) : null;

        currentEmployee = {
          connecteam_name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
          ssn,
          total_pay: totalPay,
          hourly_rate: hourlyRate,
          title: String(row['Title'] || '').trim(),
          address: String(row['Address'] || '').trim(),
          birthday: String(row['Birthday'] || '').trim(),
          jobMap: new Map()
        };

        // Also check if this header row itself has a job (can happen)
        const jobName = String(row['Type'] || '').trim();
        if (jobName && !skipTypes.has(jobName.toLowerCase())) {
          const shiftHours = parseHours(row['Shift hours']);
          if (shiftHours > 0) {
            const key = jobName.toLowerCase();
            const existing = currentEmployee.jobMap.get(key) || { name: jobName, hours: 0 };
            existing.hours = round2(existing.hours + shiftHours);
            currentEmployee.jobMap.set(key, existing);
          }
        }

        employees.push(currentEmployee);
      } else if (currentEmployee) {
        // Job detail row - belongs to currentEmployee
        const jobName = String(row['Type'] || '').trim();
        if (!jobName || skipTypes.has(jobName.toLowerCase())) continue;

        const shiftHours = parseHours(row['Shift hours']);
        if (shiftHours <= 0) continue;

        const key = jobName.toLowerCase();
        const existing = currentEmployee.jobMap.get(key) || { name: jobName, hours: 0 };
        existing.hours = round2(existing.hours + shiftHours);
        currentEmployee.jobMap.set(key, existing);
      }
    }

    // Convert to final structure
    const result = employees
      .filter(emp => emp.jobMap.size > 0) // only employees with hours
      .map(emp => {
        const jobs = Array.from(emp.jobMap.values());
        const total_hours = round2(jobs.reduce((s, j) => s + j.hours, 0));
        return {
          connecteam_name: emp.connecteam_name,
          first_name: emp.first_name,
          last_name: emp.last_name,
          ssn: emp.ssn,
          total_pay: emp.total_pay,
          hourly_rate: emp.hourly_rate,
          title: emp.title,
          address: emp.address,
          birthday: emp.birthday,
          jobs,
          total_hours
        };
      });

    if (result.length === 0) {
      return Response.json({ success: false, error: 'No employees with hours found in file' }, { status: 400 });
    }

    // Also do a quick SSN lookup against PendingEmployee to pre-match
    const allSsns = result.map(e => e.ssn).filter(Boolean);
    let pendingBySSN = {};
    let pendingByName = {};

    if (allSsns.length > 0) {
      const pending = await base44.asServiceRole.entities.PendingEmployee.list();
      for (const p of pending) {
        const ssnClean = (p.ssn_tax_id || '').replace(/\D/g, '');
        if (ssnClean) pendingBySSN[ssnClean] = p;
        const nameKey = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().trim();
        if (nameKey) pendingByName[nameKey] = p;
      }
    }

    // Enrich each employee with match info
    const enriched = result.map(emp => {
      let match = null;
      let match_method = null;

      // Try SSN match first
      if (emp.ssn && pendingBySSN[emp.ssn]) {
        const p = pendingBySSN[emp.ssn];
        match = {
          pending_employee_id: p.id,
          full_name: `${p.first_name} ${p.last_name}`.trim(),
          email: p.email,
          ssn_tax_id: p.ssn_tax_id
        };
        match_method = 'ssn';
      }

      // Fallback: exact name match
      if (!match) {
        const nameKey = emp.connecteam_name.toLowerCase();
        if (pendingByName[nameKey]) {
          const p = pendingByName[nameKey];
          match = {
            pending_employee_id: p.id,
            full_name: `${p.first_name} ${p.last_name}`.trim(),
            email: p.email,
            ssn_tax_id: p.ssn_tax_id
          };
          match_method = 'name_exact';
        }
      }

      return { ...emp, match, match_method };
    });

    const matchedCount = enriched.filter(e => e.match).length;
    console.log(`✅ Parsed ${enriched.length} employees, ${matchedCount} matched in system`);

    // Return all employees — UI will let admin pick which one to import
    return Response.json({
      success: true,
      data: {
        employees: enriched,
        employee_count: enriched.length,
        matched_count: matchedCount,
        // Legacy single-employee compatibility: first employee's data
        jobs: enriched[0]?.jobs || [],
        total_hours: enriched[0]?.total_hours || 0,
        job_count: enriched[0]?.jobs?.length || 0
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