import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CORE FINANCIAL ENGINE v2 — recalculateJobFinancials_v2
 *
 * SSOT: Full aggregation from source records every time.
 * Writes ONLY to Job.
 * No Invoice writes. No PayrollAllocation/Expense/DrivingLog writes.
 * Idempotent — skips write if values unchanged.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // STEP 1 — AUTH
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Allow admin, ceo, and internal service-role invocations (from other backend functions)
    const isAdminRole = user.role === 'admin' || user.role === 'ceo';
    const isServiceInvocation = req.headers.get('x-internal-invocation') === 'true';
    if (!isAdminRole && !isServiceInvocation) {
      return Response.json({ error: 'Forbidden: Admin or CEO only' }, { status: 403 });
    }

    const { job_id } = await req.json();
    if (!job_id) {
      return Response.json({ error: 'job_id is required' }, { status: 400 });
    }

    // STEP 2 — FETCH JOB
    const job = await base44.asServiceRole.entities.Job.get(job_id);
    if (!job) {
      return Response.json({ error: `Job not found: ${job_id}` }, { status: 404 });
    }
    if (job.financial_year_locked === true) {
      return Response.json({
        error: `Job "${job.name}" (${job_id}) is financially locked for the fiscal year.`
      }, { status: 409 });
    }

    // STEP 3 — AGGREGATE COSTS
    const [allocations, expenses, drivingLogs] = await Promise.all([
      base44.asServiceRole.entities.PayrollAllocation.filter({ job_id, status: 'confirmed' }).catch(() => []),
      base44.asServiceRole.entities.Expense.filter({ job_id, status: 'approved' }).catch(() => []),
      base44.asServiceRole.entities.DrivingLog.filter({ job_id, status: 'approved' }).catch(() => []),
    ]);

    const payroll_cost = allocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
    const expense_cost = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const driving_cost = drivingLogs.reduce((sum, d) => sum + ((d.miles || 0) * (d.rate_per_mile ?? 0.7)), 0);
    const real_cost = Number((payroll_cost + expense_cost + driving_cost).toFixed(2));

    // STEP 4 — AGGREGATE REVENUE
    const invoices = await base44.asServiceRole.entities.Invoice.filter({ job_id });
    const revenue_real = Number(invoices.reduce((sum, inv) => sum + (inv.total || 0), 0).toFixed(2));

    // STEP 5 — CALCULATE PROFITS
    const contract_amount = job.contract_amount || 0;
    const commission_percentage = job.commission_percentage || 0;

    const profit_contractual = Number((contract_amount - real_cost).toFixed(2));
    const profit_real = Number((revenue_real - real_cost).toFixed(2));
    const commission_amount = Number(((profit_contractual * commission_percentage) / 100).toFixed(2));

    // STEP 6 — IDEMPOTENT WRITE
    const prev = {
      real_cost: job.real_cost ?? null,
      revenue_real: job.revenue_real ?? null,
      profit_contractual: job.profit_contractual ?? null,
      profit_real: job.profit_real ?? null,
      commission_amount: job.commission_amount ?? null,
    };

    const unchanged =
      prev.real_cost === real_cost &&
      prev.revenue_real === revenue_real &&
      prev.profit_contractual === profit_contractual &&
      prev.profit_real === profit_real &&
      prev.commission_amount === commission_amount;

    if (unchanged) {
      return Response.json({
        success: true,
        status: 'no_change',
        job_id,
        financials: { real_cost, revenue_real, profit_contractual, profit_real, commission_amount }
      });
    }

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.Job.update(job_id, {
      real_cost,
      revenue_real,
      profit_contractual,
      profit_real,
      commission_amount,
      financial_last_recalculated_at: now
    });

    return Response.json({
      success: true,
      status: 'updated',
      job_id,
      financials: { real_cost, revenue_real, profit_contractual, profit_real, commission_amount },
      previous: prev,
      recalculated_at: now,
      sources: {
        payroll_allocations: allocations.length,
        expenses: expenses.length,
        driving_logs: drivingLogs.length,
        invoices: invoices.length
      }
    });

  } catch (error) {
    console.error('[recalculateJobFinancials_v2] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});