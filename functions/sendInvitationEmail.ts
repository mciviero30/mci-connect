import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, fullName, language = 'en' } = await req.json();

    if (!to) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const sendgridKey = Deno.env.get('SENDGRID_API_KEY');
    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || 'noreply@mciconnect.com';

    if (!sendgridKey) {
      return Response.json({ error: 'SendGrid not configured' }, { status: 500 });
    }

    const subject = language === 'es' 
      ? 'Bienvenido a MCI Connect: Tu Plataforma Integral de Gestión Empresarial' 
      : 'Welcome to MCI Connect: Your Comprehensive Business Management Platform';

    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/ece524c74_Screenshot2025-12-16at20316AM.png';

    const htmlBody = language === 'es'
          ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <img src="${logoUrl}" alt="MCI" style="max-width: 300px; height: auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="color: #333333; font-size: 16px; margin: 0 0 20px 0;">Hola <strong>${fullName}</strong>,</p>
              
              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                Nos complace darle la bienvenida al equipo. Ha sido invitado a unirse a <strong>MCI Connect</strong>, nuestra plataforma integral diseñada para optimizar la gestión empresarial y sus actividades diarias.
              </p>
              
              <h2 style="color: #1E40AF; font-size: 18px; font-weight: bold; margin: 30px 0 15px 0;">
                Características Clave de MCI Connect
              </h2>
              
              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
                La plataforma MCI Connect le otorgará acceso a las siguientes herramientas y recursos esenciales:
              </p>
              
              <ul style="color: #333333; font-size: 15px; line-height: 1.8; margin: 0 0 25px 0; padding-left: 20px;">
                <li><strong>Registre su tiempo:</strong> Entrada/salida y registro de horas de trabajo.</li>
                <li><strong>Gestione gastos:</strong> Suba recibos y solicite reembolsos eficientemente.</li>
                <li><strong>Reporte millaje:</strong> Registre sus viajes y millas recorridas.</li>
                <li><strong>Revise nómina:</strong> Consulte su pago y horas trabajadas.</li>
                <li><strong>Vea el calendario:</strong> Asignaciones de trabajo y horarios.</li>
                <li><strong>Comuníquese:</strong> Chat en tiempo real con el equipo.</li>
                <li><strong style="color: #F59E0B;">MCI Field:</strong> Fotos de proyectos, planos y tareas en campo.</li>
                <li><strong>Capacitación:</strong> Acceda a cursos y certificaciones.</li>
              </ul>

              <h2 style="color: #1E40AF; font-size: 18px; font-weight: bold; margin: 30px 0 15px 0;">
                Pasos para Comenzar
              </h2>
              
              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
                Para activar su cuenta y comenzar a usar la plataforma, por favor siga estos sencillos pasos:
              </p>
              
              <ol style="color: #333333; font-size: 15px; line-height: 1.8; margin: 0 0 25px 0; padding-left: 20px;">
                <li>Revise su bandeja de entrada en: <strong>${to}</strong></li>
                <li>Busque el email de <strong>Base44</strong> (por favor revise su carpeta de spam si no lo ve inmediatamente).</li>
                <li>Haga clic en <strong>"Aceptar Invitación"</strong>.</li>
                <li>Cree su contraseña y complete su perfil.</li>
                <li>¡Comience a usar la plataforma!</li>
              </ol>

              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 30px 0;">
                Si encuentra alguna dificultad o tiene preguntas durante el proceso de configuración, no dude en contactar a nuestro equipo de soporte.
              </p>

              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 30px 0 10px 0;">
                Le deseamos mucho éxito utilizando MCI Connect.
              </p>

              <p style="color: #333333; font-size: 15px; margin: 0;">
                Atentamente,
              </p>
              <p style="color: #1E40AF; font-size: 15px; font-weight: bold; margin: 5px 0 0 0;">
                El Equipo MCI
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
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
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <img src="${logoUrl}" alt="MCI" style="max-width: 300px; height: auto;">
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <p style="color: #333333; font-size: 16px; margin: 0 0 20px 0;">Hi <strong>${fullName}</strong>,</p>
              
              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 25px 0;">
                We are delighted to welcome you to the team. You have been invited to join <strong>MCI Connect</strong>, our comprehensive platform designed to streamline your business management and daily activities.
              </p>
              
              <h2 style="color: #1E40AF; font-size: 18px; font-weight: bold; margin: 30px 0 15px 0;">
                Key Features of MCI Connect
              </h2>
              
              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
                The MCI Connect platform will grant you access to the following essential tools and resources:
              </p>
              
              <ul style="color: #333333; font-size: 15px; line-height: 1.8; margin: 0 0 25px 0; padding-left: 20px;">
                <li><strong>Track your time:</strong> Clock in/out and log your work hours.</li>
                <li><strong>Manage expenses:</strong> Upload receipts and request reimbursements efficiently.</li>
                <li><strong>Report mileage:</strong> Track your trips and miles driven.</li>
                <li><strong>Review payroll:</strong> Check your pay and hours worked.</li>
                <li><strong>View calendar:</strong> See job assignments and schedules.</li>
                <li><strong>Communicate:</strong> Engage in real-time chat with the team.</li>
                <li><strong style="color: #F59E0B;">MCI Field:</strong> Access project photos, blueprints, and field tasks.</li>
                <li><strong>Training:</strong> Access courses and certifications.</li>
              </ul>

              <h2 style="color: #1E40AF; font-size: 18px; font-weight: bold; margin: 30px 0 15px 0;">
                Steps to Get Started
              </h2>
              
              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0;">
                To activate your account and begin using the platform, please follow these simple steps:
              </p>
              
              <ol style="color: #333333; font-size: 15px; line-height: 1.8; margin: 0 0 25px 0; padding-left: 20px;">
                <li>Check your inbox at: <strong>${to}</strong></li>
                <li>Look for the email from <strong>Base44</strong> (please check your spam folder if you do not see it immediately).</li>
                <li>Click <strong>"Accept Invitation"</strong>.</li>
                <li>Create your password and complete your profile.</li>
                <li>Start using the platform!</li>
              </ol>

              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 30px 0;">
                Should you encounter any difficulties or have questions during the setup process, please do not hesitate to contact our support team.
              </p>

              <p style="color: #333333; font-size: 15px; line-height: 1.6; margin: 30px 0 10px 0;">
                We wish you great success using MCI Connect.
              </p>

              <p style="color: #333333; font-size: 15px; margin: 0;">
                Sincerely,
              </p>
              <p style="color: #1E40AF; font-size: 15px; font-weight: bold; margin: 5px 0 0 0;">
                The MCI Team
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
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
          `);

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