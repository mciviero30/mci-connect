import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    // Only handle updates where status changed to approved
    if (event?.type !== 'update') return Response.json({ skipped: 'not an update' });

    const newStatus = data?.status;
    const oldStatus = old_data?.status;

    if (newStatus !== 'approved' || oldStatus === 'approved') {
      return Response.json({ skipped: 'status not changed to approved' });
    }

    const expense = data;
    if (!expense?.employee_email) return Response.json({ skipped: 'no employee email' });

    // Find the employee user to get their name
    const users = await base44.asServiceRole.entities.User.filter({ email: expense.employee_email });
    const employee = users[0];
    const employeeName = employee?.full_name || expense.employee_name || expense.employee_email;

    // Create in-app notification
    await base44.asServiceRole.entities.Notification.create({
      recipient_email: expense.employee_email,
      title: '✅ Expense Approved',
      message: `Your expense of $${expense.amount?.toFixed(2)} for "${expense.description || expense.category}" has been approved.`,
      category: 'approvals',
      priority: 'medium',
      is_read: false,
      action_url: '/MisGastos'
    });

    // Send email notification
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: expense.employee_email,
      subject: `Expense Approved – $${expense.amount?.toFixed(2)}`,
      body: `Hi ${employeeName},\n\nYour expense has been approved:\n\n• Amount: $${expense.amount?.toFixed(2)}\n• Category: ${expense.category}\n• Description: ${expense.description || 'N/A'}\n• Date: ${expense.date}\n\nYou can view your expenses in MCI Connect.\n\nThank you!`
    });

    console.log(`[notifyExpenseApproved] Notified ${expense.employee_email} for expense $${expense.amount}`);
    return Response.json({ success: true, notified: expense.employee_email });

  } catch (error) {
    console.error('[notifyExpenseApproved] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});