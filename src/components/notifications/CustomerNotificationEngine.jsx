import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';

/**
 * Notificaciones para Clientes (Branches/Customers)
 * Alertas sobre cambios en sus proyectos, estado de trabajos, etc.
 */
export default function CustomerNotificationEngine({ user }) {
  const queryClient = useQueryClient();
  const lastCheckRef = useRef({});

  // Get client's projects via ProjectMember
  const { data: clientProjects = [] } = useQuery({
    queryKey: ['clientProjects', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const memberships = await base44.entities.ProjectMember.filter({
        user_email: user.email,
        role: 'client'
      }, '-updated_date', 20);
      return memberships;
    },
    enabled: !!user?.email,
    refetchInterval: 600000, // 10 minutes
    staleTime: 300000,
    initialData: []
  });

  // Get chat messages for client projects (new comments/updates)
  const { data: recentMessages = [] } = useQuery({
    queryKey: ['clientChatMessages', user?.email, clientProjects.length],
    queryFn: async () => {
      if (!clientProjects.length) return [];
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const messages = await base44.entities.ChatMessage.filter({
        created_date: { $gte: twoHoursAgo }
      }, '-created_date', 30);
      return messages.filter(m => m.sender_email !== user.email);
    },
    enabled: !!user?.email && clientProjects.length > 0,
    refetchInterval: 300000, // 5 minutes
    staleTime: 120000,
    initialData: []
  });

  // Notify on project status updates
  useEffect(() => {
    if (!clientProjects.length) return;

    clientProjects.forEach(async (project) => {
      const key = `project_update_${project.id}`;
      if (lastCheckRef.current[key]) return;

      const updatedDate = new Date(project.updated_date);
      const minutesAgo = (Date.now() - updatedDate.getTime()) / 60000;

      // Only notify if updated in last 30 minutes
      if (minutesAgo > 30) return;

      lastCheckRef.current[key] = true;

      try {
        await base44.entities.Notification.create({
          recipient_email: user.email,
          recipient_name: user.full_name,
          title: `📋 Project Update: ${project.project_name || 'Your Project'}`,
          message: `There's a new update on your project. Check the details and latest comments.`,
          type: 'client_project_update',
          priority: 'medium',
          link: `/page/ClientPortal?project=${project.project_id}`,
          related_entity_id: project.project_id,
          related_entity_type: 'project',
          read: false
        });

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to create client project notification:', error);
      }
    });
  }, [clientProjects, user?.email, user?.full_name, queryClient]);

  // Notify on new messages/comments from team
  useEffect(() => {
    if (!recentMessages.length || !clientProjects.length) return;

    recentMessages.forEach(async (message) => {
      const key = `message_${message.id}`;
      if (lastCheckRef.current[key]) return;

      lastCheckRef.current[key] = true;

      try {
        await base44.entities.Notification.create({
          recipient_email: user.email,
          recipient_name: user.full_name,
          title: `💬 New Message from ${message.sender_name || 'Team'}`,
          message: message.content?.substring(0, 100) || 'New comment on your project',
          type: 'client_message',
          priority: 'medium',
          link: `/page/ClientPortal?tab=chat`,
          related_entity_id: message.id,
          related_entity_type: 'chat_message',
          read: false
        });

        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (error) {
        console.error('Failed to create client message notification:', error);
      }
    });
  }, [recentMessages, clientProjects, user?.email, user?.full_name, queryClient]);

  return null;
}