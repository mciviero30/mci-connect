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

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    
    if (existingUsers.length === 0) {
      // Create placeholder user so we can send them emails
      await base44.asServiceRole.entities.User.create({
        email: email,
        full_name: fullName || 'New Employee',
        first_name: firstName || '',
        last_name: lastName || '',
        position: position || 'technician',
        department: department || 'operations',
        team_id: teamId || '',
        team_name: teamName || '',
        employment_status: 'pending_registration',
        role: 'user',
        hourly_rate: 25,
        hourly_rate_overtime: 37.5,
        per_diem_amount: 50
      });
    }

    const appUrl = req.headers.get('origin') || 'https://your-app.base44.com';

    const emailBody = language === 'es'
      ? `Hola ${firstName || fullName},\n\n¡Bienvenido a MCI Connect!\n\nHas sido invitado a unirte a nuestra plataforma de gestión.\n\nAccede aquí: ${appUrl}\n\nUsa tu email: ${email}\n\nInicia sesión para comenzar.\n\n¡Bienvenido al equipo!\nMCI Team`
      : `Hello ${firstName || fullName},\n\nWelcome to MCI Connect!\n\nYou've been invited to join our management platform.\n\nAccess here: ${appUrl}\n\nUse your email: ${email}\n\nLog in to get started.\n\nWelcome to the team!\nMCI Team`;

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