
import { base44 } from '@/api/base44Client';

/**
 * Helper para crear notificaciones con configuración del usuario
 */
export async function createNotification({
  recipientEmail,
  recipientName,
  type,
  title,
  message,
  priority = 'medium',
  actionUrl = null,
  relatedEntityType = null,
  relatedEntityId = null,
  metadata = {}
}) {
  try {
    // Obtener configuración de notificaciones del usuario
    const settings = await getUserNotificationSettings(recipientEmail);
    
    // Determinar el tipo base para la configuración
    const typeBase = getNotificationTypeBase(type);
    
    // Verificar si el usuario quiere recibir notificaciones in-app
    const inAppEnabled = settings[`${typeBase}_in_app`] !== false;
    const emailEnabled = settings[`${typeBase}_email`] === true;
    const pushEnabled = settings[`${typeBase}_push`] === true && settings.push_enabled;

    if (!inAppEnabled && !emailEnabled && !pushEnabled) {
      return null;
    }

    // Crear notificación in-app si está habilitada
    let notification = null;
    if (inAppEnabled) {
      notification = await base44.entities.Notification.create({
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        type,
        title,
        message,
        priority,
        action_url: actionUrl,
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        metadata,
        is_read: false
      });
    }

    // Enviar email si está habilitado
    if (emailEnabled && notification) {
      await sendEmailNotification(notification);
      await base44.entities.Notification.update(notification.id, {
        sent_via_email: true,
        email_sent_date: new Date().toISOString()
      });
    }

    // Enviar push si está habilitado
    if (pushEnabled && notification) {
      await sendPushNotification(notification);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Obtener configuración de notificaciones del usuario
 */
async function getUserNotificationSettings(userEmail) {
  const defaultSettings = {
    project_invitation_in_app: true,
    project_invitation_email: true,
    project_invitation_push: true, // New default
    task_assigned_in_app: true,
    task_assigned_email: true,
    task_assigned_push: true, // New default
    task_status_in_app: true,
    task_status_email: false,
    task_status_push: true, // New default
    task_deadline_in_app: true,
    task_deadline_email: true,
    task_deadline_push: true, // New default
    access_request_in_app: true,
    access_request_email: true,
    access_request_push: true, // New default
    mentions_in_app: true,
    mentions_email: true,
    mentions_push: true, // New default
    file_uploads_in_app: true,
    file_uploads_email: false,
    file_uploads_push: true, // New default
    milestone_in_app: true,
    milestone_email: true,
    milestone_push: true, // New default
    system_alerts_in_app: true,
    system_alerts_email: true,
    system_alerts_push: true, // New default
    push_enabled: true, // Global push enable/disable
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00', // 10 PM
    quiet_hours_end: '07:00' // 7 AM
  };

  try {
    const settings = await base44.entities.NotificationSettings.filter({ 
      user_email: userEmail 
    });
    
    if (settings.length > 0) {
      // Merge stored settings with defaults to ensure all keys exist
      return { ...defaultSettings, ...settings[0] };
    }
    
    // Configuración por defecto si no existe
    return defaultSettings;
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    // Return default settings even on error
    return defaultSettings;
  }
}

/**
 * Mapear tipo de notificación a configuración base
 */
function getNotificationTypeBase(type) {
  const typeMap = {
    'project_invitation': 'project_invitation',
    'project_member_added': 'project_invitation',
    'task_assigned': 'task_assigned',
    'task_status_changed': 'task_status',
    'task_due_soon': 'task_deadline',
    'task_overdue': 'task_deadline',
    'access_request_pending': 'access_request',
    'access_request_approved': 'access_request',
    'access_request_rejected': 'access_request',
    'comment_mention': 'mentions',
    'file_uploaded': 'file_uploads',
    'milestone_completed': 'milestone',
    'system_alert': 'system_alerts'
  };
  
  return typeMap[type] || 'system_alerts';
}

/**
 * Enviar notificación por email
 */
export async function sendEmailNotification(notification) {
  try {
    const priorityEmojis = {
      low: 'ℹ️',
      medium: '📢',
      high: '⚠️',
      urgent: '🚨'
    };

    const emoji = priorityEmojis[notification.priority] || '📢';
    
    await base44.integrations.Core.SendEmail({
      to: notification.recipient_email,
      subject: `${emoji} ${notification.title} - MCI Field`,
      body: `Hello ${notification.recipient_name},\n\n${notification.message}\n\n${
        notification.action_url 
          ? `Take action: ${window.location.origin}${notification.action_url}\n\n` 
          : ''
      }---\nThis is an automated notification from MCI Field.\nYou can manage your notification preferences in Settings.`
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

/**
 * Enviar notificación push
 */
export async function sendPushNotification(notification) {
  try {
    // Get user's push subscriptions
    const subscriptions = await base44.entities.PushSubscription.filter({
      user_email: notification.recipient_email,
      active: true
    }).catch(() => []);

    if (subscriptions.length === 0) {
      return; // No active push subscriptions
    }

    // Check if push is enabled for this notification type
    const settings = await getUserNotificationSettings(notification.recipient_email);
    const typeBase = getNotificationTypeBase(notification.type);
    const pushEnabled = settings[`${typeBase}_push`] !== false && settings.push_enabled;

    if (!pushEnabled) {
      return; // Push disabled for this type
    }

    // Check quiet hours
    if (settings.quiet_hours_enabled && isQuietHours(settings)) {
      return; // In quiet hours
    }

    // Send push to all active subscriptions
    // Note: In a real implementation, you would send this to your backend
    // which would use web-push library to send the actual push notification

    // For browser testing - send local notification if permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const priorityEmojis = {
        low: 'ℹ️',
        medium: '📢',
        high: '⚠️',
        urgent: '🚨'
      };

      const emoji = priorityEmojis[notification.priority] || '📢';
      
      new Notification(`${emoji} ${notification.title}`, {
        body: notification.message,
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200],
        data: {
          url: notification.action_url
        },
        requireInteraction: notification.priority === 'urgent'
      });
    }

  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Check if current time is in quiet hours
 */
function isQuietHours(settings) {
  if (!settings.quiet_hours_start || !settings.quiet_hours_end) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = settings.quiet_hours_start.split(':').map(Number);
  const [endHour, endMin] = settings.quiet_hours_end.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Quiet hours span midnight
    return currentTime >= startTime || currentTime <= endTime;
  }
}

/**
 * Helpers específicos para cada tipo de evento
 */

export async function notifyProjectInvitation({ 
  recipientEmail, 
  recipientName, 
  projectName, 
  inviterName,
  projectId 
}) {
  return createNotification({
    recipientEmail,
    recipientName,
    type: 'project_invitation',
    title: 'New Project Invitation',
    message: `${inviterName} invited you to join the project "${projectName}"`,
    priority: 'high',
    actionUrl: `/Projects/${projectId}`,
    relatedEntityType: 'project',
    relatedEntityId: projectId,
    metadata: { projectName, inviterName }
  });
}

export async function notifyTaskAssigned({ 
  recipientEmail, 
  recipientName, 
  taskName, 
  assignerName,
  taskId,
  projectId 
}) {
  return createNotification({
    recipientEmail,
    recipientName,
    type: 'task_assigned',
    title: 'New Task Assigned',
    message: `${assignerName} assigned you the task "${taskName}"`,
    priority: 'medium',
    actionUrl: `/Projects/${projectId}?task=${taskId}`,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    metadata: { taskName, assignerName, projectId }
  });
}

export async function notifyTaskDueSoon({ 
  recipientEmail, 
  recipientName, 
  taskName, 
  dueDate,
  taskId,
  projectId 
}) {
  return createNotification({
    recipientEmail,
    recipientName,
    type: 'task_due_soon',
    title: 'Task Due Soon',
    message: `Task "${taskName}" is due on ${dueDate}`,
    priority: 'high',
    actionUrl: `/Projects/${projectId}?task=${taskId}`,
    relatedEntityType: 'task',
    relatedEntityId: taskId,
    metadata: { taskName, dueDate, projectId }
  });
}

export async function notifyAccessRequestPending({ 
  recipientEmail, 
  recipientName, 
  requesterName,
  projectName,
  projectId 
}) {
  return createNotification({
    recipientEmail,
    recipientName,
    type: 'access_request_pending',
    title: 'New Access Request',
    message: `${requesterName} requested access to "${projectName}"`,
    priority: 'medium',
    actionUrl: `/Projects/${projectId}/access-requests`,
    relatedEntityType: 'project',
    relatedEntityId: projectId,
    metadata: { requesterName, projectName }
  });
}

export async function notifyMilestoneCompleted({ 
  recipientEmail, 
  recipientName, 
  milestoneName,
  projectName,
  projectId 
}) {
  return createNotification({
    recipientEmail,
    recipientName,
    type: 'milestone_completed',
    title: 'Milestone Completed! 🎉',
    message: `Milestone "${milestoneName}" in project "${projectName}" has been completed`,
    priority: 'medium',
    actionUrl: `/Projects/${projectId}`,
    relatedEntityType: 'project',
    relatedEntityId: projectId,
    metadata: { milestoneName, projectName }
  });
}

export async function notifyTimesheetStatus({ 
  recipientEmail, 
  recipientName, 
  status,
  date,
  hours
}) {
  const statusMessages = {
    approved: 'Your timesheet has been approved',
    rejected: 'Your timesheet has been rejected'
  };

  const statusColors = {
    approved: 'medium',
    rejected: 'high'
  };

  return createNotification({
    recipientEmail,
    recipientName,
    type: 'task_status_changed',
    title: `Timesheet ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `${statusMessages[status]} for ${date} (${hours} hours)`,
    priority: statusColors[status] || 'medium',
    actionUrl: '/MisHoras',
    relatedEntityType: 'timesheet',
    metadata: { status, date, hours }
  });
}

export async function notifyExpenseStatus({ 
  recipientEmail, 
  recipientName, 
  status,
  amount,
  category,
  date
}) {
  const statusMessages = {
    approved: 'Your expense has been approved',
    rejected: 'Your expense has been rejected'
  };

  const statusColors = {
    approved: 'medium',
    rejected: 'high'
  };

  return createNotification({
    recipientEmail,
    recipientName,
    type: 'task_status_changed',
    title: `Expense ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: `${statusMessages[status]} - $${amount} for ${category} on ${date}`,
    priority: statusColors[status] || 'medium',
    actionUrl: '/MisGastos',
    relatedEntityType: 'expense',
    metadata: { status, amount, category, date }
  });
}

export async function notifyTimeOffStatus({ 
  recipientEmail, 
  recipientName, 
  status,
  startDate,
  endDate,
  timeOffType,
  notes
}) {
  const statusMessages = {
    approved: 'Your time off request has been approved',
    rejected: 'Your time off request has been rejected'
  };

  const statusColors = {
    approved: 'medium',
    rejected: 'high'
  };

  const message = `${statusMessages[status]} for ${startDate}${endDate !== startDate ? ` to ${endDate}` : ''}${notes ? `\nNotes: ${notes}` : ''}`;

  return createNotification({
    recipientEmail,
    recipientName,
    type: 'task_status_changed',
    title: `Time Off ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message,
    priority: statusColors[status] || 'medium',
    actionUrl: '/TimeOffRequests',
    relatedEntityType: 'time_off',
    metadata: { status, startDate, endDate, timeOffType, notes }
  });
}

export async function notifyJobAssignment({ 
  recipientEmail, 
  recipientName, 
  jobName,
  date,
  startTime,
  jobId
}) {
  return createNotification({
    recipientEmail,
    recipientName,
    type: 'task_assigned',
    title: 'New Job Assignment',
    message: `You have been assigned to "${jobName}" on ${date}${startTime ? ` at ${startTime}` : ''}`,
    priority: 'high',
    actionUrl: `/JobDetails?id=${jobId}`,
    relatedEntityType: 'job',
    relatedEntityId: jobId,
    metadata: { jobName, date, startTime }
  });
}

export async function notifyScheduleChange({ 
  recipientEmail, 
  recipientName, 
  jobName,
  oldDate,
  newDate,
  oldTime,
  newTime,
  jobId
}) {
  const timeChange = oldTime !== newTime ? ` Time changed from ${oldTime} to ${newTime}.` : '';
  const dateChange = oldDate !== newDate ? ` Date changed from ${oldDate} to ${newDate}.` : '';
  
  return createNotification({
    recipientEmail,
    recipientName,
    type: 'task_status_changed',
    title: 'Schedule Updated',
    message: `Your assignment for "${jobName}" has been updated.${dateChange}${timeChange}`,
    priority: 'high',
    actionUrl: `/Calendario`,
    relatedEntityType: 'job',
    relatedEntityId: jobId,
    metadata: { jobName, oldDate, newDate, oldTime, newTime }
  });
}

export async function notifyAnnouncement({ 
  recipientEmail, 
  recipientName, 
  announcementTitle,
  authorName,
  priority,
  announcementId
}) {
  const priorityLevel = priority === 'urgent' ? 'urgent' : 
                       priority === 'important' ? 'high' : 'medium';

  return createNotification({
    recipientEmail,
    recipientName,
    type: 'system_alert',
    title: `📢 New Announcement: ${announcementTitle}`,
    message: `${authorName} posted a new ${priority} announcement`,
    priority: priorityLevel,
    actionUrl: '/NewsFeed',
    relatedEntityType: 'announcement',
    relatedEntityId: announcementId,
    metadata: { announcementTitle, authorName, priority }
  });
}
