import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DELETE ORPHANED ONBOARDINGFORM RECORDS
 * Admin-only. Specifically for orphaned emails (no matching User).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the 3 marziociviero@hotmail.com records
    const idsToDelete = [
      '6957172f9909476516c98ae2',
      '6957168c2adc30764d631e8c',
      '695716865854a5ce29a9e7ed'
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