import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, fullName, language = 'es' } = await req.json();

    if (!to) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const appUrl = new URL(req.url).origin.replace('/functions/sendInvitationEmail', '');
    const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@mciconnect.com';

    if (!sendgridKey) {
      return Response.json({ error: 'SendGrid not configured' }, { status: 500 });
    }

    const subject = language === 'es' 
      ? 'Bienvenido a MCI Connect: Tu Plataforma Integral de Gestión Empresarial' 
      : 'Welcome to MCI Connect: Your Comprehensive Business Management Platform';

    const timestamp = Date.now();
    const logoUrl = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/d7bf652da_Screenshot2025-12-16at14303AM.png?v=${timestamp}`;

    const htmlBody = language === 'es'
          ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #000000; padding: 30px; text-align: left;">
              <img src="${logoUrl}" alt="MCI" style="max-width: 250px; height: auto; display: block;">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #1f2937; font-size: 16px; margin: 0 0 20px 0;">Estimado(a) <strong>${fullName}</strong>,</p>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                Nos complace darle la bienvenida al equipo. Ha sido invitado a unirse a <strong>MCI Connect</strong>, nuestra plataforma integral diseñada para optimizar la gestión empresarial y sus actividades diarias.
              </p>
              
              <h2 style="color: #1E40AF; font-size: 18px; font-weight: 600; margin: 30px 0 15px 0; border-bottom: 2px solid #1E40AF; padding-bottom: 10px;">
                Características Clave de MCI Connect
              </h2>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
                La plataforma MCI Connect le otorgará acceso a las siguientes herramientas y recursos esenciales:
              </p>
              
              <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Registre su tiempo:</strong> Entrada/salida y registro de horas de trabajo.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Gestione gastos:</strong> Suba recibos y solicite reembolsos eficientemente.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Reporte millaje:</strong> Registre sus viajes y millas recorridas.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Revise nómina:</strong> Consulte su pago y horas trabajadas.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Vea el calendario:</strong> Asignaciones de trabajo y horarios.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Comuníquese:</strong> Chat en tiempo real con el equipo.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong style="color: #F59E0B;">MCI Field:</strong> Fotos de proyectos, planos y tareas en campo.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Capacitación:</strong> Acceda a cursos y certificaciones.
                  </td>
                </tr>
              </table>

              <h2 style="color: #1E40AF; font-size: 18px; font-weight: 600; margin: 30px 0 15px 0; border-bottom: 2px solid #1E40AF; padding-bottom: 10px;">
                Pasos para Comenzar
              </h2>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
                Para activar su cuenta y comenzar a usar la plataforma, por favor siga estos sencillos pasos:
              </p>
              
              <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    1. Revise su bandeja de entrada en: <strong>${to}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    2. Busque el email de <strong>Base44</strong> (por favor revise su carpeta de spam si no lo ve inmediatamente).
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    3. Haga clic en <strong>"Aceptar Invitación"</strong>.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    4. Cree su contraseña y complete su perfil.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    5. ¡Comience a usar la plataforma!
                  </td>
                </tr>
              </table>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 30px 0 0 0;">
                Si encuentra alguna dificultad o tiene preguntas durante el proceso de configuración, no dude en contactar a nuestro equipo de soporte.
              </p>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 30px 0;">
                Le deseamos mucho éxito utilizando MCI Connect.
              </p>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0;">
                Atentamente,
              </p>
              <p style="color: #1E40AF; font-size: 15px; font-weight: 600; margin: 5px 0 0 0;">
                El Equipo MCI
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.5;">
                © 2025 MCI Connect. Todos los derechos reservados.<br>
                Plataforma Integral de Gestión Empresarial
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `
          : `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: #000000; padding: 30px; text-align: left;">
              <img src="${logoUrl}" alt="MCI" style="max-width: 250px; height: auto; display: block;">
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #1f2937; font-size: 16px; margin: 0 0 20px 0;">Dear <strong>${fullName}</strong>,</p>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                We are delighted to welcome you to the team. You have been invited to join <strong>MCI Connect</strong>, our comprehensive platform designed to streamline your business management and daily activities.
              </p>
              
              <h2 style="color: #1E40AF; font-size: 18px; font-weight: 600; margin: 30px 0 15px 0; border-bottom: 2px solid #1E40AF; padding-bottom: 10px;">
                Key Features of MCI Connect
              </h2>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
                The MCI Connect platform will grant you access to the following essential tools and resources:
              </p>
              
              <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Track your time:</strong> Clock in/out and log your work hours.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Manage expenses:</strong> Upload receipts and request reimbursements efficiently.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Report mileage:</strong> Track your trips and miles driven.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Review payroll:</strong> Check your pay and hours worked.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>View calendar:</strong> Job assignments and schedules.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Communicate:</strong> Real-time chat with the team.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong style="color: #F59E0B;">MCI Field:</strong> Project photos, blueprints, and field tasks.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    • <strong>Training:</strong> Access courses and certifications.
                  </td>
                </tr>
              </table>

              <h2 style="color: #1E40AF; font-size: 18px; font-weight: 600; margin: 30px 0 15px 0; border-bottom: 2px solid #1E40AF; padding-bottom: 10px;">
                Steps to Get Started
              </h2>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
                To activate your account and begin using the platform, please follow these simple steps:
              </p>
              
              <table cellpadding="0" cellspacing="0" style="width: 100%; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    1. Check your inbox at: <strong>${to}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    2. Look for the email from <strong>Base44</strong> (please check your spam folder if you do not see it immediately).
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    3. Click <strong>"Accept Invitation"</strong>.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    4. Create your password and complete your profile.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    5. Start using the platform!
                  </td>
                </tr>
              </table>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 30px 0 0 0;">
                Should you encounter any difficulties or have questions during the setup process, please do not hesitate to contact our support team.
              </p>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 30px 0;">
                We wish you great success using MCI Connect.
              </p>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0;">
                Sincerely,
              </p>
              <p style="color: #1E40AF; font-size: 15px; font-weight: 600; margin: 5px 0 0 0;">
                The MCI Team
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.5;">
                © 2025 MCI Connect. All rights reserved.<br>
                Comprehensive Business Management Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `);

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
          type: 'text/html',
          value: htmlBody,
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