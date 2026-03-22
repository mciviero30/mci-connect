import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('[Calendar Test] Starting comprehensive end-to-end test...');

    const results = {
      success: true,
      tests: [],
      errors: [],
      summary: {},
    };

    // 1. Fetch test data
    console.log('[Test 1] Fetching active jobs...');
    const jobs = await base44.asServiceRole.entities.Job.filter({ status: 'active' }, '', 5);
    results.tests.push({ name: 'Fetch Jobs', passed: jobs.length > 0, count: jobs.length });
    
    if (jobs.length === 0) {
      results.errors.push('No active jobs found for testing');
      results.success = false;
      return Response.json(results);
    }

    console.log('[Test 2] Fetching employees...');
    const employees = await base44.asServiceRole.entities.User.filter({ employment_status: 'active' }, '', 5);
    results.tests.push({ name: 'Fetch Employees', passed: employees.length > 0, count: employees.length });
    
    if (employees.length === 0) {
      results.errors.push('No active employees found for testing');
      results.success = false;
      return Response.json(results);
    }

    // 2. Create test assignments with different configurations
    console.log('[Test 3] Creating test assignments...');
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 1); // Tomorrow
    const dateStr = testDate.toISOString().split('T')[0];

    const testAssignments = [];

    // Test Case 1: Regular assignment without hour enforcement
    const assignment1 = await base44.asServiceRole.entities.JobAssignment.create({
      employee_email: employees[0].email,
      employee_name: employees[0].full_name,
      job_id: jobs[0].id,
      job_name: jobs[0].name,
      date: dateStr,
      start_time: '08:00',
      end_time: '17:00',
      enforce_scheduled_hours: false,
      event_type: 'job_milestone',
    });
    testAssignments.push(assignment1);
    results.tests.push({ 
      name: 'Create Regular Assignment', 
      passed: !!assignment1.id,
      assignment_id: assignment1.id 
    });

    // Test Case 2: Assignment WITH strict hour enforcement
    if (employees.length > 1 && jobs.length > 1) {
      const assignment2 = await base44.asServiceRole.entities.JobAssignment.create({
        employee_email: employees[1].email,
        employee_name: employees[1].full_name,
        job_id: jobs[1].id,
        job_name: jobs[1].name,
        date: dateStr,
        start_time: '07:00',
        end_time: '16:00',
        enforce_scheduled_hours: true,
        scheduled_start_time: '07:00',
        scheduled_end_time: '17:00',
        early_clockout_grace_minutes: 5,
        scheduled_break_minutes: 60,
        max_daily_hours: 8,
        event_type: 'job_milestone',
      });
      testAssignments.push(assignment2);
      results.tests.push({ 
        name: 'Create Controlled Hours Assignment', 
        passed: !!assignment2.id,
        assignment_id: assignment2.id,
        enforced: assignment2.enforce_scheduled_hours === true,
      });
    }

    // Test Case 3: Appointment (non-job event)
    if (employees.length > 2) {
      const assignment3 = await base44.asServiceRole.entities.JobAssignment.create({
        employee_email: employees[2].email,
        employee_name: employees[2].full_name,
        event_type: 'appointment',
        event_title: 'Team Meeting - Calendar Test',
        date: dateStr,
        start_time: '10:00',
        end_time: '11:00',
        enforce_scheduled_hours: false,
      });
      testAssignments.push(assignment3);
      results.tests.push({ 
        name: 'Create Appointment', 
        passed: !!assignment3.id,
        assignment_id: assignment3.id 
      });
    }

    // Test Case 4: Time-off request
    if (employees.length > 3) {
      const assignment4 = await base44.asServiceRole.entities.JobAssignment.create({
        employee_email: employees[3].email,
        employee_name: employees[3].full_name,
        event_type: 'time_off',
        event_title: 'Personal Day - Calendar Test',
        date: dateStr,
        enforce_scheduled_hours: false,
      });
      testAssignments.push(assignment4);
      results.tests.push({ 
        name: 'Create Time-Off', 
        passed: !!assignment4.id,
        assignment_id: assignment4.id 
      });
    }

    // 3. Verify assignments were created correctly
    console.log('[Test 4] Verifying created assignments...');
    const createdAssignments = await base44.asServiceRole.entities.JobAssignment.filter({ 
      date: dateStr 
    });
    
    const ourTestAssignments = createdAssignments.filter(a => 
      testAssignments.some(t => t.id === a.id)
    );

    results.tests.push({ 
      name: 'Verify Assignments Created', 
      passed: ourTestAssignments.length === testAssignments.length,
      expected: testAssignments.length,
      actual: ourTestAssignments.length,
    });

    // 4. Verify hour enforcement fields
    console.log('[Test 5] Validating hour enforcement fields...');
    const enforcedAssignment = testAssignments.find(a => a.enforce_scheduled_hours === true);
    if (enforcedAssignment) {
      const hasAllFields = 
        enforcedAssignment.scheduled_start_time &&
        enforcedAssignment.scheduled_end_time &&
        enforcedAssignment.early_clockout_grace_minutes !== undefined &&
        enforcedAssignment.scheduled_break_minutes !== undefined &&
        enforcedAssignment.max_daily_hours !== undefined;

      results.tests.push({
        name: 'Validate Hour Control Fields',
        passed: hasAllFields,
        fields: {
          scheduled_start_time: enforcedAssignment.scheduled_start_time,
          scheduled_end_time: enforcedAssignment.scheduled_end_time,
          grace_minutes: enforcedAssignment.early_clockout_grace_minutes,
          break_minutes: enforcedAssignment.scheduled_break_minutes,
          max_hours: enforcedAssignment.max_daily_hours,
        }
      });
    }

    // 5. Update test - modify one assignment
    console.log('[Test 6] Testing assignment updates...');
    if (testAssignments.length > 0) {
      const updateTest = await base44.asServiceRole.entities.JobAssignment.update(
        testAssignments[0].id,
        { notes: 'Updated via end-to-end test' }
      );
      results.tests.push({
        name: 'Update Assignment',
        passed: updateTest.notes === 'Updated via end-to-end test',
      });
    }

    // 6. Query assignments by employee
    console.log('[Test 7] Testing employee-specific queries...');
    if (employees.length > 0) {
      const employeeAssignments = await base44.asServiceRole.entities.JobAssignment.filter({
        employee_email: employees[0].email,
        date: dateStr,
      });
      results.tests.push({
        name: 'Query By Employee',
        passed: employeeAssignments.length > 0,
        count: employeeAssignments.length,
      });
    }

    // 7. Query assignments by job
    console.log('[Test 8] Testing job-specific queries...');
    if (jobs.length > 0) {
      const jobAssignments = await base44.asServiceRole.entities.JobAssignment.filter({
        job_id: jobs[0].id,
        date: dateStr,
      });
      results.tests.push({
        name: 'Query By Job',
        passed: jobAssignments.length > 0,
        count: jobAssignments.length,
      });
    }

    // 8. Cleanup test data
    console.log('[Test 9] Cleaning up test assignments...');
    let deletedCount = 0;
    for (const assignment of testAssignments) {
      try {
        await base44.asServiceRole.entities.JobAssignment.delete(assignment.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete assignment ${assignment.id}:`, error);
        results.errors.push(`Cleanup failed for ${assignment.id}`);
      }
    }
    results.tests.push({
      name: 'Cleanup Test Data',
      passed: deletedCount === testAssignments.length,
      deleted: deletedCount,
      expected: testAssignments.length,
    });

    // Summary
    const totalTests = results.tests.length;
    const passedTests = results.tests.filter(t => t.passed).length;
    results.summary = {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      successRate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
    };

    results.success = passedTests === totalTests && results.errors.length === 0;

    console.log('[Calendar Test] Completed:', results.summary);

    return Response.json(results);

  } catch (error) {
    console.error('[Calendar Test] Fatal error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
});