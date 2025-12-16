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
      ? (language === 'es' ? '🔔 Recordatorio: Tu invitación a MCI Connect' : '🔔 Reminder: Your MCI Connect Invitation')
      : (language === 'es' ? '🎉 ¡Bienvenido a MCI Connect!' : '🎉 Welcome to MCI Connect!');

    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png';

    const htmlBody = isReminder
      ? (language === 'es'
          ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); padding: 40px; text-align: center;">
              <img src="${logoUrl}" alt="MCI Connect" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Recordatorio</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tu invitación a MCI Connect está esperando</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1f2937; font-size: 18px; margin: 0 0 20px 0;">Hola <strong>${fullName}</strong>,</p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Este es un recordatorio amistoso sobre tu invitación para unirte a <strong>MCI Connect</strong>.
              </p>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #2563EB; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📋 Pasos para acceder:</h3>
                <ol style="color: #1f2937; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Revisa tu bandeja de entrada en <strong>${to}</strong></li>
                  <li>Busca el email de <strong>Base44</strong> (revisa spam si no lo ves)</li>
                  <li>Haz clic en <strong>"Aceptar Invitación"</strong></li>
                  <li>Crea tu contraseña y completa tu perfil</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                  🚀 Abrir MCI Connect
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0 0; text-align: center; line-height: 1.6;">
                ¡Te esperamos!<br>
                <strong style="color: #2563EB;">Equipo MCI</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.6;">
                © 2025 MCI Connect. Todos los derechos reservados.<br>
                Sistema de gestión empresarial
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
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); padding: 40px; text-align: center;">
              <img src="${logoUrl}" alt="MCI Connect" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Reminder</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your MCI Connect invitation is waiting</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1f2937; font-size: 18px; margin: 0 0 20px 0;">Hi <strong>${fullName}</strong>,</p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                This is a friendly reminder about your invitation to join <strong>MCI Connect</strong>.
              </p>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #2563EB; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">📋 Steps to access:</h3>
                <ol style="color: #1f2937; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Check your inbox at <strong>${to}</strong></li>
                  <li>Look for the email from <strong>Base44</strong> (check spam if you don't see it)</li>
                  <li>Click <strong>"Accept Invitation"</strong></li>
                  <li>Create your password and complete your profile</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                  🚀 Open MCI Connect
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0 0; text-align: center; line-height: 1.6;">
                We're waiting for you!<br>
                <strong style="color: #2563EB;">MCI Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.6;">
                © 2025 MCI Connect. All rights reserved.<br>
                Business management system
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `)
      : (language === 'es'
          ? `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); padding: 40px; text-align: center;">
              <img src="${logoUrl}" alt="MCI Connect" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">¡Bienvenido a MCI Connect!</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Tu plataforma de gestión empresarial</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1f2937; font-size: 18px; margin: 0 0 20px 0;">Hola <strong>${fullName}</strong>,</p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                ¡Nos emociona tenerte en el equipo! Has sido invitado a <strong>MCI Connect</strong>, nuestra plataforma integral de gestión empresarial.
              </p>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #2563EB; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">🚀 ¿Qué puedes hacer en MCI Connect?</h3>
                <ul style="color: #1f2937; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li><strong>⏰ Registra tus horas</strong> - Control de entrada/salida y tiempo trabajado</li>
                  <li><strong>💰 Gestiona gastos</strong> - Sube recibos y solicita reembolsos</li>
                  <li><strong>🚗 Reporta millaje</strong> - Registra tus viajes y millas recorridas</li>
                  <li><strong>📋 Revisa tu nómina</strong> - Consulta tus pagos y horas trabajadas</li>
                  <li><strong>📅 Ve tu calendario</strong> - Asignaciones de trabajo y horarios</li>
                  <li><strong>💬 Comunícate</strong> - Chat en tiempo real con el equipo</li>
                  <li><strong>📸 MCI Field</strong> - Fotos de proyectos, planos y tareas en campo</li>
                  <li><strong>🎓 Capacitación</strong> - Accede a cursos y certificaciones</li>
                </ul>
              </div>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📋 Pasos para comenzar:</h3>
                <ol style="color: #1f2937; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Revisa tu bandeja de entrada en <strong>${to}</strong></li>
                  <li>Busca el email de <strong>Base44</strong> (revisa spam si no lo ves)</li>
                  <li>Haz clic en <strong>"Aceptar Invitación"</strong></li>
                  <li>Crea tu contraseña y completa tu perfil</li>
                  <li>¡Empieza a usar la plataforma!</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                  🚀 Abrir MCI Connect
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0 0; text-align: center; line-height: 1.6;">
                ¿Necesitas ayuda? Contáctanos en cualquier momento.<br>
                <strong style="color: #2563EB;">Equipo MCI</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.6;">
                © 2025 MCI Connect. Todos los derechos reservados.<br>
                Sistema de gestión empresarial
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
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); padding: 40px; text-align: center;">
              <img src="${logoUrl}" alt="MCI Connect" style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 20px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">Welcome to MCI Connect!</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Your business management platform</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1f2937; font-size: 18px; margin: 0 0 20px 0;">Hi <strong>${fullName}</strong>,</p>
              <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                We're excited to have you on the team! You've been invited to <strong>MCI Connect</strong>, our comprehensive business management platform.
              </p>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #2563EB; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">🚀 What you can do in MCI Connect:</h3>
                <ul style="color: #1f2937; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li><strong>⏰ Track your time</strong> - Clock in/out and log work hours</li>
                  <li><strong>💰 Manage expenses</strong> - Upload receipts and request reimbursements</li>
                  <li><strong>🚗 Report mileage</strong> - Track your trips and miles driven</li>
                  <li><strong>📋 Review payroll</strong> - Check your pay and hours worked</li>
                  <li><strong>📅 View calendar</strong> - Job assignments and schedules</li>
                  <li><strong>💬 Communicate</strong> - Real-time chat with the team</li>
                  <li><strong>📸 MCI Field</strong> - Project photos, blueprints, and field tasks</li>
                  <li><strong>🎓 Training</strong> - Access courses and certifications</li>
                </ul>
              </div>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 8px;">
                <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📋 Steps to get started:</h3>
                <ol style="color: #1f2937; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Check your inbox at <strong>${to}</strong></li>
                  <li>Look for the email from <strong>Base44</strong> (check spam if you don't see it)</li>
                  <li>Click <strong>"Accept Invitation"</strong></li>
                  <li>Create your password and complete your profile</li>
                  <li>Start using the platform!</li>
                </ol>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                  🚀 Open MCI Connect
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin: 30px 0 0 0; text-align: center; line-height: 1.6;">
                Need help? Contact us anytime.<br>
                <strong style="color: #2563EB;">MCI Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.6;">
                © 2025 MCI Connect. All rights reserved.<br>
                Business management system
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