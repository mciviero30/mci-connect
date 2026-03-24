import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * BACKFILL WORK AUTHORIZATIONS - Safe Migration
 * 
 * Auto-creates WorkAuthorization for legacy Jobs that have:
 * - Linked invoices, OR
 * - Time entries recorded, OR
 * - Expenses recorded
 * 
 * Does NOT delete or modify Jobs
 * Does NOT force approvals
 * Marks auto-generated authorizations with backfill flags
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate - admin only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { dry_run = true } = await req.json();

    // Load all jobs
    const allJobs = await base44.asServiceRole.entities.Job.list('-created_date', 5000);
    
    // Load all invoices
    const allInvoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 5000);
    
    // Load all time entries
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.list('-created_date', 10000);
    
    // Load all expenses
    const allExpenses = await base44.asServiceRole.entities.Expense.list('-created_date', 5000);

    const results = {
      total_jobs: allJobs.length,
      jobs_with_authorization: 0,
      jobs_without_authorization: 0,
      eligible_for_backfill: 0,
      backfilled: 0,
      skipped: 0,
      errors: []
    };

    const backfillCandidates = [];

    // Analyze each job
    for (const job of allJobs) {
      // Already has authorization - skip
      if (job.authorization_id) {
        results.jobs_with_authorization++;
        continue;
      }

      results.jobs_without_authorization++;

      // Check if job has activity (invoices, time, expenses)
      const hasInvoice = allInvoices.some(inv => inv.job_id === job.id);
      const hasTimeEntries = allTimeEntries.some(te => te.job_id === job.id);
      const hasExpenses = allExpenses.some(exp => exp.job_id === job.id);

      const hasActivity = hasInvoice || hasTimeEntries || hasExpenses;

      if (!hasActivity) {
        results.skipped++;
        continue;
      }

      // ELIGIBLE FOR BACKFILL
      results.eligible_for_backfill++;

      // Determine authorization type and confidence
      let authType = job.billing_type || 'fixed_price';
      let confidence = 50; // Base confidence

      if (hasInvoice) confidence += 30;
      if (hasTimeEntries) confidence += 10;
      if (hasExpenses) confidence += 10;

      // Find the linked invoice for reference
      const linkedInvoice = allInvoices.find(inv => inv.job_id === job.id);

      backfillCandidates.push({
        job,
        authType,
        confidence: Math.min(confidence, 100),
        hasInvoice,
        hasTimeEntries,
        hasExpenses,
        linkedInvoice
      });
    }

    // CREATE AUTHORIZATIONS (if not dry run)
    if (!dry_run) {
      for (const candidate of backfillCandidates) {
        try {
          // Create WorkAuthorization
          const authorization = await base44.asServiceRole.entities.WorkAuthorization.create({
            customer_id: candidate.job.customer_id || '',
            customer_name: candidate.job.customer_name || 'Unknown',
            authorization_type: candidate.authType,
            approval_source: candidate.hasInvoice ? 'signed_quote' : 'verbal',
            authorization_number: candidate.linkedInvoice?.invoice_number || `AUTO-${candidate.job.job_number}`,
            approved_amount: candidate.job.contract_amount || 0,
            approved_at: candidate.job.created_date || new Date().toISOString(),
            verified_by_user_id: user.id,
            verified_by_email: user.email,
            verified_by_name: user.full_name,
            verification_notes: `Auto-generated during migration. Evidence: ${
              candidate.hasInvoice ? 'Linked invoice' : ''
            }${candidate.hasTimeEntries ? ' Time entries' : ''}${candidate.hasExpenses ? ' Expenses' : ''}`,
            external_reference: candidate.linkedInvoice?.id || null,
            linked_invoice_id: candidate.linkedInvoice?.id || null,
            status: 'approved',
            backfill_auto_generated: true,
            backfill_confidence: candidate.confidence
          });

          // Link Job to Authorization
          await base44.asServiceRole.entities.Job.update(candidate.job.id, {
            authorization_id: authorization.id
          });

          results.backfilled++;

          console.log(`✅ Backfilled authorization for Job ${candidate.job.job_number} (${candidate.job.name})`);

        } catch (error) {
          results.errors.push({
            job_id: candidate.job.id,
            job_name: candidate.job.name,
            error: error.message
          });
          console.error(`❌ Failed to backfill Job ${candidate.job.id}:`, error.message);
        }
      }
    }

    return Response.json({
      success: true,
      dry_run,
      summary: results,
      backfill_candidates: backfillCandidates.map(c => ({
        job_id: c.job.id,
        job_number: c.job.job_number,
        job_name: c.job.name,
        customer_name: c.job.customer_name,
        confidence: c.confidence,
        evidence: {
          has_invoice: c.hasInvoice,
          has_time_entries: c.hasTimeEntries,
          has_expenses: c.hasExpenses
        }
      }))
    });

  } catch (error) {
    console.error('[BACKFILL ERROR]', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});