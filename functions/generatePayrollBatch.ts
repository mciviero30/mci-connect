import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL ENTERPRISE CORE — Generate Payroll Batch
 * 
 * Calculates and creates PayrollAllocation records for all active employees
 * in the specified batch period.
 * 
 * Can ONLY be called when batch.status = "draft"
 * Deletes existing allocations before regenerating.
 * 
 * Payload:
 * {
 *   batch_id: string
 * }
 */
/**
 * Helper: Get ISO week key (YYYY-W##) to avoid year collision
 */
function getISOWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${isoYear}-W${String(weekNum).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { batch_id } = await req.json();

    if (!batch_id) {
      return Response.json({ error: 'batch_id required' }, { status: 400 });
    }

    // 1. VALIDATE: Batch exists and is in draft
    const batches = await base44.asServiceRole.entities.PayrollBatch.filter(
      { id: batch_id },
      '',
      1
    );

    if (!batches || batches.length === 0) {
      return Response.json({ error: 'Batch not found' }, { status: 404 });
    }

    const batch = batches[0];

    if (batch.status !== 'draft') {
      return Response.json({
        error: `Cannot generate payroll for locked batch. Status: ${batch.status}`
      }, { status: 400 });
    }

    const periodStart = new Date(batch.period_start);
    const periodEnd = new Date(batch.period_end);

    // 2. DELETE existing allocations for safe regeneration in draft
    const existingAllocations = await base44.asServiceRole.entities.PayrollAllocation.filter(
      { batch_id: batch_id },
      '',
      1000
    );

    if (existingAllocations && existingAllocations.length > 0) {
      for (const alloc of existingAllocations) {
        await base44.asServiceRole.entities.PayrollAllocation.delete(alloc.id);
      }
    }

    // 3. FETCH active employees
    const employees = await base44.asServiceRole.entities.EmployeeProfile.filter(
      { employment_status: 'active' },
      '',
      1000
    );

    if (!employees || employees.length === 0) {
      return Response.json({
        success: true,
        message: 'No active employees found',
        allocations_created: 0,
        totals: {
          total_regular_hours: 0,
          total_overtime_hours: 0,
          total_commissions: 0,
          total_gross: 0
        }
      });
    }

    // 4. GENERATE allocations
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalCommissions = 0;
    let totalGross = 0;
    const allocations = [];

    for (const employee of employees) {
      try {
        // A) Pull TimeEntry records for period (server-side date filtering)
        const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter(
          {
            user_id: employee.user_id,
            date: { $gte: batch.period_start, $lte: batch.period_end }
          },
          '',
          1000
        );

        // B) Calculate hours per ISO week (with year collision protection)
        const weeklyHours = {};

        timeEntries.forEach(te => {
          const teDate = new Date(te.date);
          const isoWeekKey = getISOWeekKey(teDate);
          if (!weeklyHours[isoWeekKey]) {
            weeklyHours[isoWeekKey] = 0;
          }
          weeklyHours[isoWeekKey] += te.hours_worked || 0;
        });

        // C) Calculate overtime per week, sum across all weeks
        let regularHours = 0;
        let overtimeHours = 0;

        Object.values(weeklyHours).forEach(weekTotal => {
          const weekRegular = Math.min(40, weekTotal);
          const weekOvertime = Math.max(0, weekTotal - 40);
          regularHours += weekRegular;
          overtimeHours += weekOvertime;
        });

        // D) Snapshot rates
        const hourlyRate = employee.hourly_rate || 0;
        const overtimeMultiplier = employee.overtime_multiplier || 1.5;

        // E) Pull approved unlinked commissions
        const commissions = await base44.asServiceRole.entities.Commission.filter(
          {
            employee_profile_id: employee.id,
            status: 'approved',
            linked_batch_id: null
          },
          '',
          1000
        );

        let commissionTotal = 0;

        // Link commissions immediately to this batch
        if (commissions && commissions.length > 0) {
          for (const comm of commissions) {
            await base44.asServiceRole.entities.Commission.update(comm.id, {
              linked_batch_id: batch_id
            });
            commissionTotal += comm.calculated_amount || 0;
          }
        }

        // F) Calculate pay
        const regularPay = regularHours * hourlyRate;
        const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
        const grossPay = regularPay + overtimePay + commissionTotal;

        // G) Create allocation
        const allocation = await base44.asServiceRole.entities.PayrollAllocation.create({
          batch_id: batch_id,
          employee_profile_id: employee.id,
          regular_hours: regularHours,
          overtime_hours: overtimeHours,
          hourly_rate_snapshot: hourlyRate,
          overtime_multiplier_snapshot: overtimeMultiplier,
          regular_pay: regularPay,
          overtime_pay: overtimePay,
          commission_total: commissionTotal,
          gross_pay: grossPay
        });

        allocations.push(allocation);
        totalRegularHours += regularHours;
        totalOvertimeHours += overtimeHours;
        totalCommissions += commissionTotal;
        totalGross += grossPay;

      } catch (err) {
        console.error(`Failed to generate allocation for employee ${employee.id}:`, err);
      }
    }

    // 5. UPDATE batch totals
    await base44.asServiceRole.entities.PayrollBatch.update(batch_id, {
      total_regular_hours: totalRegularHours,
      total_overtime_hours: totalOvertimeHours,
      total_commissions: totalCommissions,
      total_gross: totalGross
    });

    return Response.json({
      success: true,
      message: 'Payroll batch generated',
      allocations_created: allocations.length,
      totals: {
        total_regular_hours: totalRegularHours,
        total_overtime_hours: totalOvertimeHours,
        total_commissions: totalCommissions,
        total_gross: totalGross
      }
    });

  } catch (error) {
    console.error('Generate payroll error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});