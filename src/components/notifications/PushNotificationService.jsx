import { base44 } from '@/api/base44Client';

/**
 * Centralized Push Notification Service
 * Handles sending notifications for critical events
 */

// Notification types with their settings keys
const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  QUOTE_APPROVED: 'quote_approved',
  QUOTE_REJECTED: 'quote_rejected',
  URGENT_JOB: 'urgent_job',
  EXPENSE_APPROVED: 'expense_approved',
  TIMESHEET_APPROVED: 'timesheet_approved',
  TASK_DEADLINE: 'task_deadline',
  MENTIONS: 'mentions',
  SYSTEM_ALERTS: 'system_alerts',
};

/**
 * Check if user has push enabled for a specific notification type
 */
async function checkUserPreference(userEmail, notificationType) {
  try {
    const settings = await base44.entities.NotificationSettings.filter({
      user_email: userEmail
    });
    
    if (settings.length === 0) return true; // Default to enabled
    
    const userSettings = settings[0];
    
    // Check if globally snoozed
    if (userSettings.snooze_until) {
      const snoozeEnd = new Date(userSettings.snooze_until);
      if (snoozeEnd > new Date()) {
        if (userSettings.snooze_type === 'all' || userSettings.snooze_type === 'push') {
          return false;
        }
      }
    }
    
    // Check quiet hours
    if (userSettings.quiet_hours_enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const start = userSettings.quiet_hours_start || '22:00';
      const end = userSettings.quiet_hours_end || '08:00';
      
      if (start < end) {
        if (currentTime >= start && currentTime <= end) return false;
      } else {
        if (currentTime >= start || currentTime <= end) return false;
      }
    }
    
    // Check specific notification type
    const pushKey = `${notificationType}_push`;
    return userSettings[pushKey] !== false;
  } catch (error) {
    console.error('Error checking user preferences:', error);
    return true;
  }
}

/**
 * Send browser push notification
 */
function sendBrowserNotification(title, body, options = {}) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: options.tag || 'mci-notification',
      requireInteraction: options.requireInteraction || false,
      data: options.data || {},
      ...options
    });
    
    notification.onclick = () => {
      window.focus();
      if (options.url) {
        window.location.href = options.url;
      }
      notification.close();
    };
    
    if (options.autoClose !== false) {
      setTimeout(() => notification.close(), options.autoCloseDelay || 8000);
    }
    
    return notification;
  }
  return null;
}

/**
 * Create in-app notification record
 */
async function createInAppNotification(data) {
  try {
    await base44.entities.Notification.create({
      user_email: data.userEmail,
      title: data.title,
      message: data.body,
      type: data.type,
      priority: data.priority || 'normal',
      link: data.url,
      read: false,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating in-app notification:', error);
  }
}

/**
 * Main notification dispatcher
 */
export async function sendNotification({
  userEmail,
  type,
  title,
  body,
  url,
  priority = 'normal',
  data = {}
}) {
  const shouldSendPush = await checkUserPreference(userEmail, type);
  
  // Always create in-app notification
  await createInAppNotification({
    userEmail,
    title,
    body,
    type,
    priority,
    url,
  });
  
  // Send browser push if enabled
  if (shouldSendPush) {
    sendBrowserNotification(title, body, {
      tag: `${type}-${Date.now()}`,
      url,
      requireInteraction: priority === 'urgent',
      data: { type, ...data },
    });
  }
}

// Specific notification helpers
export async function notifyTaskAssigned({ userEmail, taskTitle, jobName, taskId, jobId }) {
  await sendNotification({
    userEmail,
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    title: '📋 New Task Assigned',
    body: `You've been assigned to "${taskTitle}" in ${jobName}`,
    url: `/Field?job=${jobId}&task=${taskId}`,
    priority: 'normal',
    data: { taskId, jobId },
  });
}

export async function notifyQuoteApproved({ userEmail, quoteNumber, customerName, quoteId }) {
  await sendNotification({
    userEmail,
    type: NOTIFICATION_TYPES.QUOTE_APPROVED,
    title: '✅ Quote Approved!',
    body: `Quote ${quoteNumber} for ${customerName} has been approved`,
    url: `/VerEstimado?id=${quoteId}`,
    priority: 'urgent',
    data: { quoteId },
  });
}

export async function notifyQuoteRejected({ userEmail, quoteNumber, customerName, quoteId, reason }) {
  await sendNotification({
    userEmail,
    type: NOTIFICATION_TYPES.QUOTE_REJECTED,
    title: '❌ Quote Rejected',
    body: `Quote ${quoteNumber} for ${customerName} was rejected${reason ? `: ${reason}` : ''}`,
    url: `/VerEstimado?id=${quoteId}`,
    priority: 'normal',
    data: { quoteId },
  });
}

export async function notifyUrgentJobUpdate({ userEmail, jobName, message, jobId }) {
  await sendNotification({
    userEmail,
    type: NOTIFICATION_TYPES.URGENT_JOB,
    title: '🚨 Urgent Job Update',
    body: `${jobName}: ${message}`,
    url: `/JobDetails?id=${jobId}`,
    priority: 'urgent',
    data: { jobId },
  });
}

export async function notifyExpenseApproved({ userEmail, amount, expenseId }) {
  await sendNotification({
    userEmail,
    type: NOTIFICATION_TYPES.EXPENSE_APPROVED,
    title: '💰 Expense Approved',
    body: `Your expense of $${amount.toFixed(2)} has been approved`,
    url: `/MisGastos`,
    priority: 'normal',
    data: { expenseId },
  });
}

export async function notifyTimesheetApproved({ userEmail, date, hours }) {
  await sendNotification({
    userEmail,
    type: NOTIFICATION_TYPES.TIMESHEET_APPROVED,
    title: '⏰ Timesheet Approved',
    body: `Your timesheet for ${date} (${hours}h) has been approved`,
    url: `/MisHoras`,
    priority: 'normal',
  });
}

export async function notifyDeadlineApproaching({ userEmail, taskTitle, dueDate, taskId, jobId }) {
  await sendNotification({
    userEmail,
    type: NOTIFICATION_TYPES.TASK_DEADLINE,
    title: '⏰ Deadline Approaching',
    body: `Task "${taskTitle}" is due ${dueDate}`,
    url: `/Field?job=${jobId}&task=${taskId}`,
    priority: 'urgent',
    data: { taskId, jobId },
  });
}

export async function notifyMention({ userEmail, mentionedBy, context, url }) {
  await sendNotification({
    userEmail,
    type: NOTIFICATION_TYPES.MENTIONS,
    title: '💬 You were mentioned',
    body: `${mentionedBy} mentioned you: "${context}"`,
    url,
    priority: 'normal',
  });
}

export default {
  sendNotification,
  notifyTaskAssigned,
  notifyQuoteApproved,
  notifyQuoteRejected,
  notifyUrgentJobUpdate,
  notifyExpenseApproved,
  notifyTimesheetApproved,
  notifyDeadlineApproaching,
  notifyMention,
  NOTIFICATION_TYPES,
};