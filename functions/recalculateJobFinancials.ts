import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 1 — JOB FINANCIAL CORE FORMALIZATION
 *
 * Recalculates Job-level financial fields:
 *   profit_real    = contract_amount - real_cost
 *   commission_amount = profit_real × commission_percentage / 100
 *
 * CONSTRAINTS:
 * - Aborts if financial_year_locked = true
 * - Does NOT modify Invoice
 * - Does NOT modify PayrollBatch or PayrollAllocation
 * - Does NOT modify CommissionResult
 * - Idempotent: safe to call multiple times with same inputs
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Admin/CEO only
    if (user.role !== 'admin' && user.role !== 'ceo') {
      return Response.json({ error: 'Forbidden: Admin or CEO access required' }, { status: 403 });
    }

    const { job_id } = await req.json();

    if (!job_id) {
      return Response.json({ error: 'job_id is required' }, { status: 400 });
    }

    // STEP 1: Fetch job
    const job = await base44.asServiceRole.entities.Job.get(job_id);
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // STEP 2: LOCK GUARD — abort if fiscal year is closed
    if (job.financial_year_locked === true) {
      return Response.json({
        success: false,
        aborted: true,
        reason: 'financial_year_locked',
        message: `Job ${job_id} is locked for fiscal year. No recalculation performed.`
      }, { status: 409 });
    }

    // STEP 3: Compute derived financials
    // real_cost is read from job.real_cost — Phase 1 does NOT aggregate from sub-entities
    const real_cost = Number((job.real_cost || 0).toFixed(2));
    const contract_amount = Number((job.contract_amount || 0).toFixed(2));
    const profit_real = Number((contract_amount - real_cost).toFixed(2));

    const commission_percentage = job.commission_percentage || 0;
    const commission_amount = commission_percentage > 0
      ? Number((profit_real * commission_percentage / 100).toFixed(2))
      : 0;

    const now = new Date().toISOString();

    // STEP 4: Idempotency check — skip write if values are unchanged
    const unchanged =
      job.profit_real === profit_real &&
      job.commission_amount === commission_amount;

    if (unchanged) {
      console.log(`[recalculateJobFinancials] No changes for Job ${job_id} — skipping write`);
      return Response.json({
        success: true,
        changed: false,
        message: 'No financial change detected — no write performed',
        values: { real_cost, profit_real, commission_amount }
      });
    }

    // STEP 5: Persist updated Job financial fields only
    await base44.asServiceRole.entities.Job.update(job_id, {
      profit_real,
      commission_amount,
      financial_last_recalculated_at: now
    });

    console.log(`[recalculateJobFinancials] Updated Job ${job_id}:`, {
      real_cost,
      profit_real,
      commission_amount
    });

    // STEP 6: Write AuditLog
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'job_financials_recalculated',
        entity_type: 'Job',
        entity_id: job_id,
        performed_by: user.email,
        performed_by_name: user.full_name || user.email,
        action_description: `Job financials recalculated: profit_real=$${profit_real}, commission_amount=$${commission_amount}`,
        before_state: {
          profit_real: job.profit_real,
          commission_amount: job.commission_amount
        },
        after_state: {
          profit_real,
          commission_amount,
          financial_last_recalculated_at: now
        },
        metadata: {
          job_id,
          real_cost,
          contract_amount,
          commission_percentage
        }
      });
    } catch (auditErr) {
      // Non-critical — log but do not fail the response
      console.warn(`[recalculateJobFinancials] AuditLog write failed (non-critical):`, auditErr.message);
    }

    return Response.json({
      success: true,
      changed: true,
      job_id,
      values: {
        real_cost,
        contract_amount,
        profit_real,
        commission_percentage,
        commission_amount
      },
      previous_values: {
        profit_real: job.profit_real,
        commission_amount: job.commission_amount
      },
      financial_last_recalculated_at: now
    });

  } catch (error) {
    console.error('[recalculateJobFinancials] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});