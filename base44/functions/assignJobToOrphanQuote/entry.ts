import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { quote_id, job_id } = payload;

    if (!quote_id || !job_id) {
      return Response.json({ error: 'Missing required fields: quote_id, job_id' }, { status: 400 });
    }

    // Verify Quote exists and is orphaned
    const quote = await base44.entities.Quote.read(quote_id);
    if (!quote) {
      return Response.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.job_id) {
      return Response.json({ error: 'Quote already has a job_id assigned' }, { status: 400 });
    }

    // Verify Job exists
    const job = await base44.entities.Job.read(job_id);
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Assign job_id to quote
    const updated = await base44.entities.Quote.update(quote_id, {
      job_id: job_id,
      job_link_backfilled: true,
      job_link_method: 'manual'
    });

    return Response.json({
      success: true,
      message: `Quote ${quote.quote_number} assigned to Job ${job.job_number || job.id}`,
      quote_id: quote_id,
      job_id: job_id,
      timestamp: new Date().toISOString(),
      admin_email: user.email
    });
  } catch (error) {
    console.error('Error assigning job to quote:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});