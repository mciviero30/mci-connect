import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    const { to, fullName, language = 'en' } = await req.json();

    if (!to || !fullName) {
      return Response.json({ error: 'Missing required fields: to, fullName' }, { status: 400 });
    }

    const appUrl = Deno.env.get('APP_URL') || 'https://mci-connect.base44.app';

    const isSpanish = language === 'es';

    const subject = isSpanish
      ? 'Bienvenido a MCI Connect - Tu invitación al equipo'
      : 'Welcome to MCI Connect - Your Team Invitation';

    const body = isSpanish
      ? `Hola ${fullName},\n\nTe damos la bienvenida al equipo de MCI. Has sido invitado a MCI Connect.\n\nAccede aquí: ${appUrl}\n\nSi no tienes cuenta, revisa el correo de Base44 para la invitación (puede estar en spam).\n\nBienvenido,\nEl Equipo MCI`
      : `Hi ${fullName},\n\nWelcome to the MCI team! You have been invited to MCI Connect.\n\nAccess the platform here: ${appUrl}\n\nIf you don't have an account yet, check your email for a Base44 invitation (may be in spam).\n\nWelcome,\nThe MCI Team`;

    // Use Base44's built-in SendEmail integration (no SendGrid needed)
    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body,
      from_name: 'MCI Connect'
    });

    console.log(`[sendInvitationEmail] ✅ Email sent to ${to}`);

    return Response.json({
      success: true,
      message: 'Email sent successfully'
    });

  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[sendInvitationEmail] ❌ Error:', error.message);
    return safeJsonError('Email failed', 500, error.message);
  }
});