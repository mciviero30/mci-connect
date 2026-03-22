import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as XLSX from 'npm:xlsx@0.18.5';

/**
 * parsePayrollExcel — v2 Dual-File Parser
 *
 * INPUT:
 *   hourly_file_base64  (required) — Connecteam Hourly Timesheet Excel
 *   driving_file_base64 (required) — Connecteam Driving Timesheet Excel
 *   hourly_file_name    (optional) — for logging
 *   driving_file_name   (optional) — for logging
 *
 * OUTPUT (root-level, no data wrapper):
 *   { success: true, employees: [...], employee_count: number }
 *
 * Each employee:
 *   { connecteam_name, first_name, last_name, ssn, total_pay, total_hours, jobs: [{name, hours}] }
 *
 * Rules:
 *   - Driving hours included in total_hours but NOT in overtime calculation
 *   - Merge is by normalized "first last" name
 *   - Read-only: no entity writes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAuthorized = ['admin', 'ceo'].includes(user.role) ||
      (user.position && ['CEO', 'Accountant'].includes(user.position));
    if (!isAuthorized) {
      return Response.json({ error: 'Only Admin, CEO, or Accountant can parse payroll files' }, { status: 403 });
    }

    const body = await req.json();
    const { hourly_file_base64, driving_file_base64, hourly_file_name, driving_file_name } = body;

    if (!hourly_file_base64) {
      return Response.json({ error: 'hourly_file_base64 is required' }, { status: 400 });
    }
    if (!driving_file_base64) {
      return Response.json({ error: 'driving_file_base64 is required' }, { status: 400 });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────
    const round2 = (n) => Math.round(n * 100) / 100;
    const normName = (first, last) => `${first} ${last}`.toLowerCase().trim();

    const skipTypes = new Set(['lunch break', 'rest break', 'no records for this day', 'no sub-job', '']);

    const parseHoursFromValue = (val) => {
      if (!val && val !== 0) return 0;
      const str = String(val).trim();
      if (!str) return 0;
      // Excel time fraction (e.g. 0.25 = 6:00)
      if (!isNaN(str)) return parseFloat(str) * 24;
      // "HH:MM" or "HHH:MM"
      const parts = str.split(':');
      if (parts.length >= 2) {
        return (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60;
      }
      return 0;
    };

    // ─── Parse a single Connecteam workbook (flat row format) ────────────────
    // Expected columns: Full name, Job, Total hours, Pay type, Total pay, Hourly rate (USD), SSN
    const parseWorkbook = (workbook, label) => {
      const sheetName = workbook.SheetNames.includes('All Employees')
        ? 'All Employees'
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      console.log(`📄 [${label}] ${rows.length} rows from sheet "${sheetName}"`);

      if (rows.length === 0) return new Map();

      const empMap = new Map(); // nameKey → employee record

      for (const row of rows) {
        // 1. Full name required
        const fullName = String(row['Full name'] || '').trim();
        if (!fullName) continue;

        // 2. Job name required
        const jobName = String(row['Job'] || '').trim();
        if (!jobName) continue;

        // 3. Hours required and > 0
        const hours = parseHoursFromValue(row['Total hours']);
        if (hours <= 0) continue;

        // 4. Skip break/lunch pay types
        const payType = String(row['Pay type'] || '').toLowerCase();
        if (payType.includes('break') || payType.includes('lunch')) continue;

        // Parse name
        const nameParts = fullName.split(' ');
        const firstName = nameParts.shift() || '';
        const lastName = nameParts.join(' ');
        const nameKey = fullName.toLowerCase();

        // Init employee record if first time seeing this name
        if (!empMap.has(nameKey)) {
          const ssnRaw = row['SSN'];
          const rawPay = row['Total pay'];
          const initPay = (rawPay !== '' && rawPay !== null && rawPay !== undefined) ? (parseFloat(rawPay) || 0) : 0;
          empMap.set(nameKey, {
              connecteam_name: fullName,
              first_name: firstName,
              last_name: lastName,
              ssn: ssnRaw ? String(ssnRaw).trim().replace(/\D/g, '') : '',
              total_pay: initPay,
              hourly_rate: row['Hourly rate (USD)'] ? parseFloat(row['Hourly rate (USD)']) : null,
              jobMap: new Map()
            });
        } else {
          // Accumulate total_pay: take max seen (last row with non-zero wins if currently 0)
          const emp = empMap.get(nameKey);
          const rowPay = parseFloat(row['Total pay']) || 0;
          if (rowPay > emp.total_pay) emp.total_pay = rowPay;
        }

        // Accumulate hours per job
        const emp = empMap.get(nameKey);
        const jobKey = jobName.toLowerCase();
        const existing = emp.jobMap.get(jobKey) || { excel_job_name: jobName, total_hours: 0 };
        existing.total_hours = round2(existing.total_hours + hours);
        emp.jobMap.set(jobKey, existing);
      }

      return empMap;
    };

    // ─── Parse both files ─────────────────────────────────────────────────────
    const hourlyWB = XLSX.read(hourly_file_base64, { type: 'base64' });
    const drivingWB = XLSX.read(driving_file_base64, { type: 'base64' });

    const hourlyMap = parseWorkbook(hourlyWB, hourly_file_name || 'hourly');
    const drivingMap = parseWorkbook(drivingWB, driving_file_name || 'driving');

    console.log(`📊 Hourly employees: ${hourlyMap.size}, Driving employees: ${drivingMap.size}`);

    // ─── Merge: start with hourly, add driving hours ──────────────────────────
    // Driving hours are labeled with a "_driving" suffix on job name for traceability,
    // and tracked separately so they are NOT counted toward overtime.
    const mergedMap = new Map(hourlyMap);

    for (const [nameKey, drivingEmp] of drivingMap) {
      if (!mergedMap.has(nameKey)) {
        mergedMap.set(nameKey, { ...drivingEmp });
      }

      const merged = mergedMap.get(nameKey);
      if (!merged.jobMap) merged.jobMap = new Map();

      for (const [jobKey, job] of drivingEmp.jobMap) {
        const drivingKey = jobKey + '_driving';
        const drivingJobName = job.excel_job_name + ' (Driving)';
        const existing = merged.jobMap.get(drivingKey) || { excel_job_name: drivingJobName, total_hours: 0, is_driving: true };
        existing.total_hours = round2(existing.total_hours + job.total_hours);
        merged.jobMap.set(drivingKey, existing);
      }

      if (!merged.total_pay && drivingEmp.total_pay) {
        merged.total_pay = drivingEmp.total_pay;
      }
    }

    // ─── Build final result array ─────────────────────────────────────────────
    const result = Array.from(mergedMap.values())
      .filter(emp => emp.jobMap && emp.jobMap.size > 0)
      .map(emp => {
        const jobs = Array.from(emp.jobMap.values());
        const total_hours = round2(jobs.reduce((s, j) => s + j.total_hours, 0));
        return {
          connecteam_name: emp.connecteam_name,
          first_name: emp.first_name,
          last_name: emp.last_name,
          ssn: emp.ssn,
          total_pay: emp.total_pay,
          hourly_rate: emp.hourly_rate,
          jobs: jobs.map(j => ({
            excel_job_name: j.excel_job_name,
            total_hours: j.total_hours,
            is_driving: j.is_driving || false
          })),
          total_hours
        };
      });

    if (result.length === 0) {
      return Response.json({ success: false, error: 'No employees with hours found in uploaded files' }, { status: 400 });
    }

    // ─── PendingEmployee pre-match (read-only enrichment) ─────────────────────
    const allSsns = result.map(e => e.ssn).filter(Boolean);
    const pendingBySSN = {};
    const pendingByName = {};

    if (allSsns.length > 0 || result.length > 0) {
      const pending = await base44.asServiceRole.entities.PendingEmployee.list();
      for (const p of pending) {
        const ssnClean = (p.ssn_tax_id || '').replace(/\D/g, '');
        if (ssnClean) pendingBySSN[ssnClean] = p;
        const nameKey = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().trim();
        if (nameKey) pendingByName[nameKey] = p;
      }
    }

    const enriched = result.map(emp => {
      let match = null;
      let match_method = null;

      if (emp.ssn && pendingBySSN[emp.ssn]) {
        const p = pendingBySSN[emp.ssn];
        match = { pending_employee_id: p.id, full_name: `${p.first_name} ${p.last_name}`.trim(), email: p.email };
        match_method = 'ssn';
      }
      if (!match) {
        const nameKey = emp.connecteam_name.toLowerCase();
        if (pendingByName[nameKey]) {
          const p = pendingByName[nameKey];
          match = { pending_employee_id: p.id, full_name: `${p.first_name} ${p.last_name}`.trim(), email: p.email };
          match_method = 'name_exact';
        }
      }

      return { ...emp, match, match_method };
    });

    const matchedCount = enriched.filter(e => e.match).length;
    console.log(`✅ Parsed ${enriched.length} employees (${matchedCount} pre-matched), ${drivingMap.size} with driving entries`);

    // ─── Root-level response (no data wrapper) ────────────────────────────────
    return Response.json({
      success: true,
      employees: enriched,
      employee_count: enriched.length,
      matched_count: matchedCount
    });

  } catch (error) {
    console.error('❌ parsePayrollExcel error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to parse payroll files'
    }, { status: 500 });
  }
});