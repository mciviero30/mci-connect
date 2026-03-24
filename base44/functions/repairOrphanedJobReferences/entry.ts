import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ============================================================================
 * REPAIR ORPHANED JOB REFERENCES
 * ============================================================================
 * 
 * Purpose: Fix invoices and time entries pointing to non-existent jobs
 * 
 * Strategy:
 * 1. Try to match orphaned invoice to existing job (by name + customer)
 * 2. If no match: Re-create job from invoice data (with backfill tracking)
 * 3. Update invoice with corrected job_id
 * 4. Same for TimeEntries
 * 
 * Safety: Idempotent, non-destructive, fully audited
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { dry_run = true } = await req.json();

    console.log(`🔧 Starting Orphaned Job References Repair (dry_run: ${dry_run})...`);

    const results = {
      invoices_repaired: 0,
      time_entries_repaired: 0,
      jobs_created: 0,
      jobs_matched: 0,
      errors: [],
      changes: []
    };

    // ============================================
    // 1. FETCH ALL DATA
    // ============================================
    
    const [jobs, invoices, timeEntries] = await Promise.all([
      base44.asServiceRole.entities.Job.list(),
      base44.asServiceRole.entities.Invoice.list(),
      base44.asServiceRole.entities.TimeEntry.list()
    ]);

    const jobIds = new Set(jobs.map(j => j.id));

    // ============================================
    // 2. REPAIR INVOICES
    // ============================================

    const orphanedInvoices = invoices.filter(i => 
      i.job_id && i.job_id !== '' && !jobIds.has(i.job_id)
    );

    console.log(`Found ${orphanedInvoices.length} invoices with invalid job references`);

    for (const invoice of orphanedInvoices) {
      try {
        console.log(`\n📄 Processing Invoice ${invoice.invoice_number || invoice.id}...`);
        
        // Try to match existing job by name + customer
        const potentialMatches = jobs.filter(job => {
          const nameMatch = job.name?.toLowerCase().trim() === invoice.job_name?.toLowerCase().trim();
          const customerMatch = job.customer_id === invoice.customer_id || 
                                job.customer_name?.toLowerCase() === invoice.customer_name?.toLowerCase();
          return nameMatch && customerMatch;
        });

        let newJobId;

        if (potentialMatches.length === 1) {
          // MATCH FOUND
          newJobId = potentialMatches[0].id;
          results.jobs_matched++;
          
          console.log(`  ✅ Matched to existing Job ${potentialMatches[0].job_number || potentialMatches[0].id}`);
          
          results.changes.push({
            type: 'invoice_matched',
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            old_job_id: invoice.job_id,
            new_job_id: newJobId,
            method: 'name_customer_match'
          });
        } else if (potentialMatches.length > 1) {
          // AMBIGUOUS - use oldest
          const oldest = potentialMatches.sort((a, b) => 
            new Date(a.created_date) - new Date(b.created_date)
          )[0];
          
          newJobId = oldest.id;
          results.jobs_matched++;
          
          console.log(`  ⚠️ Multiple matches - using oldest Job ${oldest.job_number || oldest.id}`);
          
          results.changes.push({
            type: 'invoice_matched_ambiguous',
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            old_job_id: invoice.job_id,
            new_job_id: newJobId,
            method: 'name_customer_match_oldest',
            ambiguous_count: potentialMatches.length
          });
        } else {
          // NO MATCH - RE-CREATE JOB
          console.log(`  🏗️ No match found - recreating job...`);
          
          if (!dry_run) {
            // Generate job number
            const { data: jobNumberData } = await base44.functions.invoke('generateJobNumber', {});
            const job_number = jobNumberData.job_number;
            
            const newJob = await base44.asServiceRole.entities.Job.create({
              name: invoice.job_name || 'Unknown Job',
              job_number,
              customer_id: invoice.customer_id || '',
              customer_name: invoice.customer_name || '',
              address: invoice.job_address || '',
              contract_amount: invoice.total || 0,
              status: invoice.status === 'paid' ? 'completed' : 'active',
              team_id: invoice.team_id || '',
              team_name: invoice.team_name || '',
              color: 'blue',
              billing_type: 'fixed_price',
              description: `Restored from Invoice ${invoice.invoice_number} - orphaned reference repair`,
              backfill_source: 'invoice',
              backfill_confidence: 100,
              backfill_completed_at: new Date().toISOString()
            });
            
            newJobId = newJob.id;
            results.jobs_created++;
            
            console.log(`  ✅ Job created: ${job_number} (${newJob.id})`);
          } else {
            newJobId = 'DRY_RUN_JOB_ID';
            results.jobs_created++;
            
            console.log(`  🔍 DRY RUN: Would create job for ${invoice.job_name}`);
          }
          
          results.changes.push({
            type: 'job_recreated_from_invoice',
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            old_job_id: invoice.job_id,
            new_job_id: newJobId,
            job_name: invoice.job_name,
            method: 'recreate_from_invoice_data'
          });
        }

        // Update invoice with corrected job_id
        if (!dry_run) {
          await base44.asServiceRole.entities.Invoice.update(invoice.id, {
            job_id: newJobId
          });
          
          console.log(`  ✅ Invoice ${invoice.invoice_number} repaired → Job ${newJobId}`);
        } else {
          console.log(`  🔍 DRY RUN: Would update invoice with job_id: ${newJobId}`);
        }

        results.invoices_repaired++;

      } catch (error) {
        console.error(`  ❌ Error repairing invoice ${invoice.invoice_number}:`, error);
        results.errors.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          error: error.message
        });
      }
    }

    // ============================================
    // 3. REPAIR TIME ENTRIES
    // ============================================

    const orphanedTimeEntries = timeEntries.filter(t =>
      t.job_id && t.job_id !== '' && !jobIds.has(t.job_id)
    );

    console.log(`\nFound ${orphanedTimeEntries.length} time entries with invalid job references`);

    for (const entry of orphanedTimeEntries) {
      try {
        console.log(`\n⏱️ Processing TimeEntry ${entry.id}...`);
        
        // Try to match existing job
        const potentialMatches = jobs.filter(job =>
          job.name?.toLowerCase().trim() === entry.job_name?.toLowerCase().trim()
        );

        let newJobId;

        if (potentialMatches.length === 1) {
          newJobId = potentialMatches[0].id;
          results.jobs_matched++;
          
          console.log(`  ✅ Matched to existing Job ${potentialMatches[0].job_number || potentialMatches[0].id}`);
        } else {
          // Re-create job
          console.log(`  🏗️ No match found - recreating job...`);
          
          if (!dry_run) {
            const { data: jobNumberData } = await base44.functions.invoke('generateJobNumber', {});
            const job_number = jobNumberData.job_number;
            
            const newJob = await base44.asServiceRole.entities.Job.create({
              name: entry.job_name || 'Unknown Job',
              job_number,
              customer_name: 'Unknown',
              address: '',
              status: 'completed',
              color: 'blue',
              billing_type: 'time_materials',
              description: `Restored from TimeEntry ${entry.id} - orphaned reference repair`,
              backfill_source: 'auto_generated',
              backfill_confidence: 70,
              backfill_completed_at: new Date().toISOString()
            });
            
            newJobId = newJob.id;
            results.jobs_created++;
            
            console.log(`  ✅ Job created: ${job_number} (${newJob.id})`);
          } else {
            newJobId = 'DRY_RUN_JOB_ID';
            results.jobs_created++;
            
            console.log(`  🔍 DRY RUN: Would create job for ${entry.job_name}`);
          }
        }

        // Update time entry
        if (!dry_run) {
          await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
            job_id: newJobId
          });
          
          console.log(`  ✅ TimeEntry ${entry.date} repaired → Job ${newJobId}`);
        } else {
          console.log(`  🔍 DRY RUN: Would update TimeEntry with job_id: ${newJobId}`);
        }

        results.time_entries_repaired++;
        results.changes.push({
          type: 'time_entry_repaired',
          entry_id: entry.id,
          old_job_id: entry.job_id,
          new_job_id: newJobId
        });

      } catch (error) {
        console.error(`  ❌ Error repairing TimeEntry ${entry.id}:`, error);
        results.errors.push({
          entry_id: entry.id,
          error: error.message
        });
      }
    }

    // ============================================
    // 4. FINAL SUMMARY
    // ============================================

    const summary = {
      dry_run,
      timestamp: new Date().toISOString(),
      invoices_repaired: results.invoices_repaired,
      time_entries_repaired: results.time_entries_repaired,
      jobs_created: results.jobs_created,
      jobs_matched: results.jobs_matched,
      total_changes: results.changes.length,
      errors: results.errors,
      changes: results.changes,
      success: results.errors.length === 0,
      ready_for_phase_2: dry_run ? 'N/A (dry run)' : (results.errors.length === 0 ? 'YES' : 'NO')
    };

    console.log('\n✅ Repair complete');
    console.log(JSON.stringify(summary, null, 2));

    return Response.json(summary);

  } catch (error) {
    console.error('❌ Repair failed:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});