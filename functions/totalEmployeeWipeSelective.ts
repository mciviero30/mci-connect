import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const result = {
      deleted_profiles: 0,
      deleted_users: 0,
      deleted_time_entries: 0,
      deleted_assignments: 0,
      deleted_expenses: 0,
      deleted_driving_logs: 0,
      deleted_course_progress: 0,
      deleted_onboarding_forms: 0,
      deleted_time_off_requests: 0,
      deleted_certifications: 0,
      deleted_employee_directory: 0,
      deleted_schedule_shifts: 0,
      errors: [],
      timestamp: new Date().toISOString(),
      final_status: 'success'
    };

    const PROTECTED_EMAIL = 'mciviero30@gmail.com';
    const entitiesToDelete = [
      'EmployeeProfile',
      'TimeEntry',
      'JobAssignment',
      'Expense',
      'DrivingLog',
      'CourseProgress',
      'OnboardingForm',
      'TimeOffRequest',
      'Certification',
      'EmployeeDirectory',
      'ScheduleShift'
    ];

    // Delete all entity records
    for (const entityName of entitiesToDelete) {
      try {
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const records = await base44.asServiceRole.entities[entityName].list('', 100);

          if (records.length === 0) {
            hasMore = false;
            break;
          }

          for (const record of records) {
            try {
              await base44.asServiceRole.entities[entityName].delete(record.id);
              result[`deleted_${entityName.replace(/([A-Z])/g, '_$1').toLowerCase().substring(1)}`]++;
            } catch (err) {
              console.error(`Failed to delete ${entityName} ${record.id}:`, err.message);
              result.errors.push({ type: entityName, id: record.id, error: err.message });
            }
          }

          if (records.length < 100) {
            hasMore = false;
          }
        }
      } catch (err) {
        console.error(`Error processing ${entityName}:`, err.message);
        result.errors.push({ type: `${entityName}_batch`, error: err.message });
      }
    }

    // Delete employee users (keep admin and protected email)
    console.log('🗑️  Cleaning up employee users...');

    try {
      let hasMore = true;

      while (hasMore) {
        const users = await base44.asServiceRole.entities.User.list('', 100);

        if (users.length === 0) {
          hasMore = false;
          break;
        }

        for (const u of users) {
          // Only delete employee users, keep admin users and protected email
          if ((u.role === 'employee' || u.role === 'user') && u.email !== PROTECTED_EMAIL) {
            try {
              await base44.asServiceRole.entities.User.delete(u.id);
              result.deleted_users++;
            } catch (err) {
              console.error(`Failed to delete user ${u.id}:`, err.message);
              result.errors.push({ type: 'user', id: u.id, error: err.message });
            }
          }
        }

        if (users.length < 100) {
          hasMore = false;
        }
      }
    } catch (err) {
      console.error('Error deleting users:', err.message);
      result.errors.push({ type: 'user_batch', error: err.message });
    }

    return Response.json(result);

  } catch (error) {
    console.error('Function error:', error.message);
    return Response.json({
      error: error.message,
      final_status: 'failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});