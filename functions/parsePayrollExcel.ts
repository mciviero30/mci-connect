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

    let workbook;
    if (file_base64) {
      workbook = XLSX.read(file_base64, { type: 'base64' });
    } else {
      const fileResponse = await fetch(file_url, {
        headers: { 'Accept': 'application/octet-stream' }
      });
      if (!fileResponse.ok) {
        return Response.json({ error: `Failed to download file: ${fileResponse.status}` }, { status: 400 });
      }
      const arrayBuffer = await fileResponse.arrayBuffer();
      console.log(`📦 Downloaded ${arrayBuffer.byteLength} bytes`);
      workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    }

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

    // Helper: parse "HH:MM" string or Excel time fraction to decimal hours
    const parseHours = (val) => {
      if (!val && val !== 0) return 0;
      const str = String(val).trim();
      if (!str) return 0;
      // Excel stores times as fraction of 24hrs (e.g. 0.25 = 6:00)
      if (!isNaN(str)) return parseFloat(str) * 24;
      // "HH:MM" or "HHH:MM" string format
      const parts = str.split(':');
      if (parts.length >= 2) {
        return (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60;
      }
      return 0;
    };

    const round2 = (n) => Math.round(n * 100) / 100;

    const skipTypes = new Set(['lunch break', 'rest break', 'no records for this day', 'no sub-job', '']);

    // Detect format:
    // "row-format": every row has First name + Last name + Type + Total hours (one job per row, employee repeats)
    // "summary-format": employee header row (has First name) + job detail rows (empty First name, Shift hours col)
    // "summary-totals-format": like summary-format but we only use the employee header row totals (Total pay, Total Paid Hours)
    const hasShiftHoursCol = rows.some(r => r['Shift hours'] !== undefined);
    const isRowFormat = !hasShiftHoursCol;
    // For summary-format with many sheets (large files), use totals from employee header rows only
    const hasTotalPayCol = rows.some(r => r['Total pay'] !== undefined && r['Total pay'] !== '');

    console.log(`📋 Detected format: ${isRowFormat ? 'row-format (Total hours per row)' : 'summary-format (Shift hours)'}`);

    const empMap = new Map(); // key = "FirstName LastName" normalized

    if (isRowFormat) {
      // ROW FORMAT: each row = one employee + one job
      for (const row of rows) {
        const firstName = String(row['First name'] || '').trim();
        const lastName = String(row['Last name'] || '').trim();
        if (!firstName && !lastName) continue;

        const nameKey = `${firstName} ${lastName}`.toLowerCase().trim();
        const jobName = String(row['Type'] || '').trim();
        if (!jobName || skipTypes.has(jobName.toLowerCase())) continue;

        // Ignore break pay types
        const payType = String(row['Pay type'] || '').toLowerCase();
        if (payType.includes('break') || payType.includes('lunch')) continue;

        const hours = parseHours(row['Total hours'] || row['Total paid hours']);
        if (hours <= 0) continue;

        if (!empMap.has(nameKey)) {
          const ssnRaw = row['SSN'];
          empMap.set(nameKey, {
            connecteam_name: `${firstName} ${lastName}`.trim(),
            first_name: firstName,
            last_name: lastName,
            ssn: ssnRaw ? String(ssnRaw).trim().replace(/\D/g, '') : '',
            total_pay: 0, // not available in this format
            hourly_rate: row['Hourly rate (USD)'] ? parseFloat(row['Hourly rate (USD)']) : null,
            title: String(row['Title'] || '').trim(),
            address: String(row['Address'] || '').trim(),
            birthday: String(row['Birthday'] || '').trim(),
            jobMap: new Map()
          });
        }

        const emp = empMap.get(nameKey);
        const key = jobName.toLowerCase();
        const existing = emp.jobMap.get(key) || { name: jobName, hours: 0 };
        existing.hours = round2(existing.hours + hours);
        emp.jobMap.set(key, existing);
      }
    } else {
      // SUMMARY FORMAT: employee header row + job detail rows
      let currentEmployee = null;
      for (const row of rows) {
        const firstName = String(row['First name'] || '').trim();
        const lastName = String(row['Last name'] || '').trim();
        const hasName = firstName || lastName;

        if (hasName) {
          const ssnRaw = row['SSN'];
          const ssn = ssnRaw ? String(ssnRaw).trim().replace(/\D/g, '') : '';
          const nameKey = `${firstName} ${lastName}`.toLowerCase().trim();
          currentEmployee = {
            connecteam_name: `${firstName} ${lastName}`.trim(),
            first_name: firstName,
            last_name: lastName,
            ssn,
            total_pay: parseFloat(row['Total pay']) || 0,
            hourly_rate: row['Hourly rate (USD)'] ? parseFloat(row['Hourly rate (USD)']) : null,
            title: String(row['Title'] || '').trim(),
            address: String(row['Address'] || '').trim(),
            birthday: String(row['Birthday'] || '').trim(),
            jobMap: new Map()
          };
          empMap.set(nameKey, currentEmployee);

          // Header row may also have a job
          const jobName = String(row['Type'] || '').trim();
          if (jobName && !skipTypes.has(jobName.toLowerCase())) {
            const h = parseHours(row['Shift hours']);
            if (h > 0) {
              currentEmployee.jobMap.set(jobName.toLowerCase(), { name: jobName, hours: round2(h) });
            }
          }
        } else if (currentEmployee) {
          const jobName = String(row['Type'] || '').trim();
          if (!jobName || skipTypes.has(jobName.toLowerCase())) continue;
          const h = parseHours(row['Shift hours']);
          if (h <= 0) continue;
          const key = jobName.toLowerCase();
          const existing = currentEmployee.jobMap.get(key) || { name: jobName, hours: 0 };
          existing.hours = round2(existing.hours + h);
          currentEmployee.jobMap.set(key, existing);
        }
      }
    }

    // Convert empMap to result array
    const result = Array.from(empMap.values())
      .filter(emp => emp.jobMap.size > 0)
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