import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calculate commission when a job is closed
 * IDEMPOTENT: Safe to call multiple times
 * VALIDATION: Only active signed agreements
 * RULE: Job must be completed
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // SECURITY: Only CEO/Admin can trigger commission calculation
    if (!user || (user.role !== 'admin' && user.role !== 'ceo')) {
      return Response.json({ error: 'Unauthorized: Admin/CEO only' }, { status: 403 });
    }

    const { job_id } = await req.json();

    if (!job_id) {
      return Response.json({ error: 'job_id is required' }, { status: 400 });
    }

    // Fetch job
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    if (jobs.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }
    const job = jobs[0];

    // VALIDATION: Job must be completed
    if (job.status !== 'completed') {
      return Response.json({ 
        error: 'Job must be completed to calculate commission',
        job_status: job.status 
      }, { status: 400 });
    }

    // Find job owner/manager (from team or assignment)
    let employeeEmail = null;
    let employeeName = null;

    // Try to find from team_id
    if (job.team_id) {
      const teams = await base44.asServiceRole.entities.Team.filter({ id: job.team_id });
      if (teams.length > 0 && teams[0].manager_email) {
        employeeEmail = teams[0].manager_email;
        employeeName = teams[0].manager_name;
      }
    }

    if (!employeeEmail) {
      return Response.json({ 
        error: 'No manager/employee found for this job. Assign a team with a manager first.' 
      }, { status: 400 });
    }

    // Find employee in directory
    const employees = await base44.asServiceRole.entities.EmployeeDirectory.filter({ 
      email: employeeEmail 
    });
    if (employees.length === 0) {
      return Response.json({ 
        error: `Employee ${employeeEmail} not found in directory` 
      }, { status: 404 });
    }
    const employee = employees[0];

    // VALIDATION: Find active signed agreement
    const agreements = await base44.asServiceRole.entities.CommissionAgreement.filter({
      employee_directory_id: employee.id,
      status: 'active',
      signed: true,
    });

    if (agreements.length === 0) {
      return Response.json({ 
        error: 'No active signed commission agreement found for this employee',
        employee_email: employeeEmail 
      }, { status: 400 });
    }

    const agreement = agreements[0];

    // IDEMPOTENCY: Check if commission already exists
    const existingResults = await base44.asServiceRole.entities.CommissionResult.filter({
      job_id: job.id,
      employee_directory_id: employee.id,
    });

    // If exists and not invalidated, return existing
    if (existingResults.length > 0) {
      const existing = existingResults[0];
      if (existing.status !== 'invalidated') {
        return Response.json({ 
          message: 'Commission already calculated',
          commission_result: existing,
          already_exists: true
        });
      }
    }

    // Calculate financials
    const jobRevenue = job.contract_amount || 0;

    // Fetch time entries
    const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({ 
      job_id: job.id,
      status: 'approved'
    });

    // Fetch expenses
    const expenses = await base44.asServiceRole.entities.Expense.filter({ 
      job_id: job.id,
      status: 'approved'
    });

    // Fetch driving logs
    const drivingLogs = await base44.asServiceRole.entities.DrivingLog.filter({ 
      job_id: job.id,
      status: 'approved'
    });

    // Calculate payroll cost
    const payrollCost = timeEntries.reduce((sum, entry) => {
      const hours = entry.hours_worked || 0;
      const rate = entry.hourly_rate || 0;
      return sum + (hours * rate);
    }, 0);

    // Calculate expense cost
    const expenseCost = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // Calculate mileage cost
    const mileageCost = drivingLogs.reduce((sum, log) => {
      const miles = log.miles || 0;
      const rate = log.rate_per_mile || 0.6;
      return sum + (miles * rate);
    }, 0);

    const totalExpenses = payrollCost + expenseCost + mileageCost;
    const netProfit = jobRevenue - totalExpenses;

    // Calculate commission
    const commissionRate = agreement.commission_rate;
    const commissionAmount = Math.max(0, (netProfit * (commissionRate / 100)));

    // Create CommissionResult
    const commissionResult = await base44.asServiceRole.entities.CommissionResult.create({
      job_id: job.id,
      job_name: job.name || job.job_name || 'Unnamed Job',
      employee_directory_id: employee.id,
      employee_email: employee.email,
      employee_name: employee.full_name || employee.email,
      agreement_id: agreement.id,
      calculation_date: new Date().toISOString(),
      job_revenue: jobRevenue,
      job_expenses: totalExpenses,
      job_mileage_cost: mileageCost,
      net_profit: netProfit,
      base_commission_rate: commissionRate,
      adjusted_commission_rate: commissionRate,
      commission_amount: commissionAmount,
      status: 'calculated',
    });

    return Response.json({
      success: true,
      commission_result: commissionResult,
      calculation: {
        revenue: jobRevenue,
        expenses: totalExpenses,
        mileage: mileageCost,
        net_profit: netProfit,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
      }
    });

  } catch (error) {
    console.error('Commission calculation error:', error);
    return Response.json({ 
      error: 'Failed to calculate commission',
      details: error.message 
    }, { status: 500 });
  }
});