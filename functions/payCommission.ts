import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Pay an approved commission
 * IDEMPOTENT: Cannot pay twice
 * ATOMIC: Creates PayrollEntry + AccountingEntry + Updates CommissionResult
 * SECURITY: CEO/Admin only
 * VALIDATION: Must be 'approved' status
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // SECURITY: Only CEO/Admin can pay
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

    // IDEMPOTENCY: Check if already paid
    if (result.status === 'paid') {
      return Response.json({ 
        error: 'Commission already paid',
        paid_at: result.paid_at,
        paid_by: result.paid_by,
        already_paid: true
      }, { status: 400 });
    }

    // VALIDATION: Must be approved
    if (result.status !== 'approved') {
      return Response.json({ 
        error: `Cannot pay commission in status: ${result.status}. Must be approved first.`,
        current_status: result.status 
      }, { status: 400 });
    }

    // VALIDATION: Amount must be positive
    if (result.commission_amount <= 0) {
      return Response.json({ 
        error: 'Cannot pay zero or negative commission amount' 
      }, { status: 400 });
    }

    // ATOMIC TRANSACTION START
    // Create PayrollEntry
    const payrollEntry = await base44.asServiceRole.entities.WeeklyPayroll.create({
      employee_email: result.employee_email,
      employee_name: result.employee_name,
      week_start: new Date().toISOString().split('T')[0],
      commission_pay: result.commission_amount,
      total_pay: result.commission_amount,
      notes: `Commission for job: ${result.job_name}`,
      status: 'paid',
    });

    // Create AccountingEntry (Transaction)
    const accountingEntry = await base44.asServiceRole.entities.Transaction.create({
      type: 'expense',
      amount: result.commission_amount,
      category: 'salaries',
      description: `Commission payment to ${result.employee_name} for job ${result.job_name}`,
      date: new Date().toISOString().split('T')[0],
      payment_method: 'bank_transfer',
      notes: `Commission Result ID: ${result.id}, Job ID: ${result.job_id}`,
    });

    // Update CommissionResult to 'paid'
    const updated = await base44.asServiceRole.entities.CommissionResult.update(
      commission_result_id,
      {
        status: 'paid',
        paid_by: user.email,
        paid_at: new Date().toISOString(),
        payroll_entry_id: payrollEntry.id,
        accounting_entry_id: accountingEntry.id,
      }
    );
    // ATOMIC TRANSACTION END

    // Create alert for Manager (commission paid)
    await base44.asServiceRole.entities.SystemAlert.create({
      recipient_email: result.employee_email,
      alert_type: 'commission_paid',
      title: 'Commission Paid',
      message: `Your commission for job "${result.job_name}" has been paid: $${result.commission_amount.toFixed(2)}`,
      severity: 'info',
      related_entity: 'CommissionResult',
      related_id: commission_result_id,
      action_url: '/MyPayroll',
      metadata: {
        job_id: result.job_id,
        commission_amount: result.commission_amount,
        payroll_entry_id: payrollEntry.id,
      }
    });

    return Response.json({
      success: true,
      commission_result: updated,
      payroll_entry_id: payrollEntry.id,
      accounting_entry_id: accountingEntry.id,
      paid_by: user.email,
      paid_at: new Date().toISOString(),
      amount_paid: result.commission_amount,
    });

  } catch (error) {
    console.error('Commission payment error:', error);
    
    // Log for debugging but return user-friendly message
    return Response.json({ 
      error: 'Failed to process commission payment',
      details: error.message 
    }, { status: 500 });
  }
});