import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Nos complace darle la bienvenida al equipo. Ha sido invitado a unirse a <strong>MCI Connect</strong>, nuestra plataforma integral diseñada para optimizar la gestión empresarial y sus actividades diarias.
              </p>

              <!-- Key Features Section -->
              <h2 style="margin: 40px 0 20px 0; font-size: 20px; font-weight: bold; color: #507DB4; border-bottom: 2px solid #507DB4; padding-bottom: 10px;">
                Características Clave de MCI Connect
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                La plataforma MCI Connect le otorgará acceso a las siguientes herramientas y recursos esenciales:
              </p>

              <ul style="margin: 0 0 30px 0; padding-left: 25px; font-size: 15px; line-height: 1.8; color: #333333;">
                <li style="margin-bottom: 10px;"><strong>Control de Tiempo:</strong> Entrada/salida inteligente con geolocalización y aprobación de horas.</li>
                <li style="margin-bottom: 10px;"><strong>Gestión de Gastos:</strong> Categorización AI de gastos, per diem y reembolsos automatizados.</li>
                <li style="margin-bottom: 10px;"><strong>Nómina Automatizada:</strong> Cálculo automático de pago con bonos y reportes detallados.</li>
                <li style="margin-bottom: 10px;"><strong>Calendario Inteligente:</strong> Asignaciones, disponibilidad de equipo y sincronización con Google Calendar.</li>
                <li style="margin-bottom: 10px;"><strong style="color: #FF8C00;">MCI Field:</strong> Gestión completa de proyectos en campo - planos, fotos, tareas y progreso en tiempo real.</li>
                <li style="margin-bottom: 10px;"><strong>Facturación y Estimados:</strong> Creación de quotes e invoices con inteligencia artificial.</li>
                <li style="margin-bottom: 10px;"><strong>Chat y Colaboración:</strong> Comunicación en tiempo real con equipos, GIFs y compartir archivos.</li>
                <li style="margin-bottom: 10px;"><strong>Reconocimientos y Metas:</strong> Sistema de puntos, premios y OKRs para el equipo.</li>
                <li style="margin-bottom: 10px;"><strong>Capacitación:</strong> Cursos, certificaciones y compliance tracking automatizado.</li>
                <li style="margin-bottom: 10px;"><strong>Analytics y Reportes:</strong> Cash flow, forecasting presupuestario y análisis de rentabilidad.</li>
              </ul>

              <!-- Steps Section -->
              <h2 style="margin: 40px 0 20px 0; font-size: 20px; font-weight: bold; color: #507DB4; border-bottom: 2px solid #507DB4; padding-bottom: 10px;">
                Pasos para Comenzar
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Para activar su cuenta y comenzar a usar la plataforma, siga estos sencillos pasos:
              </p>

              <ol style="margin: 0 0 30px 0; padding-left: 25px; font-size: 15px; line-height: 1.8; color: #333333;">
                <li style="margin-bottom: 10px;">Revise su bandeja de entrada en: <strong>${to}</strong></li>
                <li style="margin-bottom: 10px;">Busque el correo electrónico de <strong>Base44</strong> (revise su carpeta de spam si no lo ve de inmediato).</li>
                <li style="margin-bottom: 10px;">Haga clic en <strong>"Aceptar Invitación"</strong>.</li>
                <li style="margin-bottom: 10px;">Cree su contraseña y complete su perfil.</li>
                <li style="margin-bottom: 10px;">¡Comience a usar la plataforma!</li>
              </ol>

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Si encuentra alguna dificultad o tiene preguntas durante el proceso de configuración, no dude en contactar a nuestro equipo de soporte.
              </p>

              <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Le deseamos mucho éxito usando MCI Connect.
              </p>

              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Atentamente,
              </p>

              <!-- Signature -->
              <p style="margin: 20px 0 0 0; font-size: 18px; font-weight: bold; color: #507DB4; border-top: 2px solid #507DB4; padding-top: 15px; display: inline-block;">
                El Equipo MCI
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0 20px 0;">
                <a href="${setupPasswordUrl}" style="display: inline-block; background: linear-gradient(135deg, #507DB4 0%, #6B9DD8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(80, 125, 180, 0.3);">
                  Únete a MCI Connect Ahora
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.5;">
                © 2025 MCI Connect. Todos los derechos reservados.
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

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                We are delighted to welcome you to the team. You have been invited to join <strong>MCI Connect</strong>, our comprehensive platform designed to streamline your business management and daily activities.
              </p>

              <!-- Key Features Section -->
              <h2 style="margin: 40px 0 20px 0; font-size: 20px; font-weight: bold; color: #507DB4; border-bottom: 2px solid #507DB4; padding-bottom: 10px;">
                Key Features of MCI Connect
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                The MCI Connect platform will grant you access to the following essential tools and resources:
              </p>

              <ul style="margin: 0 0 30px 0; padding-left: 25px; font-size: 15px; line-height: 1.8; color: #333333;">
                <li style="margin-bottom: 10px;"><strong>Time Tracking:</strong> Smart clock in/out with geolocation and hours approval.</li>
                <li style="margin-bottom: 10px;"><strong>Expense Management:</strong> AI categorization, per diem and automated reimbursements.</li>
                <li style="margin-bottom: 10px;"><strong>Automated Payroll:</strong> Automatic pay calculation with bonuses and detailed reports.</li>
                <li style="margin-bottom: 10px;"><strong>Smart Calendar:</strong> Job assignments, team availability and Google Calendar sync.</li>
                <li style="margin-bottom: 10px;"><strong style="color: #FF8C00;">MCI Field:</strong> Complete field project management - blueprints, photos, tasks and real-time progress.</li>
                <li style="margin-bottom: 10px;"><strong>Invoicing & Estimates:</strong> AI-powered quote and invoice creation.</li>
                <li style="margin-bottom: 10px;"><strong>Chat & Collaboration:</strong> Real-time team communication with GIFs and file sharing.</li>
                <li style="margin-bottom: 10px;"><strong>Recognition & Goals:</strong> Points system, awards and team OKRs.</li>
                <li style="margin-bottom: 10px;"><strong>Training:</strong> Courses, certifications and automated compliance tracking.</li>
                <li style="margin-bottom: 10px;"><strong>Analytics & Reports:</strong> Cash flow, budget forecasting and profitability analysis.</li>
              </ul>

              <!-- Steps Section -->
              <h2 style="margin: 40px 0 20px 0; font-size: 20px; font-weight: bold; color: #507DB4; border-bottom: 2px solid #507DB4; padding-bottom: 10px;">
                Steps to Get Started
              </h2>

              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                To activate your account and begin using the platform, please follow these simple steps:
              </p>

              <ol style="margin: 0 0 30px 0; padding-left: 25px; font-size: 15px; line-height: 1.8; color: #333333;">
                <li style="margin-bottom: 10px;">Check your inbox at: <strong>${to}</strong></li>
                <li style="margin-bottom: 10px;">Look for the email from <strong>Base44</strong> (please check your spam folder if you do not see it immediately).</li>
                <li style="margin-bottom: 10px;">Click <strong>"Accept Invitation"</strong>.</li>
                <li style="margin-bottom: 10px;">Create your password and complete your profile.</li>
                <li style="margin-bottom: 10px;">Start using the platform!</li>
              </ol>

              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Should you encounter any difficulties or have questions during the setup process, please do not hesitate to contact our support team.
              </p>

              <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                We wish you great success using MCI Connect.
              </p>

              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Sincerely,
              </p>

              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Sincerely,
              </p>

              <!-- Signature -->
              <p style="margin: 20px 0 30px 0; font-size: 18px; font-weight: bold; color: #507DB4; border-top: 2px solid #507DB4; padding-top: 15px; display: inline-block;">
                The MCI Team
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${setupPasswordUrl}" style="display: inline-block; background: linear-gradient(135deg, #507DB4 0%, #6B9DD8 100%); color: #ffffff !important; text-decoration: none; padding: 18px 50px; border-radius: 10px; font-size: 18px; font-weight: bold; box-shadow: 0 6px 20px rgba(80, 125, 180, 0.4); text-align: center;">
                      Join MCI Connect Now
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.5;">
                © 2025 MCI Connect. All rights reserved.
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
    console.error('Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});