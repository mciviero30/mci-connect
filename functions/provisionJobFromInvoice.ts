import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Idempotent Job Provisioning Function
 * 
 * Ensures complete job setup:
 * 1. Job exists in MCI Connect
 * 2. Google Drive folder created
 * 3. MCI Field project synced
 * 
 * Can run multiple times safely - won't duplicate resources
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse input
    const { invoice_id, mode = 'unknown' } = await req.json();
    
    if (!invoice_id) {
      return Response.json({ error: 'invoice_id required' }, { status: 400 });
    }

    // Load invoice
    const invoice = await base44.entities.Invoice.filter({ id: invoice_id }).then(r => r[0]);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // APPROVAL GATE: Skip provisioning if not approved
    const approval_status = invoice.approval_status || 'approved'; // Legacy: missing = approved
    if (approval_status !== 'approved') {
      if (import.meta.env?.DEV) {
        console.log(`⏸️ Provisioning skipped: Invoice ${invoice_id} is ${approval_status}`);
      }
      return Response.json({
        ok: false,
        skipped: true,
        reason: 'Invoice not approved',
        approval_status: approval_status,
        invoice_id
      });
    }

    // CRITICAL: AUTHORIZATION GATE - No auto-Job creation without WorkAuthorization
    // If invoice has no linked authorization, SKIP job creation
    // Admin must create WorkAuthorization first, then manually create Job
    if (!invoice.authorization_id) {
      console.log(`⏸️ Provisioning skipped: Invoice ${invoice_id} has no linked WorkAuthorization`);
      return Response.json({
        ok: false,
        skipped: true,
        reason: 'No WorkAuthorization linked to invoice',
        message: 'Admin must create WorkAuthorization and link to invoice before job provisioning',
        invoice_id
      });
    }

    let jobId = invoice.job_id;
    let job = null;
    const steps = {
      job: 'unknown',
      drive: 'unknown',
      field: 'unknown'
    };
    const errors = [];
    const startTime = Date.now();

    // ========================================
    // STEP 1: Ensure Job Exists (IDEMPOTENT)
    // ========================================
    try {
      if (jobId) {
        // Load existing job - NEVER create new if ID exists
        const jobs = await base44.asServiceRole.entities.Job.filter({ id: jobId });
        job = jobs[0];
        
        if (job) {
          steps.job = 'existing';
          if (import.meta.env?.DEV) {
            console.log(`✅ Job exists: ${job.id} - using existing`);
          }
        } else {
          // Job ID exists but job not found - data inconsistency
          steps.job = 'error';
          errors.push('Job ID references non-existent job');
          if (import.meta.env?.DEV) {
            console.error(`❌ Job ${jobId} not found - data integrity issue`);
          }
        }
      } else if (invoice.job_name) {
        // PHASE 3 FIX: Check for duplicate BEFORE creating
        const duplicateJobs = await base44.asServiceRole.entities.Job.filter({
          name: invoice.job_name,
          customer_id: invoice.customer_id || ''
        });

        if (duplicateJobs.length > 0) {
          // Duplicate found - link to existing instead of creating
          job = duplicateJobs[0];
          jobId = job.id;
          steps.job = 'existing';
          
          // Link invoice to existing job
          await base44.asServiceRole.entities.Invoice.update(invoice_id, { 
            job_id: jobId,
            job_link_method: 'duplicate_prevention'
          });
          
          console.log(`✅ Linked to existing Job: ${job.id} ${job.job_number} (duplicate prevented)`);
        } else {
          // No duplicate - safe to create new job
          if (import.meta.env?.DEV) {
            console.log('📁 Creating new Job from invoice...');
          }
          
          // Generate job number
          const jobNumberResponse = await base44.asServiceRole.functions.invoke('generateJobNumber', {});
          const job_number = jobNumberResponse?.data?.job_number || jobNumberResponse?.job_number;
          
          job = await base44.asServiceRole.entities.Job.create({
            name: invoice.job_name,
            job_number: job_number,
            authorization_id: invoice.authorization_id, // REQUIRED: Link to WorkAuthorization
            address: invoice.job_address || '',
            customer_id: invoice.customer_id || '',
            customer_name: invoice.customer_name || '',
            contract_amount: invoice.total || 0,
            team_id: invoice.team_id || '',
            team_name: invoice.team_name || '',
            status: 'active',
            color: 'blue',
            description: `Created from Invoice ${invoice.invoice_number}`,
            provisioning_status: 'in_progress',
            provisioning_attempts: 1,
            provisioning_last_attempt_at: new Date().toISOString(),
            provisioning_steps: { job: 'created', drive: 'unknown', field: 'unknown' }
          });
          
          jobId = job.id;
          steps.job = 'created';
          
          // Update invoice with job_id (atomic link)
          await base44.asServiceRole.entities.Invoice.update(invoice_id, { job_id: jobId });
          
          if (import.meta.env?.DEV) {
            console.log(`✅ Job created: ${jobId} ${job_number}`);
          }
        }
      }
    } catch (error) {
      steps.job = 'error';
      errors.push(`Job: ${error.message}`);
      if (import.meta.env?.DEV) {
        console.error('❌ Job step error:', error);
      }
    }

    // If no job, cannot continue
    if (!jobId || !job) {
      return Response.json({
        ok: false,
        error: 'Cannot provision without a job',
        steps,
        errors
      }, { status: 500 });
    }

    // ========================================
    // STEP 2: Ensure Drive Folder Exists (IDEMPOTENT)
    // ========================================
    try {
      if (job.drive_folder_id && job.drive_folder_url) {
        // Drive folder already exists - NEVER create duplicate
        steps.drive = 'existing';
        if (import.meta.env?.DEV) {
          console.log(`✅ Drive folder exists: ${job.drive_folder_id} - skipping creation`);
        }
      } else {
        // Create folder via existing function
        if (import.meta.env?.DEV) {
          console.log('📂 Creating Google Drive folder...');
        }
        
        const driveResult = await base44.asServiceRole.functions.invoke('createJobDriveFolder', {
          job_id: jobId,
          job_name: job.name
        });
        
        if (driveResult?.folder_id) {
          steps.drive = 'created';
          // Reload job to get updated drive info
          const updatedJobs = await base44.asServiceRole.entities.Job.filter({ id: jobId });
          job = updatedJobs[0];
          if (import.meta.env?.DEV) {
            console.log(`✅ Drive folder created: ${driveResult.folder_id}`);
          }
        } else {
          throw new Error('No folder_id returned');
        }
      }
    } catch (error) {
      steps.drive = 'error';
      errors.push(`Drive: ${error.message}`);
      if (import.meta.env?.DEV) {
        console.error('❌ Drive step error:', error);
      }
    }

    // ========================================
    // STEP 3: MCI Field Sync - SKIPPED (Manual Only)
    // ========================================
    // Field provisioning is now MANUAL ONLY via JobDetails button
    // This prevents creating unnecessary Field projects for all jobs
    steps.field = 'skipped';
    if (import.meta.env?.DEV) {
      console.log('⏭️ Field sync skipped - use manual provisioning from JobDetails');
    }

    // ========================================
    // STEP 4: Update Job Provisioning Status & Tracking
    // ========================================
    // Field is now optional, so only check Job + Drive
    const hasErrors = steps.job === 'error' || steps.drive === 'error';
    const allCompleted = steps.job !== 'unknown' && steps.drive !== 'unknown';
    const isPartial = allCompleted && hasErrors;
    const isFullyComplete = allCompleted && !hasErrors;
    
    let provisioningStatus;
    if (isFullyComplete) {
      provisioningStatus = 'completed';
    } else if (isPartial) {
      provisioningStatus = 'partial';
    } else if (hasErrors) {
      provisioningStatus = 'error';
    } else {
      provisioningStatus = 'in_progress';
    }
    
    // Increment attempt counter
    const currentAttempts = (job?.provisioning_attempts || 0) + 1;
    const duration = Date.now() - startTime;
    
    await base44.asServiceRole.entities.Job.update(jobId, {
      provisioning_status: provisioningStatus,
      provisioning_last_error: errors.length > 0 ? errors.join('; ').substring(0, 200) : null,
      provisioning_steps: steps,
      provisioning_attempts: currentAttempts,
      provisioning_last_attempt_at: new Date().toISOString(),
      provisioning_completed_at: isFullyComplete ? new Date().toISOString() : job?.provisioning_completed_at || null
    });

    // Reload job to get final state
    const finalJob = await base44.asServiceRole.entities.Job.filter({ id: jobId }).then(r => r[0]);

    if (import.meta.env?.DEV) {
      console.log(`⏱️ Provisioning completed in ${duration}ms - Status: ${provisioningStatus}`);
    }

    return Response.json({
      ok: isFullyComplete,
      invoice_id,
      job_id: jobId,
      drive_folder_url: finalJob?.drive_folder_url || null,
      field_project_id: finalJob?.field_project_id || null,
      steps,
      errors: errors.length > 0 ? errors : null,
      provisioning_status: provisioningStatus,
      duration_ms: duration,
      attempts: currentAttempts
    });

  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('❌ Provisioning function error:', error);
    }
    return Response.json({ 
      ok: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
});