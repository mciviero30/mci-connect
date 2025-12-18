import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function PayrollReminderService({ user }) {
  const lastNotificationRef = useRef({});
  const isAdmin = user?.role === 'admin' || 
    ['CEO', 'administrator', 'manager'].includes(user?.position) ||
    user?.department === 'HR';

  // Check if payroll has been marked as processed this week
  const { data: weeklyPayrolls = [] } = useQuery({
    queryKey: ['weeklyPayrolls'],
    queryFn: async () => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
      weekStart.setHours(0, 0, 0, 0);
      
      return base44.entities.WeeklyPayroll.filter({
        week_start_date: weekStart.toISOString().split('T')[0]
      });
    },
    enabled: isAdmin,
    refetchInterval: 60000, // Check every minute
  });

  const isPayrollProcessed = weeklyPayrolls.some(p => 
    p.status === 'processed' || p.status === 'sent_to_bank' || p.payroll_submitted
  );

  useEffect(() => {
    if (!isAdmin) return;

    const checkAndSendNotifications = async () => {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 3 = Wednesday
      const hour = now.getHours();
      const minute = now.getMinutes();
      const dateKey = now.toISOString().split('T')[0];
      const timeKey = `${hour}:${minute}`;

      // Skip weekends
      if (day === 0 || day === 6) return;

      // Daily reminder at 9:30 AM (Monday-Friday)
      if (hour === 9 && minute === 30) {
        const notifKey = `daily-${dateKey}`;
        if (lastNotificationRef.current[notifKey]) return;
        
        try {
          await base44.entities.Notification.create({
            recipient_email: user.email,
            recipient_name: user.full_name,
            title: '🕐 Revisión Diaria de Payroll',
            message: 'Por favor verifique y apruebe las horas registradas el día anterior.',
            type: 'payroll_reminder',
            priority: 'medium',
            link: '/page/Horarios',
            read: false
          });
          lastNotificationRef.current[notifKey] = true;
        } catch (error) {
          console.error('Failed to send daily payroll reminder:', error);
        }
      }

      // Wednesday reminders
      if (day === 3) { // Wednesday
        // First reminder at 9:30 AM
        if (hour === 9 && minute === 30) {
          const notifKey = `wednesday-morning-${dateKey}`;
          if (lastNotificationRef.current[notifKey]) return;
          
          try {
            await base44.entities.Notification.create({
              recipient_email: user.email,
              recipient_name: user.full_name,
              title: '⚠️ Cierre de Payroll',
              message: 'Hoy es el último día para enviar al banco. Revise las horas pendientes.',
              type: 'payroll_deadline',
              priority: 'high',
              link: '/page/Horarios',
              read: false
            });
            lastNotificationRef.current[notifKey] = true;
          } catch (error) {
            console.error('Failed to send Wednesday morning reminder:', error);
          }
        }

        // Critical reminder at 2:00 PM - ONLY if payroll not processed
        if (hour === 14 && minute === 0) {
          const notifKey = `wednesday-critical-${dateKey}`;
          if (lastNotificationRef.current[notifKey]) return;
          
          // Skip if payroll already processed
          if (isPayrollProcessed) {
            console.log('Payroll already processed - skipping critical reminder');
            lastNotificationRef.current[notifKey] = true;
            return;
          }
          
          try {
            await base44.entities.Notification.create({
              recipient_email: user.email,
              recipient_name: user.full_name,
              title: '🚨 CRÍTICO: Última Oportunidad Payroll',
              message: 'Última oportunidad para aprobar y enviar el Payroll al banco.',
              type: 'payroll_critical',
              priority: 'urgent',
              link: '/page/Horarios',
              read: false,
              requires_action: true
            });
            lastNotificationRef.current[notifKey] = true;
          } catch (error) {
            console.error('Failed to send critical payroll reminder:', error);
          }
        }
      }
    };

    // Check every minute
    const interval = setInterval(checkAndSendNotifications, 60000);
    
    // Check immediately on mount
    checkAndSendNotifications();

    return () => clearInterval(interval);
  }, [isAdmin, user?.email, user?.full_name, isPayrollProcessed]);

  return null; // This is a service component with no UI
}