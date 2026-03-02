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

    const subject = language === 'es'
      ? 'Bienvenido a MCI Connect - Tu invitación al equipo'
      : 'Welcome to MCI Connect - Your Team Invitation';

    const body = language === 'es'
      ? `
Hola ${fullName},

Te damos la bienvenida al equipo de MCI. Has sido invitado a unirte a MCI Connect, nuestra plataforma integral de gestión empresarial.

MCI Connect te da acceso a:
• Control de Tiempo: Entrada/salida con geolocalización y aprobación de horas
• Gestión de Gastos: Categorización AI de gastos y reembolsos
• Nómina Automatizada: Cálculo automático de pago con reportes detallados
• Calendario Inteligente: Asignaciones y disponibilidad de equipo
• MCI Field: Gestión de proyectos en campo - planos, fotos y tareas
• Facturación y Estimados: Creación con inteligencia artificial

Pasos para activar tu cuenta:
1. Revisa tu correo de Base44 (puede estar en spam)
2. Haz clic en "Aceptar Invitación"
3. Crea tu contraseña
4. Accede a la plataforma en: ${appUrl}

Si tienes preguntas, contacta a tu supervisor.

Bienvenido al equipo,
El Equipo MCI
      `.trim()
      : `
Hi ${fullName},

Welcome to the MCI team! You have been invited to join MCI Connect, our comprehensive business management platform.

MCI Connect gives you access to:
• Time Tracking: Clock in/out with geolocation and hours approval
• Expense Management: AI categorization and automated reimbursements
• Automated Payroll: Automatic pay calculation with detailed reports
• Smart Calendar: Job assignments and team availability
• MCI Field: Field project management - blueprints, photos and tasks
• Invoicing & Estimates: AI-powered creation

Steps to activate your account:
1. Check your Base44 invitation email (may be in spam)
2. Click "Accept Invitation"
3. Create your password
4. Access the platform at: ${appUrl}

If you have questions, please contact your supervisor.

Welcome to the team,
The MCI Team
      `.trim();

    // Use Base44's built-in email (no SendGrid credits needed)
    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body,
      from_name: 'MCI Connect'
    });

    console.log(`[sendInvitationEmail] ✅ Email sent successfully to ${to}`);

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