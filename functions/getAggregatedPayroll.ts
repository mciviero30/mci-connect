import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && !['CEO', 'administrator', 'manager'].includes(user.position)) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { week_start, week_end } = body;

    if (!week_start || !week_end) {
      return Response.json({ error: 'week_start and week_end are required' }, { status: 400 });
    }

    // Fetch all data in parallel
    const [profiles, users, timeEntries, drivingLogs, expenses] = await Promise.all([
      base44.asServiceRole.entities.EmployeeProfile.filter({ employment_status: 'active' }),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.TimeEntry.filter({
        date: { $gte: week_start, $lte: week_end },
        status: 'approved'
      }),
      base44.asServiceRole.entities.DrivingLog.filter({
        date: { $gte: week_start, $lte: week_end },
        status: 'approved'
      }),
      base44.asServiceRole.entities.Expense.filter({
        date: { $gte: week_start, $lte: week_end },
        status: 'approved'
      }),
    ]);

    const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});

    const payrollData = profiles
      .filter(p => p.user_id)
      .map(profile => {
        const appUser = userMap[profile.user_id];
        if (!appUser) return null;

        const employee = {
          id: profile.user_id,
          email: appUser.email,
          full_name: appUser.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          position: profile.position || '',
          hourly_rate: profile.hourly_rate || 25,
          profile_photo_url: profile.profile_photo_url || null,
          avatar_image_url: appUser.avatar_image_url || null,
          preferred_profile_image: appUser.preferred_profile_image || null,
        };

        const hourlyRate = parseFloat(profile.hourly_rate || 25);
        const overtimeMultiplier = parseFloat(profile.overtime_multiplier || 1.5);
        const overtimeRate = hourlyRate * overtimeMultiplier;

        // Filter entries for this employee (user_id preferred, email fallback)
        const empTimeEntries = timeEntries.filter(e =>
          e.user_id === profile.user_id || e.employee_email === appUser.email
        );
        const empDrivingLogs = drivingLogs.filter(d =>
          d.user_id === profile.user_id || d.employee_email === appUser.email
        );
        const empExpenses = expenses.filter(e =>
          e.user_id === profile.user_id || e.employee_email === appUser.email
        );

        // Calculate hours
        let workHours = 0;
        let drivingHours = 0;

        empTimeEntries.forEach(e => {
          const h = parseFloat(e.hours_worked || 0);
          if (e.work_type === 'driving') {
            drivingHours += h;
          } else {
            workHours += h;
          }
        });

        empDrivingLogs.forEach(d => {
          drivingHours += parseFloat(d.hours || 0);
        });

        // Overtime: only work hours > 40
        const normalHours = Math.min(workHours, 40);
        const overtimeHours = Math.max(0, workHours - 40);
        const drivingMiles = empDrivingLogs.reduce((sum, d) => sum + (d.miles || 0), 0);

        // Per diem (category = per_diem)
        const perDiemExpenses = empExpenses.filter(e => e.category === 'per_diem');
        const perDiemAmount = perDiemExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const workDaysCount = new Set(perDiemExpenses.map(e => e.date)).size;

        // Reimbursements (personal payment_method, not per diem)
        const reimbursements = empExpenses
          .filter(e => e.payment_method === 'personal' && e.category !== 'per_diem')
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        // Pay calculations
        const regularPay = normalHours * hourlyRate;
        const overtimePay = overtimeHours * overtimeRate;
        const workPay = regularPay + overtimePay;
        const drivingHoursPay = drivingHours * hourlyRate;
        const mileagePay = drivingMiles * 0.60; // $0.60/mile employee reimbursement rate
        const drivingPay = drivingHoursPay + mileagePay;
        const bonusAmount = 0; // Future: load from BonusConfiguration
        const totalPay = workPay + drivingPay + perDiemAmount + reimbursements + bonusAmount;

        return {
          employee,
          normalHours,
          overtimeHours,
          drivingHours,
          drivingMiles,
          perDiemAmount,
          workDaysCount,
          workPay,
          drivingPay,
          reimbursements,
          pendingReimbursements: 0,
          bonusAmount,
          totalPay,
          hourlyRate,
          overtimeRate,
          weekPayroll: null // Future: load from PayrollBatch
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.employee.full_name || '').localeCompare(b.employee.full_name || ''));

    return Response.json({ payrollData });

  } catch (error) {
    console.error('getAggregatedPayroll error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});