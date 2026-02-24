import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SEC-01 FIX: Authenticate and check role at entry
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'ceo')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { batch_id } = await req.json();

    if (!batch_id) {
      return Response.json({ error: 'batch_id required' }, { status: 400 });
    }

    const batches = await base44.asServiceRole.entities.PayrollBatch.filter({ id: batch_id }, '', 1);
    if (!batches || batches.length === 0) {
      return Response.json({ error: 'Batch not found' }, { status: 404 });
    }

    const batch = batches[0];

    if (batch.status !== 'draft') {
      return Response.json({
        error: `Cannot lock batch in ${batch.status} status. Only draft batches can be locked.`
      }, { status: 400 });
    }

    const taxBreakdowns = await base44.asServiceRole.entities.PayrollTaxBreakdown.filter(
      { batch_id }, '', 1000
    );

    if (!taxBreakdowns || taxBreakdowns.length === 0) {
      return Response.json({ error: 'Cannot lock batch. Taxes must be calculated first.' }, { status: 400 });
    }

    // Prevent double snapshot
    const existingSnapshot = await base44.asServiceRole.entities.PayrollBatchLiability.filter(
      { batch_id }, '', 1
    );
    if (existingSnapshot && existingSnapshot.length > 0) {
      return Response.json({ error: 'Liability snapshot already exists for this batch.' }, { status: 400 });
    }

    // CON-01 FIX: Also fetch allocations to cross-verify gross
    const allocations = await base44.asServiceRole.entities.PayrollAllocation.filter(
      { batch_id }, '', 1000
    );
    const allocGrossTotal = parseFloat(allocations.reduce((s, a) => s + (a.gross_pay || 0), 0).toFixed(2));
    const breakdownGrossTotal = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.gross_pay || 0), 0).toFixed(2));

    if (Math.abs(allocGrossTotal - breakdownGrossTotal) > 0.05) {
      console.warn(`CONSISTENCY WARNING: Allocation gross ${allocGrossTotal} vs breakdown gross ${breakdownGrossTotal} — difference exceeds $0.05`);
    }

    const totalGrossPay = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.gross_pay || 0), 0).toFixed(2));
    const totalNetPay = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.net_pay || 0), 0).toFixed(2));
    const totalEmployeeFica = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.social_security_employee || 0) + (t.medicare_employee || 0), 0).toFixed(2));
    const totalEmployerFica = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.social_security_employer || 0) + (t.medicare_employer || 0), 0).toFixed(2));
    const totalFederalWithholding = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.federal_withholding || 0), 0).toFixed(2));
    const totalStateWithholding = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.state_withholding || 0), 0).toFixed(2));
    const totalFuta = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.futa || 0), 0).toFixed(2));
    const totalSuta = parseFloat(taxBreakdowns.reduce((s, t) => s + (t.suta || 0), 0).toFixed(2));
    const totalEmployerTax = parseFloat((totalEmployerFica + totalFuta + totalSuta).toFixed(2));
    const totalCashRequired = parseFloat((totalNetPay + totalEmployerTax).toFixed(2));

    const now = new Date().toISOString();

    await base44.asServiceRole.entities.PayrollBatchLiability.create({
      batch_id,
      total_gross_pay: totalGrossPay,
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

    const locked = await base44.asServiceRole.entities.PayrollBatch.update(batch_id, {
      status: 'locked',
      locked_at: now
    });

    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'lock',
      performed_by_user_id: user.id,
      timestamp: now,
      metadata: {
        liability_snapshot_created: true,
        total_cash_required: totalCashRequired,
        allocation_gross_verified: allocGrossTotal,
        breakdown_gross_verified: breakdownGrossTotal
      }
    });

    return Response.json({
      success: true,
      message: 'Batch locked successfully',
      batch_id,
      status: 'locked',
      locked_at: locked.locked_at,
      total_cash_required: totalCashRequired
    });

  } catch (error) {
    console.error('Lock batch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});