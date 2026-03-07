import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Marks approved commissions as 'paid' when payroll is paid.
 * Called when WeeklyPayroll.status changes to 'paid'.
 * 
 * Input:
 * {
 *   payroll_id: string,
 *   week_start: string (YYYY-MM-DD),
 *   week_end: string (YYYY-MM-DD),
 *   employee_user_id: string
 * }
 * 
 * Output:
 * {
 *   success: boolean,
 *   updated_count: number,
 *   commission_ids: string[]
 * }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { payroll_id, week_start, week_end, employee_user_id } = await req.json();

    console.log('[markCommissionsPaid] Starting', { payroll_id, week_start, week_end, employee_user_id });

    if (!payroll_id || !week_start || !week_end || !employee_user_id) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(week_end);

    // Fetch approved commissions for this employee in the period
    const allCommissions = await base44.asServiceRole.entities.CommissionRecord.filter({
      user_id: employee_user_id,
      status: 'approved'
    });

    // Filter by calculation_date in period
    const weekCommissions = allCommissions.filter(c => {
      const calcDate = new Date(c.calculation_date);
      return calcDate >= weekStartDate && calcDate <= weekEndDate;
    });

    console.log('[markCommissionsPaid] Found commissions', { count: weekCommissions.length });

    if (weekCommissions.length === 0) {
      return Response.json({ 
        success: true, 
        updated_count: 0, 
        commission_ids: [],
        message: 'No approved commissions found for this period'
      });
    }

    // Update all matching commissions
    const updatedIds = [];
    for (const commission of weekCommissions) {
      await base44.asServiceRole.entities.CommissionRecord.update(commission.id, {
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
        paid_in_payroll_id: payroll_id,
        paid_via_method: 'payroll'
      });
      updatedIds.push(commission.id);
      console.log('[markCommissionsPaid] ✅ Updated', { commission_id: commission.id, amount: commission.commission_amount });
    }

    console.log('[markCommissionsPaid] Complete', { updated_count: updatedIds.length });

    return Response.json({
      success: true,
      updated_count: updatedIds.length,
      commission_ids: updatedIds
    });

  } catch (error) {
    console.error('[markCommissionsPaid] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});