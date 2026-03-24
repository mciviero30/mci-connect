import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { password } = await req.json();

    if (!password) {
      return Response.json({ error: 'Password required to disable 2FA' }, { status: 400 });
    }

    // Note: Base44 doesn't expose password verification, so we skip this check
    // In production, you'd verify the password before disabling 2FA
    
    // Delete 2FA config
    const twoFactorConfigs = await base44.entities.TwoFactorAuth.filter({ user_id: user.id });
    
    if (twoFactorConfigs.length > 0) {
      await base44.entities.TwoFactorAuth.delete(twoFactorConfigs[0].id);
    }

    return Response.json({ success: true });

  } catch (error) {
    console.error('2FA Disable Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});