import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = ['admin', 'ceo', 'owner', 'super_admin', 'administrator'];
    if (!ADMIN_ROLES.includes(caller.role?.toLowerCase?.())) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Return info about how to get the codebase
    // In production, this redirects to a GitHub archive download
    const REPO = 'mciviero30/mci-connect';
    const BRANCH = 'main';
    const zipUrl = `https://github.com/${REPO}/archive/refs/heads/${BRANCH}.zip`;

    // Log the export request for audit
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'codebase_export',
      user_id: caller.id,
      user_email: caller.email,
      timestamp: new Date().toISOString(),
      details: JSON.stringify({ repo: REPO, branch: BRANCH }),
    }).catch(() => {});

    return Response.json({
      ok: true,
      download_url: zipUrl,
      repo: REPO,
      branch: BRANCH,
      message: 'Use download_url to get the full codebase ZIP from GitHub',
    });

  } catch (err) {
    console.error('[exportCodebaseZip] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
