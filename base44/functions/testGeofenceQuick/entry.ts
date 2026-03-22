import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * QUICK GEOFENCE TEST - Creates ONE test entry and waits to verify automation
 * Does NOT clean up - leaves data for manual inspection
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

    console.log('🧪 Quick Geofence Test Starting...');

    // Get first active job with GPS
    const jobs = await base44.asServiceRole.entities.Job.filter({ status: 'active' }, '', 5);
    const testJob = jobs.find(j => j.latitude && j.longitude);

    if (!testJob) {
      return Response.json({ error: 'No job with GPS coordinates found' });
    }

    console.log(`✅ Using job: ${testJob.name} at (${testJob.latitude}, ${testJob.longitude})`);
    console.log(`   Geofence radius: ${testJob.geofence_radius || 100}m`);

    // Create coords 200m away (OUTSIDE geofence)
    const outsideCoords = {
      lat: testJob.latitude + 0.0018, // ~200m
      lng: testJob.longitude
    };

    const expectedDistance = calculateDistance(
      outsideCoords.lat, outsideCoords.lng,
      testJob.latitude, testJob.longitude
    );

    console.log(`📍 Test coords: ${Math.round(expectedDistance)}m from job (should be ~200m)`);

    // Create TimeEntry with FRAUD (says it's inside, but coords are outside)
    console.log('📝 Creating TimeEntry with fraud simulation...');
    
    const timeEntry = await base44.asServiceRole.entities.TimeEntry.create({
      user_id: user.id,
      employee_email: user.email,
      employee_name: user.full_name,
      job_id: testJob.id,
      job_name: testJob.name,
      date: new Date().toISOString().split('T')[0],
      check_in: '08:00:00',
      check_out: '16:00:00',
      check_in_latitude: outsideCoords.lat,
      check_in_longitude: outsideCoords.lng,
      check_out_latitude: outsideCoords.lat,
      check_out_longitude: outsideCoords.lng,
      hours_worked: 8,
      work_type: 'normal',
      status: 'pending',
      geofence_validated: true, // FRAUD: Frontend says OK
      geofence_distance_meters: 50, // FRAUD: Frontend lies about distance
      notes: '🧪 QUICK TEST - DELETE ME'
    });

    console.log(`✅ TimeEntry created: ${timeEntry.id}`);
    console.log(`   Frontend said: validated=true, distance=50m`);
    console.log(`   Reality: distance=${Math.round(expectedDistance)}m (FRAUD)`);

    // Wait for automation to execute
    console.log('⏳ Waiting 5 seconds for automation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Re-fetch to see backend validation results
    const validated = await base44.asServiceRole.entities.TimeEntry.get(timeEntry.id);

    console.log('\n📊 BACKEND VALIDATION RESULTS:');
    console.log('─'.repeat(60));
    console.log(`geofence_validated_backend: ${validated.geofence_validated_backend}`);
    console.log(`geofence_distance_backend_meters_checkin: ${validated.geofence_distance_backend_meters_checkin}`);
    console.log(`geofence_distance_backend_meters_checkout: ${validated.geofence_distance_backend_meters_checkout}`);
    console.log(`geofence_discrepancy: ${validated.geofence_discrepancy}`);
    console.log(`requires_location_review: ${validated.requires_location_review}`);
    console.log('─'.repeat(60));

    // Analyze results
    const tests = {
      automation_executed: validated.geofence_validated_backend !== undefined,
      fraud_detected: validated.geofence_validated_backend === false,
      real_distance_recorded: validated.geofence_distance_backend_meters_checkin > 100,
      discrepancy_flagged: validated.geofence_discrepancy === true,
      review_required: validated.requires_location_review === true
    };

    const allPassed = Object.values(tests).every(v => v === true);

    console.log('\n🎯 TEST RESULTS:');
    Object.entries(tests).forEach(([key, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${key}: ${passed}`);
    });

    const verdict = allPassed 
      ? '✅ ALL SYSTEMS OPERATIONAL - Geofencing 100% functional'
      : '❌ ISSUES DETECTED - See details above';

    console.log(`\n${verdict}`);

    return Response.json({
      verdict,
      test_entry_id: timeEntry.id,
      expected_distance: Math.round(expectedDistance),
      backend_results: {
        validated: validated.geofence_validated_backend,
        distance_checkin: validated.geofence_distance_backend_meters_checkin,
        distance_checkout: validated.geofence_distance_backend_meters_checkout,
        discrepancy: validated.geofence_discrepancy,
        needs_review: validated.requires_location_review
      },
      tests,
      all_passed: allPassed,
      note: 'Test entry NOT deleted - check TimeEntry list for "🧪 QUICK TEST - DELETE ME"'
    });

  } catch (error) {
    console.error('Test error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});