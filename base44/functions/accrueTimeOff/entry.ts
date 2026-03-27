import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Get all active employees
    const employees = await base44.entities.EmployeeDirectory.filter({ status: 'active' });
    
    const results = {
      updated: [],
      created: [],
      errors: []
    };

    for (const emp of employees) {
      try {
        // Get or create balance record for current year
        const existingBalances = await base44.entities.TimeOffBalance.filter({
          employee_email: emp.employee_email,
          year: currentYear
        });

        const lastAccrualDate = existingBalances[0]?.last_accrual_date;
        const lastAccrualMonth = lastAccrualDate ? new Date(lastAccrualDate).getMonth() + 1 : 0;

        // Skip if already accrued this month
        if (lastAccrualMonth === currentMonth) {
          continue;
        }

        const accrualRate = existingBalances[0]?.accrual_rate_per_month || 1.25;
        
        if (existingBalances.length > 0) {
          // Update existing record
          const balance = existingBalances[0];
          await base44.entities.TimeOffBalance.update(balance.id, {
            vacation_accrued: balance.vacation_accrued + accrualRate,
            vacation_balance: (balance.vacation_accrued + accrualRate) - balance.vacation_used,
            last_accrual_date: new Date().toISOString().split('T')[0]
          });
          results.updated.push(emp.employee_email);
        } else {
          // Create new record
          await base44.entities.TimeOffBalance.create({
            user_id: emp.user_id,
            employee_email: emp.employee_email,
            employee_name: emp.full_name,
            year: currentYear,
            vacation_accrued: accrualRate,
            vacation_balance: accrualRate,
            sick_accrued: 0,
            sick_balance: 0,
            personal_accrued: 0,
            personal_balance: 0,
            accrual_rate_per_month: accrualRate,
            last_accrual_date: new Date().toISOString().split('T')[0]
          });
          results.created.push(emp.employee_email);
        }
      } catch (error) {
        results.errors.push({
          employee: emp.employee_email,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results,
      total_processed: employees.length
    });

  } catch (error) {
    console.error('Accrual error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});