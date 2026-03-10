import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only process Expense updates (per_diem category)
    if (event.type !== 'update' || event.entity_name !== 'Expense') {
      return Response.json({ success: false, reason: 'Not an Expense update' });
    }

    // Only process if status changed to 'approved' AND category is 'per_diem'
    if (!data || data.category !== 'per_diem' || data.status !== 'approved') {
      return Response.json({ success: true, reason: 'Not a per_diem approval' });
    }

    if (old_data?.status === 'approved') {
      return Response.json({ success: true, reason: 'Already approved' });
    }

    // Get the current expense record
    const expenseId = event.entity_id;
    
    // Verify this is a per-diem expense and get all details
    const expense = await base44.entities.Expense.get(expenseId);
    
    if (!expense || expense.category !== 'per_diem' || expense.status !== 'approved') {
      return Response.json({ success: false, reason: 'Invalid expense state' });
    }

    // Sync the per-diem to the job's expenses (it's already created as an Expense record with job_id)
    // The per-diem is already in the Expense entity with the job_id, so no additional sync needed
    // Payroll will automatically pick it up when calculating allocations

    return Response.json({
      success: true,
      message: 'Per diem approval synced',
      expense_id: expenseId,
      amount: expense.amount,
      job_id: expense.job_id,
      user_id: expense.user_id
    });

  } catch (error) {
    console.error('Per Diem Sync Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});