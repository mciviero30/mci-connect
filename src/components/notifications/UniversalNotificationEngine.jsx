import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

// Universal Notification Engine - Handles all notification triggers across the app
export default function UniversalNotificationEngine({ user }) {
  const queryClient = useQueryClient();
  const processedNotifications = useRef(new Set());

  useEffect(() => {
    if (!user?.email) return;

    // Subscribe to real-time changes
    const subscriptions = [];

    // 1. JOB ASSIGNMENTS - Notify employee when assigned
    const assignmentChannel = base44.entities.JobAssignment.subscribe(
      async (event) => {
        if (event.type === 'INSERT' || event.type === 'UPDATE') {
          const assignment = event.new;
          const notifId = `assignment_${assignment.id}_${assignment.updated_date}`;
          
          if (processedNotifications.current.has(notifId)) return;
          processedNotifications.current.add(notifId);

          // Notify assigned employee
          if (assignment.employee_email && assignment.employee_email === user.email) {
            try {
              await base44.entities.Notification.create({
                recipient_email: assignment.employee_email,
                recipient_name: assignment.employee_name,
                title: '📋 Nueva Asignación de Trabajo',
                message: `Has sido asignado a: ${assignment.job_name || assignment.event_title || 'Trabajo'}${assignment.date ? ` - ${assignment.date}` : ''}`,
                type: 'job_assignment',
                priority: 'high',
                link: '/page/Calendario',
                related_entity_id: assignment.id,
                related_entity_type: 'assignment',
                read: false,
                created_date: new Date().toISOString()
              });

              // Send push notification
              if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                registration.showNotification('Nueva Asignación', {
                  body: `${assignment.job_name || 'Trabajo'} - ${assignment.date || 'Fecha TBD'}`,
                  icon: '/logo192.png',
                  badge: '/badge-icon.png',
                  tag: notifId,
                  requireInteraction: true,
                  vibrate: [200, 100, 200],
                  data: { url: '/page/Calendario' }
                });
              }

              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } catch (error) {
              console.error('Failed to create assignment notification:', error);
            }
          }
        }
      }
    );
    subscriptions.push(assignmentChannel);

    // 2. GLOBAL ALERTS - Broadcast from CEO/Admin
    const alertChannel = base44.entities.Post.subscribe(
      async (event) => {
        if (event.type === 'INSERT') {
          const post = event.new;
          const notifId = `post_${post.id}`;
          
          if (processedNotifications.current.has(notifId)) return;
          processedNotifications.current.add(notifId);

          // If urgent priority, send as push notification
          if (post.priority === 'urgent') {
            try {
              await base44.entities.Notification.create({
                recipient_email: user.email,
                recipient_name: user.full_name,
                title: `🚨 Alerta Global: ${post.title}`,
                message: post.content.substring(0, 150),
                type: 'global_alert',
                priority: 'urgent',
                link: '/page/NewsFeed',
                related_entity_id: post.id,
                related_entity_type: 'post',
                read: false,
                created_date: new Date().toISOString()
              });

              // Push notification
              if ('serviceWorker' in navigator && 'PushManager' in window) {
                const registration = await navigator.serviceWorker.ready;
                registration.showNotification(`🚨 ${post.title}`, {
                  body: post.content.substring(0, 100),
                  icon: '/logo192.png',
                  badge: '/badge-icon.png',
                  tag: notifId,
                  requireInteraction: true,
                  vibrate: [300, 100, 300, 100, 300],
                  data: { url: '/page/NewsFeed' }
                });
              }

              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } catch (error) {
              console.error('Failed to create alert notification:', error);
            }
          }
        }
      }
    );
    subscriptions.push(alertChannel);

    // 3. PAYROLL APPROVALS - Notify employee when approved
    const timeEntryChannel = base44.entities.TimeEntry.subscribe(
      async (event) => {
        if (event.type === 'UPDATE') {
          const oldEntry = event.old;
          const newEntry = event.new;
          const notifId = `timeentry_${newEntry.id}_${newEntry.updated_date}`;
          
          if (processedNotifications.current.has(notifId)) return;

          // Detect status change to approved
          if (oldEntry.status !== 'approved' && newEntry.status === 'approved') {
            processedNotifications.current.add(notifId);

            // Notify employee
            if (newEntry.employee_email && newEntry.employee_email === user.email) {
              try {
                await base44.entities.Notification.create({
                  recipient_email: newEntry.employee_email,
                  recipient_name: newEntry.employee_name,
                  title: '✅ Horas Aprobadas',
                  message: `Tus horas del ${newEntry.date} han sido aprobadas (${newEntry.hours_worked?.toFixed(1)}h) - Listo para Pago`,
                  type: 'payroll_approval',
                  priority: 'medium',
                  link: '/page/MisHoras',
                  related_entity_id: newEntry.id,
                  related_entity_type: 'time_entry',
                  read: false,
                  created_date: new Date().toISOString()
                });

                // Push notification
                if ('serviceWorker' in navigator && 'PushManager' in window) {
                  const registration = await navigator.serviceWorker.ready;
                  registration.showNotification('Horas Aprobadas', {
                    body: `${newEntry.hours_worked?.toFixed(1)}h aprobadas - ${newEntry.date}`,
                    icon: '/logo192.png',
                    badge: '/badge-icon.png',
                    tag: notifId,
                    vibrate: [200, 100, 200],
                    data: { url: '/page/MisHoras' }
                  });
                }

                queryClient.invalidateQueries({ queryKey: ['notifications'] });
              } catch (error) {
                console.error('Failed to create approval notification:', error);
              }
            }
          }
        }
      }
    );
    subscriptions.push(timeEntryChannel);

    // 4. EXPENSE APPROVALS
    const expenseChannel = base44.entities.Expense.subscribe(
      async (event) => {
        if (event.type === 'UPDATE') {
          const oldExpense = event.old;
          const newExpense = event.new;
          const notifId = `expense_${newExpense.id}_${newExpense.updated_date}`;
          
          if (processedNotifications.current.has(notifId)) return;

          if (oldExpense.status !== 'approved' && newExpense.status === 'approved') {
            processedNotifications.current.add(notifId);

            if (newExpense.employee_email && newExpense.employee_email === user.email) {
              try {
                await base44.entities.Notification.create({
                  recipient_email: newExpense.employee_email,
                  recipient_name: newExpense.employee_name,
                  title: '💰 Gasto Aprobado',
                  message: `Tu gasto de $${newExpense.amount?.toFixed(2)} ha sido aprobado`,
                  type: 'expense_approval',
                  priority: 'medium',
                  link: '/page/MisGastos',
                  related_entity_id: newExpense.id,
                  related_entity_type: 'expense',
                  read: false,
                  created_date: new Date().toISOString()
                });

                queryClient.invalidateQueries({ queryKey: ['notifications'] });
              } catch (error) {
                console.error('Failed to create expense approval notification:', error);
              }
            }
          }
        }
      }
    );
    subscriptions.push(expenseChannel);

    // 5. CERTIFICATIONS - Notify when assigned
    const certChannel = base44.entities.Certification.subscribe(
      async (event) => {
        if (event.type === 'INSERT') {
          const cert = event.new;
          const notifId = `cert_${cert.id}`;
          
          if (processedNotifications.current.has(notifId)) return;
          processedNotifications.current.add(notifId);

          if (cert.employee_email && cert.employee_email === user.email) {
            try {
              await base44.entities.Notification.create({
                recipient_email: cert.employee_email,
                recipient_name: cert.employee_name,
                title: '🎓 Nueva Certificación Asignada',
                message: `Se te ha asignado: ${cert.certification_name}`,
                type: 'certification_assigned',
                priority: 'medium',
                link: '/page/MyProfile',
                related_entity_id: cert.id,
                related_entity_type: 'certification',
                read: false,
                created_date: new Date().toISOString()
              });

              queryClient.invalidateQueries({ queryKey: ['notifications'] });
            } catch (error) {
              console.error('Failed to create certification notification:', error);
            }
          }
        }
      }
    );
    subscriptions.push(certChannel);

    // Cleanup subscriptions on unmount
    return () => {
      subscriptions.forEach(sub => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      });
    };
  }, [user?.email, user?.full_name, queryClient]);

  return null;
}