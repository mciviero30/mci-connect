import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * JOB COST AGGREGATION (Phase C1.2)
 * 
 * Aggregates labor and material costs for a job
 * Used by commission calculation and job analytics
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id, as_of_date } = await req.json();

    if (!job_id) {
      return Response.json({ error: 'Missing job_id' }, { status: 400 });
    }

    const asOfDate = as_of_date || new Date().toISOString().split('T')[0];

    // ===========================
    // FETCH TIME ENTRIES
    // ===========================
    const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({
      job_id: job_id,
      date: { $lte: asOfDate }
    });

    // ===========================
    // FETCH EXPENSES
    // ===========================
    const expenses = await base44.asServiceRole.entities.Expense.filter({
      job_id: job_id,
      date: { $lte: asOfDate }
    });

    // ===========================
    // CALCULATE LABOR COST
    // ===========================
    let laborCost = 0;
    const laborBreakdown = [];

    for (const entry of timeEntries) {
      // Resolve employee from user_id (preferred) or email (fallback)
      let employee = null;
      
      if (entry.user_id) {
        const employees = await base44.asServiceRole.entities.EmployeeDirectory.filter({
          user_id: entry.user_id
        });
        employee = employees[0];
      }
      
      if (!employee && entry.employee_email) {
        const employees = await base44.asServiceRole.entities.EmployeeDirectory.filter({
          employee_email: entry.employee_email
        });
        employee = employees[0];
      }

      const hourlyRate = employee?.hourly_rate || 0;
      const hours = entry.hours_worked || 0;
      const cost = hours * hourlyRate;

      laborCost += cost;

      laborBreakdown.push({
        entry_id: entry.id,
        date: entry.date,
        employee_name: entry.employee_name,
        hours: hours,
        hourly_rate: hourlyRate,
        cost: cost
      });
    }

    // ===========================
    // CALCULATE MATERIAL COST
    // ===========================
    const materialExpenses = expenses.filter(e => 
      e.account_category === 'expense_materials'
    );

    const materialCost = materialExpenses.reduce((sum, exp) => 
      sum + (exp.amount || 0), 0
    );

    // ===========================
    // CALCULATE OTHER EXPENSES
    // ===========================
    const otherExpensesList = expenses.filter(e => 
      e.account_category !== 'expense_materials'
    );

    const otherExpenses = otherExpensesList.reduce((sum, exp) => 
      sum + (exp.amount || 0), 0
    );

    // ===========================
    // TOTALS
    // ===========================
    const totalCost = laborCost + materialCost + otherExpenses;

    return Response.json({
      job_id: job_id,
      as_of_date: asOfDate,
      labor_cost: Math.round(laborCost * 100) / 100,
      material_cost: Math.round(materialCost * 100) / 100,
      other_expenses: Math.round(otherExpenses * 100) / 100,
      total_cost: Math.round(totalCost * 100) / 100,
      breakdown: {
        time_entries_count: timeEntries.length,
        total_hours: timeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0),
        labor_details: laborBreakdown,
        material_expenses_count: materialExpenses.length,
        other_expenses_count: otherExpensesList.length
      }
    });

  } catch (error) {
    console.error('[aggregateJobCosts] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});