import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';

// Component to create notifications when tasks are updated or comments are added
export function useTaskActivityNotifier() {
  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData) => {
      return base44.entities.Notification.create(notificationData);
    }
  });

  // Notify admin when task status changes to completed
  const notifyTaskCompleted = async (task, completedBy) => {
    try {
      const user = await base44.auth.me();
      const job = task.job_id ? await base44.entities.Job.filter({ id: task.job_id }).then(j => j[0]) : null;
      
      // Get all admins and project members
      const admins = await base44.entities.User.filter({ role: 'admin' });
      const projectMembers = job ? await base44.entities.ProjectMember.filter({ 
        project_id: task.job_id,
        role: { $in: ['admin', 'manager'] }
      }) : [];
      
      const recipientEmails = [
        ...admins.map(a => a.email),
        ...projectMembers.map(m => m.user_email)
      ].filter((email, index, self) => 
        email !== user.email && self.indexOf(email) === index
      );

      // Create notifications for each recipient
      for (const email of recipientEmails) {
        await createNotificationMutation.mutateAsync({
          type: 'task_completed',
          recipient_email: email,
          title: '✅ Task Completed',
          message: `${completedBy.full_name || completedBy.email} completed task: ${task.title}`,
          priority: 'normal',
          link: `/field-project/${task.job_id}?tab=tasks`,
          metadata: {
            task_id: task.id,
            job_id: task.job_id,
            completed_by: completedBy.email
          }
        });
      }
    } catch (error) {
      console.error('Error notifying task completion:', error);
    }
  };

  // Notify admin when comment is added to a task
  const notifyTaskComment = async (task, comment, commentAuthor) => {
    try {
      const user = await base44.auth.me();
      const job = task.job_id ? await base44.entities.Job.filter({ id: task.job_id }).then(j => j[0]) : null;
      
      // Get all admins and project members
      const admins = await base44.entities.User.filter({ role: 'admin' });
      const projectMembers = job ? await base44.entities.ProjectMember.filter({ 
        project_id: task.job_id,
        role: { $in: ['admin', 'manager', 'client'] }
      }) : [];
      
      const recipientEmails = [
        ...admins.map(a => a.email),
        ...projectMembers.map(m => m.user_email)
      ].filter((email, index, self) => 
        email !== user.email && self.indexOf(email) === index
      );

      // Create notifications for each recipient
      for (const email of recipientEmails) {
        await createNotificationMutation.mutateAsync({
          type: 'task_comment',
          recipient_email: email,
          title: '💬 New Comment',
          message: `${commentAuthor.full_name || commentAuthor.email} commented on: ${task.title}`,
          priority: 'normal',
          link: `/field-project/${task.job_id}?tab=tasks`,
          metadata: {
            task_id: task.id,
            job_id: task.job_id,
            comment_id: comment.id,
            author: commentAuthor.email
          }
        });
      }
    } catch (error) {
      console.error('Error notifying task comment:', error);
    }
  };

  // Notify admin when plan/blueprint annotation is added
  const notifyPlanAnnotation = async (plan, annotation, annotationAuthor) => {
    try {
      const user = await base44.auth.me();
      
      // Get all admins and project members
      const admins = await base44.entities.User.filter({ role: 'admin' });
      const projectMembers = plan.job_id ? await base44.entities.ProjectMember.filter({ 
        project_id: plan.job_id,
        role: { $in: ['admin', 'manager'] }
      }) : [];
      
      const recipientEmails = [
        ...admins.map(a => a.email),
        ...projectMembers.map(m => m.user_email)
      ].filter((email, index, self) => 
        email !== user.email && self.indexOf(email) === index
      );

      // Create notifications for each recipient
      for (const email of recipientEmails) {
        await createNotificationMutation.mutateAsync({
          type: 'plan_annotation',
          recipient_email: email,
          title: '📍 Plan Annotation Added',
          message: `${annotationAuthor.full_name || annotationAuthor.email} added a note to: ${plan.name}`,
          priority: 'normal',
          link: `/field-project/${plan.job_id}?tab=plans`,
          metadata: {
            plan_id: plan.id,
            job_id: plan.job_id,
            annotation_id: annotation.id,
            author: annotationAuthor.email
          }
        });
      }
    } catch (error) {
      console.error('Error notifying plan annotation:', error);
    }
  };

  return {
    notifyTaskCompleted,
    notifyTaskComment,
    notifyPlanAnnotation
  };
}

// Hook to monitor task activities and send notifications
export default function TaskActivityNotifier({ jobId }) {
  const { notifyTaskCompleted, notifyTaskComment, notifyPlanAnnotation } = useTaskActivityNotifier();

  // This component is passive - notifications are triggered by mutations
  // in the actual task update/comment components
  
  return null;
}