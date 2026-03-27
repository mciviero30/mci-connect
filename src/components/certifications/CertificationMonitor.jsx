import React, { useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';

/**
 * CERTIFICATION MONITOR COMPONENT
 * 
 * Runs proactive monitoring for certifications:
 * 1. Checks for certifications expiring in 30 days → sends email alert
 * 2. Checks for expired certifications → updates status to 'expired'
 * 
 * This component runs silently in the background when mounted in key pages
 * (MyProfile, EmployeeProfile, Dashboard)
 */
export default function CertificationMonitor({ userEmail }) {
  const queryClient = useQueryClient();

  // Fetch certifications for monitoring
  const { data: certifications = [] } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list('-created_date', 300),
    staleTime: 300000, // 5 minutes
    enabled: !!userEmail
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['certificationAlerts'],
    queryFn: () => base44.entities.CertificationAlert.list('-alert_sent_date', 100),
    staleTime: 300000,
    enabled: !!userEmail
  });

  // Mutation to update certification status
  const updateCertificationMutation = useMutation({
    mutationFn: ({ id, status }) => 
      base44.entities.Certification.update(id, { status }),
  });

  // Mutation to create alert
  const createAlertMutation = useMutation({
    mutationFn: (alertData) => base44.entities.CertificationAlert.create(alertData)
  });

  // Mutation to send email
  const sendEmailMutation = useMutation({
    mutationFn: ({ to, subject, body }) => 
      base44.integrations.Core.SendEmail({
        to,
        subject,
        body,
        from_name: 'MCI Connect - Compliance'
      })
  });

  useEffect(() => {
    if (!certifications.length) return;

    const today = new Date();
    const processedThisSession = new Set();

    // PROCESS EACH CERTIFICATION
    certifications.forEach(async (cert) => {
      if (!cert.expiration_date || processedThisSession.has(cert.id)) return;
      
      const expiryDate = new Date(cert.expiration_date);
      const daysUntilExpiry = differenceInDays(expiryDate, today);

      // RULE 1: AUTO-EXPIRE if expiration date has passed
      if (daysUntilExpiry < 0 && cert.status !== 'expired') {
        try {
          await updateCertificationMutation.mutateAsync({ 
            id: cert.id, 
            status: 'expired' 
          });
          
          // Create expiration notice
          await createAlertMutation.mutateAsync({
            certification_id: cert.id,
            employee_email: cert.employee_email,
            employee_name: cert.employee_name,
            certification_name: cert.certification_name,
            expiration_date: cert.expiration_date,
            alert_sent_date: new Date().toISOString(),
            alert_type: 'expiration_notice',
            acknowledged: false
          });

          queryClient.invalidateQueries({ queryKey: ['certifications'] });
          processedThisSession.add(cert.id);
        } catch (error) {
          console.error('Failed to auto-expire certification:', error);
        }
      }

      // RULE 2: SEND 30-DAY WARNING if within 30 days and status is active
      else if (daysUntilExpiry >= 0 && daysUntilExpiry <= 30 && cert.status === 'active') {
        // Check if we already sent a 30-day warning
        const existingWarning = alerts.find(alert => 
          alert.certification_id === cert.id && 
          alert.alert_type === '30_day_warning'
        );

        if (!existingWarning) {
          try {
            // Update status to expiring_soon
            if (cert.status !== 'expiring_soon') {
              await updateCertificationMutation.mutateAsync({ 
                id: cert.id, 
                status: 'expiring_soon' 
              });
            }

            // Send email alert
            const emailBody = `Hello ${cert.employee_name},\n\n` +
              `This is a proactive reminder that your certification is expiring soon:\n\n` +
              `📋 Certification: ${cert.certification_name}\n` +
              `📅 Expiration Date: ${formatDate(cert.expiration_date)}\n` +
              `⏰ Days Remaining: ${daysUntilExpiry}\n\n` +
              `Please renew this certification before it expires to maintain compliance.\n\n` +
              `Thank you,\nMCI Connect - Compliance Team`;

            await sendEmailMutation.mutateAsync({
              to: cert.employee_email,
              subject: `⚠️ Certification Expiring in ${daysUntilExpiry} Days: ${cert.certification_name}`,
              body: emailBody
            });

            // Log the alert
            await createAlertMutation.mutateAsync({
              certification_id: cert.id,
              employee_email: cert.employee_email,
              employee_name: cert.employee_name,
              certification_name: cert.certification_name,
              expiration_date: cert.expiration_date,
              alert_sent_date: new Date().toISOString(),
              alert_type: '30_day_warning',
              acknowledged: false
            });

            queryClient.invalidateQueries({ queryKey: ['certifications'] });
            queryClient.invalidateQueries({ queryKey: ['certificationAlerts'] });
            processedThisSession.add(cert.id);
          } catch (error) {
            console.error('Failed to send 30-day warning:', error);
          }
        }
      }
    });
  }, [certifications, alerts, queryClient]);

  // This component doesn't render anything - it's purely for background monitoring
  return null;
}