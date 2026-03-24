import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data, old_data } = await req.json();

    // Only process approved time off requests
    if (event.type === 'update' && data.status === 'approved' && old_data?.status === 'pending') {
      const currentYear = new Date().getFullYear();
      const requestYear = new Date(data.start_date).getFullYear();

      // Only process current year requests
      if (requestYear !== currentYear) {
        return Response.json({ 
          success: true, 
          message: 'Request is for different year, skipped' 
        });
      }

      // Calculate days used
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      // Get employee's balance
      const balances = await base44.asServiceRole.entities.TimeOffBalance.filter({
        employee_email: data.employee_email,
        year: currentYear
      });

      if (balances.length === 0) {
        return Response.json({ 
          error: 'No balance found for employee',
          success: false 
        }, { status: 404 });
      }

      const balance = balances[0];

      // Update balance based on request type
      const updateData = {};
      
      if (data.request_type === 'vacation') {
        updateData.vacation_used = balance.vacation_used + daysDiff;
        updateData.vacation_balance = balance.vacation_accrued - (balance.vacation_used + daysDiff);
      } else if (data.request_type === 'sick') {
        updateData.sick_used = balance.sick_used + daysDiff;
        updateData.sick_balance = balance.sick_accrued - (balance.sick_used + daysDiff);
      } else if (data.request_type === 'personal') {
        updateData.personal_used = balance.personal_used + daysDiff;
        updateData.personal_balance = balance.personal_accrued - (balance.personal_used + daysDiff);
      }

      await base44.asServiceRole.entities.TimeOffBalance.update(balance.id, updateData);

      return Response.json({
        success: true,
        days_deducted: daysDiff,
        new_balance: updateData.vacation_balance || updateData.sick_balance || updateData.personal_balance
      });
    }

    return Response.json({ success: true, message: 'No action needed' });

  } catch (error) {
    console.error('Update balance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});