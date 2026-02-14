import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Get all job assignments for tomorrow
    const assignments = await base44.asServiceRole.entities.JobAssignment.filter({
      date: tomorrowStr
    });

    if (assignments.length === 0) {
      return Response.json({ message: 'No assignments for tomorrow', sent: 0 });
    }

    // Get all employees
    const employees = await base44.asServiceRole.entities.EmployeeDirectory.filter({
      status: 'active'
    });

    const employeeMap = new Map(employees.map(e => [e.employee_email, e]));

    let sentCount = 0;

    // Group assignments by employee
    const assignmentsByEmployee = new Map();
    for (const assignment of assignments) {
      const email = assignment.employee_email;
      if (!assignmentsByEmployee.has(email)) {
        assignmentsByEmployee.set(email, []);
      }
      assignmentsByEmployee.get(email).push(assignment);
    }

    // Send SMS to each employee
    for (const [email, empAssignments] of assignmentsByEmployee) {
      const employee = employeeMap.get(email);
      if (!employee?.phone) continue;

      const jobsList = empAssignments.map(a => 
        `${a.job_name || 'Job'} at ${a.start_time || 'TBD'}`
      ).join(', ');

      const message = `MCI: Tomorrow's schedule (${tomorrowStr}): ${jobsList}. Be ready!`;

      try {
        await base44.asServiceRole.functions.invoke('sendSMS', {
          to: employee.phone,
          message: message
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send SMS to ${email}:`, error);
      }
    }

    return Response.json({ 
      message: `Sent ${sentCount} job reminders`,
      assignmentsCount: assignments.length,
      sent: sentCount
    });

  } catch (error) {
    console.error('Daily job reminder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});