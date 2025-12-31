import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { requireUser, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    const { to, fullName, language = 'en' } = await req.json();

    if (!to || !fullName) {
      return Response.json({ error: 'Missing required fields: to, fullName' }, { status: 400 });
    }

    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const sendgridFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');

    if (!sendgridApiKey || !sendgridFromEmail) {
      return Response.json({ error: 'SendGrid credentials not configured' }, { status: 500 });
    }

    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png';

    // Send password reset to allow user to set password
    const appUrl = Deno.env.get('APP_URL') || 'https://mci-connect.base44.app';
    const setupPasswordUrl = `${appUrl}`;

    const htmlBody = language === 'es'
      ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 0;">
              <img src="${logoUrl}" alt="MCI Connect" style="width: 100%; height: auto; display: block; max-height: 150px; object-fit: cover;">
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Hola <strong>${fullName}</strong>,
              </p>

              <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5; color: #333333;">
                Nos complace darle la bienvenida al equipo. Ha sido invitado a unirse a <strong style="color: #507DB4;">MCI Connect</strong>, nuestra plataforma integral diseñada para optimizar la gestión empresarial y sus actividades diarias.
              </p>

              <!-- Key Features Section -->
              <h2 style="margin: 25px 0 12px 0; font-size: 20px; font-weight: bold; color: #507DB4; border-bottom: 2px solid #E0E7FF; padding-bottom: 8px;">
                Características Clave de MCI Connect
              </h2>

              <p style="margin: 8px 0 12px 0; font-size: 15px; line-height: 1.5; color: #333333;">
                La plataforma MCI Connect le otorgará acceso a las siguientes herramientas y recursos esenciales:
              </p>

              <ul style="margin: 12px 0; padding-left: 20px; list-style-position: outside; font-size: 14px; line-height: 1.6; color: #333333;">
                <li style="margin-bottom: 6px;"><strong>Control de Tiempo:</strong> Entrada/salida inteligente con geolocalización y aprobación de horas.</li>
                <li style="margin-bottom: 6px;"><strong>Gestión de Gastos:</strong> Categorización AI de gastos, per diem y reembolsos automatizados.</li>
                <li style="margin-bottom: 6px;"><strong>Nómina Automatizada:</strong> Cálculo automático de pago con bonos y reportes detallados.</li>
                <li style="margin-bottom: 6px;"><strong>Calendario Inteligente:</strong> Asignaciones, disponibilidad de equipo y sincronización con Google Calendar.</li>
                <li style="margin-bottom: 6px;"><strong style="color: #FF8C00;">MCI Field:</strong> Gestión completa de proyectos en campo - planos, fotos, tareas y progreso en tiempo real.</li>
                <li style="margin-bottom: 6px;"><strong>Facturación y Estimados:</strong> Creación de quotes e invoices con inteligencia artificial.</li>
              </ul>

              <!-- Steps Section -->
              <h2 style="margin: 25px 0 12px 0; font-size: 20px; font-weight: bold; color: #507DB4; border-bottom: 2px solid #E0E7FF; padding-bottom: 8px;">
                Pasos para Comenzar
              </h2>

              <p style="margin: 8px 0 12px 0; font-size: 15px; line-height: 1.5; color: #333333;">
                Para activar su cuenta y comenzar a usar la plataforma, siga estos sencillos pasos:
              </p>

              <ol style="margin: 12px 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #333333;">
                <li style="margin-bottom: 6px;">Revise su bandeja de entrada en: <a href="mailto:${to}" style="color: #507DB4; text-decoration: none; font-weight: 600;">${to}</a></li>
                <li style="margin-bottom: 6px;">Busque el correo electrónico de <strong>Base44</strong> (revise su carpeta de spam si no lo ve de inmediato).</li>
                <li style="margin-bottom: 6px;">Haga clic en "<strong>Aceptar Invitación</strong>".</li>
                <li style="margin-bottom: 6px;">Cree su contraseña y complete su perfil.</li>
                <li style="margin-bottom: 6px;">¡Comience a usar la plataforma!</li>
              </ol>

              <p style="margin: 20px 0 15px 0; font-size: 14px; line-height: 1.5; color: #555555;">
                Si encuentra alguna dificultad o tiene preguntas durante el proceso de configuración, no dude en contactar a nuestro equipo de soporte.
              </p>

              <p style="margin: 15px 0 8px 0; font-size: 15px; line-height: 1.5; color: #333333;">
                Le deseamos mucho éxito usando MCI Connect.
              </p>

              <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.5; color: #333333;">
                Atentamente,
              </p>

              <!-- Signature -->
              <p style="margin: 15px 0 20px 0; font-size: 18px; font-weight: bold; color: #507DB4; border-top: 2px solid #507DB4; padding-top: 12px; display: inline-block;">
                El Equipo MCI
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 20px 0;">
                <a href="${setupPasswordUrl}" style="display: inline-block; background-color: #507DB4; color: #ffffff !important; text-decoration: none; padding: 16px 45px; border-radius: 8px; font-size: 17px; font-weight: bold; box-shadow: 0 4px 12px rgba(80, 125, 180, 0.3); border: none;">
                  Únete a MCI Connect Ahora
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.5;">
                © ${new Date().getFullYear()} MCI Connect. Todos los derechos reservados.
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
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 0;">
              <img src="${logoUrl}" alt="MCI Connect" style="width: 100%; height: auto; display: block; max-height: 150px; object-fit: cover;">
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 50px 40px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Hi <strong>${fullName}</strong>,
              </p>

              <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5; color: #333333;">
                We are delighted to welcome you to the team. You have been invited to join <strong style="color: #507DB4;">MCI Connect</strong>, our comprehensive platform designed to streamline your business management and daily activities.
              </p>

              <!-- Key Features Section -->
              <h2 style="margin: 25px 0 12px 0; font-size: 20px; font-weight: bold; color: #507DB4; border-bottom: 2px solid #E0E7FF; padding-bottom: 8px;">
                Key Features of MCI Connect
              </h2>

              <p style="margin: 8px 0 12px 0; font-size: 15px; line-height: 1.5; color: #333333;">
                The MCI Connect platform will grant you access to the following essential tools and resources:
              </p>

              <ul style="margin: 12px 0; padding-left: 20px; list-style-position: outside; font-size: 14px; line-height: 1.6; color: #333333;">
                <li style="margin-bottom: 6px;"><strong>Time Tracking:</strong> Smart clock in/out with geolocation and hours approval.</li>
                <li style="margin-bottom: 6px;"><strong>Expense Management:</strong> AI categorization, per diem and automated reimbursements.</li>
                <li style="margin-bottom: 6px;"><strong>Automated Payroll:</strong> Automatic pay calculation with bonuses and detailed reports.</li>
                <li style="margin-bottom: 6px;"><strong>Smart Calendar:</strong> Job assignments, team availability and Google Calendar sync.</li>
                <li style="margin-bottom: 6px;"><strong style="color: #FF8C00;">MCI Field:</strong> Complete field project management - blueprints, photos, tasks and real-time progress.</li>
                <li style="margin-bottom: 6px;"><strong>Invoicing & Estimates:</strong> AI-powered quote and invoice creation.</li>
              </ul>

              <!-- Steps Section -->
              <h2 style="margin: 25px 0 12px 0; font-size: 20px; font-weight: bold; color: #507DB4; border-bottom: 2px solid #E0E7FF; padding-bottom: 8px;">
                Steps to Get Started
              </h2>

              <p style="margin: 8px 0 12px 0; font-size: 15px; line-height: 1.5; color: #333333;">
                To activate your account and begin using the platform, please follow these simple steps:
              </p>

              <ol style="margin: 12px 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #333333;">
                <li style="margin-bottom: 6px;">Check your inbox at: <a href="mailto:${to}" style="color: #507DB4; text-decoration: none; font-weight: 600;">${to}</a></li>
                <li style="margin-bottom: 6px;">Look for the email from <strong>Base44</strong> (please check your spam folder if you do not see it immediately).</li>
                <li style="margin-bottom: 6px;">Click "<strong>Accept Invitation</strong>".</li>
                <li style="margin-bottom: 6px;">Create your password and complete your profile.</li>
                <li style="margin-bottom: 6px;">Start using the platform!</li>
              </ol>

              <p style="margin: 20px 0 15px 0; font-size: 14px; line-height: 1.5; color: #555555;">
                Should you encounter any difficulties or have questions during the setup process, please do not hesitate to contact our support team.
              </p>

              <p style="margin: 15px 0 8px 0; font-size: 15px; line-height: 1.5; color: #333333;">
                We wish you great success using MCI Connect.
              </p>

              <p style="margin: 8px 0 0 0; font-size: 15px; line-height: 1.5; color: #333333;">
                Sincerely,
              </p>

              <!-- Signature -->
              <p style="margin: 15px 0 20px 0; font-size: 18px; font-weight: bold; color: #507DB4; border-top: 2px solid #507DB4; padding-top: 12px; display: inline-block;">
                The MCI Team
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 20px 0;">
                <a href="${setupPasswordUrl}" style="display: inline-block; background-color: #507DB4; color: #ffffff !important; text-decoration: none; padding: 16px 45px; border-radius: 8px; font-size: 17px; font-weight: bold; box-shadow: 0 4px 12px rgba(80, 125, 180, 0.3); border: none;">
                  Join MCI Connect Now
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.5;">
                © ${new Date().getFullYear()} MCI Connect. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    const subject = 'Welcome to MCI Connect: Your Comprehensive Business Management Platform';

    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject,
        }],
        from: {
          email: sendgridFromEmail,
          name: 'MCI Connect'
        },
        content: [{
          type: 'text/html',
          value: htmlBody
        }]
      })
    });

    if (!sendGridResponse.ok) {
      const error = await sendGridResponse.text();
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
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('Error sending email:', error);
    }
    return safeJsonError('Email failed', 500, error.message);
  }
});