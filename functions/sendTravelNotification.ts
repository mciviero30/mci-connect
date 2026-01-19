import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      notificationType, // 'travel_requested' or 'travel_booked'
      booking,
      recipientEmail,
      recipientName
    } = await req.json();

    if (!notificationType || !booking || !recipientEmail) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    const sendgridFromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
    const appUrl = Deno.env.get('APP_URL') || 'https://mci-connect.base44.app';

    if (!sendgridApiKey || !sendgridFromEmail) {
      return Response.json({ error: 'SendGrid not configured' }, { status: 500 });
    }

    const travelUrl = `${appUrl}#!/TravelBookings`;
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/2372f6478_Screenshot2025-12-24at13539AM.png';

    const isTravelRequest = notificationType === 'travel_requested';
    
    const subject = isTravelRequest 
      ? `🌎 New Travel Request: ${booking.job_name}`
      : `✈️ Travel Booked: ${booking.job_name}`;

    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

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
          
          <tr>
            <td style="padding: 0;">
              <img src="${logoUrl}" alt="MCI Connect" style="width: 100%; height: auto; display: block; max-height: 150px; object-fit: cover;">
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              
              <h1 style="margin: 0 0 20px 0; font-size: 24px; color: ${isTravelRequest ? '#507DB4' : '#10B981'}; font-weight: bold;">
                ${isTravelRequest ? '🌎 New Travel Request' : '✈️ Travel Confirmed'}
              </h1>

              <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                Hi <strong>${recipientName}</strong>,
              </p>

              <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                ${isTravelRequest 
                  ? 'A new travel booking request has been submitted and needs your attention.'
                  : 'Your travel arrangements have been confirmed. Please review the details below.'}
              </p>

              <div style="background-color: #F0F4FF; border-left: 4px solid #507DB4; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #507DB4; font-weight: bold;">
                  ${booking.job_name}
                </h2>
                
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px; line-height: 1.8; color: #333333;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #507DB4; width: 140px;">📅 Travel Dates:</td>
                    <td style="padding: 6px 0;">${formatDate(booking.travel_start_date)} - ${formatDate(booking.travel_end_date)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #507DB4;">🚗 Transportation:</td>
                    <td style="padding: 6px 0;">${booking.transportation_type === 'flight' ? 'Flight' : booking.transportation_type === 'car' ? 'Car' : 'Flight + Car'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #507DB4;">👥 Employees:</td>
                    <td style="padding: 6px 0;">${booking.assigned_employee_names?.join(', ') || booking.assigned_employees?.length || 0} travelers</td>
                  </tr>
                  ${isTravelRequest ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: bold; color: #507DB4;">📋 Requested by:</td>
                    <td style="padding: 6px 0;">${booking.requested_by || 'CEO'}</td>
                  </tr>` : ''}
                </table>

                ${!isTravelRequest && booking.hotel_name ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #E0E7FF;">
                  <p style="font-weight: bold; color: #507DB4; margin: 0 0 8px 0;">🏨 Hotel</p>
                  <p style="margin: 0; font-size: 13px;">${booking.hotel_name}</p>
                  ${booking.hotel_confirmation_number ? `<p style="margin: 4px 0 0 0; font-size: 13px;">Confirmation: ${booking.hotel_confirmation_number}</p>` : ''}
                </div>` : ''}

                ${!isTravelRequest && booking.flight_airline ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #E0E7FF;">
                  <p style="font-weight: bold; color: #507DB4; margin: 0 0 8px 0;">✈️ Flight</p>
                  <p style="margin: 0; font-size: 13px;">${booking.flight_airline}</p>
                  ${booking.flight_confirmation_number ? `<p style="margin: 4px 0 0 0; font-size: 13px;">Confirmation: ${booking.flight_confirmation_number}</p>` : ''}
                </div>` : ''}
              </div>

              ${isTravelRequest ? `
              <p style="margin: 25px 0 15px 0; font-size: 14px; line-height: 1.6; color: #666666;">
                Please log in to complete the booking details including hotel, flights, and rental car information.
              </p>` : `
              <p style="margin: 25px 0 15px 0; font-size: 14px; line-height: 1.6; color: #666666;">
                All travel details are now available in the app. Please review carefully and contact HR if you have any questions.
              </p>`}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${travelUrl}" style="display: inline-block; background-color: #507DB4; color: #ffffff !important; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(80, 125, 180, 0.3);">
                  ${isTravelRequest ? 'View Request' : 'View Travel Details'}
                </a>
              </div>

            </td>
          </tr>

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
          to: [{ email: recipientEmail }],
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
    await base44.asServiceRole.functions.invoke('createNotification', {
      recipientEmail: recipientEmail,
      recipientName: recipientName,
      type: notificationType,
      category: 'travel',
      priority: isTravelRequest ? 'high' : 'medium',
      title: isTravelRequest 
        ? `Nueva solicitud de viaje: ${booking.job_name}`
        : `Viaje confirmado: ${booking.job_name}`,
      message: `${formatDate(booking.travel_start_date)} - ${formatDate(booking.travel_end_date)}`,
      actionUrl: 'TravelBookings',
      relatedEntityType: 'travel_booking',
      relatedEntityId: booking.id
    }).catch(err => console.error('Failed to create in-app notification:', err));

    return Response.json({ 
      success: true, 
      message: 'Email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending travel notification:', error);
    return Response.json({ 
      error: 'Failed to send notification',
      details: error.message 
    }, { status: 500 });
  }
});