import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DELETE ORPHANED ONBOARDINGFORM RECORDS - angelo.civiero@mci-us.com
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const idsToDelete = [
      '6954beff75e9344d90f2e49b',
      '6954beef0fd87b180039d2aa',
      '6954be7a75d0e60cabfaecee',
      '6954be711d49d45cec935e9e',
      '6954be5d5a8d788436943bbd',
      '6954bdbd5a8d788436943b4a',
      '6954bdb33723c00a01b94586'
    ];

    let deleted = 0;
    for (const id of idsToDelete) {
      await base44.asServiceRole.entities.OnboardingForm.delete(id);
      deleted++;
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      deleted_records: deleted,
      status: 'success'
    });

  } catch (err) {
    console.error('❌ Delete failed:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});