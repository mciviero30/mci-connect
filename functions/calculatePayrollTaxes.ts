import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Fetch the batch
    const batches = await base44.asServiceRole.entities.PayrollBatch.filter({ id: batch_id }, '', 1);
    const batch = batches?.[0];

    if (!batch) {
      return Response.json({ error: 'PayrollBatch not found' }, { status: 404 });
    }

    if (batch.status !== 'draft') {
      return Response.json(
        { error: 'Cannot recalculate taxes after batch is locked.' },
        { status: 400 }
      );
    }

    // Delete existing breakdowns for this batch
    const existingBreakdowns = await base44.asServiceRole.entities.PayrollTaxBreakdown.filter(
      { batch_id },
      '',
      1000
    );

    if (existingBreakdowns?.length > 0) {
      await Promise.all(
        existingBreakdowns.map(b => base44.asServiceRole.entities.PayrollTaxBreakdown.delete(b.id))
      );
      console.log(`Deleted ${existingBreakdowns.length} existing tax breakdowns for batch ${batch_id}`);
    }

    // Fetch all allocations for this batch
    const allocations = await base44.asServiceRole.entities.PayrollAllocation.filter(
      { batch_id },
      '',
      1000
    );

    if (!allocations || allocations.length === 0) {
      return Response.json(
        { error: 'No allocations found for this batch. Run Generate Payroll first.' },
        { status: 400 }
      );
    }

    // Batch fetch all employee profiles (no N+1)
    const uniqueProfileIds = [...new Set(allocations.map(a => a.employee_profile_id))];
    const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter(
      { id: { $in: uniqueProfileIds } },
      '',
      1000
    );
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    // Calculate taxes per allocation
    const now = new Date().toISOString();
    const breakdownsToCreate = [];

    for (const alloc of allocations) {
      const profile = profileMap[alloc.employee_profile_id];

      if (!profile?.tax_classification) {
        throw new Error(`Employee ${alloc.employee_profile_id} is missing tax_classification`);
      }

      const taxClass = profile.tax_classification.toLowerCase();

      if (taxClass !== 'w2' && taxClass !== '1099') {
        throw new Error(`Invalid tax_classification "${taxClass}" for employee ${alloc.employee_profile_id}`);
      }

      const grossPay = alloc.gross_pay || 0;

      // Use stored withholding from profile (default 0 if not set)
      const federalWithholding = profile?.federal_allowances ? 0 : 0; // placeholder — Step 2 will integrate W4 withholding tables
      const stateWithholding = 0; // placeholder — Step 2 will integrate state tables

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
        // W2 calculations
        // TODO Phase 4:
        // - Apply Social Security wage cap
        // - Apply FUTA wage cap
        // - Implement state-specific SUTA rates
        // - Integrate W4 federal withholding tables
        const socialSecurityEmployee = parseFloat((grossPay * 0.062).toFixed(2));
        const medicareEmployee = parseFloat((grossPay * 0.0145).toFixed(2));
        const socialSecurityEmployer = socialSecurityEmployee;
        const medicareEmployer = medicareEmployee;
        const futa = parseFloat((grossPay * 0.006).toFixed(2));
        const suta = parseFloat((grossPay * 0.02).toFixed(2));

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

    // Bulk create breakdowns
    const created = await Promise.all(
      breakdownsToCreate.map(b => base44.asServiceRole.entities.PayrollTaxBreakdown.create(b))
    );

    // Compute totals for response
    const totalNetPay = parseFloat(
      breakdownsToCreate.reduce((sum, b) => sum + b.net_pay, 0).toFixed(2)
    );
    const totalEmployerCost = parseFloat(
      breakdownsToCreate.reduce((sum, b) => sum + b.employer_total_cost, 0).toFixed(2)
    );

    // Write audit log
    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'calculate_taxes',
      performed_by_user_id: user.id,
      timestamp: now,
      metadata: {
        breakdowns_created: created.length,
        total_net_pay: totalNetPay,
        total_employer_cost: totalEmployerCost
      }
    });

    console.log(`Tax calculation complete for batch ${batch_id}: ${created.length} breakdowns created`);

    return Response.json({
      success: true,
      breakdowns_created: created.length,
      total_net_pay: totalNetPay,
      total_employer_cost: totalEmployerCost
    });

  } catch (error) {
    console.error('calculatePayrollTaxes error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});