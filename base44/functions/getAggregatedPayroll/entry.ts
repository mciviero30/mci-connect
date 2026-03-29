import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const OVERTIME_THRESHOLD = 8;   // hours per day before OT
const OVERTIME_RATE   = 1.5;
const DRIVING_RATE    = 0.67;   // per-mile IRS rate (2025)

function parseHHMM(str) {
  if (!str) return null;
  const parts = String(str).split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function calcHoursWorked(checkIn, checkOut) {
  const inMin  = parseHHMM(checkIn);
  const outMin = parseHHMM(checkOut);
  if (inMin === null || outMin === null) return 0;
  const diff = outMin - inMin;
  return diff > 0 ? diff / 60 : 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = ['admin', 'ceo', 'owner', 'super_admin', 'administrator'];
    if (!ADMIN_ROLES.includes(user.role?.toLowerCase?.())) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { week_start, week_end } = body;

    if (!week_start || !week_end) {
      return Response.json({ error: 'week_start and week_end required (YYYY-MM-DD)' }, { status: 400 });
    }

    const startDate = new Date(week_start + 'T00:00:00Z');
    const endDate   = new Date(week_end   + 'T23:59:59Z');

    // ── Fetch all active employees ────────────────────────────────
    const employees = await base44.asServiceRole.entities.User.list('full_name', 500);
    const activeEmps = employees.filter(e =>
      e.role !== 'client' && e.full_name && e.email
    );

    // ── Fetch time entries in range ───────────────────────────────
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.list('-date', 2000);
    const rangeEntries = allTimeEntries.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d >= startDate && d <= endDate && e.status === 'approved';
    });

    // ── Fetch driving logs in range ───────────────────────────────
    const allDrivingLogs = await base44.asServiceRole.entities.DrivingLog.list('-date', 2000);
    const rangeDriving = allDrivingLogs.filter(dl => {
      if (!dl.date) return false;
      const d = new Date(dl.date);
      return d >= startDate && d <= endDate;
    });

    // ── Fetch expenses in range ───────────────────────────────────
    const allExpenses = await base44.asServiceRole.entities.Expense.list('-date', 2000);
    const rangeExpenses = allExpenses.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    });

    // ── Fetch WeeklyPayroll records ───────────────────────────────
    const weeklyPayrolls = await base44.asServiceRole.entities.WeeklyPayroll
      .list('-week_start', 500).catch(() => []);

    // ── Fetch Commissions (approved/paid bonuses) ─────────────────
    const allCommissions = await base44.asServiceRole.entities.Commission
      .list('-created_date', 1000).catch(() => []);
    const rangeCommissions = allCommissions.filter(c => {
      if (!c.created_date) return false;
      const d = new Date(c.created_date);
      return d >= startDate && d <= endDate &&
        (c.status === 'approved' || c.status === 'paid');
    });

    // ── Per-diem rates (company config or default) ────────────────
    const companyConf = await base44.asServiceRole.entities.CompanySettings
      .list('', 1).catch(() => []);
    const perDiemRate = companyConf?.[0]?.per_diem_rate || 50;

    // ── Build payroll row per employee ────────────────────────────
    const payrollData = [];

    for (const emp of activeEmps) {
      const matchEntry = (e) =>
        (emp.id && e.user_id === emp.id) ||
        (emp.email && e.employee_email?.toLowerCase() === emp.email.toLowerCase());

      const empEntries  = rangeEntries.filter(matchEntry);
      const empDriving  = rangeDriving.filter(dl =>
        (emp.id && dl.user_id === emp.id) ||
        (emp.email && dl.employee_email?.toLowerCase() === emp.email.toLowerCase())
      );
      const empExpenses = rangeExpenses.filter(e =>
        (emp.id && e.user_id === emp.id) ||
        (emp.email && e.employee_email?.toLowerCase() === emp.email.toLowerCase())
      );
      const empCommissions = rangeCommissions.filter(c =>
        (emp.id && c.user_id === emp.id) ||
        (emp.email && c.employee_email?.toLowerCase() === emp.email.toLowerCase())
      );

      // Skip employees with zero activity
      if (!empEntries.length && !empDriving.length && !empExpenses.length && !empCommissions.length) {
        continue;
      }

      // ── Hours calculation ──
      const hourlyRate = emp.hourly_rate || 0;
      let normalHours  = 0;
      let overtimeHours = 0;
      const workDays = new Set();

      for (const entry of empEntries) {
        const hrs = entry.hours_worked ||
          calcHoursWorked(entry.check_in, entry.check_out);
        const dayKey = entry.date?.toString().slice(0, 10);
        if (dayKey) workDays.add(dayKey);

        if (hrs > OVERTIME_THRESHOLD) {
          normalHours   += OVERTIME_THRESHOLD;
          overtimeHours += hrs - OVERTIME_THRESHOLD;
        } else {
          normalHours += hrs;
        }
      }

      // ── Driving ──
      const drivingHours = empDriving.reduce((s, dl) => s + (dl.hours || 0), 0);
      const drivingMiles = empDriving.reduce((s, dl) => s + (dl.miles || 0), 0);

      // ── Per diem ──
      const perDiemAmount = workDays.size * perDiemRate;

      // ── Expenses ──
      const reimbursements = empExpenses
        .filter(e => e.status === 'approved')
        .reduce((s, e) => s + (e.amount || 0), 0);
      const pendingReimbursements = empExpenses
        .filter(e => e.status === 'submitted' || e.status === 'pending')
        .reduce((s, e) => s + (e.amount || 0), 0);

      // ── Commissions / bonuses ──
      const bonusAmount = empCommissions.reduce((s, c) => s + (c.amount || 0), 0);

      // ── Pay totals ──
      const workPay    = (normalHours * hourlyRate) + (overtimeHours * hourlyRate * OVERTIME_RATE);
      const drivingPay = drivingMiles * DRIVING_RATE;
      const totalPay   = workPay + drivingPay + perDiemAmount + reimbursements + bonusAmount;

      // ── WeeklyPayroll record (status) ──
      const weekPayroll = weeklyPayrolls.find(wp =>
        wp.week_start?.slice(0, 10) === week_start &&
        ((emp.id && wp.user_id === emp.id) ||
         (emp.email && wp.employee_email?.toLowerCase() === emp.email.toLowerCase()))
      ) || null;

      payrollData.push({
        employee: {
          id:        emp.id,
          full_name: emp.full_name,
          email:     emp.email,
          hourly_rate: hourlyRate,
          role:      emp.role,
          position:  emp.position,
        },
        normalHours:          Math.round(normalHours    * 100) / 100,
        overtimeHours:        Math.round(overtimeHours  * 100) / 100,
        drivingHours:         Math.round(drivingHours   * 100) / 100,
        drivingMiles:         Math.round(drivingMiles   * 10)  / 10,
        workDaysCount:        workDays.size,
        perDiemAmount:        Math.round(perDiemAmount  * 100) / 100,
        workPay:              Math.round(workPay        * 100) / 100,
        drivingPay:           Math.round(drivingPay     * 100) / 100,
        reimbursements:       Math.round(reimbursements * 100) / 100,
        pendingReimbursements:Math.round(pendingReimbursements * 100) / 100,
        bonusAmount:          Math.round(bonusAmount    * 100) / 100,
        totalPay:             Math.round(totalPay       * 100) / 100,
        weekPayroll,
      });
    }

    // Sort by name
    payrollData.sort((a, b) => a.employee.full_name.localeCompare(b.employee.full_name));

    return Response.json({ payrollData });

  } catch (err) {
    console.error('getAggregatedPayroll error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
