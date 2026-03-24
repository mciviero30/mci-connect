import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Fetch all invoices with job_id
    const allInvoices = await base44.entities.Invoice.list('-created_date', 100);
    const invoicesWithJobId = allInvoices.filter(i => i.job_id);

    // Identify and repair ghost references (job_id doesn't exist)
    const repaired = [];
    const skipped = [];

    for (const invoice of invoicesWithJobId) {
      try {
        await base44.entities.Job.read(invoice.job_id);
        // Job exists, skip
        skipped.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          reason: 'job_exists'
        });
      } catch (error) {
        // Job does not exist - this is a ghost reference, repair it
        try {
          await base44.entities.Invoice.update(invoice.id, {
            job_id: null,
            job_link_backfilled: false,
            job_link_method: 'repair_ghost_reference'
          });

          repaired.push({
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            invalid_job_id: invoice.job_id,
            job_name: invoice.job_name,
            customer_id: invoice.customer_id,
            action: 'removed_invalid_job_id',
            timestamp: new Date().toISOString()
          });
        } catch (updateError) {
          skipped.push({
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            reason: 'update_failed',
            error: updateError.message
          });
        }
      }
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      repair_summary: {
        total_invoices_checked: invoicesWithJobId.length,
        ghost_references_repaired: repaired.length,
        skipped: skipped.length,
        admin_email: user.email
      },
      repaired_invoices: repaired,
      skipped_invoices: skipped,
      next_steps: [
        'Run repairGhostTimeEntryReferences() to repair time entries',
        'Then run auditJobSSotReadiness() to verify all repairs',
        'Confirm invalid_references count is now 0',
        'Proceed to manual orphaned quote cleanup'
      ]
    });
  } catch (error) {
    console.error('Error repairing ghost invoice references:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});