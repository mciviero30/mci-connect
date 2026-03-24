import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import * as OTPAuth from 'npm:otpauth@9.3.2';
import QRCode from 'npm:qrcode@1.5.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has 2FA enabled
    const existing = await base44.entities.TwoFactorAuth.filter({ user_id: user.id });
    
    if (existing.length > 0 && existing[0].enabled) {
      return Response.json({ 
        error: '2FA is already enabled. Please disable it first to reset.' 
      }, { status: 400 });
    }

    // Generate new TOTP secret
    const totp = new OTPAuth.TOTP({
      issuer: 'MCI Connect',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    });

    const secret = totp.secret.base32;
    const otpauthUrl = totp.toString();

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);

    // Generate 10 backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase();
      backupCodes.push(code);
    }

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(async (code) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      })
    );

    // Save to database (not enabled yet - requires verification)
    if (existing.length > 0) {
      await base44.entities.TwoFactorAuth.update(existing[0].id, {
        secret,
        backup_codes: hashedBackupCodes,
        enabled: false,
        verified_at: null
      });
    } else {
      await base44.entities.TwoFactorAuth.create({
        user_id: user.id,
        user_email: user.email,
        secret,
        backup_codes: hashedBackupCodes,
        enabled: false
      });
    }

    return Response.json({
      qrCode: qrCodeDataURL,
      secret,
      backupCodes, // Return plain codes to user (only shown once)
      otpauthUrl
    });

  } catch (error) {
    console.error('2FA Setup Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});