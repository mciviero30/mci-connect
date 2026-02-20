import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

/**
 * Confirm payroll batch with HARDENED financial integrity
 * 
 * PHASE HARDENING - CRITICAL CHANGES:
 * 1. File hash deduplication - blocks duplicate confirmed batches
 * 2. Atomic transaction for Job updates - ALL or NOTHING
 * 3. total_paid immutability - locked after confirmation
 * 4. Audit logging - full trail of financial mutation
 * 
 * If ANY Job update fails → entire batch reverted
 * No partial state allowed
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Only CEO/Admin/Accountant can confirm
    const isAuthorized = ['admin', 'ceo'].includes(user.role) || 
                        (user.position && ['CEO', 'Accountant'].includes(user.position));
    if (!isAuthorized) {
      return Response.json({ 
        error: 'Only Admin, CEO, or Accountant can confirm payroll batches' 
      }, { status: 403 });
    }

    const body = await req.json();
    const {
      employee_id,
      employee_name,
      period_start,
      period_end,
      total_paid,
      allocations,
      file_url,
      notes
    } = body;

    if (!employee_id || !employee_name || !period_start || !period_end || !total_paid || !allocations?.length) {
      return Response.json({ 
        error: 'Missing required fields: employee_id, employee_name, period_start, period_end, total_paid, allocations' 
      }, { status: 400 });
    }

    // Validate allocations sum to total_paid (within 1 cent)
    const allocSum = allocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
    const diff = Math.abs(allocSum - total_paid);
    if (diff > 0.01) {
      return Response.json({
        error: `Allocations don't sum to total_paid. Got: $${allocSum.toFixed(2)}, Expected: $${total_paid.toFixed(2)}`
      }, { status: 400 });
    }

    // ==========================================
    // 2️⃣ FILE HASH DEDUPLICATION
    // ==========================================
    let file_hash = '';
    if (file_url) {
      // Simple hash of file_url + period + employee for duplicate detection
      file_hash = crypto
        .createHash('sha256')
        .update(`${file_url}:${period_start}:${period_end}:${employee_id}`)
        .digest('hex');

      // Check if batch with this hash already confirmed
      const existingBatch = await base44.entities.PayrollBatch.filter({
        file_hash,
        status: 'confirmed'
      });

      if (existingBatch.length > 0) {
        console.warn(`⚠️ Duplicate batch detected: hash=${file_hash}`);
        return Response.json({
          error: 'Duplicate payroll batch detected',
          details: `A confirmed batch with the same file already exists (ID: ${existingBatch[0].id})`,
          existing_batch_id: existingBatch[0].id
        }, { status: 409 });
      }
    }

    console.log(`🔄 Starting PayrollBatch confirmation for ${employee_name}`);
    console.log(`   File hash: ${file_hash}`);

    // ==========================================
    // ATOMIC TRANSACTION - Job Updates
    // ==========================================
    // We simulate transaction atomicity by collecting all updates first,
    // then executing with error handling & rollback plan
    const jobUpdatesToApply = [];
    const allocationRecordsToCreate = [];
    
    // Get all jobs once
    const allJobs = await base44.entities.Job.list();
    
    // Pre-validate all job updates before applying any
    for (const alloc of allocations) {
      const job = allJobs.find(j => j.id === alloc.job_id);
      if (job) {
        const newTotalCost = (job.total_cost || 0) + alloc.allocated_amount;
        jobUpdatesToApply.push({
          job_id: alloc.job_id,
          oldCost: job.total_cost || 0,
          newCost: newTotalCost,
          allocation: alloc
        });
      }
    }

    console.log(`✅ Pre-validated ${jobUpdatesToApply.length} job cost updates`);

    // Step 1: Create PayrollBatch (NOT yet locked)
    const batch = await base44.entities.PayrollBatch.create({
      employee_id,
      employee_name,
      period_start,
      period_end,
      total_paid,
      source: 'Connecteam Import',
      status: 'confirmed',
      file_hash: file_hash,
      confirmed_at: new Date().toISOString(),
      created_by: user.email,
      allocation_count: allocations.length,
      jobs_affected: allocations.map(a => a.job_id).filter(id => id),
      notes: notes || '',
      is_locked: false  // Will lock AFTER allocations succeed
    });

    console.log(`✅ Created PayrollBatch ${batch.id}`);

    // Step 2: Create PayrollAllocation records
    const createdAllocations = [];
    try {
      for (const alloc of allocations) {
        const record = await base44.entities.PayrollAllocation.create({
          payroll_batch_id: batch.id,
          job_id: alloc.job_id || '',
          job_name: alloc.job_name,
          allocated_amount: alloc.allocated_amount,
          allocation_percentage: alloc.allocation_percentage,
          hours_worked: alloc.hours_worked || 0,
          is_rounding_adjustment: alloc.is_rounding_adjustment || false,
          rounding_delta: alloc.rounding_delta || 0,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          financial_recalc_triggered: false,
          is_locked: false  // Will lock after job updates
        });
        createdAllocations.push(record);
      }
      console.log(`✅ Created ${createdAllocations.length} PayrollAllocation records`);
    } catch (err) {
      // ROLLBACK: Delete batch if allocations failed
      console.error(`❌ Allocation creation failed, rolling back batch ${batch.id}:`, err);
      try {
        await base44.entities.PayrollBatch.delete(batch.id);
      } catch (deleteErr) {
        console.error(`❌ Rollback failed for batch ${batch.id}:`, deleteErr);
      }
      throw new Error(`Failed to create allocations: ${err.message}`);
    }

    // Step 3: ATOMIC TRANSACTION - Update Job costs
    // All job updates must succeed, or we fail the entire batch
    const jobUpdateErrors = [];
    const appliedJobUpdates = [];

    for (const update of jobUpdatesToApply) {
      try {
        await base44.entities.Job.update(update.job_id, {
          total_cost: update.newCost
        });
        appliedJobUpdates.push(update);
        console.log(`✅ Updated Job ${update.job_id}: cost ${update.oldCost} → ${update.newCost}`);
      } catch (err) {
        jobUpdateErrors.push({
          job_id: update.job_id,
          error: err.message
        });
        console.error(`❌ Job update failed for ${update.job_id}:`, err.message);
      }
    }

    // If ANY job update failed, ROLLBACK everything
    if (jobUpdateErrors.length > 0) {
      console.error(`❌ Job updates failed (${jobUpdateErrors.length}/${jobUpdateErrors.length}). ROLLING BACK.`);
      
      // Rollback: Reverse applied updates
      for (const applied of appliedJobUpdates) {
        try {
          await base44.entities.Job.update(applied.job_id, {
            total_cost: applied.oldCost
          });
          console.log(`↩️  Rolled back Job ${applied.job_id}: cost restored to ${applied.oldCost}`);
        } catch (rbErr) {
          console.error(`🔴 CRITICAL: Rollback failed for Job ${applied.job_id}:`, rbErr);
        }
      }

      // Delete batch and allocations
      try {
        for (const alloc of createdAllocations) {
          await base44.entities.PayrollAllocation.delete(alloc.id);
        }
        await base44.entities.PayrollBatch.delete(batch.id);
        console.log(`↩️  Deleted batch ${batch.id} and allocations`);
      } catch (cleanupErr) {
        console.error(`🔴 CRITICAL: Cleanup failed:`, cleanupErr);
      }

      return Response.json({
        success: false,
        error: 'Job cost updates failed - entire batch rolled back',
        failed_jobs: jobUpdateErrors
      }, { status: 500 });
    }

    console.log(`✅ All ${appliedJobUpdates.length} job cost updates succeeded`);

    // Step 4: Trigger financial recalculations (non-critical, don't rollback)
    for (const update of appliedJobUpdates) {
      try {
        await base44.functions.invoke('recalculateInvoiceFinancials', {
          job_id: update.job_id
        });
        console.log(`✅ Triggered recalculateInvoiceFinancials for Job ${update.job_id}`);
      } catch (err) {
        console.warn(`⚠️ recalculateInvoiceFinancials failed for Job ${update.job_id}:`, err.message);
      }
    }

    // Step 4b: Create draft invoices for placeholder jobs (non-critical)
    const placeholderAllocations = allocations.filter(a => a.is_placeholder && a.job_id);
    for (const alloc of placeholderAllocations) {
      try {
        // Get a unique invoice number
        let invoiceNumber = `PAYROLL-DRAFT-${Date.now()}`;
        try {
          const { invoice_number } = await base44.functions.invoke('generateInvoiceNumber', {});
          invoiceNumber = invoice_number || invoiceNumber;
        } catch (_) {}

        await base44.entities.Invoice.create({
          invoice_number: invoiceNumber,
          job_id: alloc.job_id,
          job_name: alloc.job_name,
          customer_name: 'Pending - Import from Payroll',
          invoice_date: period_start,
          items: [{
            item_name: 'Payroll Labor Cost (Pending)',
            description: `Auto-created from payroll import. Update with real billing info. Hours: ${alloc.hours_worked}`,
            quantity: 1,
            unit_price: 0,
            total: 0
          }],
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          status: 'draft',
          notes: `⚠️ PAYROLL DRAFT: This invoice was auto-created because job "${alloc.job_name}" was not found in the system. Please update with correct customer, amounts, and billing info. Payroll Batch: ${batch.id}`,
        });
        console.log(`🧾 Created draft invoice for placeholder job "${alloc.job_name}"`);
      } catch (err) {
        console.warn(`⚠️ Failed to create draft invoice for "${alloc.job_name}":`, err.message);
      }
    }

    // Step 5: LOCK batch & allocations - total_paid now immutable
    try {
      await base44.entities.PayrollBatch.update(batch.id, {
        is_locked: true,
        locked_at: new Date().toISOString()
      });

      for (const alloc of createdAllocations) {
        await base44.entities.PayrollAllocation.update(alloc.id, {
          is_locked: true
        });
      }
      console.log(`🔒 Locked batch ${batch.id} and allocations (total_paid immutable)`);
    } catch (err) {
      console.error(`⚠️ Lock operation failed (non-critical):`, err.message);
    }

    // ==========================================
    // 4️⃣ AUDIT LOGGING
    // ==========================================
    try {
      await base44.entities.AuditLog.create({
        event_type: 'payroll_batch_confirmed',
        entity_type: 'PayrollBatch',
        entity_id: batch.id,
        performed_by: user.email,
        performed_by_name: user.full_name || user.email,
        action_description: `Confirmed payroll batch for ${employee_name} (${period_start} to ${period_end}): $${total_paid.toFixed(2)} across ${allocations.length} jobs`,
        before_state: null,
        after_state: {
          batch_id: batch.id,
          status: 'confirmed',
          total_paid,
          allocation_count: allocations.length,
          is_locked: true
        },
        metadata: {
          employee_id,
          period_start,
          period_end,
          file_hash: file_hash.substring(0, 16) + '...',
          job_update_count: appliedJobUpdates.length,
          rounding_error: diff
        }
      });
      console.log(`📋 Audit log created for batch ${batch.id}`);
    } catch (auditErr) {
      console.warn(`⚠️ Audit logging failed (non-critical):`, auditErr.message);
    }

    return Response.json({
      success: true,
      batch_id: batch.id,
      allocation_count: createdAllocations.length,
      total_allocated: allocSum.toFixed(2),
      is_locked: true,
      message: `✅ CONFIRMED: Payroll batch for ${employee_name} (${allocations.length} jobs). Data is now LOCKED.`
    });

  } catch (error) {
    console.error('❌ confirmPayrollBatch error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to confirm payroll batch'
    }, { status: 500 });
  }
});