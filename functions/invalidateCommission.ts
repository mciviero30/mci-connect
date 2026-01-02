import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Invalidate a commission when job changes
 * RULE: If job financials change, invalidate unpaid commissions
 * SECURITY: CEO/Admin only
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // SECURITY: Only CEO/Admin can invalidate
    if (!user || (user.role !== 'admin' && user.role !== 'ceo')) {
      return Response.json({ error: 'Unauthorized: Admin/CEO only' }, { status: 403 });
    }

    const { job_id, reason } = await req.json();

    if (!job_id) {
      return Response.json({ error: 'job_id is required' }, { status: 400 });
    }

    // Find all commission results for this job (not yet paid)
    const results = await base44.asServiceRole.entities.CommissionResult.filter({ 
      job_id 
    });

    const invalidated = [];
    const skipped = [];

    for (const result of results) {
      // Don't invalidate already paid commissions
      if (result.status === 'paid') {
        skipped.push({ id: result.id, reason: 'already_paid' });
        continue;
      }

      // Don't invalidate already invalidated
      if (result.status === 'invalidated') {
        skipped.push({ id: result.id, reason: 'already_invalidated' });
        continue;
      }

      // Invalidate
      await base44.asServiceRole.entities.CommissionResult.update(result.id, {
        status: 'invalidated',
        invalidation_reason: reason || 'Job data changed',
        invalidated_by: user.email,
        invalidated_at: new Date().toISOString(),
      });

      invalidated.push(result.id);
    }

    return Response.json({
      success: true,
      invalidated_count: invalidated.length,
      invalidated_ids: invalidated,
      skipped_count: skipped.length,
      skipped,
      message: `Invalidated ${invalidated.length} commission(s) for job ${job_id}`
    });

  } catch (error) {
    console.error('Commission invalidation error:', error);
    return Response.json({ 
      error: 'Failed to invalidate commissions',
      details: error.message 
    }, { status: 500 });
  }
});