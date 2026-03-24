import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * MIGRATION STEP 2: Backfill user_id across all workforce entities
 * Admin-only. Does NOT delete data, only populates user_id from email matches.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      entities_updated: {},
      total_records_updated: 0,
      errors: []
    };

    try {
      // Get all users for email matching
      const allUsers = await base44.entities.User.list();
      const emailToUserId = new Map(allUsers.map(u => [u.email?.toLowerCase(), u.id]));

      // STEP 2.1: TimeEntry
      try {
        const timeEntries = await base44.entities.TimeEntry.list();
        let updated = 0;
        for (const entry of timeEntries) {
          if (!entry.user_id && entry.employee_email) {
            const userId = emailToUserId.get(entry.employee_email?.toLowerCase());
            if (userId) {
              await base44.entities.TimeEntry.update(entry.id, { user_id: userId });
              updated++;
            }
          }
        }
        results.entities_updated.TimeEntry = updated;
        results.total_records_updated += updated;
      } catch (err) {
        results.errors.push(`TimeEntry: ${err.message}`);
      }

      // STEP 2.2: DrivingLog
      try {
        const drivingLogs = await base44.entities.DrivingLog.list();
        let updated = 0;
        for (const log of drivingLogs) {
          if (!log.user_id && log.employee_email) {
            const userId = emailToUserId.get(log.employee_email?.toLowerCase());
            if (userId) {
              await base44.entities.DrivingLog.update(log.id, { user_id: userId });
              updated++;
            }
          }
        }
        results.entities_updated.DrivingLog = updated;
        results.total_records_updated += updated;
      } catch (err) {
        results.errors.push(`DrivingLog: ${err.message}`);
      }

      // STEP 2.3: Expense
      try {
        const expenses = await base44.entities.Expense.list();
        let updated = 0;
        for (const exp of expenses) {
          if (!exp.user_id && exp.employee_email) {
            const userId = emailToUserId.get(exp.employee_email?.toLowerCase());
            if (userId) {
              await base44.entities.Expense.update(exp.id, { user_id: userId });
              updated++;
            }
          }
        }
        results.entities_updated.Expense = updated;
        results.total_records_updated += updated;
      } catch (err) {
        results.errors.push(`Expense: ${err.message}`);
      }

      // STEP 2.4: JobAssignment
      try {
        const assignments = await base44.entities.JobAssignment.list();
        let updated = 0;
        for (const assign of assignments) {
          if (!assign.user_id && assign.employee_email) {
            const userId = emailToUserId.get(assign.employee_email?.toLowerCase());
            if (userId) {
              await base44.entities.JobAssignment.update(assign.id, { user_id: userId });
              updated++;
            }
          }
        }
        results.entities_updated.JobAssignment = updated;
        results.total_records_updated += updated;
      } catch (err) {
        results.errors.push(`JobAssignment: ${err.message}`);
      }

      // STEP 2.5: Certification
      try {
        const certs = await base44.entities.Certification.list();
        let updated = 0;
        for (const cert of certs) {
          if (!cert.user_id && cert.employee_email) {
            const userId = emailToUserId.get(cert.employee_email?.toLowerCase());
            if (userId) {
              await base44.entities.Certification.update(cert.id, { user_id: userId });
              updated++;
            }
          }
        }
        results.entities_updated.Certification = updated;
        results.total_records_updated += updated;
      } catch (err) {
        results.errors.push(`Certification: ${err.message}`);
      }

      // STEP 2.6: OnboardingForm
      try {
        const forms = await base44.entities.OnboardingForm.list();
        let updated = 0;
        for (const form of forms) {
          if (!form.user_id && form.employee_email) {
            const userId = emailToUserId.get(form.employee_email?.toLowerCase());
            if (userId) {
              await base44.entities.OnboardingForm.update(form.id, { user_id: userId });
              updated++;
            }
          }
        }
        results.entities_updated.OnboardingForm = updated;
        results.total_records_updated += updated;
      } catch (err) {
        results.errors.push(`OnboardingForm: ${err.message}`);
      }

      // STEP 2.7: TimeOffRequest
      try {
        const requests = await base44.entities.TimeOffRequest.list();
        let updated = 0;
        for (const req of requests) {
          if (!req.user_id && req.employee_email) {
            const userId = emailToUserId.get(req.employee_email?.toLowerCase());
            if (userId) {
              await base44.entities.TimeOffRequest.update(req.id, { user_id: userId });
              updated++;
            }
          }
        }
        results.entities_updated.TimeOffRequest = updated;
        results.total_records_updated += updated;
      } catch (err) {
        results.errors.push(`TimeOffRequest: ${err.message}`);
      }

      // STEP 2.8: Commission
      try {
        const commissions = await base44.entities.Commission.list();
        let updated = 0;
        for (const comm of commissions) {
          if (!comm.user_id && comm.employee_email) {
            const userId = emailToUserId.get(comm.employee_email?.toLowerCase());
            if (userId) {
              await base44.entities.Commission.update(comm.id, { user_id: userId });
              updated++;
            }
          }
        }
        results.entities_updated.Commission = updated;
        results.total_records_updated += updated;
      } catch (err) {
        results.errors.push(`Commission: ${err.message}`);
      }

      // STEP 2.9: PayrollAllocation
      try {
        const allocations = await base44.entities.PayrollAllocation.list();
        let updated = 0;
        for (const alloc of allocations) {
          if (!alloc.user_id && alloc.employee_email) {
            const userId = emailToUserId.get(alloc.employee_email?.toLowerCase());
            if (userId) {
              await base44.entities.PayrollAllocation.update(alloc.id, { user_id: userId });
              updated++;
            }
          }
        }
        results.entities_updated.PayrollAllocation = updated;
        results.total_records_updated += updated;
      } catch (err) {
        results.errors.push(`PayrollAllocation: ${err.message}`);
      }

      results.status = results.errors.length === 0 ? 'success' : 'partial_success';
      results.summary = `✅ Updated ${results.total_records_updated} records across ${Object.keys(results.entities_updated).length} entities`;

      console.log('✅ Backfill Complete:', results);
      return Response.json(results);

    } catch (err) {
      console.error('❌ Backfill failed:', err);
      return Response.json({ error: err.message, results }, { status: 500 });
    }

  } catch (err) {
    console.error('Auth error:', err);
    return Response.json({ error: 'Authentication failed' }, { status: 401 });
  }
});