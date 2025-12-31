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

    // Log provisioning start
    if (import.meta.env?.DEV) {
      console.log(`🚀 Starting provisioning for invoice ${invoice_id} (mode: ${mode})`);
    }

    // Load invoice
    const invoice = await base44.entities.Invoice.filter({ id: invoice_id }).then(r => r[0]);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    let jobId = invoice.job_id;
    let job = null;
    const steps = {
      job: 'unknown',
      drive: 'unknown',
      field: 'unknown'
    };
    const errors = [];

    // ========================================
    // STEP 1: Ensure Job Exists
    // ========================================
    try {
      if (jobId) {
        // Load existing job
        const jobs = await base44.asServiceRole.entities.Job.filter({ id: jobId });
        job = jobs[0];
        
        if (job) {
          steps.job = 'existing';
          if (import.meta.env?.DEV) {
            console.log(`✅ Job exists: ${job.id}`);
          }
        } else {
          // Job ID exists but job not found - clear it and create new
          jobId = null;
        }
      }
      
      if (!jobId && invoice.job_name) {
        // Create new job
        if (import.meta.env?.DEV) {
          console.log('📁 Creating new Job from invoice...');
        }
        
        job = await base44.asServiceRole.entities.Job.create({
          name: invoice.job_name,
          address: invoice.job_address || '',
          customer_id: invoice.customer_id || '',
          customer_name: invoice.customer_name || '',
          contract_amount: invoice.total || 0,
          team_id: invoice.team_id || '',
          team_name: invoice.team_name || '',
          status: 'active',
          color: 'blue',
          description: `Created from Invoice ${invoice.invoice_number}`,
          provisioning_status: 'in_progress'
        });
        
        jobId = job.id;
        steps.job = 'created';
        
        // Update invoice with job_id
        await base44.asServiceRole.entities.Invoice.update(invoice_id, { job_id: jobId });
        
        if (import.meta.env?.DEV) {
          console.log(`✅ Job created: ${jobId}`);
        }
      }
    } catch (error) {
      errors.push(`Job creation failed: ${error.message}`);
      if (import.meta.env?.DEV) {
        console.error('❌ Job creation error:', error);
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
    // STEP 2: Ensure Drive Folder Exists
    // ========================================
    try {
      if (job.drive_folder_id && job.drive_folder_url) {
        // Already has folder
        steps.drive = 'existing';
        if (import.meta.env?.DEV) {
          console.log(`✅ Drive folder exists: ${job.drive_folder_id}`);
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
          if (import.meta.env?.DEV) {
            console.log(`✅ Drive folder created: ${driveResult.folder_id}`);
          }
        } else {
          throw new Error('Drive folder creation returned no folder_id');
        }
      }
    } catch (error) {
      errors.push(`Drive folder failed: ${error.message}`);
      steps.drive = 'error';
      if (import.meta.env?.DEV) {
        console.error('❌ Drive folder error:', error);
      }
    }

    // ========================================
    // STEP 3: Ensure MCI Field Sync
    // ========================================
    try {
      if (job.field_project_id) {
        // Already synced
        steps.field = 'existing';
        if (import.meta.env?.DEV) {
          console.log(`✅ Field project exists: ${job.field_project_id}`);
        }
      } else {
        // Sync to Field
        if (import.meta.env?.DEV) {
          console.log('🔗 Syncing to MCI Field...');
        }
        
        const fieldResult = await base44.asServiceRole.functions.invoke('syncJobToMCIField', {
          jobData: job
        });
        
        if (fieldResult?.success && fieldResult?.mci_field_job_id) {
          // Update job with field project id
          await base44.asServiceRole.entities.Job.update(jobId, {
            field_project_id: fieldResult.mci_field_job_id
          });
          
          steps.field = 'created';
          if (import.meta.env?.DEV) {
            console.log(`✅ Field sync completed: ${fieldResult.mci_field_job_id}`);
          }
        } else {
          throw new Error(fieldResult?.error || 'Field sync returned no project ID');
        }
      }
    } catch (error) {
      errors.push(`Field sync failed: ${error.message}`);
      steps.field = 'error';
      if (import.meta.env?.DEV) {
        console.error('❌ Field sync error:', error);
      }
    }

    // ========================================
    // STEP 4: Update Job Provisioning Status
    // ========================================
    const allSuccess = steps.drive !== 'error' && steps.field !== 'error';
    const provisioningStatus = allSuccess ? 'completed' : 'error';
    
    await base44.asServiceRole.entities.Job.update(jobId, {
      provisioning_status: provisioningStatus,
      provisioning_last_error: errors.length > 0 ? errors.join('; ') : null,
      provisioning_completed_at: allSuccess ? new Date().toISOString() : null
    });

    // Reload job to get final state
    const finalJob = await base44.asServiceRole.entities.Job.filter({ id: jobId }).then(r => r[0]);

    return Response.json({
      ok: allSuccess,
      invoice_id,
      job_id: jobId,
      drive_folder_url: finalJob?.drive_folder_url || null,
      field_project_id: finalJob?.field_project_id || null,
      steps,
      errors: errors.length > 0 ? errors : null,
      provisioning_status: provisioningStatus
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