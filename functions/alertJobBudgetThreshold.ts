import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * alertJobBudgetThreshold
 * Checks all active jobs and sends email + in-app notification
 * when real_cost exceeds 80% of estimated_cost.
 * Designed to run as a scheduled automation (daily).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled calls (no user auth) or admin calls
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch {
      // Called from scheduler (no user token) - allow via service role
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all active jobs with financial data
    const jobs = await base44.asServiceRole.entities.Job.filter({
      status: { $in: ['active', 'on_hold'] }
    });

    const alerts = [];
    const THRESHOLD = 0.80; // 80%

    for (const job of jobs) {
      const realCost = job.real_cost || 0;
      const estimatedCost = job.estimated_cost || 0;

      if (estimatedCost <= 0) continue;

      const pctUsed = realCost / estimatedCost;

      // Only alert between 80% and 120% (above 120% is already "over budget")
      if (pctUsed < THRESHOLD || pctUsed > 1.20) continue;

      // Check if we already notified about this job today
      const today = new Date().toISOString().split('T')[0];
      const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
        related_entity_id: job.id,
        type: 'job_budget_threshold'
      }, '-created_date', 1);

      if (existingNotifs.length > 0) {
        const lastNotif = existingNotifs[0];
        const lastDate = lastNotif.created_date?.split('T')[0];
        if (lastDate === today) continue; // Already notified today
      }

      const pctLabel = (pctUsed * 100).toFixed(0);

      // Get admin users to notify
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

      for (const admin of admins) {
        if (!admin.email) continue;

        // In-app notification
        await base44.asServiceRole.entities.Notification.create({
          recipient_email: admin.email,
          recipient_name: admin.full_name || 'Admin',
          title: `⚠️ Budget Alert: ${job.name}`,
          message: `Job "${job.name}" has used ${pctLabel}% of its estimated budget. Real cost: $${realCost.toLocaleString()} / Estimated: $${estimatedCost.toLocaleString()}.`,
          type: 'job_budget_threshold',
          priority: 'high',
          link: `/page/JobDetails?id=${job.id}`,
          related_entity_id: job.id,
          related_entity_type: 'job',
          read: false
        });

        // Email notification
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          from_name: 'MCI Connect — Budget Alert',
          subject: `⚠️ Budget Alert: ${job.name} at ${pctLabel}%`,
          body: `
Hi ${admin.full_name || 'Admin'},

Budget threshold alert for job: <strong>${job.name}</strong>

• Customer: ${job.customer_name || 'N/A'}
• Real Cost to Date: $${realCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Estimated Budget: $${estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Budget Used: <strong>${pctLabel}%</strong>

This job has exceeded 80% of its estimated budget. Please review costs and take action if needed.

<a href="${Deno.env.get('APP_URL') || ''}/page/JobDetails?id=${job.id}">View Job Details →</a>

— MCI Connect Automated Alerts
          `.trim()
        });

        alerts.push({ job_id: job.id, job_name: job.name, pct: pctLabel, admin: admin.email });
      }
    }

    console.log(`[alertJobBudgetThreshold] Checked ${jobs.length} jobs, sent ${alerts.length} alerts`);
    return Response.json({ success: true, alerts_sent: alerts.length, details: alerts });

  } catch (error) {
    console.error('[alertJobBudgetThreshold] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});