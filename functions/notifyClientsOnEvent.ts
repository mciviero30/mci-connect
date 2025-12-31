import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    const { job_id, event_type, additional_data } = await req.json();

    if (!job_id || !event_type) {
      return Response.json({ error: 'Missing job_id or event_type' }, { status: 400 });
    }

    // Get active rules for this event
    const rules = await base44.asServiceRole.entities.ClientNotificationRule.filter({
      trigger_event: event_type,
      active: true
    });

    if (rules.length === 0) {
      return Response.json({ message: 'No active rules for this event', notified: 0 });
    }

    // Get job details
    const jobs = await base44.asServiceRole.entities.Job.list();
    const job = jobs.find(j => j.id === job_id);

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get client members
    const members = await base44.asServiceRole.entities.ProjectMember.filter({
      project_id: job_id,
      role: 'client'
    });

    let notifiedCount = 0;

    for (const rule of rules) {
      // Check if rule applies to this project
      if (!rule.apply_to_all_projects && 
          rule.specific_projects && 
          !rule.specific_projects.includes(job_id)) {
        continue;
      }

      for (const member of members) {
        try {
          // Replace template variables
          const subject = rule.email_subject
            ?.replace('{project_name}', job.name)
            ?.replace('{event_type}', event_type);
          
          const body = rule.email_body
            ?.replace('{project_name}', job.name)
            ?.replace('{event_type}', event_type)
            ?.replace('{additional_info}', additional_data?.message || '');

          const portalMessage = rule.portal_message
            ?.replace('{project_name}', job.name)
            ?.replace('{event_type}', event_type);

          // Send email
          if ((rule.notification_type === 'email' || rule.notification_type === 'both') && subject && body) {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: member.user_email,
              subject: subject,
              body: body
            });
          }

          // Create portal notification
          if ((rule.notification_type === 'portal' || rule.notification_type === 'both') && portalMessage) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: member.user_email,
              title: subject || 'Actualización del Proyecto',
              message: portalMessage,
              type: 'info',
              link: `/ClientPortal?project=${job_id}`,
              read: false
            });
          }

          notifiedCount++;
        } catch (error) {
          if (import.meta.env?.DEV) {
            console.error(`Error notifying ${member.user_email}:`, error);
          }
        }
      }
    }

    return Response.json({ 
      success: true, 
      notified: notifiedCount,
      clients: members.length 
    });

  } catch (error) {
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('Error in notifyClientsOnEvent:', error);
    }
    return safeJsonError('Notification failed', 500, error.message);
  }
});