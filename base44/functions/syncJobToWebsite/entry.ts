import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { job_id } = await req.json().catch(() => ({}));
    if (!job_id) return Response.json({ error: 'job_id required' }, { status: 400 });

    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id }, '', 1);
    if (!jobs.length) return Response.json({ error: 'Job not found' }, { status: 404 });

    const job = jobs[0];

    // Mark as synced to website
    await base44.asServiceRole.entities.Job.update(job_id, {
      synced_to_website: true,
      website_sync_date: new Date().toISOString(),
    });

    console.log(`[syncJobToWebsite] Marked job ${job_id} as synced to website`);
    return Response.json({ ok: true, job_id, job_name: job.name, synced: true });

  } catch (err) {
    console.error('[syncJobToWebsite] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
