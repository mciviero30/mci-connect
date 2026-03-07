import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * BACKEND GEOFENCE RE-VALIDATION - Autoridad Final
 * 
 * Triggered automatically when TimeEntry is created
 * Recalcula distancia usando coords almacenadas
 * Marca estado oficial independiente del frontend
 * 
 * NO bloquea creación, solo audita y marca flags
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * SAME LOGIC AS FRONTEND (geolocation.js) - single source of truth
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process create events
    if (event.type !== 'create') {
      return Response.json({ success: true, message: 'Not a create event, skipping' });
    }

    const timeEntry = data;
    
    // Skip validation for driving hours (no geofence required)
    if (timeEntry.work_type === 'driving') {
      await base44.asServiceRole.entities.TimeEntry.update(timeEntry.id, {
        geofence_validated_backend: false,
        geofence_discrepancy: false,
        requires_location_review: false,
        geofence_distance_backend_meters_checkin: 0,
        geofence_distance_backend_meters_checkout: 0,
      });
      
      return Response.json({ 
        success: true, 
        message: 'Driving hours - geofence not applicable' 
      });
    }

    // Get job coordinates
    const job = await base44.asServiceRole.entities.Job.get(timeEntry.job_id);
    
    if (!job || !job.latitude || !job.longitude) {
      // Job has no coordinates - cannot validate
      await base44.asServiceRole.entities.TimeEntry.update(timeEntry.id, {
        geofence_validated_backend: false,
        requires_location_review: true,
        geofence_discrepancy: false,
      });
      
      return Response.json({ 
        success: true, 
        message: 'Job has no GPS coordinates - marked for review' 
      });
    }

    // BACKEND RE-VALIDATION: Recalculate distances (AUTHORITY)
    const checkInLat = timeEntry.check_in_latitude;
    const checkInLng = timeEntry.check_in_longitude;
    const checkOutLat = timeEntry.check_out_latitude;
    const checkOutLng = timeEntry.check_out_longitude;

    if (!checkInLat || !checkInLng) {
      // No location data - cannot validate
      await base44.asServiceRole.entities.TimeEntry.update(timeEntry.id, {
        geofence_validated_backend: false,
        requires_location_review: true,
        geofence_discrepancy: false,
      });
      
      return Response.json({ 
        success: true, 
        message: 'No location data - marked for review' 
      });
    }

    // Calculate check-in distance (ALWAYS REQUIRED)
    const checkInDistance = calculateDistance(
      checkInLat,
      checkInLng,
      job.latitude,
      job.longitude
    );

    // Calculate check-out distance (if available)
    let checkOutDistance = null;
    if (checkOutLat && checkOutLng) {
      checkOutDistance = calculateDistance(
        checkOutLat,
        checkOutLng,
        job.latitude,
        job.longitude
      );
    }

    // Get geofence radius (default 100m)
    const maxDistance = job.geofence_radius || 100;

    // VALIDATION LOGIC
    const checkInValid = checkInDistance <= maxDistance;
    const checkOutValid = checkOutDistance === null || checkOutDistance <= maxDistance;
    const backendValidated = checkInValid && checkOutValid;

    // DISCREPANCY DETECTION
    const frontendValidated = timeEntry.geofence_validated || false;
    const hasDiscrepancy = frontendValidated !== backendValidated;

    // UPDATE FLAGS (backend authority)
    await base44.asServiceRole.entities.TimeEntry.update(timeEntry.id, {
      geofence_validated_backend: backendValidated,
      geofence_distance_backend_meters_checkin: Math.round(checkInDistance),
      geofence_distance_backend_meters_checkout: checkOutDistance ? Math.round(checkOutDistance) : null,
      geofence_discrepancy: hasDiscrepancy,
      requires_location_review: !backendValidated || hasDiscrepancy,
    });

    // PASO 4: Log backend discrepancy (deduplicated via telemetry)
    if (hasDiscrepancy) {
      // Telemetry structure matches frontend (for future aggregation)
      console.log('[🎯 Geofence Telemetry]', {
        event_type: 'geofence_backend_discrepancy',
        user_email: timeEntry.employee_email,
        job_id: job.id,
        distance_meters: Math.round(checkInDistance),
        source: 'backend',
        timestamp: new Date().toISOString(),
        metadata: {
          job_name: job.name,
          frontend_validated: frontendValidated,
          backend_validated: backendValidated,
          check_in_distance: Math.round(checkInDistance),
          check_out_distance: checkOutDistance ? Math.round(checkOutDistance) : null,
          max_distance: maxDistance
        }
      });
    }

    // LOG RESULTS (for audit trail)
    console.log('[Geofence Backend Validation]', {
      timeEntryId: timeEntry.id,
      jobId: job.id,
      jobName: job.name,
      checkInDistance: Math.round(checkInDistance),
      checkOutDistance: checkOutDistance ? Math.round(checkOutDistance) : null,
      maxDistance,
      backendValidated,
      frontendValidated,
      hasDiscrepancy,
      requiresReview: !backendValidated || hasDiscrepancy,
    });

    return Response.json({ 
      success: true,
      validated: backendValidated,
      requiresReview: !backendValidated || hasDiscrepancy,
      distances: {
        checkIn: Math.round(checkInDistance),
        checkOut: checkOutDistance ? Math.round(checkOutDistance) : null,
      }
    });

  } catch (error) {
    console.error('[Geofence Validation Error]', error.message);
    
    // CRITICAL: DO NOT block TimeEntry creation on validation error
    // Just log and continue
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 }); // Return 200 to prevent automation retry
  }
});