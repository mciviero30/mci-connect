import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function ClientNotificationEngine() {
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['client-notification-rules'],
    queryFn: () => base44.entities.ClientNotificationRule.filter({ active: true }),
    refetchInterval: 60000, // Check every minute
  });

  // Monitor photo uploads
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query?.queryKey?.[0] === 'client-photos' && event.type === 'updated') {
        const photoRule = rules.find(r => r.trigger_event === 'photo_uploaded');
        if (photoRule) {
          handlePhotoUploadTrigger(event.query.queryKey[1], photoRule);
        }
      }
    });

    return unsubscribe;
  }, [rules, queryClient]);

  const handlePhotoUploadTrigger = async (jobId, rule) => {
    try {
      // Get client members for this project
      const members = await base44.entities.ProjectMember.filter({ 
        project_id: jobId,
        role: 'client'
      });

      const job = await base44.entities.Job.list().then(jobs => jobs.find(j => j.id === jobId));

      for (const member of members) {
        if (rule.notification_type === 'email' || rule.notification_type === 'both') {
          await base44.integrations.Core.SendEmail({
            to: member.user_email,
            subject: rule.email_subject.replace('{project_name}', job?.name || 'Su Proyecto'),
            body: rule.email_body.replace('{project_name}', job?.name || 'Su Proyecto')
          });
        }

        if (rule.notification_type === 'portal' || rule.notification_type === 'both') {
          await base44.entities.Notification.create({
            user_email: member.user_email,
            title: 'Nueva Foto Subida',
            message: rule.portal_message.replace('{project_name}', job?.name || 'Su Proyecto'),
            type: 'info',
            link: `/ClientPortal?project=${jobId}`,
            read: false
          });
        }
      }
    } catch (error) {
      console.error('Error sending client notification:', error);
    }
  };

  return null; // This component doesn't render anything
}