import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 2B: Manual orphan repair (safe, limited scope)
 * Repairs exactly 2 orphaned references:
 * - 1 Invoice (INV-00001)
 * - 1 TimeEntry (696504e97bb8a80b94ab8c57)
 * 
 * Creates missing Job records and links them.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Unauthorized. Admin only.' 
      }, { status: 403 });
    }

    console.log('🔧 Starting Phase 2B: Manual orphan repair...\n');

    const results = {
      timestamp: new Date().toISOString(),
      jobs_created: 0,
      invoices_repaired: 0,
      time_entries_repaired: 0,
      details: []
    };

    // 1. Fetch the orphaned Invoice
    console.log('📋 Fetching orphaned Invoice INV-00001...');
    const invoices = await base44.asServiceRole.entities.Invoice.filter({
      invoice_number: 'INV-00001'
    });

    if (invoices.length === 0) {
      return Response.json({
        ...results,
        error: 'Invoice INV-00001 not found'
      }, { status: 404 });
    }

    const invoice = invoices[0];
    console.log(`  Found: ${invoice.job_name} (current job_id: ${invoice.job_id})`);

    // 2. Fetch the orphaned TimeEntry
    console.log('\n📋 Fetching orphaned TimeEntry...');
    const timeEntry = await base44.asServiceRole.entities.TimeEntry.get('696504e97bb8a80b94ab8c57');
    
    if (!timeEntry) {
      return Response.json({
        ...results,
        error: 'TimeEntry 696504e97bb8a80b94ab8c57 not found'
      }, { status: 404 });
    }

    console.log(`  Found: ${timeEntry.job_name} on ${timeEntry.date} (current job_id: ${timeEntry.job_id})`);

    // 3. Check if Jobs exist
    console.log('\n🔍 Checking if Jobs exist...');
    const invoiceJobExists = await base44.asServiceRole.entities.Job.get(invoice.job_id).catch(() => null);
    const timeEntryJobExists = await base44.asServiceRole.entities.Job.get(timeEntry.job_id).catch(() => null);

    // 4. Create Job for Invoice if needed
    let invoiceJobId = invoice.job_id;
    if (!invoiceJobExists) {
      console.log(`\n✨ Creating Job for Invoice (${invoice.job_name})...`);
      const newJob = await base44.asServiceRole.entities.Job.create({
        name: invoice.job_name,
        description: `Recreated from orphaned Invoice ${invoice.invoice_number}`,
        customer_name: invoice.customer_name,
        customer_id: invoice.customer_id || '',
        address: invoice.job_address || '',
        status: 'active',
        billing_type: 'fixed_price',
        contract_amount: invoice.total || 0,
        backfill_source: 'orphan_repair',
        backfill_confidence: 100,
        backfill_completed_at: new Date().toISOString()
      });

      invoiceJobId = newJob.id;
      results.jobs_created++;
      results.details.push({
        action: 'job_created',
        job_id: newJob.id,
        job_name: newJob.name,
        source: 'invoice'
      });
      console.log(`  ✅ Job created: ${newJob.id}`);
    } else {
      console.log(`  ℹ️ Job already exists for Invoice`);
    }

    // 5. Create Job for TimeEntry if needed
    let timeEntryJobId = timeEntry.job_id;
    if (!timeEntryJobExists) {
      console.log(`\n✨ Creating Job for TimeEntry (${timeEntry.job_name})...`);
      const newJob = await base44.asServiceRole.entities.Job.create({
        name: timeEntry.job_name,
        description: `Recreated from orphaned TimeEntry on ${timeEntry.date}`,
        customer_name: 'Unknown', // No customer info in TimeEntry
        status: 'active',
        billing_type: 'time_materials',
        backfill_source: 'orphan_repair',
        backfill_confidence: 100,
        backfill_completed_at: new Date().toISOString()
      });

      timeEntryJobId = newJob.id;
      results.jobs_created++;
      results.details.push({
        action: 'job_created',
        job_id: newJob.id,
        job_name: newJob.name,
        source: 'time_entry'
      });
      console.log(`  ✅ Job created: ${newJob.id}`);
    } else {
      console.log(`  ℹ️ Job already exists for TimeEntry`);
    }

    // 6. Update Invoice if needed
    if (invoice.job_id !== invoiceJobId) {
      console.log(`\n🔗 Linking Invoice to Job...`);
      await base44.asServiceRole.entities.Invoice.update(invoice.id, {
        job_id: invoiceJobId,
        job_link_backfilled: true,
        job_link_method: 'orphan_repair_manual'
      });
      results.invoices_repaired++;
      results.details.push({
        action: 'invoice_linked',
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        job_id: invoiceJobId
      });
      console.log(`  ✅ Invoice ${invoice.invoice_number} → Job ${invoiceJobId}`);
    }

    // 7. Update TimeEntry if needed
    if (timeEntry.job_id !== timeEntryJobId) {
      console.log(`\n🔗 Linking TimeEntry to Job...`);
      await base44.asServiceRole.entities.TimeEntry.update(timeEntry.id, {
        job_id: timeEntryJobId
      });
      results.time_entries_repaired++;
      results.details.push({
        action: 'time_entry_linked',
        time_entry_id: timeEntry.id,
        date: timeEntry.date,
        job_id: timeEntryJobId
      });
      console.log(`  ✅ TimeEntry ${timeEntry.date} → Job ${timeEntryJobId}`);
    }

    console.log('\n✅ Phase 2B complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Jobs created: ${results.jobs_created}`);
    console.log(`  - Invoices repaired: ${results.invoices_repaired}`);
    console.log(`  - TimeEntries repaired: ${results.time_entries_repaired}`);
    console.log('\n💡 Next step: Run runJobBackfillSafetyCheckpoint to verify');

    return Response.json({
      ...results,
      success: true,
      message: 'Orphaned references repaired successfully'
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});