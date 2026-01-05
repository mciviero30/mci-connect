import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, startOfDay } from 'date-fns';

// Notification Engine - Monitors and creates notifications for critical events
export default function NotificationEngine({ user }) {
  // Only run for authenticated users
  if (!user?.email) return null;

  // DISABLED: All polling disabled to fix refresh issue
  // These features can be re-enabled later with proper optimization
  
  const pendingTimeEntries = [];
  const pendingExpenses = [];
  const pendingTimeOff = [];
  const inventory = [];
  const certifications = [];
  const assignments = [];
  const invoices = [];
  const allTimeEntries = [];
  const employees = [];

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
            if (!notificationExists('certification_expiring', cert.id)) {
              const daysLeft = differenceInDays(new Date(cert.expiration_date), today);
              await base44.entities.Notification.create({
                recipient_email: user.email,
                recipient_name: user.full_name,
                type: 'certification_expiring',
                priority: daysLeft <= 7 ? 'urgent' : 'high',
                title: `⚠️ Certification Expiring: ${cert.employee_name}`,
                message: `${cert.certification_name} expires in ${daysLeft} days. Renewal required.`,
                action_url: '/Empleados',
                related_entity_type: 'certification',
                related_entity_id: cert.id
              }).catch(err => console.error('Failed to create notification:', err));
            }
          }

          // Overdue and upcoming invoices
          const overdueInvoices = invoices.filter(inv => {
            if (inv.status === 'paid' || inv.status === 'cancelled' || !inv.due_date) return false;
            const dueDate = new Date(inv.due_date);
            return dueDate < today;
          });

          const upcomingInvoices = invoices.filter(inv => {
            if (inv.status === 'paid' || inv.status === 'cancelled' || !inv.due_date) return false;
            const dueDate = new Date(inv.due_date);
            const daysUntilDue = differenceInDays(dueDate, today);
            return daysUntilDue >= 0 && daysUntilDue <= 7;
          });

          // Overdue invoices notifications
          for (const invoice of overdueInvoices.slice(0, 3)) {
            if (!notificationExists('invoice_overdue', invoice.id)) {
              const daysOverdue = differenceInDays(today, new Date(invoice.due_date));
              await base44.entities.Notification.create({
                recipient_email: user.email,
                recipient_name: user.full_name,
                type: 'invoice_overdue',
                priority: 'urgent',
                title: `🚨 Invoice Overdue: ${invoice.customer_name}`,
                message: `Invoice #${invoice.invoice_number} is ${daysOverdue} days overdue. Balance: $${(invoice.balance || invoice.total || 0).toFixed(2)}`,
                action_url: '/Facturas',
                related_entity_type: 'invoice',
                related_entity_id: invoice.id
              }).catch(err => console.error('Failed to create notification:', err));
            }
          }

          // Upcoming invoices notifications
          for (const invoice of upcomingInvoices.slice(0, 3)) {
            if (!notificationExists('invoice_due_soon', invoice.id)) {
              const daysUntilDue = differenceInDays(new Date(invoice.due_date), today);
              await base44.entities.Notification.create({
                recipient_email: user.email,
                recipient_name: user.full_name,
                type: 'invoice_due_soon',
                priority: daysUntilDue <= 3 ? 'high' : 'medium',
                title: `📅 Invoice Due Soon: ${invoice.customer_name}`,
                message: `Invoice #${invoice.invoice_number} due in ${daysUntilDue} days. Balance: $${(invoice.balance || invoice.total || 0).toFixed(2)}`,
                action_url: '/Facturas',
                related_entity_type: 'invoice',
                related_entity_id: invoice.id
              }).catch(err => console.error('Failed to create notification:', err));
            }
          }

          // Overtime alerts - Group by employee
          const overtimeMap = new Map();
          allTimeEntries.forEach(entry => {
            const entryDate = new Date(entry.date);
            const weeksDiff = Math.floor(differenceInDays(today, entryDate) / 7);
            if (weeksDiff > 0) return; // Only current week

            const key = entry.employee_email;
            if (!overtimeMap.has(key)) {
              overtimeMap.set(key, {
                email: entry.employee_email,
                name: entry.employee_name,
                totalHours: 0,
                overtimeHours: 0
              });
            }
            
            const data = overtimeMap.get(key);
            data.totalHours += entry.hours_worked || 0;
            if (entry.hour_type === 'overtime') {
              data.overtimeHours += entry.hours_worked || 0;
            }
          });

          // Check for excessive overtime (more than 10 hours in a week)
          for (const [email, data] of overtimeMap) {
            if (data.overtimeHours > 10) {
              const notifId = `overtime_${email}_${today.toISOString().split('T')[0]}`;
              if (!notificationExists('overtime_alert', notifId)) {
                await base44.entities.Notification.create({
                  recipient_email: user.email,
                  recipient_name: user.full_name,
                  type: 'overtime_alert',
                  priority: data.overtimeHours > 20 ? 'urgent' : 'high',
                  title: `⏰ Excessive Overtime: ${data.name}`,
                  message: `${data.name} has ${data.overtimeHours.toFixed(1)} overtime hours this week (${data.totalHours.toFixed(1)} total). Consider workload adjustment.`,
                  action_url: '/Horarios',
                  related_entity_type: 'time_entry',
                  related_entity_id: notifId
                }).catch(err => console.error('Failed to create notification:', err));
              }
            }
          }

          // Performance review reminders
          for (const emp of employees) {
            if (emp.employment_status !== 'active') continue;
            
            // Check if review is due (90 days since hire or last review)
            const hireDate = emp.hire_date ? new Date(emp.hire_date) : null;
            const lastReviewDate = emp.last_performance_review_date ? new Date(emp.last_performance_review_date) : null;
            
            const referenceDate = lastReviewDate || hireDate;
            if (!referenceDate) continue;

            const daysSinceReview = differenceInDays(today, referenceDate);
            
            // Alert if 90 days have passed (quarterly review due)
            if (daysSinceReview >= 90 && daysSinceReview <= 95) {
              const notifId = `review_${emp.email}_${daysSinceReview}`;
              if (!notificationExists('performance_review_due', notifId)) {
                await base44.entities.Notification.create({
                  recipient_email: user.email,
                  recipient_name: user.full_name,
                  type: 'performance_review_due',
                  priority: 'high',
                  title: `📋 Performance Review Due: ${emp.full_name}`,
                  message: `Quarterly performance review is due for ${emp.full_name}. Last review: ${daysSinceReview} days ago.`,
                  action_url: '/PerformanceManagement',
                  related_entity_type: 'employee',
                  related_entity_id: notifId
                }).catch(err => console.error('Failed to create notification:', err));
              }
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
    assignments.length,
    invoices.length,
    allTimeEntries.length,
    employees.length
  ]);

  return null; // This component doesn't render anything
}