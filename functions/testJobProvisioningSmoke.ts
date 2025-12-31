import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Smoke Test: Job Provisioning System
 * 
 * Tests idempotency by running provisioning 3 times on same invoice.
 * Verifies: no duplicates, proper status tracking, error handling.
 * 
 * Returns detailed report for audit.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const report = {
      test_timestamp: new Date().toISOString(),
      test_user: user.email,
      results: [],
      summary: {}
    };

    // ========================================
    // STEP 1: Find or Create Test Invoice
    // ========================================
    let testInvoice;
    const recentInvoices = await base44.entities.Invoice.list('-created_date', 1);
    
    if (recentInvoices.length > 0) {
      testInvoice = recentInvoices[0];
      report.test_invoice_id = testInvoice.id;
      report.test_invoice_number = testInvoice.invoice_number;
      report.test_type = 'existing_invoice';
    } else {
      // Create minimal test invoice
      testInvoice = await base44.entities.Invoice.create({
        invoice_number: `TEST-${Date.now()}`,
        customer_name: 'Smoke Test Customer',
        job_name: 'Smoke Test Job',
        job_address: '123 Test St',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        items: [{ description: 'Test Item', quantity: 1, unit_price: 100, total: 100 }],
        subtotal: 100,
        tax_rate: 0,
        tax_amount: 0,
        total: 100,
        status: 'draft'
      });
      
      report.test_invoice_id = testInvoice.id;
      report.test_invoice_number = testInvoice.invoice_number;
      report.test_type = 'created_test_invoice';
    }

    // ========================================
    // STEP 2: Run Provisioning 3 Times
    // ========================================
    for (let attempt = 1; attempt <= 3; attempt++) {
      const attemptStart = Date.now();
      
      try {
        const result = await base44.asServiceRole.functions.invoke('provisionJobFromInvoice', {
          invoice_id: testInvoice.id,
          mode: `smoke_test_attempt_${attempt}`
        });

        const attemptResult = {
          attempt,
          duration_ms: Date.now() - attemptStart,
          ok: result.ok,
          job_id: result.job_id,
          drive_folder_url: result.drive_folder_url,
          field_project_id: result.field_project_id,
          steps: result.steps,
          errors: result.errors,
          provisioning_status: result.provisioning_status,
          attempts_counter: result.attempts
        };

        report.results.push(attemptResult);

        // Wait 1s between attempts
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        report.results.push({
          attempt,
          duration_ms: Date.now() - attemptStart,
          error: error.message,
          failed: true
        });
      }
    }

    // ========================================
    // STEP 3: Verify Idempotency
    // ========================================
    const jobIds = report.results.map(r => r.job_id).filter(Boolean);
    const uniqueJobIds = [...new Set(jobIds)];
    
    const driveFolderUrls = report.results.map(r => r.drive_folder_url).filter(Boolean);
    const uniqueDriveFolders = [...new Set(driveFolderUrls)];
    
    const fieldProjectIds = report.results.map(r => r.field_project_id).filter(Boolean);
    const uniqueFieldProjects = [...new Set(fieldProjectIds)];

    report.summary = {
      total_attempts: 3,
      successful_attempts: report.results.filter(r => r.ok).length,
      failed_attempts: report.results.filter(r => r.failed || !r.ok).length,
      unique_jobs_created: uniqueJobIds.length,
      unique_drive_folders_created: uniqueDriveFolders.length,
      unique_field_projects_created: uniqueFieldProjects.length,
      idempotency_check: {
        jobs_ok: uniqueJobIds.length <= 1,
        drive_ok: uniqueDriveFolders.length <= 1,
        field_ok: uniqueFieldProjects.length <= 1
      },
      avg_duration_ms: Math.round(
        report.results.reduce((sum, r) => sum + r.duration_ms, 0) / report.results.length
      )
    };

    // ========================================
    // STEP 4: Final Job State Verification
    // ========================================
    if (uniqueJobIds.length > 0) {
      const finalJob = await base44.entities.Job.get(uniqueJobIds[0]);
      report.final_job_state = {
        id: finalJob.id,
        name: finalJob.name,
        provisioning_status: finalJob.provisioning_status,
        provisioning_attempts: finalJob.provisioning_attempts,
        provisioning_steps: finalJob.provisioning_steps,
        has_drive_folder: !!finalJob.drive_folder_url,
        has_field_project: !!finalJob.field_project_id,
        last_error: finalJob.provisioning_last_error
      };
    }

    // ========================================
    // VERDICT
    // ========================================
    const allIdempotent = 
      report.summary.idempotency_check.jobs_ok &&
      report.summary.idempotency_check.drive_ok &&
      report.summary.idempotency_check.field_ok;

    report.verdict = allIdempotent ? '✅ PASS - Idempotency preserved' : '❌ FAIL - Duplicates created';
    report.pass = allIdempotent;

    return Response.json(report, { status: 200 });

  } catch (error) {
    return Response.json({
      error: error.message,
      stack: error.stack,
      verdict: '❌ FAIL - Test crashed'
    }, { status: 500 });
  }
});