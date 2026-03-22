import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Approve a commission with optional rate adjustment
 * SECURITY: CEO/Admin only
 * VALIDATION: Must be in 'calculated' status
 * RULE: Adjusted rate must be within agreement bounds
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // SECURITY: Only CEO/Admin can approve
    if (!user || (user.role !== 'admin' && user.role !== 'ceo')) {
      return Response.json({ error: 'Unauthorized: Admin/CEO only' }, { status: 403 });
    }

    const { commission_result_id, adjusted_rate, notes } = await req.json();

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

    // VALIDATION: Must be in calculated status
    if (result.status !== 'calculated') {
      return Response.json({ 
        error: `Cannot approve commission in status: ${result.status}`,
        current_status: result.status 
      }, { status: 400 });
    }

    // Calculate new commission amount if rate adjusted
    let finalRate = result.base_commission_rate;
    let finalAmount = result.commission_amount;

    if (adjusted_rate !== undefined && adjusted_rate !== null) {
      // VALIDATION: Rate must be non-negative and reasonable
      if (adjusted_rate < 0 || adjusted_rate > 100) {
        return Response.json({ 
          error: 'Invalid commission rate. Must be between 0 and 100' 
        }, { status: 400 });
      }

      finalRate = parseFloat(adjusted_rate);
      finalAmount = Math.max(0, (result.net_profit * (finalRate / 100)));
    }

    // Update commission result
    const updated = await base44.asServiceRole.entities.CommissionResult.update(
      commission_result_id,
      {
        adjusted_commission_rate: finalRate,
        commission_amount: finalAmount,
        status: 'approved',
        approved_by: user.email,
        approved_at: new Date().toISOString(),
        notes: notes || result.notes,
      }
    );

    // AUDIT LOG: Commission approved
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'commission_approved',
      entity_type: 'CommissionResult',
      entity_id: commission_result_id,
      performed_by: user.email,
      performed_by_name: user.full_name || user.email,
      action_description: `Commission approved for ${result.employee_name} on job "${result.job_name}": $${finalAmount.toFixed(2)}`,
      before_state: {
        status: 'calculated',
        commission_amount: result.commission_amount,
      },
      after_state: {
        status: 'approved',
        commission_amount: finalAmount,
        adjusted_rate: finalRate,
      },
      metadata: {
        rate_adjusted: adjusted_rate !== undefined,
        notes: notes,
      }
    });

    // Create alert for Manager (commission approved)
    await base44.asServiceRole.entities.SystemAlert.create({
      recipient_email: result.employee_email,
      alert_type: 'commission_approved',
      title: 'Commission Approved',
      message: `Your commission for job "${result.job_name}" has been approved: $${finalAmount.toFixed(2)}`,
      severity: 'info',
      related_entity: 'CommissionResult',
      related_id: commission_result_id,
      action_url: '/CommissionReports',
      metadata: {
        job_id: result.job_id,
        commission_amount: finalAmount,
      }
    });

    // Alert CEO/Admin about pending payment
    const adminUsers = await base44.asServiceRole.entities.User.list();
    const ceoAdminUsers = adminUsers.filter(u => u.role === 'admin' || u.role === 'ceo');

    for (const admin of ceoAdminUsers) {
      await base44.asServiceRole.entities.SystemAlert.create({
        recipient_email: admin.email,
        alert_type: 'commission_pending_approval',
        title: 'Commission Pending Payment',
        message: `Commission approved for ${result.employee_name} on "${result.job_name}": $${finalAmount.toFixed(2)} - Ready for payment`,
        severity: 'warning',
        related_entity: 'CommissionResult',
        related_id: commission_result_id,
        action_url: '/CommissionReview',
        metadata: {
          employee_email: result.employee_email,
          job_id: result.job_id,
          commission_amount: finalAmount,
        }
      });
    }

    return Response.json({
      success: true,
      commission_result: updated,
      approved_by: user.email,
      approved_at: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Commission approval error:', error);
    return Response.json({ 
      error: 'Failed to approve commission',
      details: error.message 
    }, { status: 500 });
  }
});