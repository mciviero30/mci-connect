import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, fullName, language = 'en' } = await req.json();
    
    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const appUrl = req.headers.get('origin') || 'https://your-app.base44.com';

    const emailBody = language === 'es'
      ? `Hola ${fullName},\n\n¡Bienvenido a MCI Connect!\n\nHas sido invitado a unirte a nuestra plataforma de gestión.\n\nAccede aquí: ${appUrl}\n\nUsa tu email: ${email}\n\nCuando inicies sesión por primera vez, tu cuenta será creada automáticamente.\n\n¡Bienvenido al equipo!\nMCI Team`
      : `Hello ${fullName},\n\nWelcome to MCI Connect!\n\nYou've been invited to join our management platform.\n\nAccess here: ${appUrl}\n\nUse your email: ${email}\n\nYour account will be automatically created when you first log in.\n\nWelcome to the team!\nMCI Team`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: language === 'es' ? '¡Bienvenido a MCI Connect!' : 'Welcome to MCI Connect!',
      body: emailBody,
      from_name: 'MCI Connect'
    });

    return Response.json({ 
      success: true,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});