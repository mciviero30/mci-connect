import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

async function sendViaSendGrid(to, subject, body, fromName = 'MCI Connect') {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@mci-connect.com';

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [{ type: 'text/plain', value: body }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid error ${response.status}: ${errorText}`);
  }

  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    await sendViaSendGrid(to, subject, body, 'MCI Connect');

    console.log(`[sendInvitationEmail] ✅ Email sent via SendGrid to ${to}`);

    return Response.json({ success: true, message: 'Email sent successfully' });

  } catch (error) {
    console.error('[sendInvitationEmail] ❌ Error:', error.message);
    return Response.json({ error: 'Email failed', details: error.message }, { status: 500 });
  }
});