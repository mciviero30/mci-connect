import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL IMPORT PREVIEW ENGINE — previewPayrollImport
 *
 * READ-ONLY. Does NOT write to any entity.
 *
 * Input:
 *   employees  — parsed employee array from parsePayrollExcel
 *   period_start — YYYY-MM-DD
 *   period_end   — YYYY-MM-DD
 *
 * Output:
 *   { employees: [...], summary: { total_employees, total_jobs, total_pay_amount } }
 *
 * Each employee entry includes:
 *   employee_match_status: "ssn_match" | "email_match" | "name_match" | "not_found"
 *   employee_id (EmployeeDirectory id, if found)
 *   jobs: [{ excel_job_name, matched_job_id, match_status, total_pay, total_hours }]
 *
 * Job match_status: "exact_match" | "alias_match" | "not_found"
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAuthorized = ['admin', 'ceo'].includes(user.role) ||
    (user.position && ['CEO', 'Accountant'].includes(user.position));
  if (!isAuthorized) {
    return Response.json({ error: 'Only Admin, CEO, or Accountant can preview payroll imports' }, { status: 403 });
  }

  const body = await req.json();
  const { employees, period_start, period_end } = body;

  if (!employees?.length) {
    return Response.json({ error: 'employees array is required and must not be empty' }, { status: 400 });
  }
  if (!period_start || !period_end) {
    return Response.json({ error: 'period_start and period_end are required' }, { status: 400 });
  }

  // ============================================================
  // Load reference data (read-only, parallel)
  // ============================================================
  const [allJobs, allEmployees, allPending] = await Promise.all([
    base44.asServiceRole.entities.Job.list(),
    base44.asServiceRole.entities.EmployeeDirectory.list(),
    base44.asServiceRole.entities.PendingEmployee.list(),
  ]);

  // Optionally load JobAlias if the entity exists (graceful — won't crash if missing)
  let allAliases = [];
  try {
    allAliases = await base44.asServiceRole.entities.JobAlias.list();
  } catch (_) {
    // JobAlias entity not present — skip alias matching
  }

  // ============================================================
  // Build lookup indexes
  // ============================================================

  // Jobs: exact name match (lowercase)
  const jobByName = new Map(); // normalized name → job
  for (const job of allJobs) {
    if (job.name) jobByName.set(job.name.trim().toLowerCase(), job);
  }

  // Job aliases: alias name → job_id
  const aliasByName = new Map(); // normalized alias → job_id
  for (const alias of allAliases) {
    if (alias.alias && alias.job_id) {
      aliasByName.set(alias.alias.trim().toLowerCase(), alias.job_id);
    }
  }

  // EmployeeDirectory: by user_id, email (lowercase), full_name (lowercase)
  const empByUserId = new Map();
  const empByEmail = new Map();
  const empByName = new Map();
  for (const emp of allEmployees) {
    if (emp.user_id) empByUserId.set(emp.user_id, emp);
    if (emp.email) empByEmail.set(emp.email.toLowerCase().trim(), emp);
    const nameKey = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase().trim()
      || (emp.full_name || '').toLowerCase().trim()
      || (emp.employee_name || '').toLowerCase().trim();
    if (nameKey) empByName.set(nameKey, emp);
  }

  // PendingEmployee: by SSN (digits only), email (lowercase), full name (lowercase)
  const pendingBySsn = new Map();
  const pendingByEmail = new Map();
  const pendingByName = new Map();
  for (const p of allPending) {
    const ssn = (p.ssn_tax_id || '').replace(/\D/g, '');
    if (ssn) pendingBySsn.set(ssn, p);
    if (p.email) pendingByEmail.set(p.email.toLowerCase().trim(), p);
    const nameKey = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().trim();
    if (nameKey) pendingByName.set(nameKey, p);
  }

  // ============================================================
  // STEP 3 — Job matching helper
  // Returns { matched_job_id, match_status }
  // ============================================================
  const matchJob = (excelJobName) => {
    const normalized = excelJobName.trim().toLowerCase();

    // 1. Exact match against Job.name
    const exactJob = jobByName.get(normalized);
    if (exactJob) {
      return { matched_job_id: exactJob.id, match_status: 'exact_match' };
    }

    // 2. Alias match
    const aliasJobId = aliasByName.get(normalized);
    if (aliasJobId) {
      return { matched_job_id: aliasJobId, match_status: 'alias_match' };
    }

    // 3. Not found
    return { matched_job_id: null, match_status: 'not_found' };
  };

  // ============================================================
  // STEP 3 — Employee matching helper
  // Priority: SSN → email → full_name (against EmployeeDirectory first, then PendingEmployee)
  // Returns { employee_match_status, employee_id, source }
  // ============================================================
  const matchEmployee = (emp) => {
    const ssnClean = (emp.ssn || '').replace(/\D/g, '');
    const emailClean = (emp.email || '').toLowerCase().trim();
    const nameKey = (emp.connecteam_name || '').toLowerCase().trim();

    // --- EmployeeDirectory (active employees) ---
    if (ssnClean) {
      // SSN not directly on EmployeeDirectory, but PendingEmployee has it — try pending first for SSN
    }
    if (emailClean && empByEmail.has(emailClean)) {
      const found = empByEmail.get(emailClean);
      return { employee_match_status: 'email_match', employee_id: found.id, source: 'EmployeeDirectory' };
    }
    if (nameKey && empByName.has(nameKey)) {
      const found = empByName.get(nameKey);
      return { employee_match_status: 'name_match', employee_id: found.id, source: 'EmployeeDirectory' };
    }

    // --- PendingEmployee (invited but not yet active) ---
    if (ssnClean && pendingBySsn.has(ssnClean)) {
      const found = pendingBySsn.get(ssnClean);
      return { employee_match_status: 'ssn_match', employee_id: found.id, source: 'PendingEmployee' };
    }
    if (emailClean && pendingByEmail.has(emailClean)) {
      const found = pendingByEmail.get(emailClean);
      return { employee_match_status: 'email_match', employee_id: found.id, source: 'PendingEmployee' };
    }
    if (nameKey && pendingByName.has(nameKey)) {
      const found = pendingByName.get(nameKey);
      return { employee_match_status: 'name_match', employee_id: found.id, source: 'PendingEmployee' };
    }

    return { employee_match_status: 'not_found', employee_id: null, source: null };
  };

  // ============================================================
  // STEP 2+3+4 — Build preview payload
  // Filter, normalize, match, aggregate
  // ============================================================
  const round2 = (n) => Number(n.toFixed(2));

  const parseHours = (val) => {
    if (!val && val !== 0) return 0;
    const str = String(val).trim();
    if (!str) return 0;
    if (!isNaN(str)) return parseFloat(str); // already decimal hours
    const parts = str.split(':');
    if (parts.length >= 2) return (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) / 60;
    return 0;
  };

  const previewEmployees = [];
  let grandTotalPay = 0;
  let grandTotalJobs = 0;

  for (const rawEmp of employees) {
    // STEP 2 — Normalize employee fields
    const connecteam_name = (rawEmp.connecteam_name || `${rawEmp.first_name || ''} ${rawEmp.last_name || ''}`).trim();
    if (!connecteam_name) continue; // skip rows with no name

    const total_pay = parseFloat(rawEmp.total_pay) || 0;

    // STEP 2 — Filter: employee must have jobs and total_pay > 0
    const rawJobs = Array.isArray(rawEmp.jobs) ? rawEmp.jobs : [];
    const validJobs = rawJobs.filter(j => j.name && parseHours(j.hours) > 0);
    if (validJobs.length === 0) continue;
    if (total_pay <= 0) continue;

    // STEP 3 — Match employee
    const { employee_match_status, employee_id, source: emp_source } = matchEmployee(rawEmp);

    // STEP 3 — Match each job and build job preview entries
    const jobEntries = [];
    for (const rawJob of validJobs) {
      const excel_job_name = rawJob.name.trim();
      const total_hours = round2(parseHours(rawJob.hours));
      const { matched_job_id, match_status } = matchJob(excel_job_name);

      // Distribute pay proportionally by hours (best estimate for preview)
      const empTotalHours = round2(validJobs.reduce((s, j) => s + parseHours(j.hours), 0));
      const proportion = empTotalHours > 0 ? total_hours / empTotalHours : 0;
      const estimated_pay = round2(total_pay * proportion);

      jobEntries.push({
        excel_job_name,
        matched_job_id,
        match_status,
        total_hours,
        total_pay: estimated_pay
      });
    }

    grandTotalPay = round2(grandTotalPay + total_pay);
    grandTotalJobs += jobEntries.length;

    previewEmployees.push({
      connecteam_name,
      ssn_last4: rawEmp.ssn ? rawEmp.ssn.slice(-4) : null, // only last 4 for display safety
      employee_match_status,
      employee_id,
      employee_source: emp_source,
      total_pay,
      total_hours: round2(validJobs.reduce((s, j) => s + parseHours(j.hours), 0)),
      jobs: jobEntries
    });
  }

  // ============================================================
  // STEP 4 — Return structured preview payload
  // ============================================================
  return Response.json({
    success: true,
    preview: {
      period_start,
      period_end,
      employees: previewEmployees,
      summary: {
        total_employees: previewEmployees.length,
        total_jobs: grandTotalJobs,
        total_pay_amount: grandTotalPay,
        employees_matched: previewEmployees.filter(e => e.employee_match_status !== 'not_found').length,
        employees_not_found: previewEmployees.filter(e => e.employee_match_status === 'not_found').length,
        jobs_matched: previewEmployees.flatMap(e => e.jobs).filter(j => j.match_status !== 'not_found').length,
        jobs_not_found: previewEmployees.flatMap(e => e.jobs).filter(j => j.match_status === 'not_found').length
      }
    }
  });
});