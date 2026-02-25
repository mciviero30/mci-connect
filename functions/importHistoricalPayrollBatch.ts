import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL PHASE 2 — Import Historical Payroll Batch
 *
 * Accepts a CSV with columns:
 *   employee_profile_id, regular_hours, overtime_hours, commission_total
 *
 * SECTION 3 FIX: Does NOT bypass state machine.
 * Creates batch as "draft", runs full state machine:
 *   draft → (generate allocations) → calculate taxes → lock → approve → paid
 *
 * Payload:
 * {
 *   period_start: string (date)
 *   period_end: string (date)
 *   csv_content: string
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECTION 1: Role enforcement — MUST be first
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'ceo')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { period_start, period_end, csv_content } = await req.json();

    if (!period_start || !period_end || !csv_content) {
      return Response.json({ error: 'period_start, period_end, and csv_content are required' }, { status: 400 });
    }

    // Parse CSV
    const lines = csv_content.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      return Response.json({ error: 'CSV must have header + at least one data row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i]?.trim(); });
      return row;
    });

    // STEP 1: Create batch as DRAFT (not paid directly)
    const batch = await base44.asServiceRole.entities.PayrollBatch.create({
      period_start,
      period_end,
      status: 'draft'
    });
    const batch_id = batch.id;

    // Batch-fetch all referenced employee profiles (no N+1)
    const empIds = [...new Set(rows.map(r => r['employee_profile_id'] || r['employee_id']).filter(Boolean))];
    const profileResults = await Promise.all(
      empIds.map(id => base44.asServiceRole.entities.EmployeeProfile.filter({ id }, '', 1).then(r => r?.[0]))
    );
    const profileMap = Object.fromEntries(profileResults.filter(Boolean).map(p => [p.id, p]));

    // STEP 2: Create PayrollAllocation records
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalCommissions = 0;
    let totalGross = 0;
    let allocationsCreated = 0;
    const skippedRows = [];
    const allocationIds = [];

    for (const row of rows) {
      const empId = row['employee_profile_id'] || row['employee_id'];
      if (!empId) { skippedRows.push({ row, reason: 'Missing employee_profile_id' }); continue; }

      const profile = profileMap[empId];
      if (!profile) { skippedRows.push({ row, reason: `Employee profile not found: ${empId}` }); continue; }

      // SECTION 4: Block W2 employees
      if (profile.tax_classification?.toLowerCase() === 'w2') {
        skippedRows.push({ row, reason: 'W2 employees are blocked until withholding engine is implemented' });
        continue;
      }
      if (!profile.tax_classification) {
        skippedRows.push({ row, reason: `Missing tax_classification for employee ${empId}` });
        continue;
      }

      const regularHours = parseFloat(row['regular_hours'] || 0);
      const overtimeHours = parseFloat(row['overtime_hours'] || 0);
      const commissionTotal = parseFloat(row['commission_total'] || 0);
      const hourlyRate = profile.hourly_rate || 0;
      const overtimeMultiplier = profile.overtime_multiplier || 1.5;
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
      const grossPay = regularPay + overtimePay + commissionTotal;

      const alloc = await base44.asServiceRole.entities.PayrollAllocation.create({
        batch_id,
        employee_profile_id: profile.id,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        hourly_rate_snapshot: hourlyRate,
        overtime_multiplier_snapshot: overtimeMultiplier,
        regular_pay: regularPay,
        overtime_pay: overtimePay,
        commission_total: commissionTotal,
        gross_pay: grossPay
      });

      allocationIds.push(alloc.id);
      totalRegularHours += regularHours;
      totalOvertimeHours += overtimeHours;
      totalCommissions += commissionTotal;
      totalGross += grossPay;
      allocationsCreated++;
    }

    if (allocationsCreated === 0) {
      // Clean up the draft batch since nothing was created
      await base44.asServiceRole.entities.PayrollBatch.delete(batch_id);
      return Response.json({
        error: 'No valid allocations could be created from CSV.',
        skipped_rows: skippedRows
      }, { status: 400 });
    }

    // Update batch totals
    await base44.asServiceRole.entities.PayrollBatch.update(batch_id, {
      total_regular_hours: totalRegularHours,
      total_overtime_hours: totalOvertimeHours,
      total_commissions: totalCommissions,
      total_gross: totalGross
    });

    // Audit: import step
    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'import',
      performed_by_user_id: user.id,
      timestamp: new Date().toISOString(),
      metadata: { allocations_created: allocationsCreated, period_start, period_end, skipped_rows: skippedRows.length }
    });

    // STEP 3: Calculate taxes (1099 only — W2 already blocked above)
    const now = new Date().toISOString();
    const allocations = await base44.asServiceRole.entities.PayrollAllocation.filter({ batch_id }, '', 1000);

    const breakdownsToCreate = allocations.map(alloc => {
      const grossPay = alloc.gross_pay || 0;
      return {
        batch_id,
        allocation_id: alloc.id,
        employee_profile_id: alloc.employee_profile_id,
        tax_classification: '1099',
        gross_pay: grossPay,
        federal_withholding: 0,
        state_withholding: 0,
        social_security_employee: 0,
        medicare_employee: 0,
        social_security_employer: 0,
        medicare_employer: 0,
        futa: 0,
        suta: 0,
        net_pay: grossPay,
        employer_total_cost: grossPay,
        calculated_at: now
      };
    });

    await Promise.all(breakdownsToCreate.map(b => base44.asServiceRole.entities.PayrollTaxBreakdown.create(b)));

    const totalNetPay = parseFloat(breakdownsToCreate.reduce((s, b) => s + b.net_pay, 0).toFixed(2));
    const totalEmployerCost = parseFloat(breakdownsToCreate.reduce((s, b) => s + b.employer_total_cost, 0).toFixed(2));

    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'calculate_taxes',
      performed_by_user_id: user.id,
      timestamp: now,
      metadata: { breakdowns_created: breakdownsToCreate.length, total_net_pay: totalNetPay, total_employer_cost: totalEmployerCost }
    });

    // STEP 4: Lock — create liability snapshot
    const taxBreakdowns = breakdownsToCreate;
    const totalGrossPay = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.gross_pay || 0), 0).toFixed(2));
    const totalNetPaySnap = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.net_pay || 0), 0).toFixed(2));
    const totalEmployeeFica = 0;
    const totalEmployerFica = 0;
    const totalFederalWithholding = 0;
    const totalStateWithholding = 0;
    const totalFuta = 0;
    const totalSuta = 0;
    const totalEmployerTax = 0;
    const totalCashRequired = parseFloat((totalNetPaySnap + totalEmployerTax).toFixed(2));

    const lockTime = new Date().toISOString();

    await base44.asServiceRole.entities.PayrollBatchLiability.create({
      batch_id,
      total_gross_pay: totalGrossPay,
      total_net_pay: totalNetPaySnap,
      total_employee_fica: totalEmployeeFica,
      total_employer_fica: totalEmployerFica,
      total_federal_withholding: totalFederalWithholding,
      total_state_withholding: totalStateWithholding,
      total_futa: totalFuta,
      total_suta: totalSuta,
      total_employer_tax: totalEmployerTax,
      total_cash_required: totalCashRequired,
      snapshot_created_at: lockTime
    });

    await base44.asServiceRole.entities.PayrollBatch.update(batch_id, { status: 'locked', locked_at: lockTime });

    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'lock',
      performed_by_user_id: user.id,
      timestamp: lockTime,
      metadata: { liability_snapshot_created: true, total_cash_required: totalCashRequired, period_start, period_end }
    });

    // STEP 5: Approve
    const approveTime = new Date().toISOString();
    await base44.asServiceRole.entities.PayrollBatch.update(batch_id, { status: 'approved', approved_at: approveTime });

    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'approve',
      performed_by_user_id: user.id,
      timestamp: approveTime,
      metadata: { previous_status: 'locked', period_start, period_end }
    });

    // STEP 6: Mark paid
    const paidTime = new Date().toISOString();
    await base44.asServiceRole.entities.PayrollBatch.update(batch_id, { status: 'paid', paid_at: paidTime });

    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'pay',
      performed_by_user_id: user.id,
      timestamp: paidTime,
      metadata: { source: 'historical_import', period_start, period_end }
    });

    return Response.json({
      success: true,
      batch_id,
      status: 'paid',
      allocations_created: allocationsCreated,
      skipped_rows: skippedRows,
      totals: { totalRegularHours, totalOvertimeHours, totalCommissions, totalGross }
    });

  } catch (error) {
    console.error('Import historical error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});