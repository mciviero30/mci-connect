import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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
      // User exists - send welcome email directly
      const appUrl = req.headers.get('origin') || 'https://your-app.base44.com';

      const emailBody = language === 'es'
        ? `Hola ${firstName || fullName},\n\n¡Bienvenido a MCI Connect!\n\nYa tienes acceso a nuestra plataforma de gestión.\n\nAccede aquí: ${appUrl}\n\nUsa tu email: ${email}\n\n¡Bienvenido al equipo!\nMCI Team`
        : `Hello ${firstName || fullName},\n\nWelcome to MCI Connect!\n\nYou now have access to our management platform.\n\nAccess here: ${appUrl}\n\nUse your email: ${email}\n\nWelcome to the team!\nMCI Team`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: language === 'es' ? '¡Bienvenido a MCI Connect!' : 'Welcome to MCI Connect!',
        body: emailBody,
        from_name: 'MCI Connect'
      });

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
    console.error('Error sending invitation:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});