import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * autoUpdateGoalProgress
 * 
 * Runs daily to auto-update goals that are linked to jobs.
 * For each active goal with a linked_job_id, it computes a new current_value
 * based on the goal_type and unit:
 *   - "hours" / "time" → sums approved TimeEntry.hours_worked for that job
 *   - "revenue" / "dollars" → sums Invoice.total for that job
 *   - "expenses" → sums approved Expense.amount for that job
 *   - default / "percentage" → skips (manual only)
 * 
 * Then updates Goal.current_value + status, and logs a GoalProgress record.
 * Admin-only endpoint.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both admin-triggered and scheduled (no user) calls
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (_) {
      // Called by scheduler (no user token) — allow via service role
      isScheduled = true;
    }

    const db = base44.asServiceRole;

    // Fetch all active goals with a linked job
    const allGoals = await db.entities.Goal.list('-created_date', 500);
    const linkedGoals = allGoals.filter(g =>
      g.linked_job_id &&
      g.status !== 'completed' &&
      g.status !== 'cancelled'
    );

    if (linkedGoals.length === 0) {
      return Response.json({ updated: 0, message: 'No linked active goals found' });
    }

    const results = [];

    for (const goal of linkedGoals) {
      const jobId = goal.linked_job_id;
      const unit = (goal.unit || 'percentage').toLowerCase();
      const goalType = (goal.goal_type || '').toLowerCase();

      let newValue = null;

      // Determine what to compute based on unit/goal_type
      if (unit === 'hours' || goalType.includes('hour') || unit === 'time') {
        // Sum approved time entries for this job
        const entries = await db.entities.TimeEntry.filter({ job_id: jobId, status: 'approved' });
        newValue = entries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

      } else if (unit === 'dollars' || unit === 'revenue' || unit === 'usd') {
        // Sum invoice totals for this job
        const invoices = await db.entities.Invoice.filter({ job_id: jobId });
        const paidInvoices = invoices.filter(i => ['paid', 'partial', 'sent'].includes(i.status));
        newValue = paidInvoices.reduce((sum, i) => sum + (i.total || 0), 0);

      } else if (unit === 'expenses') {
        // Sum approved expenses for this job
        const expenses = await db.entities.Expense.filter({ job_id: jobId, status: 'approved' });
        newValue = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      } else {
        // percentage/count/custom — skip auto-update
        continue;
      }

      if (newValue === null || newValue === goal.current_value) continue;

      // Compute new status
      const pct = goal.target_value > 0 ? (newValue / goal.target_value) : 0;
      const newStatus = pct >= 1 ? 'completed'
        : pct >= 0.7 ? 'on_track'
        : pct >= 0.4 ? 'at_risk'
        : 'behind';

      // Log progress entry
      await db.entities.GoalProgress.create({
        goal_id: goal.id,
        updated_by_email: 'system@mciconnect.app',
        updated_by_name: 'Auto-Update (System)',
        previous_value: goal.current_value || 0,
        new_value: newValue,
        status: newStatus,
        notes: `Auto-updated from job data on ${new Date().toLocaleDateString()}`
      });

      // Update goal
      const updatePayload = {
        current_value: newValue,
        status: newStatus,
      };
      if (newStatus === 'completed' && !goal.completed_date) {
        updatePayload.completed_date = new Date().toISOString().split('T')[0];
      }

      await db.entities.Goal.update(goal.id, updatePayload);

      // Notify owner if status changed
      if (newStatus !== goal.status && goal.owner_email) {
        const messages = {
          completed: `🎉 Goal auto-completed: "${goal.title}"`,
          at_risk: `⚠️ Goal at risk: "${goal.title}"`,
          behind: `🚨 Goal behind schedule: "${goal.title}"`,
          on_track: `✅ Goal back on track: "${goal.title}"`
        };
        await db.entities.Notification.create({
          user_email: goal.owner_email,
          type: 'goal_auto_update',
          title: 'Goal Progress Auto-Updated',
          message: messages[newStatus] || `Goal updated to ${newStatus}`,
          is_read: false
        });
      }

      results.push({
        goal_id: goal.id,
        title: goal.title,
        previous: goal.current_value,
        new: newValue,
        status: newStatus
      });

      console.log(`Updated goal "${goal.title}": ${goal.current_value} → ${newValue} (${newStatus})`);
    }

    return Response.json({
      updated: results.length,
      skipped: linkedGoals.length - results.length,
      results
    });

  } catch (error) {
    console.error('autoUpdateGoalProgress error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});