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

    // ─── Parse a single workbook into empMap ──────────────────────────────────
    const parseWorkbook = (workbook, label) => {
      const sheetName = workbook.SheetNames.includes('All Employees')
        ? 'All Employees'
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      console.log(`📄 [${label}] ${rows.length} rows from sheet "${sheetName}"`);

      if (rows.length === 0) return new Map();

      // Detect format:
      // "row-format" (Connecteam v2): every row has Full name + Job + Total hours
      // "summary-format" (legacy): employee header row + detail rows with Shift hours
      const hasShiftHoursCol = rows.some(r => r['Shift hours'] !== undefined);
      const hasFullNameCol = rows.some(r => r['Full name'] !== undefined && r['Full name'] !== '');
      const isRowFormat = !hasShiftHoursCol || hasFullNameCol;
      console.log(`📋 [${label}] Format: ${isRowFormat ? 'row-format (Connecteam v2)' : 'summary-format (legacy)'}`);

      const empMap = new Map(); // nameKey → employee record

      // Helper: extract name from row (supports both Full name and First/Last name columns)
      const extractName = (row) => {
        const fullName = String(row['Full name'] || '').trim();
        if (fullName) {
          const parts = fullName.split(' ');
          const firstName = parts.shift() || '';
          const lastName = parts.join(' ');
          return { fullName, firstName, lastName };
        }
        // Legacy fallback
        const firstName = String(row['First name'] || '').trim();
        const lastName = String(row['Last name'] || '').trim();
        if (!firstName && !lastName) return null;
        return { fullName: `${firstName} ${lastName}`.trim(), firstName, lastName };
      };

      // Helper: get job name from row (supports Job and Type columns)
      const extractJobName = (row) => String(row['Job'] || row['Type'] || '').trim();

      // Helper: get hours from row (supports Total hours, Shift hours, Total paid hours)
      const extractHours = (row) => parseHoursFromValue(row['Total hours'] || row['Shift hours'] || row['Total paid hours']);

      if (isRowFormat) {
        for (const row of rows) {
          const nameResult = extractName(row);
          if (!nameResult) continue;
          const { fullName, firstName, lastName } = nameResult;

          const nameKey = normName(firstName, lastName);
          const jobName = extractJobName(row);
          if (!jobName || skipTypes.has(jobName.toLowerCase())) continue;

          const payType = String(row['Pay type'] || '').toLowerCase();
          if (payType.includes('break') || payType.includes('lunch')) continue;

          const hours = extractHours(row);
          if (hours <= 0) continue;

          if (!empMap.has(nameKey)) {
            const ssnRaw = row['SSN'];
            empMap.set(nameKey, {
              connecteam_name: fullName,
              first_name: firstName,
              last_name: lastName,
              ssn: ssnRaw ? String(ssnRaw).trim().replace(/\D/g, '') : '',
              total_pay: parseFloat(row['Total pay']) || 0,
              hourly_rate: row['Hourly rate (USD)'] ? parseFloat(row['Hourly rate (USD)']) : null,
              title: String(row['Title'] || '').trim(),
              jobMap: new Map()
            });
          } else {
            // Accumulate total_pay across rows for same employee
            const emp = empMap.get(nameKey);
            const rowPay = parseFloat(row['Total pay']) || 0;
            if (rowPay > 0 && emp.total_pay === 0) emp.total_pay = rowPay;
          }

          const emp = empMap.get(nameKey);
          const key = jobName.toLowerCase();
          const existing = emp.jobMap.get(key) || { name: jobName, hours: 0 };
          existing.hours = round2(existing.hours + hours);
          emp.jobMap.set(key, existing);
        }
      } else {
        // Legacy summary-format: employee header row (has name) + detail rows (no name)
        let currentEmployee = null;
        for (const row of rows) {
          const nameResult = extractName(row);

          if (nameResult) {
            const { fullName, firstName, lastName } = nameResult;
            const ssnRaw = row['SSN'];
            const nameKey = normName(firstName, lastName);
            currentEmployee = {
              connecteam_name: fullName,
              first_name: firstName,
              last_name: lastName,
              ssn: ssnRaw ? String(ssnRaw).trim().replace(/\D/g, '') : '',
              total_pay: parseFloat(row['Total pay']) || 0,
              hourly_rate: row['Hourly rate (USD)'] ? parseFloat(row['Hourly rate (USD)']) : null,
              title: String(row['Title'] || '').trim(),
              jobMap: new Map()
            };
            empMap.set(nameKey, currentEmployee);

            const jobName = extractJobName(row);
            if (jobName && !skipTypes.has(jobName.toLowerCase())) {
              const h = extractHours(row);
              if (h > 0) {
                currentEmployee.jobMap.set(jobName.toLowerCase(), { name: jobName, hours: round2(h) });
              }
            }
          } else if (currentEmployee) {
            const jobName = extractJobName(row);
            if (!jobName || skipTypes.has(jobName.toLowerCase())) continue;
            const h = extractHours(row);
            if (h <= 0) continue;
            const key = jobName.toLowerCase();
            const existing = currentEmployee.jobMap.get(key) || { name: jobName, hours: 0 };
            existing.hours = round2(existing.hours + h);
            currentEmployee.jobMap.set(key, existing);
          }
        }
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
        // Employee only in driving file — include with driving hours only
        mergedMap.set(nameKey, { ...drivingEmp });
      }

      const merged = mergedMap.get(nameKey);
      if (!merged.jobMap) merged.jobMap = new Map();

      for (const [jobKey, job] of drivingEmp.jobMap) {
        const drivingKey = jobKey + '_driving';
        const drivingJobName = job.name + ' (Driving)';
        const existing = merged.jobMap.get(drivingKey) || { name: drivingJobName, hours: 0, is_driving: true };
        existing.hours = round2(existing.hours + job.hours);
        merged.jobMap.set(drivingKey, existing);
      }

      // If driving file has total_pay and hourly doesn't, carry it over
      if (!merged.total_pay && drivingEmp.total_pay) {
        merged.total_pay = drivingEmp.total_pay;
      }
    }

    // ─── Build final result array ─────────────────────────────────────────────
    const result = Array.from(mergedMap.values())
      .filter(emp => emp.jobMap && emp.jobMap.size > 0)
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
          jobs: jobs.map(j => ({
            name: j.name,
            hours: j.hours,
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