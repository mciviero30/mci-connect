import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, fullName, language = 'es', isReminder = false } = await req.json();

    if (!to) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const appUrl = new URL(req.url).origin.replace('/functions/sendInvitationEmail', '');
    const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@mciconnect.com';

    if (!sendgridKey) {
      return Response.json({ error: 'SendGrid not configured' }, { status: 500 });
    }

    const subject = isReminder
      ? (language === 'es' ? 'Recordatorio - MCI Connect' : 'Reminder - MCI Connect')
      : (language === 'es' ? 'Invitación a MCI Connect' : 'MCI Connect Invitation');

    const body = isReminder
      ? (language === 'es'
          ? `Hola ${fullName},\n\nEste es un recordatorio sobre tu invitación a MCI Connect.\n\nPara acceder:\n1. Revisa tu bandeja de entrada en ${to}\n2. Busca el email de Base44\n3. Haz clic en "Aceptar Invitación"\n4. Crea tu contraseña\n\nLink de la aplicación: ${appUrl}\n\n¡Te esperamos!\nMCI Team`
          : `Hi ${fullName},\n\nThis is a reminder about your MCI Connect invitation.\n\nTo access:\n1. Check your inbox at ${to}\n2. Look for Base44 email\n3. Click "Accept Invitation"\n4. Create your password\n\nApp link: ${appUrl}\n\nWe're waiting for you!\nMCI Team`)
      : (language === 'es'
          ? `Hola ${fullName},\n\nHas sido invitado a unirte a MCI Connect, nuestro sistema de gestión.\n\nPara comenzar:\n1. Revisa tu bandeja de entrada en ${to}\n2. Busca el email de invitación de Base44\n3. Haz clic en "Aceptar Invitación"\n4. Crea tu contraseña y completa tu perfil\n\nLink de la aplicación: ${appUrl}\n\n¡Bienvenido al equipo!\nMCI Team`
          : `Hi ${fullName},\n\nYou've been invited to join MCI Connect, our management system.\n\nTo get started:\n1. Check your inbox at ${to}\n2. Look for the Base44 invitation email\n3. Click "Accept Invitation"\n4. Create your password and complete your profile\n\nApp link: ${appUrl}\n\nWelcome to the team!\nMCI Team`);

    // Send via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject,
        }],
        from: { 
          email: fromEmail,
          name: 'MCI Connect'
        },
        content: [{
          type: 'text/plain',
          value: body,
        }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid error:', error);
      return Response.json({ 
        error: 'Failed to send email',
        details: error 
      }, { status: 500 });
    }

    return Response.json({ 
      success: true,
      message: 'Email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});