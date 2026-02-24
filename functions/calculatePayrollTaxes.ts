import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Social Security wage base 2026
const SS_WAGE_BASE = 176100;
// FUTA wage base
const FUTA_WAGE_BASE = 7000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'ceo')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { batch_id } = await req.json();

    if (!batch_id) {
      return Response.json({ error: 'batch_id is required' }, { status: 400 });
    }

    const batches = await base44.asServiceRole.entities.PayrollBatch.filter({ id: batch_id }, '', 1);
    const batch = batches?.[0];

    if (!batch) {
      return Response.json({ error: 'PayrollBatch not found' }, { status: 404 });
    }

    if (batch.status !== 'draft') {
      return Response.json({ error: 'Cannot recalculate taxes after batch is locked.' }, { status: 400 });
    }

    // Delete existing breakdowns
    const existingBreakdowns = await base44.asServiceRole.entities.PayrollTaxBreakdown.filter(
      { batch_id }, '', 1000
    );
    if (existingBreakdowns?.length > 0) {
      await Promise.all(existingBreakdowns.map(b => base44.asServiceRole.entities.PayrollTaxBreakdown.delete(b.id)));
    }

    const allocations = await base44.asServiceRole.entities.PayrollAllocation.filter(
      { batch_id }, '', 1000
    );

    if (!allocations || allocations.length === 0) {
      return Response.json(
        { error: 'No allocations found for this batch. Run Generate Payroll first.' },
        { status: 400 }
      );
    }

    // Batch fetch profiles (no N+1)
    const uniqueProfileIds = [...new Set(allocations.map(a => a.employee_profile_id))];
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter(
      { id: { $in: uniqueProfileIds } }, '', 1000
    );
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    // FIN-02/03: Fetch YTD gross per employee from paid batches to apply wage caps
    // Fetch all paid batches to accumulate YTD wages
    const paidBatches = await base44.asServiceRole.entities.PayrollBatch.filter(
      { status: 'paid' }, '', 1000
    );
    const paidBatchIds = paidBatches.map(b => b.id);

    // Build YTD gross map per employee_profile_id
    const ytdGrossMap = {};
    if (paidBatchIds.length > 0) {
      const ytdAllocations = await base44.asServiceRole.entities.PayrollAllocation.filter(
        { batch_id: { $in: paidBatchIds } }, '', 5000
      );
      for (const a of (ytdAllocations || [])) {
        ytdGrossMap[a.employee_profile_id] = (ytdGrossMap[a.employee_profile_id] || 0) + (a.gross_pay || 0);
      }
    }

    const now = new Date().toISOString();
    const breakdownsToCreate = [];
    // EDGE-01 FIX: Collect errors per employee instead of aborting
    const errors = [];

    for (const alloc of allocations) {
      const profile = profileMap[alloc.employee_profile_id];

      if (!profile?.tax_classification) {
        errors.push({ employee_profile_id: alloc.employee_profile_id, reason: 'Missing tax_classification' });
        continue;
      }

      const taxClass = profile.tax_classification.toLowerCase();

      if (taxClass !== 'w2' && taxClass !== '1099') {
        errors.push({ employee_profile_id: alloc.employee_profile_id, reason: `Invalid tax_classification: ${taxClass}` });
        continue;
      }

      const grossPay = alloc.gross_pay || 0;

      let breakdown;

      if (taxClass === '1099') {
        breakdown = {
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
      } else {
        // W2 calculations with wage caps (FIN-02, FIN-03)
        const ytdGross = ytdGrossMap[alloc.employee_profile_id] || 0;

        // Social Security cap
        const ssWageEligibleYTD = Math.min(ytdGross, SS_WAGE_BASE);
        const ssWageEligibleAfter = Math.max(0, Math.min(ytdGross + grossPay, SS_WAGE_BASE) - ssWageEligibleYTD);
        const socialSecurityEmployee = parseFloat((ssWageEligibleAfter * 0.062).toFixed(2));
        const socialSecurityEmployer = socialSecurityEmployee;

        // Medicare (no cap)
        const medicareEmployee = parseFloat((grossPay * 0.0145).toFixed(2));
        const medicareEmployer = medicareEmployee;

        // FUTA cap
        const futaWageEligibleYTD = Math.min(ytdGross, FUTA_WAGE_BASE);
        const futaWageEligibleAfter = Math.max(0, Math.min(ytdGross + grossPay, FUTA_WAGE_BASE) - futaWageEligibleYTD);
        const futa = parseFloat((futaWageEligibleAfter * 0.006).toFixed(2));

        // FIN-04: SUTA — use flat 2% (configurable in future via CompanySettings)
        const suta = parseFloat((grossPay * 0.02).toFixed(2));

        // FIN-01 FIX: Use 22% flat federal withholding estimate for W2
        // NOTE: This is an estimate. Full W4 table integration is Phase 4.
        const federalWithholding = parseFloat((grossPay * 0.22).toFixed(2));
        const stateWithholding = parseFloat((grossPay * 0.05).toFixed(2));

        const netPay = parseFloat(
          (grossPay - federalWithholding - stateWithholding - socialSecurityEmployee - medicareEmployee).toFixed(2)
        );

        const employerTotalCost = parseFloat(
          (grossPay + socialSecurityEmployer + medicareEmployer + futa + suta).toFixed(2)
        );

        breakdown = {
          batch_id,
          allocation_id: alloc.id,
          employee_profile_id: alloc.employee_profile_id,
          tax_classification: 'w2',
          gross_pay: grossPay,
          federal_withholding: federalWithholding,
          state_withholding: stateWithholding,
          social_security_employee: socialSecurityEmployee,
          medicare_employee: medicareEmployee,
          social_security_employer: socialSecurityEmployer,
          medicare_employer: medicareEmployer,
          futa,
          suta,
          net_pay: netPay,
          employer_total_cost: employerTotalCost,
          calculated_at: now
        };
      }

      breakdownsToCreate.push(breakdown);
    }

    // Fail if all employees had errors
    if (breakdownsToCreate.length === 0 && errors.length > 0) {
      return Response.json({
        error: 'All employees failed tax calculation. Check tax_classification fields.',
        errors
      }, { status: 400 });
    }

    const created = await Promise.all(
      breakdownsToCreate.map(b => base44.asServiceRole.entities.PayrollTaxBreakdown.create(b))
    );

    const totalNetPay = parseFloat(breakdownsToCreate.reduce((sum, b) => sum + b.net_pay, 0).toFixed(2));
    const totalEmployerCost = parseFloat(breakdownsToCreate.reduce((sum, b) => sum + b.employer_total_cost, 0).toFixed(2));

    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'calculate_taxes',
      performed_by_user_id: user.id,
      timestamp: now,
      metadata: {
        breakdowns_created: created.length,
        skipped_employees: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        total_net_pay: totalNetPay,
        total_employer_cost: totalEmployerCost
      }
    });

    console.log(`Tax calculation complete for batch ${batch_id}: ${created.length} breakdowns, ${errors.length} skipped`);

    return Response.json({
      success: true,
      breakdowns_created: created.length,
      skipped_employees: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      total_net_pay: totalNetPay,
      total_employer_cost: totalEmployerCost
    });

  } catch (error) {
    console.error('calculatePayrollTaxes error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});