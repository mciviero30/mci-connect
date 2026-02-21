import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CONFIRM PAYROLL IMPORT FROM PREVIEW — Full-file atomic orchestration
 *
 * Takes the structured preview payload from previewPayrollImport,
 * confirms each employee as an independent PayrollBatch via confirmPayrollBatch,
 * and rolls back ALL confirmed batches via reversePayrollBatch if any single one fails.
 *
 * INVARIANTS:
 * - Does NOT modify Invoice.
 * - Does NOT call recalculateInvoiceFinancials.
 * - Does NOT write Job.total_cost.
 * - All mutations are delegated to confirmPayrollBatch / reversePayrollBatch.
 * - No partial state: all employees confirmed, or none.
 *
 * Input:
 *   previewPayload  — output of previewPayrollImport (employees array + summary)
 *   period_start    — YYYY-MM-DD
 *   period_end      — YYYY-MM-DD
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
    return Response.json({ error: 'Only Admin, CEO, or Accountant can confirm payroll imports' }, { status: 403 });
  }

  const body = await req.json();
  const { preview_id } = body;

  if (!preview_id) {
    return Response.json({ error: 'preview_id is required' }, { status: 400 });
  }

  // ============================================================
  // Fetch and validate the stored preview record
  // ============================================================
  const previews = await base44.asServiceRole.entities.PayrollImportPreview.filter({ preview_id });
  if (!previews.length) {
    return Response.json({ error: 'Preview not found. Generate a new preview before confirming.' }, { status: 404 });
  }

  const previewRecord = previews[0];
  const now = new Date();

  // Auto-expire if TTL exceeded
  if (new Date(previewRecord.expires_at) <= now) {
    await base44.asServiceRole.entities.PayrollImportPreview.update(previewRecord.id, { status: 'expired' }).catch(() => {});
    return Response.json({ error: 'Preview has expired. Please generate a new preview and try again.' }, { status: 410 });
  }

  if (previewRecord.status === 'confirmed') {
    return Response.json({ error: 'Preview has already been confirmed.' }, { status: 409 });
  }

  if (previewRecord.status === 'expired') {
    return Response.json({ error: 'Preview has expired. Please generate a new preview and try again.' }, { status: 410 });
  }

  // Ownership check: only the user who created it may confirm
  if (previewRecord.created_by !== user.id) {
    return Response.json({ error: 'You are not authorized to confirm this preview.' }, { status: 403 });
  }

  const previewPayload = previewRecord.payload;
  const period_start = previewRecord.period_start;
  const period_end = previewRecord.period_end;

  // ============================================================
  // STEP 2 — GLOBAL VALIDATION (no mutations yet)
  // ============================================================
  if (!previewPayload?.employees?.length) {
    return Response.json({ error: 'Stored preview payload is empty or malformed.' }, { status: 400 });
  }

  const employees = previewPayload.employees;

  // Validate: all employees resolved
  const unresolvedEmployees = employees.filter(e => e.employee_match_status === 'not_found' || !e.employee_id);
  if (unresolvedEmployees.length > 0) {
    return Response.json({
      error: 'All employees must be resolved before confirmation.',
      unresolved: unresolvedEmployees.map(e => e.connecteam_name)
    }, { status: 400 });
  }

  // Validate: all jobs matched (no not_found)
  const unresolvedJobs = [];
  for (const emp of employees) {
    for (const job of (emp.jobs || [])) {
      if (job.match_status === 'not_found' || !job.matched_job_id) {
        unresolvedJobs.push({ employee: emp.connecteam_name, job: job.excel_job_name });
      }
    }
  }
  if (unresolvedJobs.length > 0) {
    return Response.json({
      error: 'All jobs must be matched before confirmation.',
      unresolved_jobs: unresolvedJobs
    }, { status: 400 });
  }

  // Validate: no duplicate PayrollBatch for any employee+period
  for (const emp of employees) {
    const existing = await base44.asServiceRole.entities.PayrollBatch.filter({
      employee_id: emp.employee_id,
      period_start,
      period_end,
      status: 'confirmed'
    });
    if (existing.length > 0) {
      return Response.json({
        error: `Duplicate PayrollBatch: ${emp.connecteam_name} already has a confirmed batch for ${period_start} → ${period_end} (ID: ${existing[0].id})`,
        existing_batch_id: existing[0].id
      }, { status: 409 });
    }
  }

  // Validate: no Job has financial_year_locked = true
  const allJobIds = [...new Set(
    employees.flatMap(e => (e.jobs || []).map(j => j.matched_job_id).filter(Boolean))
  )];
  for (const jobId of allJobIds) {
    const job = await base44.asServiceRole.entities.Job.get(jobId);
    if (job?.financial_year_locked === true) {
      return Response.json({
        error: `Job "${job.name}" (${job.id}) has financial_year_locked = true. Cannot confirm import.`
      }, { status: 409 });
    }
  }

  console.log(`[confirmPayrollImportFromPreview] Global validation passed for ${employees.length} employees, ${allJobIds.length} unique jobs.`);

  // ============================================================
  // STEP 3 — CONFIRMATION LOOP
  // Delegates each employee to confirmPayrollBatch via invoke.
  // ============================================================
  const confirmedBatchIds = [];
  let failedEmployee = null;
  let failureError = null;

  for (const emp of employees) {
    const jobs = emp.jobs || [];
    if (jobs.length === 0) continue;

    // Build allocations array for confirmPayrollBatch
    // Distribute total_pay proportionally by hours (same logic as preview)
    const empTotalHours = jobs.reduce((s, j) => s + (j.total_hours || 0), 0);
    let runningTotal = 0;
    const allocations = jobs.map((job, idx) => {
      const proportion = empTotalHours > 0 ? (job.total_hours || 0) / empTotalHours : 1 / jobs.length;
      const isLast = idx === jobs.length - 1;
      // Last allocation absorbs rounding delta
      const allocated_amount = isLast
        ? Number((emp.total_pay - runningTotal).toFixed(2))
        : Number((emp.total_pay * proportion).toFixed(2));
      runningTotal = Number((runningTotal + allocated_amount).toFixed(2));
      const allocation_percentage = Number((proportion * 100).toFixed(4));

      return {
        job_id: job.matched_job_id,
        job_name: job.excel_job_name,
        allocated_amount,
        allocation_percentage,
        hours_worked: job.total_hours || 0,
        is_rounding_adjustment: isLast,
        rounding_delta: isLast ? Number((emp.total_pay - runningTotal).toFixed(2)) : 0
      };
    });

    console.log(`[confirmPayrollImportFromPreview] Confirming ${emp.connecteam_name} — $${emp.total_pay} across ${allocations.length} jobs`);

    try {
      const result = await base44.functions.invoke('confirmPayrollBatch', {
        employee_id: emp.employee_id,
        employee_name: emp.connecteam_name,
        period_start,
        period_end,
        total_paid: emp.total_pay,
        allocations,
        notes: `Imported via full-file payroll import (${period_start} → ${period_end})`
      });

      const batchId = result?.batch_id;
      if (!batchId || result?.success === false) {
        throw new Error(result?.error || 'confirmPayrollBatch returned no batch_id');
      }

      confirmedBatchIds.push(batchId);
      console.log(`[confirmPayrollImportFromPreview] ✅ Confirmed batch ${batchId} for ${emp.connecteam_name}`);

    } catch (err) {
      failedEmployee = emp.connecteam_name;
      failureError = err.message;
      console.error(`[confirmPayrollImportFromPreview] ❌ Failed for ${emp.connecteam_name}:`, err.message);
      break;
    }
  }

  // ============================================================
  // STEP 4 — ROLLBACK ON FAILURE
  // Reverse all confirmed batches in order.
  // ============================================================
  if (failedEmployee) {
    console.error(`[confirmPayrollImportFromPreview] ROLLBACK: reversing ${confirmedBatchIds.length} confirmed batches`);

    const rollbackErrors = [];
    for (const batchId of confirmedBatchIds) {
      try {
        await base44.functions.invoke('reversePayrollBatch', {
          batch_id: batchId,
          reason: `Automatic rollback: import failed at employee "${failedEmployee}". Error: ${failureError}`
        });
        console.log(`[confirmPayrollImportFromPreview] ↩️ Reversed batch ${batchId}`);
      } catch (rbErr) {
        rollbackErrors.push({ batch_id: batchId, error: rbErr.message });
        console.error(`[confirmPayrollImportFromPreview] CRITICAL: rollback failed for batch ${batchId}:`, rbErr.message);
      }
    }

    // Audit log the failed import attempt
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'payroll_batch_reversed',
      entity_type: 'PayrollBatch',
      entity_id: 'import_failed',
      performed_by: user.email,
      performed_by_name: user.full_name || user.email,
      action_description: `Full-file payroll import FAILED and rolled back. Failed employee: "${failedEmployee}". ${confirmedBatchIds.length} batches reversed.`,
      before_state: null,
      after_state: { status: 'rolled_back' },
      metadata: {
        period_start,
        period_end,
        failed_employee: failedEmployee,
        error: failureError,
        batches_rolled_back: confirmedBatchIds,
        rollback_errors: rollbackErrors
      }
    }).catch(e => console.warn('[confirmPayrollImportFromPreview] Audit log failed:', e.message));

    return Response.json({
      status: 'failed',
      failed_employee: failedEmployee,
      error_message: failureError,
      batches_rolled_back: confirmedBatchIds.length,
      rollback_errors: rollbackErrors.length > 0 ? rollbackErrors : undefined
    }, { status: 500 });
  }

  // ============================================================
  // STEP 5 — SUCCESS: mark preview as confirmed
  // ============================================================
  await base44.asServiceRole.entities.PayrollImportPreview.update(previewRecord.id, {
    status: 'confirmed'
  }).catch(e => console.warn('[confirmPayrollImportFromPreview] Preview status update failed (non-critical):', e.message));

  console.log(`[confirmPayrollImportFromPreview] ✅ All ${confirmedBatchIds.length} employees confirmed successfully`);

  // Audit log the successful import
  await base44.asServiceRole.entities.AuditLog.create({
    event_type: 'payroll_batch_confirmed',
    entity_type: 'PayrollBatch',
    entity_id: 'import_complete',
    performed_by: user.email,
    performed_by_name: user.full_name || user.email,
    action_description: `Full-file payroll import CONFIRMED for ${period_start} → ${period_end}. ${confirmedBatchIds.length} batches created for ${employees.length} employees.`,
    before_state: null,
    after_state: { status: 'confirmed', batch_count: confirmedBatchIds.length },
    metadata: {
      period_start,
      period_end,
      employees_confirmed: employees.length,
      batch_ids: confirmedBatchIds,
      total_pay: previewPayload.summary?.total_pay_amount
    }
  }).catch(e => console.warn('[confirmPayrollImportFromPreview] Audit log failed:', e.message));

  return Response.json({
    status: 'success',
    employees_confirmed: confirmedBatchIds.length,
    total_batches_created: confirmedBatchIds.length,
    batch_ids: confirmedBatchIds,
    period_start,
    period_end
  });
});