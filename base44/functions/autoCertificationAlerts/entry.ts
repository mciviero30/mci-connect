import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * autoCertificationAlerts
 * 
 * Runs daily to:
 *  1. Check all active certifications for expiring/expired status
 *  2. Update Certification.status accordingly
 *  3. Send a 30-day warning CertificationAlert (once per certification)
 *  4. Send an expiration notice CertificationAlert (once per certification)
 *  5. Create in-app Notification for the employee + admin
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (no user) or admin calls
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (_) {
      // Scheduled — no user token, proceed with service role
    }

    const db = base44.asServiceRole;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);

    // Fetch all non-expired certs
    const allCerts = await db.entities.Certification.list('-expiration_date', 1000);
    const activeCerts = allCerts.filter(c => c.expiration_date);

    // Fetch existing alerts to avoid duplicates
    const existingAlerts = await db.entities.CertificationAlert.list('-alert_sent_date', 2000);
    const alertKey = (certId, type) => `${certId}::${type}`;
    const alertSet = new Set(existingAlerts.map(a => alertKey(a.certification_id, a.alert_type)));

    const stats = { status_updated: 0, alerts_sent: 0, notifications_sent: 0 };

    // Fetch admins for notification
    const allUsers = await db.entities.User.list();
    const adminEmails = allUsers.filter(u => u.role === 'admin').map(u => u.email);

    for (const cert of activeCerts) {
      const expDate = new Date(cert.expiration_date);
      expDate.setHours(0, 0, 0, 0);

      const isExpired = expDate < today;
      const isExpiringSoon = !isExpired && expDate <= in30Days;

      // --- 1. Update certification status ---
      const newStatus = isExpired ? 'expired' : isExpiringSoon ? 'expiring_soon' : 'active';
      if (newStatus !== cert.status) {
        await db.entities.Certification.update(cert.id, { status: newStatus });
        stats.status_updated++;
        console.log(`Cert status updated: "${cert.certification_name}" for ${cert.employee_name} → ${newStatus}`);
      }

      const certName = cert.certification_name || cert.certification_type;
      const daysUntil = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      // --- 2. 30-day warning ---
      if (isExpiringSoon && !alertSet.has(alertKey(cert.id, '30_day_warning'))) {
        await db.entities.CertificationAlert.create({
          certification_id: cert.id,
          employee_email: cert.employee_email,
          employee_name: cert.employee_name,
          certification_name: certName,
          expiration_date: cert.expiration_date,
          alert_sent_date: new Date().toISOString(),
          alert_type: '30_day_warning',
          acknowledged: false
        });
        stats.alerts_sent++;

        // Notify employee
        await db.entities.Notification.create({
          user_email: cert.employee_email,
          type: 'certification_expiring',
          title: 'Certification Expiring Soon',
          message: `⚠️ Your "${certName}" certification expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}. Please renew it.`,
          is_read: false
        });
        stats.notifications_sent++;

        // Notify admins
        for (const adminEmail of adminEmails) {
          if (adminEmail !== cert.employee_email) {
            await db.entities.Notification.create({
              user_email: adminEmail,
              type: 'certification_expiring',
              title: 'Employee Certification Expiring',
              message: `⚠️ ${cert.employee_name}'s "${certName}" expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
              is_read: false
            });
            stats.notifications_sent++;
          }
        }

        console.log(`30-day alert sent for ${cert.employee_name} - ${certName}`);
      }

      // --- 3. Expiration notice ---
      if (isExpired && !alertSet.has(alertKey(cert.id, 'expiration_notice'))) {
        await db.entities.CertificationAlert.create({
          certification_id: cert.id,
          employee_email: cert.employee_email,
          employee_name: cert.employee_name,
          certification_name: certName,
          expiration_date: cert.expiration_date,
          alert_sent_date: new Date().toISOString(),
          alert_type: 'expiration_notice',
          acknowledged: false
        });
        stats.alerts_sent++;

        // Notify employee
        await db.entities.Notification.create({
          user_email: cert.employee_email,
          type: 'certification_expired',
          title: 'Certification Expired',
          message: `🚨 Your "${certName}" certification expired on ${cert.expiration_date}. Renew immediately.`,
          is_read: false
        });
        stats.notifications_sent++;

        // Notify admins
        for (const adminEmail of adminEmails) {
          if (adminEmail !== cert.employee_email) {
            await db.entities.Notification.create({
              user_email: adminEmail,
              type: 'certification_expired',
              title: 'Employee Certification Expired',
              message: `🚨 ${cert.employee_name}'s "${certName}" expired on ${cert.expiration_date}.`,
              is_read: false
            });
            stats.notifications_sent++;
          }
        }

        console.log(`Expiration notice sent for ${cert.employee_name} - ${certName}`);
      }
    }

    return Response.json({
      success: true,
      certifications_checked: activeCerts.length,
      ...stats
    });

  } catch (error) {
    console.error('autoCertificationAlerts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});