import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { week_start, week_end } = await req.json();

    if (!week_start || !week_end) {
      return Response.json({ error: 'week_start and week_end required' }, { status: 400 });
    }

    // PHASE 2: Backend Alignment - Use EmployeeDirectory as SSOT
    const [directoryEmployees, timeEntries, drivingLogs, expenses, weeklyPayrolls, bonusConfigs, jobs, invoices] = await Promise.all([
      base44.entities.EmployeeDirectory.filter({ status: 'active' }),
      base44.entities.TimeEntry.list(),
      base44.entities.DrivingLog.list(),
      base44.entities.Expense.list(),
      base44.entities.WeeklyPayroll.list(),
      base44.entities.BonusConfiguration.filter({ status: 'active' }),
      base44.entities.Job.list(),
      base44.entities.Invoice.list()
    ]);

    // Enrich with User data for rates and settings
    const userIds = directoryEmployees.filter(d => d.user_id).map(d => d.user_id);
    const users = await Promise.all(
      userIds.map(id => base44.entities.User.filter({ id }).catch(() => []))
    );
    const userMap = users.flat().reduce((acc, u) => ({ ...acc, [u.id]: u }), {});

    // Map directory to employee shape
    const employees = directoryEmployees.map(d => {
      const user = userMap[d.user_id];
      return {
        id: d.user_id || d.id,
        email: d.employee_email,
        full_name: d.full_name,
        position: d.position,
        profile_photo_url: d.profile_photo_url,
        avatar_image_url: user?.avatar_image_url,
        preferred_profile_image: user?.preferred_profile_image,
        hourly_rate: user?.hourly_rate || 25,
        hourly_rate_overtime: user?.hourly_rate_overtime,
        per_diem_amount: user?.per_diem_amount || 50
      };
    });

    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(week_end);

    // Aggregate payroll per employee
    const payrollData = employees.map(emp => {
      // Filter time entries (approved only, within week)
      const empTimeEntries = timeEntries.filter(e => {
        const entryDate = new Date(e.date);
        const matchesEmployee = e.user_id ? e.user_id === emp.id : e.employee_email === emp.email;
        return matchesEmployee &&
          e.status === 'approved' &&
          entryDate >= weekStartDate &&
          entryDate <= weekEndDate;
      });

      // Filter driving logs (approved only, within week)
      const empDrivingLogs = drivingLogs.filter(d => {
        const logDate = new Date(d.date);
        const matchesEmployee = d.user_id ? d.user_id === emp.id : d.employee_email === emp.email;
        return matchesEmployee &&
          d.status === 'approved' &&
          logDate >= weekStartDate &&
          logDate <= weekEndDate;
      });

      // Filter expenses (approved only, within week)
      const empExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        const matchesEmployee = exp.employee_user_id ? exp.employee_user_id === emp.id : exp.employee_email === emp.email;
        return matchesEmployee &&
          exp.status === 'approved' &&
          expDate >= weekStartDate &&
          expDate <= weekEndDate;
      });

      // Calculate work hours (for overtime)
      const totalWorkHours = empTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      const normalHours = Math.min(totalWorkHours, 40);
      const overtimeHours = Math.max(0, totalWorkHours - 40);

      // Calculate driving
      const drivingHours = empDrivingLogs.reduce((sum, d) => sum + (d.hours || 0), 0);
      const drivingMiles = empDrivingLogs.reduce((sum, d) => sum + (d.miles || 0), 0);

      // Employee rates
      const hourlyRate = emp.hourly_rate || 25;
      const overtimeRate = emp.hourly_rate_overtime || (hourlyRate * 1.5);
      const perDiemDaily = emp.per_diem_amount || 50;

      // Calculate pays
      const mileagePay = drivingMiles * 0.60;
      const drivingHoursPay = drivingHours * hourlyRate;
      const totalDrivingPay = mileagePay + drivingHoursPay;

      // Per Diem - based on actual work days
      const workDaysSet = new Set();
      empTimeEntries.forEach(e => workDaysSet.add(e.date));
      const workDaysCount = workDaysSet.size;
      const perDiemAmount = workDaysCount * perDiemDaily;

      // Reimbursements (personal payment, not per diem)
      const reimbursements = empExpenses
        .filter(exp => exp.payment_method === 'personal' && exp.category !== 'per_diem')
        .reduce((sum, exp) => sum + exp.amount, 0);

      // Bonuses (derived from jobs)
      let bonusAmount = 0;
      const empBonusConfigs = bonusConfigs.filter(bc => {
        const matchesEmployee = bc.user_id ? bc.user_id === emp.id : bc.employee_email === emp.email;
        return matchesEmployee && bc.status === 'active';
      });

      for (const bonusConfig of empBonusConfigs) {
        const job = jobs.find(j => j.id === bonusConfig.job_id);
        const jobInvoice = invoices.find(inv => inv.job_id === bonusConfig.job_id && inv.status === 'paid');

        if (job && jobInvoice) {
          if (bonusConfig.bonus_type === 'percentage') {
            bonusAmount += (job.contract_amount || 0) * (bonusConfig.bonus_value / 100);
          } else if (bonusConfig.bonus_type === 'fixed_amount') {
            bonusAmount += bonusConfig.bonus_value;
          }
        }
      }

      // Calculate total pay
      const workPay = (normalHours * hourlyRate) + (overtimeHours * overtimeRate);
      const totalPay = workPay + totalDrivingPay + reimbursements + perDiemAmount + bonusAmount;

      // Find existing weekly payroll
      const weekPayroll = weeklyPayrolls.find(p => {
        const matchesEmployee = p.user_id ? p.user_id === emp.id : p.employee_email === emp.email;
        return matchesEmployee &&
          p.week_start === week_start &&
          p.week_end === week_end;
      });

      return {
        employee: {
          id: emp.id,
          email: emp.email,
          full_name: emp.full_name,
          position: emp.position,
          profile_photo_url: emp.profile_photo_url,
          avatar_image_url: emp.avatar_image_url,
          preferred_profile_image: emp.preferred_profile_image
        },
        normalHours,
        overtimeHours,
        drivingHours,
        drivingMiles,
        perDiemAmount,
        workDaysCount,
        workPay,
        drivingPay: totalDrivingPay,
        reimbursements,
        bonusAmount,
        totalPay,
        hourlyRate,
        overtimeRate,
        weekPayroll: weekPayroll || null
      };
    });

    return Response.json({
      payrollData,
      weekStart: week_start,
      weekEnd: week_end
    });

  } catch (error) {
    console.error('Error generating payroll:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});