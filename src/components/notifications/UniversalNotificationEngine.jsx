import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { differenceInDays, startOfDay } from 'date-fns';

// UNIFIED Notification Engine - Handles all event monitoring and notifications
// Consolidated from previous scattered systems
export default function UniversalNotificationEngine({ user }) {
  const queryClient = useQueryClient();
  const lastCheckRef = useRef({});

  // Poll for new assignments - Optimized for mobile
  const { data: assignments = [] } = useQuery({
    queryKey: ['recentAssignments', user?.email],
    queryFn: () => base44.entities.JobAssignment.filter({ employee_email: user.email }, '-updated_date', 10),
    enabled: !!user?.email,
    refetchInterval: 60000, // Check every 1 minute for faster notifications
    staleTime: 30000,
    initialData: []
  });

  // Poll for urgent posts - REDUCED frequency
  const { data: urgentPosts = [] } = useQuery({
    queryKey: ['urgentPosts'],
    queryFn: () => base44.entities.Post.filter({ priority: 'urgent' }, '-created_date', 5),
    enabled: !!user?.email,
    refetchInterval: 180000, // Check every 3 minutes (was 20s)
    staleTime: 90000,
    initialData: []
  });

  // Poll for approved time entries - REDUCED frequency
  const { data: myTimeEntries = [] } = useQuery({
    queryKey: ['myApprovedEntries', user?.email],
    queryFn: () => base44.entities.TimeEntry.filter({ employee_email: user.email, status: 'approved' }, '-updated_date', 10),
    enabled: !!user?.email,
    refetchInterval: 300000, // Check every 5 minutes (was 30s)
    staleTime: 180000,
    initialData: []
  });

  // Poll for approved expenses - REDUCED frequency
  const { data: myExpenses = [] } = useQuery({
    queryKey: ['myApprovedExpenses', user?.email],
    queryFn: () => base44.entities.Expense.filter({ employee_email: user.email, status: 'approved' }, '-updated_date', 10),
    enabled: !!user?.email,
    refetchInterval: 300000,
    staleTime: 180000,
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
      
      if (minutesAgo > 60) return;

      lastCheckRef.current[key] = true;

      try {
        await base44.entities.Notification.create({
          recipient_email: user.email,
          recipient_name: user.full_name,
          title: '📋 New Job Assigned',
          message: `${assignment.job_name || assignment.event_title || 'New Job'}${assignment.date ? ` - ${assignment.date}` : ''}. Tap to see details.`,
          type: 'job_assignment',
          priority: 'high',
          link: '/page/Calendario',
          related_entity_id: assignment.id,
          related_entity_type: 'assignment',
          read: false
        });

        // Send browser notification if supported (mobile-optimized)
        if (Notification.permission === 'granted') {
          new Notification('📋 New Job Assigned', {
            body: `${assignment.job_name || 'New Job'} - ${assignment.date || 'Date TBD'}`,
            icon: '/logo192.png',
            badge: '/badge-icon.png',
            tag: key,
            requireInteraction: true,
            vibrate: [200, 100, 200],
            silent: false,
            renotify: true,
            actions: [
              { action: 'view', title: 'View Details' },
              { action: 'dismiss', title: 'Dismiss' }
            ]
          });
        } else if (Notification.permission !== 'denied') {
          // Request permission if not yet granted
          Notification.requestPermission();
        }

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to create assignment notification:', error);
      }
    });
  }, [assignments, user?.email, user?.full_name, queryClient]);

  // Check for urgent posts (CEO/Admin Broadcasts)
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
          title: `🚨 Company Alert: ${post.title}`,
          message: post.content.substring(0, 150),
          type: 'global_alert',
          priority: 'urgent',
          link: '/page/NewsFeed',
          related_entity_id: post.id,
          related_entity_type: 'post',
          read: false,
          requires_action: true
        });

        // High-priority browser notification
        if (Notification.permission === 'granted') {
          new Notification(`🚨 ${post.title}`, {
            body: post.content.substring(0, 100),
            icon: '/logo192.png',
            badge: '/badge-icon.png',
            tag: key,
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300]
          });
        }

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to create alert notification:', error);
      }
    });
  }, [urgentPosts, user?.email, user?.full_name, queryClient]);

  // Check for schedule changes (assignment updates)
  useEffect(() => {
    if (!assignments.length) return;

    assignments.forEach(async (assignment) => {
      const updateKey = `schedule_update_${assignment.id}_${assignment.updated_date}`;
      if (lastCheckRef.current[updateKey]) return;
      
      const updatedDate = new Date(assignment.updated_date);
      const createdDate = new Date(assignment.created_date);
      const minutesSinceUpdate = (Date.now() - updatedDate.getTime()) / 60000;
      
      // Only notify if updated recently and it's not a new assignment
      if (minutesSinceUpdate > 30 || updatedDate.getTime() === createdDate.getTime()) return;

      lastCheckRef.current[updateKey] = true;

      try {
        await base44.entities.Notification.create({
          recipient_email: user.email,
          recipient_name: user.full_name,
          title: '🔄 Schedule Updated',
          message: `Your schedule for ${assignment.date || 'upcoming date'} has been updated. Check details.`,
          type: 'schedule_change',
          priority: 'high',
          link: '/page/Calendario',
          related_entity_id: assignment.id,
          related_entity_type: 'assignment',
          read: false
        });

        if (Notification.permission === 'granted') {
          new Notification('🔄 Schedule Updated', {
            body: `${assignment.job_name || 'Your job'} - ${assignment.date || 'Date TBD'}`,
            icon: '/logo192.png',
            badge: '/badge-icon.png',
            tag: updateKey,
            vibrate: [200, 100, 200]
          });
        }

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to create schedule change notification:', error);
      }
    });
  }, [assignments, user?.email, user?.full_name, queryClient]);

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

  // Poll for job deadlines approaching (3 days)
  const { data: jobsApproachingDeadline = [] } = useQuery({
    queryKey: ['jobsApproachingDeadline'],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ status: 'active' }, '-updated_date', 50);
      const today = startOfDay(new Date());
      return jobs.filter(job => {
        const endDate = job.end_date_field ? new Date(job.end_date_field) : null;
        if (!endDate) return false;
        const daysUntil = differenceInDays(endDate, today);
        return daysUntil > 0 && daysUntil <= 3;
      });
    },
    enabled: !!user?.email && user?.role === 'admin',
    refetchInterval: 600000, // Check every 10 minutes
    staleTime: 300000,
    initialData: []
  });

  // Check for job deadlines (Admin notification)
  useEffect(() => {
    if (!jobsApproachingDeadline.length || user?.role !== 'admin') return;

    jobsApproachingDeadline.forEach(async (job) => {
      const key = `deadline_${job.id}`;
      if (lastCheckRef.current[key]) return;

      lastCheckRef.current[key] = true;
      const daysUntil = differenceInDays(new Date(job.end_date_field), startOfDay(new Date()));

      try {
        const priority = daysUntil === 0 ? 'urgent' : daysUntil === 1 ? 'high' : 'medium';
        
        await base44.entities.Notification.create({
          recipient_email: user.email,
          recipient_name: user.full_name,
          title: `⏰ Job Deadline: ${job.name}`,
          message: `"${job.name}" expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}. Contract: $${job.contract_amount?.toFixed(2) || 'N/A'}`,
          type: 'deadline_alert',
          priority,
          link: '/page/Trabajos',
          related_entity_id: job.id,
          related_entity_type: 'job',
          read: false
        });

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to create deadline notification:', error);
      }
    });
  }, [jobsApproachingDeadline, user?.email, user?.full_name, user?.role, queryClient]);

  return null;
}