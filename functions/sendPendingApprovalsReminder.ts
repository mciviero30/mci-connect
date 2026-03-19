import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * DAILY REMINDER - Pending Approvals
 * Sends email to admins if there are old pending time entries or expenses
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffDate = threeDaysAgo.toISOString().split('T')[0];

    // Find old pending time entries
    const pendingTimeEntries = await base44.asServiceRole.entities.TimeEntry.filter(
      { status: 'pending' },
      '-created_date',
      100
    );

    const oldTimeEntries = pendingTimeEntries.filter(te => te.date <= cutoffDate);

    // Find old pending expenses
    const pendingExpenses = await base44.asServiceRole.entities.Expense.filter(
      { status: 'pending' },
      '-created_date',
      100
    );

    const oldExpenses = pendingExpenses.filter(exp => exp.date <= cutoffDate);

    // If nothing pending, skip
    if (oldTimeEntries.length === 0 && oldExpenses.length === 0) {
      console.log('[PendingReminder] No old pending items - skipping notification');
      return Response.json({ 
        success: true, 
        skipped: true,
        reason: 'No old pending approvals' 
      });
    }

    // Get all admins to notify
    const admins = await base44.asServiceRole.entities.User.filter(
      { role: 'admin' },
      '',
      50
    );

    if (admins.length === 0) {
      console.log('[PendingReminder] No admins found');
      return Response.json({ success: false, error: 'No admins to notify' });
    }

    // Build email content
    const timeEntriesHtml = oldTimeEntries.length > 0 
      ? `<h3>⏰ Time Entries Pending (${oldTimeEntries.length})</h3>
         <ul>
           ${oldTimeEntries.slice(0, 10).map(te => 
             `<li>${te.employee_name} - ${te.date} - ${te.hours_worked}h on ${te.job_name}</li>`
           ).join('')}
           ${oldTimeEntries.length > 10 ? `<li>...and ${oldTimeEntries.length - 10} more</li>` : ''}
         </ul>` 
      : '';

    const expensesHtml = oldExpenses.length > 0
      ? `<h3>💰 Expenses Pending (${oldExpenses.length})</h3>
         <ul>
           ${oldExpenses.slice(0, 10).map(exp => 
             `<li>${exp.employee_name} - ${exp.date} - $${exp.amount} - ${exp.category}</li>`
           ).join('')}
           ${oldExpenses.length > 10 ? `<li>...and ${oldExpenses.length - 10} more</li>` : ''}
         </ul>`
      : '';

    const totalAmount = oldExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1E3A8A;">📋 Pending Approvals Reminder</h2>
        <p>You have items pending approval for more than 3 days:</p>
        
        ${timeEntriesHtml}
        ${expensesHtml}
        
        <p style="margin-top: 20px; padding: 15px; background: #FEF3C7; border-left: 4px solid #F59E0B;">
          <strong>Total Pending Expenses:</strong> $${totalAmount.toFixed(2)}
        </p>
        
        <p style="margin-top: 20px;">
          <a href="${Deno.env.get('APP_URL')}/Horarios" 
             style="background: #1E3A8A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Review Time Entries
          </a>
          
          <a href="${Deno.env.get('APP_URL')}/Gastos" 
             style="background: #1E3A8A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; margin-left: 10px;">
            Review Expenses
          </a>
        </p>
      </div>
    `;

    // Send to all admins
    const emailPromises = admins.map(admin => 
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `⚠️ ${oldTimeEntries.length + oldExpenses.length} Pending Approvals Need Review`,
        body: emailBody
      }).catch(err => console.error(`Failed to send to ${admin.email}:`, err))
    );

    await Promise.all(emailPromises);

    return Response.json({
      success: true,
      notified_admins: admins.length,
      pending_time_entries: oldTimeEntries.length,
      pending_expenses: oldExpenses.length,
      total_pending_amount: totalAmount
    });

  } catch (error) {
    console.error('[PendingReminder] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});