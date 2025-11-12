import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, startOfDay } from 'date-fns';

// Notification Engine - Monitors and creates notifications for critical events
export default function NotificationEngine({ user }) {
  // Only run for authenticated users
  if (!user?.email) return null;

  // Monitor pending approvals (admin only)
  const { data: pendingTimeEntries = [] } = useQuery({
    queryKey: ['pendingTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'pending' }),
    enabled: user?.role === 'admin',
    refetchInterval: 300000, // Check every 5 minutes
    initialData: []
  });

  const { data: pendingExpenses = [] } = useQuery({
    queryKey: ['pendingExpenses'],
    queryFn: () => base44.entities.Expense.filter({ status: 'pending' }),
    enabled: user?.role === 'admin',
    refetchInterval: 300000,
    initialData: []
  });

  const { data: pendingTimeOff = [] } = useQuery({
    queryKey: ['pendingTimeOff'],
    queryFn: () => base44.entities.TimeOffRequest.filter({ status: 'pending' }),
    enabled: user?.role === 'admin',
    refetchInterval: 300000,
    initialData: []
  });

  // Monitor inventory levels (admin only)
  const { data: inventory = [] } = useQuery({
    queryKey: ['inventoryItems'],
    queryFn: () => base44.entities.InventoryItem.list(),
    enabled: user?.role === 'admin',
    refetchInterval: 900000, // Check every 15 minutes
    initialData: []
  });

  // Monitor certifications expiring soon (admin only)
  const { data: certifications = [] } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list(),
    enabled: user?.role === 'admin',
    refetchInterval: 86400000, // Check daily
    initialData: []
  });

  // Monitor upcoming assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.JobAssignment.list('-date', 100),
    enabled: !!user,
    refetchInterval: 600000,
    initialData: []
  });

  // Check and create notifications
  useEffect(() => {
    if (!user?.email) return;

    const checkAndNotify = async () => {
      try {
        // Get existing notifications to avoid duplicates
        const existingNotifications = await base44.entities.Notification.filter({
          recipient_email: user.email,
          created_date: { $gte: new Date(Date.now() - 86400000).toISOString() } // Last 24 hours
        }).catch(() => []);

        const notificationExists = (type, entityId) => {
          return existingNotifications.some(n => 
            n.type === type && 
            n.related_entity_id === entityId &&
            !n.is_read
          );
        };

        // 1. ADMIN: Pending Approvals
        if (user.role === 'admin') {
          // Timesheet approvals
          if (pendingTimeEntries.length > 0) {
            const urgentCount = pendingTimeEntries.filter(e => {
              const days = differenceInDays(new Date(), new Date(e.date));
              return days > 7;
            }).length;

            if (urgentCount > 0 && !notificationExists('system_alert', 'timesheets')) {
              await base44.entities.Notification.create({
                recipient_email: user.email,
                recipient_name: user.full_name,
                type: 'system_alert',
                priority: urgentCount > 10 ? 'urgent' : 'high',
                title: `⏰ ${pendingTimeEntries.length} Pending Timesheets`,
                message: `${urgentCount} timesheets are over 7 days old and need immediate approval.`,
                action_url: '/Horarios',
                related_entity_type: 'timesheet',
                related_entity_id: 'timesheets'
              }).catch(err => console.error('Failed to create notification:', err));
            }
          }

          // Expense approvals
          if (pendingExpenses.length > 5 && !notificationExists('system_alert', 'expenses')) {
            await base44.entities.Notification.create({
              recipient_email: user.email,
              recipient_name: user.full_name,
              type: 'system_alert',
              priority: 'high',
              title: `💰 ${pendingExpenses.length} Pending Expenses`,
              message: `Multiple expenses are waiting for your approval.`,
              action_url: '/Gastos',
              related_entity_type: 'expense',
              related_entity_id: 'expenses'
            }).catch(err => console.error('Failed to create notification:', err));
          }

          // Time off approvals
          if (pendingTimeOff.length > 0 && !notificationExists('system_alert', 'timeoff')) {
            await base44.entities.Notification.create({
              recipient_email: user.email,
              recipient_name: user.full_name,
              type: 'system_alert',
              priority: 'medium',
              title: `📅 ${pendingTimeOff.length} Time Off Requests`,
              message: `Employees are waiting for time off approval.`,
              action_url: '/TimeOffRequests',
              related_entity_type: 'time_off',
              related_entity_id: 'timeoff'
            }).catch(err => console.error('Failed to create notification:', err));
          }

          // Low inventory alerts
          const lowStockItems = inventory.filter(item => 
            item.quantity <= item.min_quantity && item.status !== 'out_of_stock'
          );

          for (const item of lowStockItems.slice(0, 5)) { // Limit to 5 to avoid spam
            if (!notificationExists('system_alert', item.id)) {
              await base44.entities.Notification.create({
                recipient_email: user.email,
                recipient_name: user.full_name,
                type: 'system_alert',
                priority: item.quantity === 0 ? 'urgent' : 'high',
                title: `📦 Low Inventory: ${item.name}`,
                message: `Only ${item.quantity} ${item.unit || 'units'} remaining. Reorder needed.`,
                action_url: '/Inventario',
                related_entity_type: 'inventory',
                related_entity_id: item.id
              }).catch(err => console.error('Failed to create notification:', err));
            }
          }

          // Expiring certifications
          const today = startOfDay(new Date());
          const expiringCerts = certifications.filter(cert => {
            if (!cert.expiration_date) return false;
            const expiryDate = new Date(cert.expiration_date);
            const daysUntilExpiry = differenceInDays(expiryDate, today);
            return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
          });

          for (const cert of expiringCerts.slice(0, 5)) { // Limit to 5
            if (!notificationExists('system_alert', cert.id)) {
              const daysLeft = differenceInDays(new Date(cert.expiration_date), today);
              await base44.entities.Notification.create({
                recipient_email: user.email,
                recipient_name: user.full_name,
                type: 'system_alert',
                priority: daysLeft <= 7 ? 'urgent' : 'high',
                title: `⚠️ Certification Expiring: ${cert.employee_name}`,
                message: `${cert.certification_name} expires in ${daysLeft} days.`,
                action_url: '/Empleados',
                related_entity_type: 'certification',
                related_entity_id: cert.id
              }).catch(err => console.error('Failed to create notification:', err));
            }
          }
        }

        // 2. EMPLOYEE: Job assignments
        const myUpcomingAssignments = assignments.filter(a => {
          if (a.employee_email !== user.email) return false;
          const assignmentDate = new Date(a.date);
          const daysUntil = differenceInDays(assignmentDate, new Date());
          return daysUntil >= 0 && daysUntil <= 2; // Next 2 days
        });

        for (const assignment of myUpcomingAssignments.slice(0, 3)) { // Limit to 3
          if (!notificationExists('system_alert', assignment.id)) {
            const daysUntil = differenceInDays(new Date(assignment.date), new Date());
            const timeText = daysUntil === 0 ? 'today' : 
                           daysUntil === 1 ? 'tomorrow' : 
                           `in ${daysUntil} days`;

            await base44.entities.Notification.create({
              recipient_email: user.email,
              recipient_name: user.full_name,
              type: 'system_alert',
              priority: daysUntil === 0 ? 'high' : 'medium',
              title: `📋 Job Assignment ${timeText}`,
              message: `${assignment.job_name || assignment.event_title} at ${assignment.start_time || 'TBD'}`,
              action_url: '/Calendario',
              related_entity_type: 'assignment',
              related_entity_id: assignment.id
            }).catch(err => console.error('Failed to create notification:', err));
          }
        }
      } catch (error) {
        console.error('Error in notification engine:', error);
      }
    };

    // Run check after a delay to avoid blocking initial render
    const timeout = setTimeout(checkAndNotify, 5000);

    // Then run periodically
    const interval = setInterval(checkAndNotify, 300000); // Every 5 minutes

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [
    user?.email,
    user?.role,
    user?.full_name,
    pendingTimeEntries.length,
    pendingExpenses.length,
    pendingTimeOff.length,
    inventory.length,
    certifications.length,
    assignments.length
  ]);

  return null; // This component doesn't render anything
}