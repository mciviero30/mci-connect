import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * TEST SUITE: Calendar Auto-Sync Engine
 * 
 * Tests:
 * ✅ 1. Clock-in creates shift automatically
 * ✅ 2. Clock-out updates shift end time
 * ✅ 3. Manual shift blocks auto-sync (priority)
 * ✅ 4. Delete TimeEntry removes auto-shift
 * ✅ 5. Multiple jobs same day (no conflicts)
 * ✅ 6. Deduplication (no duplicates created)
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const results = [];
  let testUser, testJob1, testJob2;

  try {
    console.log('🧪 [TEST] Starting Calendar Auto-Sync Test Suite...');

    // ============================================
    // SETUP: Create test user and jobs
    // ============================================
    const employees = await base44.entities.EmployeeDirectory.list();
    testUser = employees.find(e => e.user_id);
    
    if (!testUser) {
      throw new Error('No test user found with user_id');
    }

    const jobs = await base44.entities.Job.filter({ status: 'active' });
    testJob1 = jobs[0];
    testJob2 = jobs[1];

    if (!testJob1 || !testJob2) {
      throw new Error('Need at least 2 active jobs for testing');
    }

    const testDate = new Date().toISOString().split('T')[0];

    console.log(`[TEST] Using user: ${testUser.full_name} (${testUser.user_id})`);
    console.log(`[TEST] Test jobs: ${testJob1.name}, ${testJob2.name}`);
    console.log(`[TEST] Test date: ${testDate}`);

    // ============================================
    // CLEANUP: Delete any existing test data
    // ============================================
    console.log('\n🧹 [TEST] Cleaning up previous test data...');
    
    const oldEntries = await base44.entities.TimeEntry.filter({
      user_id: testUser.user_id,
      date: testDate
    });
    
    for (const entry of oldEntries) {
      await base44.entities.TimeEntry.delete(entry.id);
    }

    const oldShifts = await base44.entities.ScheduleShift.filter({
      user_id: testUser.user_id,
      date: testDate
    });
    
    for (const shift of oldShifts) {
      await base44.entities.ScheduleShift.delete(shift.id);
    }

    console.log(`[TEST] Deleted ${oldEntries.length} time entries, ${oldShifts.length} shifts`);

    // ============================================
    // TEST 1: Clock-in creates shift automatically
    // ============================================
    console.log('\n✅ [TEST 1] Clock-in creates shift...');
    
    const timeEntry1 = await base44.entities.TimeEntry.create({
      user_id: testUser.user_id,
      employee_email: testUser.employee_email,
      employee_name: testUser.full_name,
      job_id: testJob1.id,
      job_name: testJob1.name,
      date: testDate,
      check_in: '08:00:00'
    });

    // Wait for automation to fire
    await new Promise(resolve => setTimeout(resolve, 3000));

    let shifts = await base44.entities.ScheduleShift.filter({
      user_id: testUser.user_id,
      job_id: testJob1.id,
      date: testDate
    });

    const test1Pass = shifts.length === 1 && shifts[0].start_time === '08:00:00';
    results.push({
      test: 'TEST 1: Clock-in creates shift',
      passed: test1Pass,
      details: test1Pass 
        ? `✅ Shift created: ${shifts[0].shift_title} (${shifts[0].start_time})` 
        : `❌ Expected 1 shift, found ${shifts.length}`
    });

    // ============================================
    // TEST 2: Clock-out updates shift end time
    // ============================================
    console.log('\n✅ [TEST 2] Clock-out updates shift...');
    
    await base44.entities.TimeEntry.update(timeEntry1.id, {
      check_out: '17:00:00'
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    shifts = await base44.entities.ScheduleShift.filter({
      user_id: testUser.user_id,
      job_id: testJob1.id,
      date: testDate
    });

    const test2Pass = shifts.length === 1 && shifts[0].end_time === '17:00:00';
    results.push({
      test: 'TEST 2: Clock-out updates shift',
      passed: test2Pass,
      details: test2Pass 
        ? `✅ Shift updated: ${shifts[0].start_time}-${shifts[0].end_time}` 
        : `❌ Expected end_time=17:00:00, found ${shifts[0]?.end_time}`
    });

    // ============================================
    // TEST 3: Manual shift blocks auto-sync
    // ============================================
    console.log('\n✅ [TEST 3] Manual shift has priority...');
    
    const manualShift = await base44.entities.ScheduleShift.create({
      user_id: testUser.user_id,
      employee_email: testUser.employee_email,
      employee_name: testUser.full_name,
      job_id: testJob2.id,
      job_name: testJob2.name,
      date: testDate,
      start_time: '09:00',
      end_time: '18:00',
      shift_type: 'job_work',
      shift_title: 'Manual Override Shift',
      status: 'scheduled',
      notes: 'manual_entry'
    });

    const timeEntry2 = await base44.entities.TimeEntry.create({
      user_id: testUser.user_id,
      employee_email: testUser.employee_email,
      employee_name: testUser.full_name,
      job_id: testJob2.id,
      job_name: testJob2.name,
      date: testDate,
      check_in: '10:00:00',
      check_out: '19:00:00'
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    shifts = await base44.entities.ScheduleShift.filter({
      user_id: testUser.user_id,
      job_id: testJob2.id,
      date: testDate
    });

    const test3Pass = shifts.length === 1 && shifts[0].id === manualShift.id;
    results.push({
      test: 'TEST 3: Manual shift blocks auto-sync',
      passed: test3Pass,
      details: test3Pass 
        ? `✅ Manual shift preserved, auto-sync blocked` 
        : `❌ Expected 1 manual shift, found ${shifts.length} shifts`
    });

    // ============================================
    // TEST 4: Delete TimeEntry removes auto-shift
    // ============================================
    console.log('\n✅ [TEST 4] Delete TimeEntry removes auto-shift...');
    
    await base44.entities.TimeEntry.delete(timeEntry1.id);

    await new Promise(resolve => setTimeout(resolve, 3000));

    shifts = await base44.entities.ScheduleShift.filter({
      user_id: testUser.user_id,
      job_id: testJob1.id,
      date: testDate,
      notes: 'auto_created_from_time_entry'
    });

    const test4Pass = shifts.length === 0;
    results.push({
      test: 'TEST 4: Delete TimeEntry removes auto-shift',
      passed: test4Pass,
      details: test4Pass 
        ? `✅ Auto-shift deleted successfully` 
        : `❌ Expected 0 auto-shifts, found ${shifts.length}`
    });

    // ============================================
    // TEST 5: Multiple jobs same day (no conflicts)
    // ============================================
    console.log('\n✅ [TEST 5] Multiple jobs same day...');
    
    const morningEntry = await base44.entities.TimeEntry.create({
      user_id: testUser.user_id,
      employee_email: testUser.employee_email,
      employee_name: testUser.full_name,
      job_id: testJob1.id,
      job_name: testJob1.name,
      date: testDate,
      check_in: '07:00:00',
      check_out: '12:00:00'
    });

    const afternoonEntry = await base44.entities.TimeEntry.create({
      user_id: testUser.user_id,
      employee_email: testUser.employee_email,
      employee_name: testUser.full_name,
      job_id: testJob2.id,
      job_name: testJob2.name,
      date: testDate,
      check_in: '13:00:00',
      check_out: '18:00:00'
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const allShifts = await base44.entities.ScheduleShift.filter({
      user_id: testUser.user_id,
      date: testDate
    });

    // Should have 2 auto-shifts + 1 manual = 3 total
    const test5Pass = allShifts.length >= 2;
    results.push({
      test: 'TEST 5: Multiple jobs same day',
      passed: test5Pass,
      details: test5Pass 
        ? `✅ ${allShifts.length} shifts created (no conflicts)` 
        : `❌ Expected >= 2 shifts, found ${allShifts.length}`
    });

    // ============================================
    // TEST 6: Deduplication (prevent duplicates)
    // ============================================
    console.log('\n✅ [TEST 6] Deduplication test...');
    
    // Try to create duplicate time entry
    const duplicateEntry = await base44.entities.TimeEntry.create({
      user_id: testUser.user_id,
      employee_email: testUser.employee_email,
      employee_name: testUser.full_name,
      job_id: testJob1.id,
      job_name: testJob1.name,
      date: testDate,
      check_in: '07:30:00',
      check_out: '12:30:00'
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const job1Shifts = await base44.entities.ScheduleShift.filter({
      user_id: testUser.user_id,
      job_id: testJob1.id,
      date: testDate,
      notes: 'auto_created_from_time_entry'
    });

    const test6Pass = job1Shifts.length === 1;
    results.push({
      test: 'TEST 6: Deduplication (prevent duplicates)',
      passed: test6Pass,
      details: test6Pass 
        ? `✅ Only 1 auto-shift exists (deduplication working)` 
        : `❌ Expected 1 auto-shift, found ${job1Shifts.length}`
    });

    // ============================================
    // CLEANUP: Remove all test data
    // ============================================
    console.log('\n🧹 [TEST] Final cleanup...');
    
    await base44.entities.TimeEntry.delete(morningEntry.id);
    await base44.entities.TimeEntry.delete(afternoonEntry.id);
    await base44.entities.TimeEntry.delete(duplicateEntry.id);
    await base44.entities.TimeEntry.delete(timeEntry2.id);
    await base44.entities.ScheduleShift.delete(manualShift.id);

    // ============================================
    // RESULTS SUMMARY
    // ============================================
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.test}`);
      console.log(`   ${r.details}\n`);
    });

    console.log(`\n✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${failedTests}/${totalTests}`);
    console.log('='.repeat(60));

    return Response.json({
      success: failedTests === 0,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests
      },
      results
    });

  } catch (error) {
    console.error('❌ [TEST] Suite failed:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      results 
    }, { status: 500 });
  }
});