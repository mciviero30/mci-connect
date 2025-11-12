import { base44 } from '@/api/base44Client';

/**
 * Helper functions to send notifications for various events
 */

// Send notification when expense is approved/rejected
export const notifyExpenseStatus = async (expense, status, user) => {
  const isApproved = status === 'approved';
  
  await base44.entities.Notification.create({
    recipient_email: expense.employee_email,
    recipient_name: expense.employee_name,
    type: 'info',
    priority: 'medium',
    title: isApproved ? '✅ Expense Approved' : '❌ Expense Rejected',
    message: `Your expense of $${expense.amount.toFixed(2)} for ${expense.category} has been ${status}.`,
    action_url: '/MisGastos',
    related_entity_type: 'expense',
    related_entity_id: expense.id
  });
};

// Send notification when timesheet is approved/rejected
export const notifyTimesheetStatus = async (timeEntry, status, user) => {
  const isApproved = status === 'approved';
  
  await base44.entities.Notification.create({
    recipient_email: timeEntry.employee_email,
    recipient_name: timeEntry.employee_name,
    type: 'info',
    priority: 'medium',
    title: isApproved ? '✅ Hours Approved' : '❌ Hours Rejected',
    message: `Your ${timeEntry.hours_worked}h on ${new Date(timeEntry.date).toLocaleDateString()} has been ${status}.`,
    action_url: '/MisHoras',
    related_entity_type: 'timeentry',
    related_entity_id: timeEntry.id
  });
};

// Send notification when time off is approved/rejected
export const notifyTimeOffStatus = async (timeOffRequest, status, user) => {
  const isApproved = status === 'approved';
  
  await base44.entities.Notification.create({
    recipient_email: timeOffRequest.employee_email,
    recipient_name: timeOffRequest.employee_name,
    type: 'info',
    priority: 'high',
    title: isApproved ? '✅ Time Off Approved' : '❌ Time Off Rejected',
    message: `Your time off request from ${new Date(timeOffRequest.start_date).toLocaleDateString()} to ${new Date(timeOffRequest.end_date).toLocaleDateString()} has been ${status}.`,
    action_url: '/TimeOffRequests',
    related_entity_type: 'time_off',
    related_entity_id: timeOffRequest.id
  });
};

// Send notification when new job is assigned
export const notifyJobAssignment = async (assignment, job, employee) => {
  await base44.entities.Notification.create({
    recipient_email: employee.email,
    recipient_name: employee.full_name,
    type: 'assignment_new',
    priority: 'high',
    title: '📋 New Job Assigned',
    message: `You have been assigned to ${job?.name || assignment.job_name} on ${new Date(assignment.date).toLocaleDateString()}`,
    action_url: `/JobDetails?id=${assignment.job_id}`,
    related_entity_type: 'assignment',
    related_entity_id: assignment.id
  });
};

// Send notification when schedule changes
export const notifyScheduleChange = async (assignment, employee, changeType = 'updated') => {
  const titles = {
    updated: '📅 Schedule Updated',
    cancelled: '❌ Schedule Cancelled',
    rescheduled: '🔄 Schedule Rescheduled'
  };
  
  await base44.entities.Notification.create({
    recipient_email: employee.email,
    recipient_name: employee.full_name,
    type: 'schedule_update',
    priority: 'high',
    title: titles[changeType] || titles.updated,
    message: `Your schedule for ${assignment.job_name || assignment.event_title} on ${new Date(assignment.date).toLocaleDateString()} has been ${changeType}.`,
    action_url: '/Calendario',
    related_entity_type: 'assignment',
    related_entity_id: assignment.id
  });
};

// Send notification for new announcement
export const notifyAnnouncement = async (post, allEmployees) => {
  const priority = post.priority === 'urgent' ? 'urgent' : 
                   post.priority === 'important' ? 'high' : 'medium';
  
  // Send to all employees
  const notifications = allEmployees.map(emp => ({
    recipient_email: emp.email,
    recipient_name: emp.full_name,
    type: 'system_alert',
    priority,
    title: `📢 ${post.title}`,
    message: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
    action_url: '/NewsFeed',
    related_entity_type: 'post',
    related_entity_id: post.id
  }));
  
  // Bulk create notifications
  for (const notif of notifications) {
    await base44.entities.Notification.create(notif);
  }
};

// Send notification for inventory restock needed
export const notifyInventoryLow = async (item, adminUsers) => {
  for (const admin of adminUsers) {
    await base44.entities.Notification.create({
      recipient_email: admin.email,
      recipient_name: admin.full_name,
      type: 'system_alert',
      priority: item.quantity === 0 ? 'urgent' : 'high',
      title: `📦 ${item.quantity === 0 ? 'Out of Stock' : 'Low Stock'}: ${item.name}`,
      message: `Only ${item.quantity} ${item.unit || 'units'} remaining. Reorder needed.`,
      action_url: '/Inventario',
      related_entity_type: 'inventory',
      related_entity_id: item.id
    });
  }
};

// Send notification for certification expiring
export const notifyCertificationExpiring = async (certification, employee, adminUsers) => {
  const daysUntilExpiry = Math.ceil(
    (new Date(certification.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)
  );
  
  // Notify employee
  await base44.entities.Notification.create({
    recipient_email: employee.email,
    recipient_name: employee.full_name,
    type: 'system_alert',
    priority: daysUntilExpiry <= 7 ? 'urgent' : 'high',
    title: `⚠️ Certification Expiring Soon`,
    message: `Your ${certification.certification_name} expires in ${daysUntilExpiry} days. Please renew it.`,
    action_url: '/MyProfile',
    related_entity_type: 'certification',
    related_entity_id: certification.id
  });
  
  // Notify admins
  for (const admin of adminUsers) {
    await base44.entities.Notification.create({
      recipient_email: admin.email,
      recipient_name: admin.full_name,
      type: 'system_alert',
      priority: daysUntilExpiry <= 7 ? 'urgent' : 'medium',
      title: `⚠️ Employee Certification Expiring`,
      message: `${employee.full_name}'s ${certification.certification_name} expires in ${daysUntilExpiry} days.`,
      action_url: '/Empleados',
      related_entity_type: 'certification',
      related_entity_id: certification.id
    });
  }
};

// Send notification when payroll is ready
export const notifyPayrollReady = async (weeklyPayroll, employee) => {
  await base44.entities.Notification.create({
    recipient_email: employee.email,
    recipient_name: employee.full_name,
    type: 'info',
    priority: 'medium',
    title: '💰 Payroll Ready',
    message: `Your payroll for ${new Date(weeklyPayroll.week_start).toLocaleDateString()} - ${new Date(weeklyPayroll.week_end).toLocaleDateString()} is ready. Total: $${weeklyPayroll.total_pay.toFixed(2)}`,
    action_url: '/MyPayroll',
    related_entity_type: 'payroll',
    related_entity_id: weeklyPayroll.id
  });
};

// Generic function to send custom notification
export const sendCustomNotification = async ({
  recipientEmail,
  recipientName,
  type = 'info',
  priority = 'medium',
  title,
  message,
  actionUrl,
  relatedEntityType,
  relatedEntityId
}) => {
  await base44.entities.Notification.create({
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    type,
    priority,
    title,
    message,
    action_url: actionUrl,
    related_entity_type: relatedEntityType,
    related_entity_id: relatedEntityId
  });
};

export default {
  notifyExpenseStatus,
  notifyTimesheetStatus,
  notifyTimeOffStatus,
  notifyJobAssignment,
  notifyScheduleChange,
  notifyAnnouncement,
  notifyInventoryLow,
  notifyCertificationExpiring,
  notifyPayrollReady,
  sendCustomNotification
};