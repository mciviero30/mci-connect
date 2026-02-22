import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Runs on schedule — alerts admins when time entries have been pending for 3+ days
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoff = threeDaysAgo.toISOString().split('T')[0];

    // Get all pending time entries older than 3 days
    const pendingEntries = await base44.asServiceRole.entities.TimeEntry.filter({ status: 'pending' });
    const staleEntries = pendingEntries.filter(e => e.date && e.date <= cutoff);

    if (staleEntries.length === 0) {
      console.log('[alertPendingHoursStale] No stale pending entries found.');
      return Response.json({ message: 'No stale entries', count: 0 });
    }

    // Get admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

    let notified = 0;
    for (const admin of admins) {
      if (!admin.email) continue;

      // Group by employee for the message
      const byEmployee = {};
      staleEntries.forEach(e => {
        const name = e.employee_name || e.employee_email || 'Unknown';
        if (!byEmployee[name]) byEmployee[name] = 0;
        byEmployee[name] += e.hours_worked || 0;
      });

      const summary = Object.entries(byEmployee)
        .map(([name, hours]) => `• ${name}: ${hours.toFixed(1)}h`)
        .join('\n');

      // Create in-app notification
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: admin.email,
        title: `⏰ ${staleEntries.length} Time Entries Pending 3+ Days`,
        message: `${staleEntries.length} time entries have been pending approval for more than 3 days. Please review.`,
        category: 'approvals',
        priority: 'high',
        is_read: false,
        action_url: '/Horarios'
      });

      // Send email
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `Action Required: ${staleEntries.length} Pending Time Entries (3+ days)`,
        body: `Hi ${admin.full_name || 'Admin'},\n\nThe following time entries have been pending approval for 3 or more days:\n\n${summary}\n\nTotal: ${staleEntries.length} entries\n\nPlease review them in MCI Connect > Horarios.\n\nThank you!`
      });

      notified++;
    }

    console.log(`[alertPendingHoursStale] Notified ${notified} admins about ${staleEntries.length} stale entries.`);
    return Response.json({ success: true, staleCount: staleEntries.length, adminsNotified: notified });

  } catch (error) {
    console.error('[alertPendingHoursStale] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});