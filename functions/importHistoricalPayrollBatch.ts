import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL PHASE 2 — Import Historical Payroll Batch
 *
 * Accepts a CSV with columns:
 *   employee_profile_id, regular_hours, overtime_hours, commission_total
 *   Optional: hourly_rate_snapshot, overtime_multiplier_snapshot
 *
 * Creates PayrollBatch + PayrollAllocation + PayrollTaxBreakdown + PayrollBatchLiability.
 * Batch is set to "paid" (historical, immutable) only after full data is recorded.
 *
 * SEC-03 FIX: CSV may include hourly_rate_snapshot and overtime_multiplier_snapshot
 * to use historical rates instead of current profile rates.
 * PERF-01 FIX: Batch-fetch all employee profiles upfront.
 * IMM-02 FIX: Create tax breakdowns and liability snapshot before marking paid.
 * EDGE-04 FIX: Return skipped_rows in response.
 */

const SS_WAGE_BASE = 176100;
const FUTA_WAGE_BASE = 7000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin' && user.role !== 'ceo') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
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

    // PERF-01 FIX: Batch-fetch all profiles upfront
    const allEmpIds = [...new Set(rows.map(r => r['employee_profile_id'] || r['employee_id']).filter(Boolean))];
    const allProfiles = await base44.asServiceRole.entities.EmployeeProfile.filter(
      { id: { $in: allEmpIds } }, '', 1000
    );
    const profileMap = Object.fromEntries((allProfiles || []).map(p => [p.id, p]));

    // Create batch as draft first
    const batch = await base44.asServiceRole.entities.PayrollBatch.create({
      period_start,
      period_end,
      status: 'draft',
    });

    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalCommissions = 0;
    let totalGross = 0;
    let allocationsCreated = 0;
    const skippedRows = [];
    const allocationRecords = [];

    for (const row of rows) {
      const empId = row['employee_profile_id'] || row['employee_id'];
      if (!empId) {
        skippedRows.push({ row, reason: 'Missing employee_profile_id' });
        continue;
      }

      const profile = profileMap[empId];
      if (!profile) {
        skippedRows.push({ row, reason: `Employee profile not found: ${empId}` });
        continue;
      }

      const regularHours = parseFloat(row['regular_hours'] || 0);
      const overtimeHours = parseFloat(row['overtime_hours'] || 0);
      const commissionTotal = parseFloat(row['commission_total'] || 0);

      // SEC-03 FIX: Use CSV snapshot rates if provided, else current profile rates
      const hourlyRate = parseFloat(row['hourly_rate_snapshot'] || profile.hourly_rate || 0);
      const overtimeMultiplier = parseFloat(row['overtime_multiplier_snapshot'] || profile.overtime_multiplier || 1.5);

      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
      const grossPay = regularPay + overtimePay + commissionTotal;

      const allocation = await base44.asServiceRole.entities.PayrollAllocation.create({
        batch_id: batch.id,
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

      totalRegularHours += regularHours;
      totalOvertimeHours += overtimeHours;
      totalCommissions += commissionTotal;
      totalGross += grossPay;
      allocationsCreated++;
      allocationRecords.push({ allocation, profile, grossPay });
    }

    // IMM-02 FIX: Create tax breakdowns for all allocations
    const now = new Date().toISOString();
    const breakdownsToCreate = [];

    for (const { allocation, profile, grossPay } of allocationRecords) {
      const taxClass = profile.tax_classification?.toLowerCase();

      if (!taxClass || (taxClass !== 'w2' && taxClass !== '1099')) {
        // Default to 1099 for historical imports with unknown classification
        breakdownsToCreate.push({
          batch_id: batch.id,
          allocation_id: allocation.id,
          employee_profile_id: profile.id,
          tax_classification: '1099',
          gross_pay: grossPay,
          federal_withholding: 0, state_withholding: 0,
          social_security_employee: 0, medicare_employee: 0,
          social_security_employer: 0, medicare_employer: 0,
          futa: 0, suta: 0,
          net_pay: grossPay,
          employer_total_cost: grossPay,
          calculated_at: now
        });
        continue;
      }

      if (taxClass === '1099') {
        breakdownsToCreate.push({
          batch_id: batch.id,
          allocation_id: allocation.id,
          employee_profile_id: profile.id,
          tax_classification: '1099',
          gross_pay: grossPay,
          federal_withholding: 0, state_withholding: 0,
          social_security_employee: 0, medicare_employee: 0,
          social_security_employer: 0, medicare_employer: 0,
          futa: 0, suta: 0,
          net_pay: grossPay,
          employer_total_cost: grossPay,
          calculated_at: now
        });
      } else {
        // W2 with wage caps (no YTD for historical — assume from zero for the period)
        const ssWage = Math.min(grossPay, SS_WAGE_BASE);
        const socialSecurityEmployee = parseFloat((ssWage * 0.062).toFixed(2));
        const socialSecurityEmployer = socialSecurityEmployee;
        const medicareEmployee = parseFloat((grossPay * 0.0145).toFixed(2));
        const medicareEmployer = medicareEmployee;
        const futaWage = Math.min(grossPay, FUTA_WAGE_BASE);
        const futa = parseFloat((futaWage * 0.006).toFixed(2));
        const suta = parseFloat((grossPay * 0.02).toFixed(2));
        const federalWithholding = parseFloat((grossPay * 0.22).toFixed(2));
        const stateWithholding = parseFloat((grossPay * 0.05).toFixed(2));
        const netPay = parseFloat((grossPay - federalWithholding - stateWithholding - socialSecurityEmployee - medicareEmployee).toFixed(2));
        const employerTotalCost = parseFloat((grossPay + socialSecurityEmployer + medicareEmployer + futa + suta).toFixed(2));

        breakdownsToCreate.push({
          batch_id: batch.id,
          allocation_id: allocation.id,
          employee_profile_id: profile.id,
          tax_classification: 'w2',
          gross_pay: grossPay,
          federal_withholding: federalWithholding,
          state_withholding: stateWithholding,
          social_security_employee: socialSecurityEmployee,
          medicare_employee: medicareEmployee,
          social_security_employer: socialSecurityEmployer,
          medicare_employer: medicareEmployer,
          futa, suta,
          net_pay: netPay,
          employer_total_cost: employerTotalCost,
          calculated_at: now
        });
      }
    }

    if (breakdownsToCreate.length > 0) {
      await Promise.all(breakdownsToCreate.map(b =>
        base44.asServiceRole.entities.PayrollTaxBreakdown.create(b)
      ));
    }

    // IMM-02 FIX: Create liability snapshot
    const totalNetPay = parseFloat(breakdownsToCreate.reduce((s, b) => s + b.net_pay, 0).toFixed(2));
    const totalEmployeeFica = parseFloat(breakdownsToCreate.reduce((s, b) => s + (b.social_security_employee || 0) + (b.medicare_employee || 0), 0).toFixed(2));
    const totalEmployerFica = parseFloat(breakdownsToCreate.reduce((s, b) => s + (b.social_security_employer || 0) + (b.medicare_employer || 0), 0).toFixed(2));
    const totalFederalWithholding = parseFloat(breakdownsToCreate.reduce((s, b) => s + (b.federal_withholding || 0), 0).toFixed(2));
    const totalStateWithholding = parseFloat(breakdownsToCreate.reduce((s, b) => s + (b.state_withholding || 0), 0).toFixed(2));
    const totalFuta = parseFloat(breakdownsToCreate.reduce((s, b) => s + (b.futa || 0), 0).toFixed(2));
    const totalSuta = parseFloat(breakdownsToCreate.reduce((s, b) => s + (b.suta || 0), 0).toFixed(2));
    const totalEmployerTax = parseFloat((totalEmployerFica + totalFuta + totalSuta).toFixed(2));
    const totalCashRequired = parseFloat((totalNetPay + totalEmployerTax).toFixed(2));

    if (breakdownsToCreate.length > 0) {
      await base44.asServiceRole.entities.PayrollBatchLiability.create({
        batch_id: batch.id,
        total_gross_pay: parseFloat(totalGross.toFixed(2)),
        total_net_pay: totalNetPay,
        total_employee_fica: totalEmployeeFica,
        total_employer_fica: totalEmployerFica,
        total_federal_withholding: totalFederalWithholding,
        total_state_withholding: totalStateWithholding,
        total_futa: totalFuta,
        total_suta: totalSuta,
        total_employer_tax: totalEmployerTax,
        total_cash_required: totalCashRequired,
        snapshot_created_at: now
      });
    }

    // Update batch totals then mark as paid
    await base44.asServiceRole.entities.PayrollBatch.update(batch.id, {
      total_regular_hours: totalRegularHours,
      total_overtime_hours: totalOvertimeHours,
      total_commissions: totalCommissions,
      total_gross: totalGross,
      status: 'paid',
      paid_at: now
    });

    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id: batch.id,
      action: 'import',
      performed_by_user_id: user.id,
      timestamp: now,
      metadata: {
        allocations_created: allocationsCreated,
        skipped_rows: skippedRows.length,
        period_start,
        period_end,
        total_cash_required: totalCashRequired
      }
    });

    return Response.json({
      success: true,
      batch_id: batch.id,
      allocations_created: allocationsCreated,
      skipped_rows: skippedRows,
      totals: { totalRegularHours, totalOvertimeHours, totalCommissions, totalGross }
    });

  } catch (error) {
    console.error('Import historical error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});