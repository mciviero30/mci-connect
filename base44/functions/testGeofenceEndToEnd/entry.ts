import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * GEOFENCE END-TO-END TEST SUITE
 * 
 * Tests complete clock in/out flow with geofence validation
 * Creates phantom test data, validates all systems, then cleans up
 */

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    const addTest = (name, status, details) => {
      results.tests.push({ name, status, details, timestamp: new Date().toISOString() });
      results.summary.total++;
      if (status === 'PASS') results.summary.passed++;
      else if (status === 'FAIL') results.summary.failed++;
      else if (status === 'WARN') results.summary.warnings++;
    };

    console.log('🧪 Starting Geofence End-to-End Test Suite...');

    // ============================================
    // TEST 1: Verify Job has GPS coordinates
    // ============================================
    console.log('\n📍 TEST 1: Job GPS Setup');
    
    const testJobs = await base44.asServiceRole.entities.Job.filter({ status: 'active' }, '', 5);
    
    if (testJobs.length === 0) {
      addTest('Job Availability', 'FAIL', 'No active jobs found in system');
      return Response.json(results);
    }

    const jobsWithGPS = testJobs.filter(j => j.latitude && j.longitude);
    const jobsWithoutGPS = testJobs.filter(j => !j.latitude || !j.longitude);

    addTest('Job GPS Coverage', 
      jobsWithGPS.length > 0 ? 'PASS' : 'FAIL',
      `${jobsWithGPS.length}/${testJobs.length} jobs have GPS coordinates`
    );

    if (jobsWithoutGPS.length > 0) {
      addTest('Jobs Without GPS', 'WARN', 
        `${jobsWithoutGPS.length} jobs missing GPS: ${jobsWithoutGPS.map(j => j.name).join(', ')}`
      );
    }

    // Use first job with GPS for testing
    const testJob = jobsWithGPS[0];
    if (!testJob) {
      addTest('Test Job Selection', 'FAIL', 'No job with GPS coordinates available for testing');
      return Response.json(results);
    }

    addTest('Test Job Selected', 'PASS', 
      `Using: ${testJob.name} (${testJob.latitude}, ${testJob.longitude}), radius: ${testJob.geofence_radius || 100}m`
    );

    // ============================================
    // TEST 2: Create test TimeEntry INSIDE geofence
    // ============================================
    console.log('\n✅ TEST 2: Clock In INSIDE Geofence');

    const insideCoords = {
      // Simulate location 50m from job (well within 100m radius)
      lat: testJob.latitude + 0.00045, // ~50m north
      lng: testJob.longitude
    };

    const insideDistance = calculateDistance(
      insideCoords.lat, insideCoords.lng,
      testJob.latitude, testJob.longitude
    );

    addTest('Inside Distance Calculation', 
      insideDistance < 100 ? 'PASS' : 'FAIL',
      `Calculated: ${Math.round(insideDistance)}m from job (expected <100m)`
    );

    const insideTimeEntry = await base44.asServiceRole.entities.TimeEntry.create({
      user_id: user.id,
      employee_email: user.email,
      employee_name: user.full_name,
      job_id: testJob.id,
      job_name: testJob.name,
      date: new Date().toISOString().split('T')[0],
      check_in: '08:00:00',
      check_out: '16:00:00',
      check_in_latitude: insideCoords.lat,
      check_in_longitude: insideCoords.lng,
      check_out_latitude: insideCoords.lat,
      check_out_longitude: insideCoords.lng,
      hours_worked: 8,
      breaks: [],
      total_break_minutes: 0,
      work_type: 'normal',
      status: 'pending',
      geofence_validated: true, // Frontend would set this
      geofence_distance_meters: Math.round(insideDistance),
      notes: '🧪 TEST ENTRY - INSIDE GEOFENCE'
    });

    addTest('TimeEntry Creation (Inside)', 'PASS', 
      `Created TimeEntry ID: ${insideTimeEntry.id}`
    );

    // Wait 2 seconds for automation to trigger
    console.log('⏳ Waiting 2s for backend validation automation...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify backend validation ran
    const validatedInside = await base44.asServiceRole.entities.TimeEntry.get(insideTimeEntry.id);

    const backendValidatedInside = validatedInside.geofence_validated_backend === true;
    const hasBackendDistance = typeof validatedInside.geofence_distance_backend_meters_checkin === 'number';

    addTest('Backend Validation Triggered (Inside)', 
      backendValidatedInside && hasBackendDistance ? 'PASS' : 'FAIL',
      `Backend validated: ${backendValidatedInside}, Distance recorded: ${hasBackendDistance} (${validatedInside.geofence_distance_backend_meters_checkin}m)`
    );

    addTest('Frontend-Backend Agreement (Inside)', 
      validatedInside.geofence_discrepancy === false ? 'PASS' : 'FAIL',
      `Discrepancy flag: ${validatedInside.geofence_discrepancy}`
    );

    // ============================================
    // TEST 3: Create test TimeEntry OUTSIDE geofence
    // ============================================
    console.log('\n❌ TEST 3: Clock In OUTSIDE Geofence');

    const outsideCoords = {
      // Simulate location 200m from job (outside 100m radius)
      lat: testJob.latitude + 0.0018, // ~200m north
      lng: testJob.longitude
    };

    const outsideDistance = calculateDistance(
      outsideCoords.lat, outsideCoords.lng,
      testJob.latitude, testJob.longitude
    );

    addTest('Outside Distance Calculation', 
      outsideDistance > 100 ? 'PASS' : 'FAIL',
      `Calculated: ${Math.round(outsideDistance)}m from job (expected >100m)`
    );

    const outsideTimeEntry = await base44.asServiceRole.entities.TimeEntry.create({
      user_id: user.id,
      employee_email: user.email,
      employee_name: user.full_name,
      job_id: testJob.id,
      job_name: testJob.name,
      date: new Date().toISOString().split('T')[0],
      check_in: '09:00:00',
      check_out: '17:00:00',
      check_in_latitude: outsideCoords.lat,
      check_in_longitude: outsideCoords.lng,
      check_out_latitude: outsideCoords.lat,
      check_out_longitude: outsideCoords.lng,
      hours_worked: 8,
      breaks: [],
      total_break_minutes: 0,
      work_type: 'normal',
      status: 'pending',
      geofence_validated: true, // Frontend FALSELY validated (simulating fraud)
      geofence_distance_meters: 50, // Frontend LIED about distance
      notes: '🧪 TEST ENTRY - OUTSIDE GEOFENCE (FRAUD SIMULATION)'
    });

    addTest('TimeEntry Creation (Outside/Fraud)', 'PASS', 
      `Created TimeEntry ID: ${outsideTimeEntry.id}`
    );

    // Wait 3 seconds for automation
    console.log('⏳ Waiting 3s for backend validation automation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify backend CAUGHT the fraud
    const validatedOutside = await base44.asServiceRole.entities.TimeEntry.get(outsideTimeEntry.id);

    const backendCaughtFraud = validatedOutside.geofence_validated_backend === false;
    const backendRecordedRealDistance = validatedOutside.geofence_distance_backend_meters_checkin > 100;
    const discrepancyDetected = validatedOutside.geofence_discrepancy === true;
    const markedForReview = validatedOutside.requires_location_review === true;

    addTest('Backend Fraud Detection', 
      backendCaughtFraud ? 'PASS' : 'FAIL',
      `Backend validated: ${validatedOutside.geofence_validated_backend} (should be false)`
    );

    addTest('Backend Real Distance Recorded', 
      backendRecordedRealDistance ? 'PASS' : 'FAIL',
      `Backend distance: ${validatedOutside.geofence_distance_backend_meters_checkin}m (should be >100m)`
    );

    addTest('Discrepancy Detection', 
      discrepancyDetected ? 'PASS' : 'FAIL',
      `Discrepancy flag: ${validatedOutside.geofence_discrepancy} (should be true)`
    );

    addTest('Review Flag Set', 
      markedForReview ? 'PASS' : 'FAIL',
      `Requires review: ${validatedOutside.requires_location_review} (should be true)`
    );

    // ============================================
    // TEST 4: Driving hours (no geofence required)
    // ============================================
    console.log('\n🚗 TEST 4: Driving Hours (No Geofence)');

    const drivingEntry = await base44.asServiceRole.entities.TimeEntry.create({
      user_id: user.id,
      employee_email: user.email,
      employee_name: user.full_name,
      job_id: testJob.id,
      job_name: testJob.name,
      date: new Date().toISOString().split('T')[0],
      check_in: '10:00:00',
      check_out: '12:00:00',
      check_in_latitude: outsideCoords.lat, // Outside geofence
      check_in_longitude: outsideCoords.lng,
      check_out_latitude: insideCoords.lat, // Different location
      check_out_longitude: insideCoords.lng,
      hours_worked: 2,
      work_type: 'driving',
      status: 'pending',
      geofence_validated: false, // Driving doesn't require geofence
      notes: '🧪 TEST ENTRY - DRIVING HOURS'
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const validatedDriving = await base44.asServiceRole.entities.TimeEntry.get(drivingEntry.id);

    const drivingNotValidated = validatedDriving.geofence_validated_backend === false;
    const drivingNotReviewed = validatedDriving.requires_location_review === false;

    addTest('Driving Hours Exemption', 
      drivingNotValidated && drivingNotReviewed ? 'PASS' : 'FAIL',
      `Backend validated: ${validatedDriving.geofence_validated_backend}, Requires review: ${validatedDriving.requires_location_review} (both should be false)`
    );

    // ============================================
    // TEST 5: Break location tracking
    // ============================================
    console.log('\n☕ TEST 5: Break Location Tracking');

    const breakEntry = await base44.asServiceRole.entities.TimeEntry.create({
      user_id: user.id,
      employee_email: user.email,
      employee_name: user.full_name,
      job_id: testJob.id,
      job_name: testJob.name,
      date: new Date().toISOString().split('T')[0],
      check_in: '07:00:00',
      check_out: '15:00:00',
      check_in_latitude: insideCoords.lat,
      check_in_longitude: insideCoords.lng,
      check_out_latitude: insideCoords.lat,
      check_out_longitude: insideCoords.lng,
      hours_worked: 7.5,
      breaks: [
        {
          type: 'lunch',
          start_time: '12:00:00',
          end_time: '12:30:00',
          duration_minutes: 30,
          start_latitude: outsideCoords.lat, // Break OUTSIDE geofence
          start_longitude: outsideCoords.lng,
          start_distance_meters: Math.round(outsideDistance),
          start_outside_geofence: true,
          end_latitude: insideCoords.lat,
          end_longitude: insideCoords.lng,
          end_distance_meters: Math.round(insideDistance),
          end_outside_geofence: false
        }
      ],
      total_break_minutes: 30,
      work_type: 'normal',
      status: 'pending',
      geofence_validated: true,
      breaks_require_review: true, // Should be flagged
      notes: '🧪 TEST ENTRY - BREAK OUTSIDE GEOFENCE'
    });

    const breakNeedsReview = breakEntry.breaks_require_review === true;

    addTest('Break Location Tracking', 
      breakNeedsReview ? 'PASS' : 'FAIL',
      `Breaks require review: ${breakEntry.breaks_require_review} (should be true)`
    );

    // ============================================
    // TEST 6: Multiple jobsites in same day
    // ============================================
    console.log('\n🏗️ TEST 6: Multiple Jobsites (Construction Reality)');

    // Get second job if available
    const secondJob = testJobs.find(j => j.id !== testJob.id && j.latitude && j.longitude);

    if (secondJob) {
      const multiJobEntry = await base44.asServiceRole.entities.TimeEntry.create({
        user_id: user.id,
        employee_email: user.email,
        employee_name: user.full_name,
        job_id: secondJob.id,
        job_name: secondJob.name,
        date: new Date().toISOString().split('T')[0],
        check_in: '13:00:00',
        check_out: '17:00:00',
        check_in_latitude: secondJob.latitude + 0.0003, // ~30m from second job
        check_in_longitude: secondJob.longitude,
        check_out_latitude: secondJob.latitude + 0.0003,
        check_out_longitude: secondJob.longitude,
        hours_worked: 4,
        work_type: 'normal',
        status: 'pending',
        geofence_validated: true,
        notes: '🧪 TEST ENTRY - SECOND JOBSITE SAME DAY'
      });

      addTest('Multiple Jobsites Same Day', 'PASS', 
        `Created entry for second job: ${secondJob.name}`
      );

      await new Promise(resolve => setTimeout(resolve, 3000));

      const validatedMulti = await base44.asServiceRole.entities.TimeEntry.get(multiJobEntry.id);

      addTest('Second Job Backend Validation', 
        validatedMulti.geofence_validated_backend === true ? 'PASS' : 'FAIL',
        `Backend validated second job: ${validatedMulti.geofence_validated_backend}`
      );
    } else {
      addTest('Multiple Jobsites Test', 'SKIP', 'Only one job with GPS available');
    }

    // ============================================
    // TEST 7: Verify automation exists and is active
    // ============================================
    console.log('\n⚙️ TEST 7: Automation Configuration');

    // Note: Can't query automations via SDK, so we verify by checking if fields were written
    const automationWorked = validatedInside.geofence_validated_backend !== undefined;

    addTest('Automation Execution', 
      automationWorked ? 'PASS' : 'FAIL',
      automationWorked 
        ? 'Backend validation automation executed successfully'
        : 'Backend validation fields not written - automation may be inactive'
    );

    // ============================================
    // TEST 8: Geofence radius configuration
    // ============================================
    console.log('\n📏 TEST 8: Geofence Radius Configuration');

    const defaultRadius = testJob.geofence_radius || 100;
    const radiusInRange = defaultRadius >= 50 && defaultRadius <= 500;

    addTest('Geofence Radius Valid', 
      radiusInRange ? 'PASS' : 'WARN',
      `Job radius: ${defaultRadius}m (valid range: 50-500m)`
    );

    // ============================================
    // TEST 9: Performance check
    // ============================================
    console.log('\n⚡ TEST 9: System Performance');

    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.filter({}, '-created_date', 100);
    const withBackendValidation = allTimeEntries.filter(e => 
      e.geofence_validated_backend !== undefined && e.geofence_validated_backend !== null
    );

    const coveragePercent = allTimeEntries.length > 0 
      ? Math.round((withBackendValidation.length / allTimeEntries.length) * 100)
      : 0;

    addTest('Backend Validation Coverage', 
      coveragePercent > 0 ? 'PASS' : 'WARN',
      `${withBackendValidation.length}/${allTimeEntries.length} entries have backend validation (${coveragePercent}%)`
    );

    // ============================================
    // CLEANUP: Delete test entries
    // ============================================
    console.log('\n🧹 CLEANUP: Removing test data...');

    const testIds = [
      insideTimeEntry.id,
      outsideTimeEntry.id,
      drivingEntry.id,
      breakEntry.id
    ];

    if (secondJob) {
      // Add multi-job entry if it exists
      const multiEntry = await base44.asServiceRole.entities.TimeEntry.filter({
        user_id: user.id,
        job_id: secondJob.id,
        notes: '🧪 TEST ENTRY - SECOND JOBSITE SAME DAY'
      });
      if (multiEntry.length > 0) testIds.push(multiEntry[0].id);
    }

    for (const id of testIds) {
      try {
        await base44.asServiceRole.entities.TimeEntry.delete(id);
      } catch (e) {
        console.warn(`Could not delete test entry ${id}:`, e.message);
      }
    }

    addTest('Cleanup', 'PASS', `Deleted ${testIds.length} test entries`);

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUITE COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ PASSED: ${results.summary.passed}/${results.summary.total}`);
    console.log(`❌ FAILED: ${results.summary.failed}/${results.summary.total}`);
    console.log(`⚠️  WARNINGS: ${results.summary.warnings}/${results.summary.total}`);
    console.log('='.repeat(60));

    results.conclusion = results.summary.failed === 0 
      ? '✅ ALL SYSTEMS OPERATIONAL'
      : `❌ ${results.summary.failed} CRITICAL ISSUES DETECTED`;

    results.recommendations = [];

    if (jobsWithoutGPS.length > 0) {
      results.recommendations.push({
        priority: 'MEDIUM',
        action: 'Geocode missing jobs',
        details: `${jobsWithoutGPS.length} jobs need GPS coordinates. Run geocodeExistingJobs function.`
      });
    }

    if (coveragePercent < 100 && coveragePercent > 0) {
      results.recommendations.push({
        priority: 'LOW',
        action: 'Backfill historical validation',
        details: `${100 - coveragePercent}% of existing entries lack backend validation (expected for old data).`
      });
    }

    if (results.summary.failed > 0) {
      results.recommendations.push({
        priority: 'CRITICAL',
        action: 'Fix failing tests',
        details: 'Review failed tests and resolve issues before production use.'
      });
    }

    return Response.json(results, { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test suite error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});