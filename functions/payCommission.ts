import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Pay an approved commission — creates payroll and accounting entries.
 * SECURITY: CEO/Admin only
 * IDEMPOTENCY: Already-paid commissions are rejected
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'ceo')) {
      return Response.json({ error: 'Unauthorized: Admin/CEO only' }, { status: 403 });
    }

    const { commission_result_id } = await req.json();

    if (!commission_result_id) {
      return Response.json({ error: 'commission_result_id is required' }, { status: 400 });
    }

    // Fetch commission result
    const results = await base44.asServiceRole.entities.CommissionResult.filter({
      id: commission_result_id
    });

    if (results.length === 0) {
      return Response.json({ error: 'Commission result not found' }, { status: 404 });
    }

    const result = results[0];

    // IDEMPOTENCY: Reject if already paid
    if (result.status === 'paid') {
      return Response.json({ 
        error: 'Commission has already been paid',
        already_paid: true,
        paid_at: result.paid_at
      }, { status: 400 });
    }

    // VALIDATION: Must be in 'approved' status
    if (result.status !== 'approved') {
      return Response.json({
        error: `Cannot pay commission in status: ${result.status}. Must be 'approved' first.`,
        current_status: result.status
      }, { status: 400 });
    }

    const amount = result.commission_amount || 0;
    const now = new Date().toISOString();

    // 1. Mark commission as paid
    await base44.asServiceRole.entities.CommissionResult.update(commission_result_id, {
      status: 'paid',
      paid_by: user.email,
      paid_at: now,
    });

    // 2. Create accounting transaction (expense)
    await base44.asServiceRole.entities.Transaction.create({
      type: 'expense',
      category: 'commission',
      amount: amount,
      date: now.split('T')[0],
      description: `Commission payment: ${result.employee_name} - ${result.job_name}`,
      reference_id: commission_result_id,
      reference_type: 'CommissionResult',
      created_by_email: user.email,
    });

    // 3. Audit log
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'commission_paid',
      entity_type: 'CommissionResult',
      entity_id: commission_result_id,
      performed_by: user.email,
      performed_by_name: user.full_name || user.email,
      action_description: `Commission paid to ${result.employee_name} for job "${result.job_name}": $${amount.toFixed(2)}`,
      before_state: { status: 'approved' },
      after_state: { status: 'paid', paid_at: now },
    });

    // 4. Notify employee
    await base44.asServiceRole.entities.SystemAlert.create({
      recipient_email: result.employee_email,
      alert_type: 'commission_paid',
      title: 'Commission Payment Processed',
      message: `Your commission of $${amount.toFixed(2)} for job "${result.job_name}" has been paid.`,
      severity: 'info',
      related_entity: 'CommissionResult',
      related_id: commission_result_id,
      action_url: '/CommissionReports',
    });

    console.log(`✅ Commission paid: ${commission_result_id} - $${amount} to ${result.employee_email}`);

    return Response.json({
      success: true,
      commission_result_id,
      amount_paid: amount,
      paid_by: user.email,
      paid_at: now,
    });

  } catch (error) {
    console.error('payCommission error:', error);
    return Response.json({
      error: 'Failed to pay commission',
      details: error.message
    }, { status: 500 });
  }
});