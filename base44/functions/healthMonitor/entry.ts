import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin-only function
    const user = await base44.auth.me();
    if (user?.role !== 'admin' && user?.role !== 'ceo') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const now = new Date();
    const alerts = [];
    const existingAlerts = await base44.asServiceRole.entities.SystemHealthAlert.filter({ status: 'active' });

    // Fetch all necessary data
    const [jobs, employees, timeEntries, invoices, schedules, commissions, taxProfiles] = await Promise.all([
      base44.asServiceRole.entities.Job.filter({ status: 'active' }),
      base44.asServiceRole.entities.User.filter({ employment_status: 'active' }),
      base44.asServiceRole.entities.TimeEntry.filter({ status: 'pending' }),
      base44.asServiceRole.entities.Invoice.list(),
      base44.asServiceRole.entities.ScheduleShift.list(),
      base44.asServiceRole.entities.CommissionResult.filter({ status: 'calculated' }),
      base44.asServiceRole.entities.TaxProfile.list()
    ]);

    // Helper to create or update alert
    const createAlert = async (alertType, severity, message, entityType, entityId, entityName, affectedCount) => {
      const existing = existingAlerts.find(a => 
        a.alert_type === alertType && 
        a.entity_id === entityId
      );

      if (existing) {
        // Update last_checked_at
        await base44.asServiceRole.entities.SystemHealthAlert.update(existing.id, {
          last_checked_at: now.toISOString(),
          message // Update message in case it changed
        });
      } else {
        // Create new alert
        const alert = await base44.asServiceRole.entities.SystemHealthAlert.create({
          alert_type: alertType,
          severity,
          message,
          entity_type: entityType,
          entity_id: entityId,
          entity_name: entityName,
          affected_count: affectedCount,
          status: 'active',
          detected_at: now.toISOString(),
          last_checked_at: now.toISOString()
        });
        alerts.push(alert);

        // Create notification for CEO/Admin
        const admins = employees.filter(e => e.role === 'admin' || e.role === 'ceo');
        for (const admin of admins) {
          await base44.asServiceRole.entities.SystemAlert.create({
            recipient_email: admin.email,
            alert_type: 'system_health',
            title: `System Health: ${severity === 'critical' ? '🔴' : '⚠️'} ${message}`,
            message: `${entityType}: ${entityName}`,
            severity: severity === 'critical' ? 'critical' : 'warning',
            related_entity: 'SystemHealthAlert',
            related_id: alert.id,
            action_url: '/SystemReadiness'
          });
        }
      }
    };

    // Check 1: Jobs without employees (CRITICAL)
    for (const job of jobs) {
      if (!job.assigned_team_field || job.assigned_team_field.length === 0) {
        await createAlert(
          'job_without_employees',
          'critical',
          'Active job has no employees assigned',
          'Job',
          job.id,
          job.name || job.job_name || 'Unnamed Job',
          1
        );
      }
    }

    // Check 2: TimeEntries without Job (WARNING)
    const timeEntriesWithoutJob = timeEntries.filter(te => !te.job_id);
    if (timeEntriesWithoutJob.length > 0) {
      for (const te of timeEntriesWithoutJob) {
        await createAlert(
          'time_entry_without_job',
          'warning',
          'Time entry is not linked to any job',
          'TimeEntry',
          te.id,
          `${te.employee_name} - ${te.date}`,
          1
        );
      }
    }

    // Check 3: Invoices without Job (WARNING)
    const orphanInvoices = invoices.filter(inv => !inv.job_id && inv.status !== 'draft');
    if (orphanInvoices.length > 0) {
      for (const inv of orphanInvoices) {
        await createAlert(
          'orphan_invoice',
          'warning',
          'Invoice is not linked to any job',
          'Invoice',
          inv.id,
          `${inv.invoice_number || inv.id}`,
          1
        );
      }
    }

    // Check 4: Active jobs without schedules (WARNING)
    for (const job of jobs) {
      const jobSchedules = schedules.filter(s => s.job_id === job.id);
      if (jobSchedules.length === 0) {
        await createAlert(
          'active_job_without_schedules',
          'warning',
          'Active job has no scheduled shifts',
          'Job',
          job.id,
          job.name || job.job_name || 'Unnamed Job',
          1
        );
      }
    }

    // Check 5: Stale commissions (calculated > 30 days ago, never approved) (WARNING)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const staleCommissions = commissions.filter(c => 
      new Date(c.calculation_date) < thirtyDaysAgo
    );
    if (staleCommissions.length > 0) {
      for (const comm of staleCommissions) {
        await createAlert(
          'stale_commission',
          'warning',
          'Commission calculated over 30 days ago but never approved',
          'CommissionResult',
          comm.id,
          `${comm.employee_name} - ${comm.job_name}`,
          1
        );
      }
    }

    // Check 6: Old pending time entries (> 7 days) (WARNING)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oldPendingEntries = timeEntries.filter(te => 
      new Date(te.date) < sevenDaysAgo
    );
    if (oldPendingEntries.length > 0) {
      for (const te of oldPendingEntries) {
        await createAlert(
          'pending_time_entries_old',
          'warning',
          'Time entry pending approval for over 7 days',
          'TimeEntry',
          te.id,
          `${te.employee_name} - ${te.date}`,
          1
        );
      }
    }

    // Check 7: Jobs without Field sync (WARNING)
    for (const job of jobs) {
      if (!job.field_project_id && job.status === 'active') {
        await createAlert(
          'job_without_field_sync',
          'warning',
          'Active job is not synced with MCI Field',
          'Job',
          job.id,
          job.name || job.job_name || 'Unnamed Job',
          1
        );
      }
    }

    // Check 8: Employees without tax profiles (CRITICAL)
    const employeesNeedingTax = employees.filter(e => 
      e.role !== 'admin' && 
      e.employment_type && 
      e.employment_type !== 'contractor_no_tax'
    );
    for (const emp of employeesNeedingTax) {
      const hasTaxProfile = taxProfiles.some(tp => 
        tp.employee_email === emp.email && tp.completed
      );
      if (!hasTaxProfile) {
        await createAlert(
          'missing_tax_profiles',
          'critical',
          'Employee missing completed tax profile',
          'User',
          emp.id,
          emp.full_name || emp.email,
          1
        );
      }
    }

    // Auto-resolve alerts that are no longer issues
    for (const existingAlert of existingAlerts) {
      let shouldResolve = false;

      // Check if the issue still exists
      if (existingAlert.alert_type === 'job_without_employees') {
        const job = jobs.find(j => j.id === existingAlert.entity_id);
        if (!job || (job.assigned_team_field && job.assigned_team_field.length > 0)) {
          shouldResolve = true;
        }
      }

      if (existingAlert.alert_type === 'time_entry_without_job') {
        const te = timeEntries.find(t => t.id === existingAlert.entity_id);
        if (!te || te.job_id) {
          shouldResolve = true;
        }
      }

      if (shouldResolve) {
        await base44.asServiceRole.entities.SystemHealthAlert.update(existingAlert.id, {
          status: 'resolved',
          resolved_at: now.toISOString(),
          resolved_by: 'system_auto'
        });
      }
    }

    return Response.json({
      success: true,
      alerts_created: alerts.length,
      timestamp: now.toISOString(),
      checks_performed: 8
    });

  } catch (error) {
    console.error('Health Monitor Error:', error);
    return Response.json({ 
      error: error.message,
      }, { status: 500 });
  }
});