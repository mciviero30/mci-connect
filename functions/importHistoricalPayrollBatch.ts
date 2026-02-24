import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL PHASE 2 — Import Historical Payroll Batch
 *
 * Accepts a CSV with columns:
 *   employee_profile_id, regular_hours, overtime_hours, commission_total
 *
 * Creates a PayrollBatch + PayrollAllocation records.
 * Calculates pay from employee snapshot rates.
 * Batch is created with status = "paid" (historical, immutable).
 *
 * Payload:
 * {
 *   period_start: string (date)
 *   period_end: string (date)
 *   csv_content: string
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'ceo') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { period_start, period_end, csv_content } = await req.json();

    if (!period_start || !period_end || !csv_content) {
      return Response.json({ error: 'period_start, period_end, and csv_content are required' }, { status: 400 });
    }

    // Parse CSV
    const lines = csv_content.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      return Response.json({ error: 'CSV must have header + at least one data row' }, { status: 400 });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',');
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i]?.trim(); });
      return row;
    });

    // Create batch as "paid" (historical, already processed)
    const batch = await base44.asServiceRole.entities.PayrollBatch.create({
      period_start,
      period_end,
      status: 'paid',
      paid_at: new Date().toISOString()
    });

    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let totalCommissions = 0;
    let totalGross = 0;
    let allocationsCreated = 0;

    for (const row of rows) {
      const empId = row['employee_profile_id'] || row['employee_id'];
      if (!empId) continue;

      const profiles = await base44.asServiceRole.entities.EmployeeProfile.filter({ id: empId }, '', 1);
      const profile = profiles?.[0];
      if (!profile) {
        console.warn(`Employee profile not found: ${empId}`);
        continue;
      }

      const regularHours = parseFloat(row['regular_hours'] || 0);
      const overtimeHours = parseFloat(row['overtime_hours'] || 0);
      const commissionTotal = parseFloat(row['commission_total'] || 0);
      const hourlyRate = profile.hourly_rate || 0;
      const overtimeMultiplier = profile.overtime_multiplier || 1.5;
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * overtimeMultiplier;
      const grossPay = regularPay + overtimePay + commissionTotal;

      await base44.asServiceRole.entities.PayrollAllocation.create({
        batch_id: batch.id,
        employee_profile_id: profile.id,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        hourly_rate_snapshot: hourlyRate,
        overtime_multiplier_snapshot: overtimeMultiplier,
        regular_pay: regularPay,
        overtime_pay: overtimePay,
        commission_total: commissionTotal,
        gross_pay: grossPay
      });

      totalRegularHours += regularHours;
      totalOvertimeHours += overtimeHours;
      totalCommissions += commissionTotal;
      totalGross += grossPay;
      allocationsCreated++;
    }

    // Update batch totals
    await base44.asServiceRole.entities.PayrollBatch.update(batch.id, {
      total_regular_hours: totalRegularHours,
      total_overtime_hours: totalOvertimeHours,
      total_commissions: totalCommissions,
      total_gross: totalGross
    });

    // Audit log
    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id: batch.id,
      action: 'import',
      performed_by_user_id: user.id,
      timestamp: new Date().toISOString(),
      metadata: { allocations_created: allocationsCreated, period_start, period_end }
    });

    return Response.json({
      success: true,
      batch_id: batch.id,
      allocations_created: allocationsCreated,
      totals: { totalRegularHours, totalOvertimeHours, totalCommissions, totalGross }
    });

  } catch (error) {
    console.error('Import historical error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});