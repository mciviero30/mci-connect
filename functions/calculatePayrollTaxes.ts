import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECTION 1: Role enforcement — MUST be first
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

    // SECTION 2: Immutability — batch must be draft
    if (batch.status !== 'draft') {
      return Response.json(
        { error: 'Entity cannot be modified after PayrollBatch is locked.' },
        { status: 400 }
      );
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

    // SECTION 4: Block W2 employees until withholding engine is implemented
    for (const alloc of allocations) {
      const profile = profileMap[alloc.employee_profile_id];
      if (!profile?.tax_classification) {
        return Response.json(
          { error: `Employee ${alloc.employee_profile_id} is missing tax_classification. Cannot calculate taxes.` },
          { status: 400 }
        );
      }
      if (profile.tax_classification.toLowerCase() === 'w2') {
        return Response.json(
          { error: 'Payroll for W2 employees is currently disabled until withholding engine is implemented.' },
          { status: 400 }
        );
      }
      if (profile.tax_classification.toLowerCase() !== '1099') {
        return Response.json(
          { error: `Invalid tax_classification "${profile.tax_classification}" for employee ${alloc.employee_profile_id}` },
          { status: 400 }
        );
      }
    }

    // SECTION 2: Delete existing breakdowns only after immutability confirmed
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

    // Calculate taxes per allocation (1099 only at this stage)
    const now = new Date().toISOString();
    const breakdownsToCreate = [];

    for (const alloc of allocations) {
      const grossPay = alloc.gross_pay || 0;

      // 1099: no withholding, no employer taxes
      breakdownsToCreate.push({
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
      });
    }

    // Bulk create breakdowns
    const created = await Promise.all(
      breakdownsToCreate.map(b => base44.asServiceRole.entities.PayrollTaxBreakdown.create(b))
    );

    const totalNetPay = parseFloat(breakdownsToCreate.reduce((sum, b) => sum + b.net_pay, 0).toFixed(2));
    const totalEmployerCost = parseFloat(breakdownsToCreate.reduce((sum, b) => sum + b.employer_total_cost, 0).toFixed(2));

    // SECTION 6: Audit log always written
    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'calculate_taxes',
      performed_by_user_id: user.id,
      timestamp: now,
      metadata: { breakdowns_created: created.length, total_net_pay: totalNetPay, total_employer_cost: totalEmployerCost }
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