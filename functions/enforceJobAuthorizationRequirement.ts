import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * JOB AUTHORIZATION ENFORCEMENT - Backend Authority
 * 
 * HARD RULE: No Job can be operational without WorkAuthorization
 * 
 * Triggered on Job create/update
 * Validates authorization_id exists and is approved
 * Blocks creation/update if authorization missing or revoked
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process Job entity events
    if (event.entity_name !== 'Job') {
      return Response.json({ success: true, message: 'Not a Job event' });
    }

    const job = data;

    // CRITICAL: authorization_id is REQUIRED for operational jobs
    if (!job.authorization_id) {
      console.error('[JOB AUTHORIZATION] ❌ BLOCKED: Job missing authorization_id', {
        job_id: job.id,
        job_name: job.name,
        customer_name: job.customer_name
      });

      // BLOCK job creation/update
      return Response.json({
        success: false,
        error: 'AUTHORIZATION_REQUIRED',
        message: 'Jobs require WorkAuthorization. Create authorization first.',
        job_id: job.id,
        job_name: job.name
      }, { status: 400 });
    }

    // Validate authorization exists and is approved
    const authorizations = await base44.asServiceRole.entities.WorkAuthorization.filter({
      id: job.authorization_id
    });

    if (authorizations.length === 0) {
      console.error('[JOB AUTHORIZATION] ❌ BLOCKED: Authorization not found', {
        job_id: job.id,
        authorization_id: job.authorization_id
      });

      return Response.json({
        success: false,
        error: 'AUTHORIZATION_NOT_FOUND',
        message: `Authorization ${job.authorization_id} does not exist`,
        job_id: job.id
      }, { status: 400 });
    }

    const authorization = authorizations[0];

    // Check authorization status
    if (authorization.status !== 'approved') {
      console.error('[JOB AUTHORIZATION] ❌ BLOCKED: Authorization not approved', {
        job_id: job.id,
        authorization_id: authorization.id,
        authorization_status: authorization.status
      });

      return Response.json({
        success: false,
        error: 'AUTHORIZATION_INVALID',
        message: `Authorization status is ${authorization.status}, not approved`,
        job_id: job.id,
        authorization_status: authorization.status
      }, { status: 400 });
    }

    // ✅ VALIDATION PASSED
    console.log('[JOB AUTHORIZATION] ✅ Validated', {
      job_id: job.id,
      job_name: job.name,
      authorization_id: authorization.id,
      authorization_type: authorization.authorization_type,
      customer_name: job.customer_name
    });

    return Response.json({
      success: true,
      validated: true,
      authorization_id: authorization.id,
      authorization_type: authorization.authorization_type,
      customer_name: job.customer_name
    });

  } catch (error) {
    console.error('[JOB AUTHORIZATION] Error:', error.message);
    
    // BLOCK on error (fail-safe)
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});