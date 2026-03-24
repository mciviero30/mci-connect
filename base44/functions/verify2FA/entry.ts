import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as OTPAuth from 'npm:otpauth@9.3.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, isSetup = false } = await req.json();

    if (!code) {
      return Response.json({ error: 'Code is required' }, { status: 400 });
    }

    // Get user's 2FA config
    const twoFactorConfigs = await base44.entities.TwoFactorAuth.filter({ user_id: user.id });
    
    if (twoFactorConfigs.length === 0) {
      return Response.json({ error: '2FA not configured' }, { status: 404 });
    }

    const twoFactorConfig = twoFactorConfigs[0];

    // Check if it's a backup code
    if (code.length === 10 && /^[A-Z0-9]+$/.test(code)) {
      const encoder = new TextEncoder();
      const data = encoder.encode(code);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const codeHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const isValidBackup = twoFactorConfig.backup_codes?.includes(codeHash);

      if (isValidBackup) {
        // Remove used backup code
        const updatedBackupCodes = twoFactorConfig.backup_codes.filter(bc => bc !== codeHash);
        
        await base44.entities.TwoFactorAuth.update(twoFactorConfig.id, {
          backup_codes: updatedBackupCodes,
          recovery_codes_used: (twoFactorConfig.recovery_codes_used || 0) + 1,
          last_verified_at: new Date().toISOString()
        });

        return Response.json({ 
          valid: true, 
          backupCodeUsed: true,
          remainingBackupCodes: updatedBackupCodes.length
        });
      }
    }

    // Verify TOTP code
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(twoFactorConfig.secret),
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    });

    const delta = totp.validate({ 
      token: code, 
      window: 1 // Allow 1 period before/after for clock drift
    });

    if (delta === null) {
      return Response.json({ valid: false, error: 'Invalid code' }, { status: 400 });
    }

    // If this is initial setup verification, enable 2FA
    if (isSetup) {
      await base44.entities.TwoFactorAuth.update(twoFactorConfig.id, {
        enabled: true,
        verified_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString()
      });
    } else {
      // Just update last verified time
      await base44.entities.TwoFactorAuth.update(twoFactorConfig.id, {
        last_verified_at: new Date().toISOString()
      });
    }

    return Response.json({ valid: true, backupCodeUsed: false });

  } catch (error) {
    console.error('2FA Verification Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});