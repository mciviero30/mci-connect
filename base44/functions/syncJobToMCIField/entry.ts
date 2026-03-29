import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { jobId } = await req.json().catch(() => ({}));
    if (!jobId) return Response.json({ error: 'jobId required' }, { status: 400 });

    const jobs = await base44.asServiceRole.entities.Job.filter({ id: jobId }, '', 1);
    if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });

    const job = jobs[0];

    // Mark job as synced to field
    await base44.asServiceRole.entities.Job.update(jobId, {
      synced_to_field: true,
      field_sync_date: new Date().toISOString(),
      field_project_id: job.field_project_id || jobId,
    });

    console.log(`[syncJobToMCIField] Synced job ${jobId} to field`);
    return Response.json({ ok: true, jobId, synced: true });

  } catch (err) {
    console.error('[syncJobToMCIField] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
