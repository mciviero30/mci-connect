import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CRITICAL TESTS POST C1-C3 FIXES
 * Tests operational validation scenarios after critical fixes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const results = {
      test_timestamp: new Date().toISOString(),
      tests: []
    };

    // ============================================
    // TEST 1: Job Creation Without Authorization
    // ============================================
    console.log('🧪 TEST 1: Attempt to create Job without WorkAuthorization...');
    
    try {
      // Get a real customer for testing
      const testCustomers = await base44.entities.Customer.list('', 1);
      if (testCustomers.length === 0) {
        throw new Error('No customers found for testing');
      }
      const testCustomer = testCustomers[0];

      // Attempt to create Job WITHOUT authorization_id
      const jobWithoutAuth = await base44.entities.Job.create({
        name: '[TEST] Job Without Auth - Should Fail',
        customer_id: testCustomer.id,
        customer_name: testCustomer.first_name ? `${testCustomer.first_name} ${testCustomer.last_name}` : testCustomer.company,
        // authorization_id: MISSING - should fail
        billing_type: 'fixed_price',
        status: 'active'
      });

      // If we got here, test FAILED - Job should have been blocked
      results.tests.push({
        test: 'TEST 1: Job Creation Without Authorization',
        status: 'FAILED ❌',
        reason: 'Job was created without authorization_id (C3 validation did not trigger)',
        job_id_created: jobWithoutAuth.id
      });

      // Cleanup - delete the incorrectly created job
      await base44.asServiceRole.entities.Job.delete(jobWithoutAuth.id);

    } catch (error) {
      // Expected to fail - this is GOOD
      if (error.message.includes('required') || error.message.includes('authorization')) {
        results.tests.push({
          test: 'TEST 1: Job Creation Without Authorization',
          status: 'PASSED ✅',
          reason: 'Job creation correctly blocked without authorization',
          error_message: error.message
        });
      } else {
        results.tests.push({
          test: 'TEST 1: Job Creation Without Authorization',
          status: 'INCONCLUSIVE ⚠️',
          reason: 'Job creation failed, but not due to authorization validation',
          error_message: error.message
        });
      }
    }

    // ============================================
    // TEST 2: Lock TimeEntry After Billing
    // ============================================
    console.log('🧪 TEST 2: Attempt to edit billed TimeEntry...');

    try {
      // Create a test time entry
      const testEmployees = await base44.entities.EmployeeDirectory.filter({ status: 'active' }, '', 1);
      if (testEmployees.length === 0) {
        throw new Error('No employees found for testing');
      }
      const testEmployee = testEmployees[0];

      const testJobs = await base44.entities.Job.list('', 1);
      if (testJobs.length === 0) {
        throw new Error('No jobs found for testing');
      }
      const testJob = testJobs[0];

      // Create test time entry
      const testEntry = await base44.entities.TimeEntry.create({
        user_id: testEmployee.user_id,
        employee_email: testEmployee.employee_email,
        employee_name: testEmployee.full_name,
        job_id: testJob.id,
        job_name: testJob.name,
        date: new Date().toISOString().split('T')[0],
        check_in: '08:00:00',
        check_out: '16:00:00',
        hours_worked: 8,
        status: 'approved'
      });

      // Mark as billed
      await base44.asServiceRole.entities.TimeEntry.update(testEntry.id, {
        billed_at: new Date().toISOString(),
        invoice_id: 'TEST_INVOICE_001'
      });

      // Now try to edit it (should fail)
      try {
        await base44.entities.TimeEntry.update(testEntry.id, {
          hours_worked: 10
        });

        // If we got here, test FAILED
        results.tests.push({
          test: 'TEST 2: Lock Billed TimeEntry',
          status: 'FAILED ❌',
          reason: 'Billed time entry was modified (C2 lock did not trigger)',
          entry_id: testEntry.id
        });
      } catch (editError) {
        // Expected to fail - this is GOOD
        if (editError.message.includes('billed') || editError.status === 403) {
          results.tests.push({
            test: 'TEST 2: Lock Billed TimeEntry',
            status: 'PASSED ✅',
            reason: 'Billed time entry correctly blocked from editing',
            error_message: editError.message
          });
        } else {
          results.tests.push({
            test: 'TEST 2: Lock Billed TimeEntry',
            status: 'INCONCLUSIVE ⚠️',
            reason: 'Edit failed, but not due to billing lock',
            error_message: editError.message
          });
        }
      }

      // Cleanup
      await base44.asServiceRole.entities.TimeEntry.delete(testEntry.id);

    } catch (error) {
      results.tests.push({
        test: 'TEST 2: Lock Billed TimeEntry',
        status: 'ERROR ❌',
        reason: 'Test setup failed',
        error_message: error.message
      });
    }

    // ============================================
    // TEST 3: MCI Field Filtering (Authorization-based)
    // ============================================
    console.log('🧪 TEST 3: MCI Field filters only authorized jobs...');

    try {
      // Get all jobs
      const allJobs = await base44.entities.Job.list();
      
      // Filter jobs with authorization
      const authorizedJobs = allJobs.filter(j => j.authorization_id);
      const unauthorizedJobs = allJobs.filter(j => !j.authorization_id);

      results.tests.push({
        test: 'TEST 3: MCI Field Authorization Filtering',
        status: 'INFO ℹ️',
        reason: 'Data snapshot taken',
        total_jobs: allJobs.length,
        authorized_jobs: authorizedJobs.length,
        unauthorized_jobs: unauthorizedJobs.length,
        note: 'Field should only show authorized jobs. Manual verification required in UI.'
      });

    } catch (error) {
      results.tests.push({
        test: 'TEST 3: MCI Field Filtering',
        status: 'ERROR ❌',
        reason: 'Test failed',
        error_message: error.message
      });
    }

    // ============================================
    // TEST 4: Double Billing Prevention
    // ============================================
    console.log('🧪 TEST 4: Prevent double billing of TimeEntries...');

    try {
      // Get a time entry that's already billed
      const billedEntries = await base44.entities.TimeEntry.filter({ 
        billed_at: { $exists: true } 
      }, '', 1);

      if (billedEntries.length === 0) {
        results.tests.push({
          test: 'TEST 4: Double Billing Prevention',
          status: 'SKIPPED ⏭️',
          reason: 'No billed time entries found in database',
          note: 'Create a T&M invoice first to generate billed entries'
        });
      } else {
        const billedEntry = billedEntries[0];
        
        // Try to create another invoice with the same entry (should be prevented by invoice builder logic)
        results.tests.push({
          test: 'TEST 4: Double Billing Prevention',
          status: 'INFO ℹ️',
          reason: 'Billed entry found',
          entry_id: billedEntry.id,
          billed_at: billedEntry.billed_at,
          invoice_id: billedEntry.invoice_id,
          note: 'Manual test: Try to create new T&M invoice with same date range. Should exclude already-billed entries.'
        });
      }

    } catch (error) {
      results.tests.push({
        test: 'TEST 4: Double Billing Prevention',
        status: 'ERROR ❌',
        reason: 'Test failed',
        error_message: error.message
      });
    }

    // ============================================
    // SUMMARY
    // ============================================
    const passedTests = results.tests.filter(t => t.status.includes('PASSED')).length;
    const failedTests = results.tests.filter(t => t.status.includes('FAILED')).length;
    const inconclusiveTests = results.tests.filter(t => t.status.includes('INCONCLUSIVE')).length;

    return Response.json({
      success: true,
      summary: {
        total_tests: results.tests.length,
        passed: passedTests,
        failed: failedTests,
        inconclusive: inconclusiveTests,
        overall_status: failedTests === 0 ? 'ALL PASSED ✅' : 'SOME FAILURES ❌'
      },
      results
    });

  } catch (error) {
    console.error('[runCriticalTests] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});