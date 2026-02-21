import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL BACKEND VALIDATION - Autoridad Final
 * 
 * FASE 6 - PAYROLL BACKEND AUTHORITY
 * 
 * Triggered automatically when WeeklyPayroll is created or updated (draft)
 * Recalcula totales desde TimeEntries aprobados
 * Marca discrepancias sin bloquear generación
 * 
 * Principios:
 * - Backend = single source of truth
 * - NO bloquea payroll
 * - Solo audita y marca flags
 */

/**
 * Calculate payroll totals from approved time entries
 */
function calculatePayrollTotals(timeEntries, employeeRate) {
  let totalHours = 0;
  let regularHours = 0;
  let overtimeHours = 0;
  let totalPay = 0;

  for (const entry of timeEntries) {
    const hours = entry.hours_worked || 0;
    totalHours += hours;

    // Overtime after 8 hours per day
    const regularForDay = Math.min(hours, 8);
    const overtimeForDay = Math.max(hours - 8, 0);

    regularHours += regularForDay;
    overtimeHours += overtimeForDay;

    // Calculate pay (overtime = 1.5x)
    totalPay += (regularForDay * employeeRate) + (overtimeForDay * employeeRate * 1.5);
  }

  return {
    total_hours: parseFloat(totalHours.toFixed(2)),
    regular_hours: parseFloat(regularHours.toFixed(2)),
    overtime_hours: parseFloat(overtimeHours.toFixed(2)),
    total_pay: parseFloat(totalPay.toFixed(2))
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process create or update events for draft payrolls
    if (event.type === 'update' && data.status !== 'draft') {
      return Response.json({ 
        success: true, 
        message: 'Not a draft payroll, skipping validation' 
      });
    }

    const payroll = data;
    
    // Skip validation if payroll has no employee
    if (!payroll.employee_email) {
      return Response.json({ 
        success: true, 
        message: 'No employee email - cannot validate' 
      });
    }

    // RE-FETCH APPROVED TIME ENTRIES (backend authority)
    const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({
      employee_email: payroll.employee_email,
      week_start_date: payroll.week_start_date,
      status: 'approved' // ONLY approved entries
    });

    // Get employee data for rate
    const employee = await base44.asServiceRole.entities.User.filter({
      email: payroll.employee_email
    });

    if (!employee || employee.length === 0) {
      console.warn('[Payroll Validation] Employee not found:', payroll.employee_email);
      return Response.json({ 
        success: true, 
        message: 'Employee not found - cannot validate' 
      });
    }

    const employeeData = employee[0];
    const hourlyRate = employeeData.hourly_rate || 0;

    if (hourlyRate === 0) {
      console.warn('[Payroll Validation] No hourly rate for employee:', payroll.employee_email);
      return Response.json({ 
        success: true, 
        message: 'No hourly rate - cannot validate pay' 
      });
    }

    // BACKEND RE-CALCULATION (authority)
    const backendTotals = calculatePayrollTotals(timeEntries, hourlyRate);

    // Frontend values (as submitted)
    const frontendTotals = {
      total_hours: payroll.total_hours || 0,
      regular_hours: payroll.regular_hours || 0,
      overtime_hours: payroll.overtime_hours || 0,
      total_pay: payroll.total_work_pay || 0 // Use total_work_pay (not total_pay which includes driving)
    };

    // DISCREPANCY DETECTION
    const TOLERANCE = 0.01; // 1 cent or 0.01 hour tolerance
    const hoursMatch = Math.abs(backendTotals.total_hours - frontendTotals.total_hours) <= TOLERANCE;
    const payMatch = Math.abs(backendTotals.total_pay - frontendTotals.total_pay) <= TOLERANCE;
    
    const hasDiscrepancy = !hoursMatch || !payMatch;

    // Build discrepancy reason
    let discrepancyReason = null;
    if (hasDiscrepancy) {
      const reasons = [];
      if (!hoursMatch) {
        reasons.push(`Hours: FE=${frontendTotals.total_hours}h, BE=${backendTotals.total_hours}h`);
      }
      if (!payMatch) {
        reasons.push(`Pay: FE=$${frontendTotals.total_pay}, BE=$${backendTotals.total_pay}`);
      }
      discrepancyReason = reasons.join(' | ');
    }

    // UPDATE FLAGS (backend authority)
    const updatePayload = {
      payroll_validated_backend: !hasDiscrepancy,
      payroll_discrepancy: hasDiscrepancy,
      payroll_discrepancy_reason: discrepancyReason,
      payroll_backend_totals: hasDiscrepancy ? backendTotals : null
    };

    await base44.asServiceRole.entities.WeeklyPayroll.update(payroll.id, updatePayload);

    // TELEMETRY: Log if discrepancy found (matches frontend telemetry structure)
    if (hasDiscrepancy) {
      console.log('[🎯 Geofence Telemetry]', {
        event_type: 'payroll_backend_discrepancy',
        user_email: payroll.employee_email,
        job_id: null,
        source: 'backend',
        timestamp: new Date().toISOString(),
        metadata: {
          payroll_id: payroll.id,
          week_start_date: payroll.week_start_date,
          frontend_totals: frontendTotals,
          backend_totals: backendTotals,
          discrepancy_reason: discrepancyReason
        }
      });
    }

    // LOG RESULTS (for audit trail)
    console.log('[Payroll Backend Validation]', {
      payrollId: payroll.id,
      employeeEmail: payroll.employee_email,
      weekStartDate: payroll.week_start_date,
      timeEntriesCount: timeEntries.length,
      frontendTotals,
      backendTotals,
      hasDiscrepancy,
      discrepancyReason,
      validated: !hasDiscrepancy
    });

    return Response.json({ 
      success: true,
      validated: !hasDiscrepancy,
      hasDiscrepancy,
      discrepancyReason,
      backendTotals,
      frontendTotals
    });

  } catch (error) {
    console.error('[Payroll Validation Error]', error.message);
    
    // CRITICAL: DO NOT block payroll creation on validation error
    // Just log and continue
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 }); // Return 200 to prevent automation retry
  }
});