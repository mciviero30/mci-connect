import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';

// Universal Notification Engine - Polls for changes and creates notifications
export default function UniversalNotificationEngine({ user }) {
  const queryClient = useQueryClient();
  const lastCheckRef = useRef({});

  // Poll for new assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['recentAssignments', user?.email],
    queryFn: () => base44.entities.JobAssignment.filter({ employee_email: user.email }, '-updated_date', 10),
    enabled: !!user?.email,
    refetchInterval: 15000, // Check every 15 seconds
    initialData: []
  });

  // Poll for urgent posts
  const { data: urgentPosts = [] } = useQuery({
    queryKey: ['urgentPosts'],
    queryFn: () => base44.entities.Post.filter({ priority: 'urgent' }, '-created_date', 5),
    enabled: !!user?.email,
    refetchInterval: 20000,
    initialData: []
  });

  // Poll for approved time entries
  const { data: myTimeEntries = [] } = useQuery({
    queryKey: ['myApprovedEntries', user?.email],
    queryFn: () => base44.entities.TimeEntry.filter({ employee_email: user.email, status: 'approved' }, '-updated_date', 10),
    enabled: !!user?.email,
    refetchInterval: 30000,
    initialData: []
  });

  // Poll for approved expenses
  const { data: myExpenses = [] } = useQuery({
    queryKey: ['myApprovedExpenses', user?.email],
    queryFn: () => base44.entities.Expense.filter({ employee_email: user.email, status: 'approved' }, '-updated_date', 10),
    enabled: !!user?.email,
    refetchInterval: 30000,
    initialData: []
  });

  // Check for new assignments
  useEffect(() => {
    if (!assignments.length) return;

    assignments.forEach(async (assignment) => {
      const key = `assignment_${assignment.id}`;
      if (lastCheckRef.current[key]) return;
      
      const assignmentDate = new Date(assignment.created_date);
      const minutesAgo = (Date.now() - assignmentDate.getTime()) / 60000;
      
      if (minutesAgo > 60) return; // Only notify for assignments created in last hour

      lastCheckRef.current[key] = true;

      try {
        await base44.entities.Notification.create({
          recipient_email: user.email,
          recipient_name: user.full_name,
          title: '📋 Nueva Asignación de Trabajo',
          message: `Has sido asignado a: ${assignment.job_name || assignment.event_title || 'Trabajo'}${assignment.date ? ` - ${assignment.date}` : ''}`,
          type: 'job_assignment',
          priority: 'high',
          link: '/page/Calendario',
          related_entity_id: assignment.id,
          related_entity_type: 'assignment',
          read: false
        });

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to create assignment notification:', error);
      }
    });
  }, [assignments, user?.email, user?.full_name, queryClient]);

  // Check for urgent posts
  useEffect(() => {
    if (!urgentPosts.length) return;

    urgentPosts.forEach(async (post) => {
      const key = `post_${post.id}`;
      if (lastCheckRef.current[key]) return;
      
      const postDate = new Date(post.created_date);
      const minutesAgo = (Date.now() - postDate.getTime()) / 60000;
      
      if (minutesAgo > 30) return;

      lastCheckRef.current[key] = true;

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
          read: false
        });

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to create alert notification:', error);
      }
    });
  }, [urgentPosts, user?.email, user?.full_name, queryClient]);

  // Check for approved time entries
  useEffect(() => {
    if (!myTimeEntries.length) return;

    myTimeEntries.forEach(async (entry) => {
      const key = `timeentry_${entry.id}`;
      if (lastCheckRef.current[key]) return;
      
      const updatedDate = new Date(entry.updated_date);
      const minutesAgo = (Date.now() - updatedDate.getTime()) / 60000;
      
      if (minutesAgo > 120) return;

      lastCheckRef.current[key] = true;

      try {
        await base44.entities.Notification.create({
          recipient_email: user.email,
          recipient_name: user.full_name,
          title: '✅ Horas Aprobadas',
          message: `Tus horas del ${entry.date} han sido aprobadas (${entry.hours_worked?.toFixed(1)}h) - Listo para Pago`,
          type: 'payroll_approval',
          priority: 'medium',
          link: '/page/MisHoras',
          related_entity_id: entry.id,
          related_entity_type: 'time_entry',
          read: false
        });

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to create approval notification:', error);
      }
    });
  }, [myTimeEntries, user?.email, user?.full_name, queryClient]);

  // Check for approved expenses
  useEffect(() => {
    if (!myExpenses.length) return;

    myExpenses.forEach(async (expense) => {
      const key = `expense_${expense.id}`;
      if (lastCheckRef.current[key]) return;
      
      const updatedDate = new Date(expense.updated_date);
      const minutesAgo = (Date.now() - updatedDate.getTime()) / 60000;
      
      if (minutesAgo > 120) return;

      lastCheckRef.current[key] = true;

      try {
        await base44.entities.Notification.create({
          recipient_email: user.email,
          recipient_name: user.full_name,
          title: '💰 Gasto Aprobado',
          message: `Tu gasto de $${expense.amount?.toFixed(2)} ha sido aprobado`,
          type: 'expense_approval',
          priority: 'medium',
          link: '/page/MisGastos',
          related_entity_id: expense.id,
          related_entity_type: 'expense',
          read: false
        });

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to create expense notification:', error);
      }
    });
  }, [myExpenses, user?.email, user?.full_name, queryClient]);

  return null;
}