import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, fullName, firstName, lastName, position, department, teamId, teamName, language = 'en' } = await req.json();
    
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user already exists in the system
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    
    if (existingUsers.length > 0) {
      // User exists - send welcome email via SendGrid (no integration credits)
      const appUrl = req.headers.get('origin') || Deno.env.get('APP_URL') || 'https://mci-connect.base44.app';
      const apiKey = Deno.env.get('SENDGRID_API_KEY');
      const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@mci-connect.com';

      const emailBody = language === 'es'
        ? `Hola ${firstName || fullName},\n\n¡Bienvenido a MCI Connect!\n\nYa tienes acceso a nuestra plataforma de gestión.\n\nAccede aquí: ${appUrl}\n\nUsa tu email: ${email}\n\n¡Bienvenido al equipo!\nMCI Team`
        : `Hello ${firstName || fullName},\n\nWelcome to MCI Connect!\n\nYou now have access to our management platform.\n\nAccess here: ${appUrl}\n\nUse your email: ${email}\n\nWelcome to the team!\nMCI Team`;

      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: fromEmail, name: 'MCI Connect' },
          subject: language === 'es' ? '¡Bienvenido a MCI Connect!' : 'Welcome to MCI Connect!',
          content: [{ type: 'text/plain', value: emailBody }]
        })
      });

      if (!sgRes.ok) {
        const err = await sgRes.text();
        console.error(`[sendInvitation] SendGrid error: ${err}`);
      }

      return Response.json({ 
        success: true,
        message: 'Welcome email sent',
        userExists: true
      });
    } else {
      // User doesn't exist yet - must be invited through Dashboard first
      return Response.json({ 
        success: false,
        requiresDashboardInvite: true,
        message: 'User must be invited through Base44 Dashboard first',
        dashboardUrl: 'https://app.base44.com/dashboard'
      });
    }

  } catch (error) {
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('Error sending invitation:', error);
    }
    return Response.json({ 
      error: 'Failed to send invitation',
      success: false 
    }, { status: 500 });
  }
});