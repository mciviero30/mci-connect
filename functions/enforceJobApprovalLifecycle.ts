import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * JOB APPROVAL LIFECYCLE ENFORCEMENT
 * 
 * PHASE 3: Prevent Jobs from becoming active without approval
 * 
 * Triggered on Job.create() or Job.update()
 * Enforces:
 * - Jobs created from pending invoices must be pending_approval
 * - Jobs cannot transition to 'active' if source document is unapproved
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.entity_name !== 'Job') {
      return Response.json({ success: true, message: 'Not a Job event' });
    }

    const job = data;

    // Check if this job was created from an invoice or quote
    const linkedInvoices = await base44.asServiceRole.entities.Invoice.filter({ job_id: job.id });
    const linkedQuotes = await base44.asServiceRole.entities.Quote.filter({ job_id: job.id });

    let shouldBeApprovalPending = false;
    let blockingDocument = null;

    // Check invoices
    for (const invoice of linkedInvoices) {
      const invApprovalStatus = invoice.approval_status || 'approved';
      if (invApprovalStatus === 'pending_approval' || invApprovalStatus === 'rejected') {
        shouldBeApprovalPending = true;
        blockingDocument = {
          type: 'Invoice',
          number: invoice.invoice_number,
          approval_status: invApprovalStatus
        };
        break;
      }
    }

    // Check quotes if no blocking invoice found
    if (!shouldBeApprovalPending) {
      for (const quote of linkedQuotes) {
        const quoteApprovalStatus = quote.approval_status || 'approved';
        if (quoteApprovalStatus === 'pending_approval' || quoteApprovalStatus === 'rejected') {
          shouldBeApprovalPending = true;
          blockingDocument = {
            type: 'Quote',
            number: quote.quote_number,
            approval_status: quoteApprovalStatus
          };
          break;
        }
      }
    }

    // ENFORCEMENT: If linked document is unapproved, Job cannot be active
    if (shouldBeApprovalPending && job.status === 'active') {
      console.error('[JOB APPROVAL LIFECYCLE] 🚫 Blocking active job with unapproved source', {
        job_id: job.id,
        job_name: job.name,
        blocking_document: blockingDocument
      });

      // Update job to pending_approval status
      await base44.asServiceRole.entities.Job.update(job.id, {
        approval_status: 'pending_approval',
        status: 'on_hold'
      });

      console.log('[JOB APPROVAL LIFECYCLE] ✅ Job forced to on_hold until source approved');
    }

    return Response.json({
      success: true,
      job_id: job.id,
      approval_enforced: shouldBeApprovalPending,
      blocking_document: blockingDocument
    });

  } catch (error) {
    console.error('[JOB APPROVAL LIFECYCLE] Error:', error.message);
    return Response.json({ error: error.message }, { status: 200 });
  }
});