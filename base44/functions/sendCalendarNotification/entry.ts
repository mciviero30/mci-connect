import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      employeeEmail, 
      employeeName, 
      eventType, // 'new_assignment' or 'schedule_update'
      jobName,
      date,
      startTime,
      endTime,
      notes,
      assignmentId
    } = await req.json();

    if (!employeeEmail || !eventType || !jobName || !date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const sendgridFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
    const appUrl = Deno.env.get('APP_URL') || 'https://mci-connect.base44.app';

    if (!sendgridApiKey || !sendgridFromEmail) {
      return Response.json({ error: 'SendGrid not configured' }, { status: 500 });
    }

    const calendarUrl = `${appUrl}#!/Calendario`;
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png';

    const isNewAssignment = eventType === 'new_assignment';
    const subject = isNewAssignment 
      ? `🔔 New Job Assignment: ${jobName}`
      : `📅 Schedule Updated: ${jobName}`;

    const htmlBody = `
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
            <td style="padding: 40px;">
              
              <h1 style="margin: 0 0 20px 0; font-size: 24px; color: ${isNewAssignment ? '#507DB4' : '#FF8C00'}; font-weight: bold;">
                ${isNewAssignment ? '🔔 New Job Assignment' : '📅 Schedule Updated'}
              </h1>

              <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Hi <strong>${employeeName}</strong>,
              </p>

              <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                ${isNewAssignment 
                  ? 'You have been assigned to a new job.' 
                  : 'Your schedule has been updated.'}
              </p>

              <!-- Job Details Box -->
              <div style="background-color: #F0F4FF; border-left: 4px solid #507DB4; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #507DB4; font-weight: bold;">
                  ${jobName}
                </h2>
                
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; line-height: 1.8; color: #333333;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #507DB4; width: 100px;">📅 Date:</td>
                    <td style="padding: 6px 0;">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  </tr>
                  ${startTime ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #507DB4;">⏰ Start:</td>
                    <td style="padding: 6px 0;">${startTime}</td>
                  </tr>` : ''}
                  ${endTime ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #507DB4;">⏱️ End:</td>
                    <td style="padding: 6px 0;">${endTime}</td>
                  </tr>` : ''}
                  ${notes ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #507DB4; vertical-align: top;">📝 Notes:</td>
                    <td style="padding: 6px 0;">${notes}</td>
                  </tr>` : ''}
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${calendarUrl}" style="display: inline-block; background-color: #507DB4; color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(80, 125, 180, 0.3);">
                  View Calendar
                </a>
              </div>

              <p style="margin: 25px 0 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                Questions? Contact your manager or check the app for more details.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
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

    const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: employeeEmail }],
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

    // Create in-app notification
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    await base44.asServiceRole.functions.invoke('createNotification', {
      recipientEmail: employeeEmail,
      recipientName: employeeName,
      type: isNewAssignment ? 'calendar_assignment' : 'calendar_update',
      category: 'calendar',
      priority: 'medium',
      title: isNewAssignment ? `Nueva asignación: ${jobName}` : `Horario actualizado: ${jobName}`,
      message: `${formattedDate} • ${startTime || ''} - ${endTime || ''}`,
      actionUrl: 'Calendario',
      relatedEntityType: 'job_assignment',
      relatedEntityId: assignmentId
    }).catch(err => console.error('Failed to create in-app notification:', err));

    return Response.json({ 
      success: true, 
      message: 'Email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending calendar notification:', error);
    return Response.json({ 
      error: 'Failed to send notification',
      details: error.message 
    }, { status: 500 });
  }
});