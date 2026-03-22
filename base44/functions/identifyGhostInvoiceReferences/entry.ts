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

    // Identify ghost references (job_id doesn't exist)
    const ghostReferences = [];
    for (const invoice of invoicesWithJobId) {
      try {
        await base44.entities.Job.read(invoice.job_id);
        // Job exists, skip
      } catch (error) {
        // Job does not exist - this is a ghost reference
        ghostReferences.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          invalid_job_id: invoice.job_id,
          job_name: invoice.job_name,
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          quote_id: invoice.quote_id,
          created_date: invoice.created_date,
          total: invoice.total,
          status: invoice.status
        });
      }
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      ghost_references_found: ghostReferences.length,
      ghost_references: ghostReferences.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )
    });
  } catch (error) {
    console.error('Error identifying ghost invoice references:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});