import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action, testEmployeeEmail } = await req.json();

    if (action === 'create') {
      // Get test employee
      const employees = await base44.entities.EmployeeDirectory.filter({
        employee_email: testEmployeeEmail
      });

      if (employees.length === 0) {
        return Response.json({ error: 'Employee not found' }, { status: 404 });
      }

      const employee = employees[0];

      // Get jobs
      const jobs = await base44.entities.Job.filter({
        name: { $in: ['MCI-house', 'LG Friend'] }
      });

      if (jobs.length === 0) {
        return Response.json({ 
          error: 'Jobs not found. Create "MCI-house" and "LG Friend" first',
          created: []
        }, { status: 400 });
      }

      const mciHouse = jobs.find(j => j.name === 'MCI-house');
      const lgFriend = jobs.find(j => j.name === 'LG Friend');

      const createdEntries = [];
      const today = new Date();

      // Create 7 days of time entries (spread across 3 jobs - MCI-house mainly, LG Friend rotation)
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() - day);
        const dateStr = currentDate.toISOString().split('T')[0];

        const job = day % 3 === 0 ? lgFriend : mciHouse;
        if (!job) continue;

        // Random hours 6-12h per day, mix of work and driving
        const hoursWorked = 6 + Math.random() * 6;
        const workType = Math.random() > 0.7 ? 'driving' : 'normal';
        const breakMinutes = Math.floor(Math.random() * 60) + 30;

        const entry = await base44.entities.TimeEntry.create({
          user_id: employee.user_id || employee.id,
          employee_email: testEmployeeEmail,
          employee_name: employee.full_name || employee.employee_name,
          job_id: job.id,
          job_name: job.name,
          date: dateStr,
          check_in: `${7 + Math.floor(Math.random() * 2)}:00:00`,
          check_out: `${17 + Math.floor(Math.random() * 2)}:00:00`,
          check_in_latitude: job.latitude || 33.9599,
          check_in_longitude: job.longitude || -83.8827,
          check_out_latitude: job.latitude || 33.9599,
          check_out_longitude: job.longitude || -83.8827,
          hours_worked: Number(hoursWorked.toFixed(2)),
          breaks: [{
            type: 'lunch',
            start_time: '12:00:00',
            end_time: '12:30:00',
            duration_minutes: breakMinutes
          }],
          total_break_minutes: breakMinutes,
          hour_type: hoursWorked > 8 ? 'overtime' : 'normal',
          work_type: workType,
          task_details: `Test work - Day ${day + 1}`,
          status: 'pending',
          geofence_validated: true,
          geofence_distance_meters: 50,
          requires_location_review: false,
          exceeds_max_hours: false,
          breaks_require_review: false,
          test_data: true,
          test_created_at: new Date().toISOString()
        });

        createdEntries.push({
          id: entry.id,
          date: dateStr,
          job: job.name,
          hours: hoursWorked,
          type: workType
        });
      }

      return Response.json({
        success: true,
        message: `Created ${createdEntries.length} test time entries`,
        entries: createdEntries
      });

    } else if (action === 'delete') {
      // Delete all test data in cascade
      // 1. Find test TimeEntries
      const testEntries = await base44.entities.TimeEntry.filter({
        employee_email: testEmployeeEmail,
        test_data: true
      }, '', 1000);

      // 2. Find related PayrollAllocation
      const payrollAllocations = await base44.entities.PayrollAllocation.filter(
        { timeentry_id: { $in: testEntries.map(e => e.id) } },
        '',
        1000
      );

      // 3. Find related Transactions
      const transactions = await base44.entities.Transaction.filter(
        { 
          $or: [
            { matched_invoice_id: { $in: testEntries.map(e => e.id) } },
            { notes: { $regex: 'Test work' } }
          ]
        },
        '',
        1000
      );

      // Delete in order: Transactions → PayrollAllocation → TimeEntry
      for (const tx of transactions) {
        try {
          await base44.entities.Transaction.delete(tx.id);
        } catch (e) {
          console.log(`Failed to delete transaction ${tx.id}:`, e.message);
        }
      }

      for (const pa of payrollAllocations) {
        try {
          await base44.entities.PayrollAllocation.delete(pa.id);
        } catch (e) {
          console.log(`Failed to delete payroll allocation ${pa.id}:`, e.message);
        }
      }

      for (const entry of testEntries) {
        try {
          await base44.entities.TimeEntry.delete(entry.id);
        } catch (e) {
          console.log(`Failed to delete time entry ${entry.id}:`, e.message);
        }
      }

      return Response.json({
        success: true,
        deleted: {
          timeEntries: testEntries.length,
          payrollAllocations: payrollAllocations.length,
          transactions: transactions.length
        }
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Test data function error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});