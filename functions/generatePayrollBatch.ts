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
        // A) Pull TimeEntry records for period
        const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter(
          {
            user_id: employee.user_id,
            // Note: TimeEntry stores 'date' as string, need to compare
          },
          '',
          1000
        );

        // Filter by date range
        const periodTimeEntries = timeEntries.filter(te => {
          const teDate = new Date(te.date);
          return teDate >= periodStart && teDate <= periodEnd;
        });

        // B) Calculate hours
        const totalHours = periodTimeEntries.reduce((sum, te) => sum + (te.hours_worked || 0), 0);

        // C) Simple overtime rule: if > 40 hours, remainder is OT
        let regularHours = totalHours;
        let overtimeHours = 0;

        if (totalHours > 40) {
          regularHours = 40;
          overtimeHours = totalHours - 40;
        }

        // D) Snapshot rates
        const hourlyRate = employee.hourly_rate || 0;
        const overtimeMultiplier = employee.overtime_multiplier || 1.5;

        // E) Pull approved commissions
        const commissions = await base44.asServiceRole.entities.Commission.filter(
          {
            employee_profile_id: employee.id,
            status: 'approved',
            linked_batch_id: null
          },
          '',
          1000
        );

        const commissionTotal = commissions ? commissions.reduce((sum, c) => sum + (c.calculated_amount || 0), 0) : 0;

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