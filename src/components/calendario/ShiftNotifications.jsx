import { base44 } from '@/api/base44Client';

/**
 * Send notification when employee is assigned to a shift
 */
export async function notifyEmployeeAssignment(shift, employees) {
  try {
    const employee = employees.find(e => e.email === shift.employee_email);
    if (!employee) return;

    const shiftDate = new Date(shift.date).toLocaleDateString();
    const timeRange = shift.start_time && shift.end_time 
      ? `${shift.start_time} - ${shift.end_time}` 
      : 'All day';

    // Create in-app notification
    await base44.entities.Notification.create({
      user_email: shift.employee_email,
      title: '📅 New Shift Assignment',
      message: `You have been assigned to ${shift.job_name || shift.title || 'a shift'} on ${shiftDate} (${timeRange})`,
      type: 'shift_assignment',
      priority: 'normal',
      read: false,
      metadata: {
        shift_id: shift.id,
        job_id: shift.job_id,
        date: shift.date,
        start_time: shift.start_time,
        end_time: shift.end_time
      }
    });

    // Send email notification
    await base44.integrations.Core.SendEmail({
      to: shift.employee_email,
      subject: '📅 New Shift Assignment - MCI Connect',
      body: `
        <h2>New Shift Assignment</h2>
        <p>Hi ${employee.full_name},</p>
        <p>You have been assigned to a new shift:</p>
        <ul>
          <li><strong>Date:</strong> ${shiftDate}</li>
          <li><strong>Time:</strong> ${timeRange}</li>
          <li><strong>Job:</strong> ${shift.job_name || 'N/A'}</li>
          <li><strong>Location:</strong> ${shift.location || 'TBD'}</li>
        </ul>
        <p>Please confirm your availability in the MCI Connect app.</p>
        <p>Best regards,<br>MCI Connect Team</p>
      `
    });
  } catch (error) {
    console.error('Error sending shift notification:', error);
  }
}

/**
 * Send reminder to all crew members for a specific shift
 */
export async function remindCrew(shift, employees) {
  try {
    const assignedEmployees = shift.assigned_crew || [shift.employee_email];
    
    for (const email of assignedEmployees.filter(Boolean)) {
      const employee = employees.find(e => e.email === email);
      if (!employee) continue;

      const shiftDate = new Date(shift.date).toLocaleDateString();
      const timeRange = shift.start_time && shift.end_time 
        ? `${shift.start_time} - ${shift.end_time}` 
        : 'All day';

      // Create in-app notification
      await base44.entities.Notification.create({
        user_email: email,
        title: '🔔 Shift Reminder',
        message: `Reminder: ${shift.job_name || shift.title || 'Shift'} on ${shiftDate} at ${shift.start_time || 'TBD'}`,
        type: 'shift_reminder',
        priority: 'high',
        read: false,
        metadata: {
          shift_id: shift.id,
          job_id: shift.job_id,
          date: shift.date
        }
      });

      // Send email reminder
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: '🔔 Shift Reminder - MCI Connect',
        body: `
          <h2>Shift Reminder</h2>
          <p>Hi ${employee.full_name},</p>
          <p>This is a reminder about your upcoming shift:</p>
          <ul>
            <li><strong>Date:</strong> ${shiftDate}</li>
            <li><strong>Time:</strong> ${timeRange}</li>
            <li><strong>Job:</strong> ${shift.job_name || 'N/A'}</li>
            <li><strong>Location:</strong> ${shift.location || 'TBD'}</li>
          </ul>
          <p>See you there!</p>
          <p>Best regards,<br>MCI Connect Team</p>
        `
      });
    }
  } catch (error) {
    console.error('Error sending crew reminder:', error);
  }
}

/**
 * Update job/task dates when shift is moved via drag-and-drop
 */
export async function syncShiftToJob(shift, originalShift) {
  try {
    if (!shift.job_id) return;

    // If date changed, update the job's scheduled date
    if (shift.date !== originalShift?.date) {
      const job = await base44.entities.Job.filter({ id: shift.job_id });
      if (job.length > 0) {
        await base44.entities.Job.update(shift.job_id, {
          start_date: shift.date
        });

        // Log activity
        await base44.entities.ActivityFeed.create({
          user_email: 'system',
          user_name: 'Calendar Sync',
          action: 'job_rescheduled',
          entity_type: 'Job',
          entity_id: shift.job_id,
          description: `Job rescheduled to ${new Date(shift.date).toLocaleDateString()} via calendar`
        });
      }
    }
  } catch (error) {
    console.error('Error syncing shift to job:', error);
  }
}