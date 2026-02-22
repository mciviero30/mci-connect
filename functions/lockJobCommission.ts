import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * COMMISSION LOCK — lockJobCommission
 * 
 * Freezes commission permanently for a job.
 * Only callable by Admin or CEO.
 * Requires fresh financial recalculation before locking.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // STEP 1 — AUTH CHECK
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdminOrCeo = user.role === 'admin' || user.role === 'ceo';
    if (!isAdminOrCeo) {
      return Response.json({
        error: 'Forbidden: Admin or CEO only'
      }, { status: 403 });
    }

    // STEP 2 — PARSE INPUT
    const { job_id } = await req.json();
    if (!job_id) {
      return Response.json({ error: 'job_id is required' }, { status: 400 });
    }

    // STEP 3 — FETCH JOB
    const job = await base44.asServiceRole.entities.Job.get(job_id);
    if (!job) {
      return Response.json({ error: `Job not found: ${job_id}` }, { status: 404 });
    }

    // STEP 4 — CHECK IF ALREADY LOCKED
    if (job.commission_locked === true) {
      return Response.json({
        error: `Commission already locked for job ${job_id}`,
        locked_at: job.commission_locked_at,
        commission_amount_final: job.commission_amount_final
      }, { status: 409 });
    }

    // STEP 5 — RECALCULATE FRESH FINANCIALS FIRST
    console.log('[lockJobCommission] Recalculating fresh financials before lock:', job_id);
    
    const recalcReq = new Request('http://internal/recalculateJobFinancials_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-invocation': 'true'
      },
      body: JSON.stringify({ job_id })
    });

    const recalcRes = await base44.functions.invoke('recalculateJobFinancials_v2', {
      job_id
    });

    if (!recalcRes.success) {
      console.error('[lockJobCommission] Recalculation failed:', recalcRes);
      return Response.json({
        error: 'Failed to recalculate financials before lock'
      }, { status: 500 });
    }

    // Fetch FRESH job data after recalculation
    const freshJob = await base44.asServiceRole.entities.Job.get(job_id);
    if (!freshJob) {
      return Response.json({ error: 'Job disappeared after recalculation' }, { status: 500 });
    }

    // STEP 6 — CREATE LOCK SNAPSHOT
    const now = new Date().toISOString();
    const snapshotData = {
      commission_locked: true,
      commission_amount_final: freshJob.commission_amount,
      profit_real_final: freshJob.profit_real,
      commission_locked_at: now
    };

    console.log('[lockJobCommission] Storing lock snapshot:', {
      job_id,
      commission_amount_final: freshJob.commission_amount,
      profit_real_final: freshJob.profit_real,
      locked_at: now
    });

    // STEP 7 — WRITE LOCK
    await base44.asServiceRole.entities.Job.update(job_id, snapshotData);

    // STEP 8 — RETURN SUCCESS
    return Response.json({
      success: true,
      job_id,
      locked_at: now,
      commission_amount_final: freshJob.commission_amount,
      profit_real_final: freshJob.profit_real,
      message: 'Commission locked permanently. Cost/revenue will continue to update, commission remains frozen.'
    });

  } catch (error) {
    console.error('[lockJobCommission] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});