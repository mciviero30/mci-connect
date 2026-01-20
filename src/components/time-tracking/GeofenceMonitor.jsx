import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { sendNotification } from '../notifications/PushNotificationService';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { AlertTriangle, MapPinOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateDistance } from '@/components/utils/geolocation';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';

export default function GeofenceMonitor({ activeSession, onAutoClockOut }) {
  const { language } = useLanguage();
  const [outOfRange, setOutOfRange] = useState(false);
  const [distanceFromSite, setDistanceFromSite] = useState(0);
  const alertSentRef = useRef(false);
  const checkIntervalRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: job } = useQuery({
    queryKey: ['job', activeSession?.jobId],
    queryFn: () => base44.entities.Job.filter({ id: activeSession.jobId }).then(jobs => jobs[0]),
    enabled: !!activeSession?.jobId,
  });

  useEffect(() => {
    if (!activeSession || !job || !job.latitude || !job.longitude || !user) {
      return;
    }

    const checkGeofence = async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });

        const distance = calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          job.latitude,
          job.longitude
        );

        setDistanceFromSite(Math.round(distance));
        const maxRadius = job.geofence_radius || 100;

        if (distance > maxRadius) {
          setOutOfRange(true);

          // Send alert only once
          if (!alertSentRef.current) {
            alertSentRef.current = true;

            // Notify employee
            sendNotification({
              userEmail: user.email,
              type: 'geofence_exit',
              title: language === 'es' ? '⚠️ Saliste del Área de Trabajo' : '⚠️ You Left Work Area',
              body: language === 'es'
                ? `Has salido del área permitida (${Math.round(distance)}m). Tu sesión se cerrará automáticamente.`
                : `You've left the allowed area (${Math.round(distance)}m). Your session will auto clock-out.`,
              url: '/TimeTracking',
              priority: 'urgent'
            });

            // Notify admins (parallel)
            const admins = await base44.entities.User.filter({ role: 'admin' });
            await Promise.all(admins.map(admin => sendNotification({
                userEmail: admin.email,
                type: 'security_alert',
                title: language === 'es' ? '🚨 Empleado Salió del Geofence' : '🚨 Employee Left Geofence',
                body: language === 'es'
                  ? `${user.full_name} salió del área de ${job.name} (${Math.round(distance)}m)`
                  : `${user.full_name} left ${job.name} area (${Math.round(distance)}m)`,
                url: '/Horarios',
                priority: 'high'
              })));

            // Auto clock-out after 30 seconds warning
            setTimeout(() => {
              onAutoClockOut();
            }, 30000);
          }
        } else {
          setOutOfRange(false);
          alertSentRef.current = false;
        }
      } catch (error) {
        console.error('Geofence check error:', error);
      }
    };

    // Check every 15 seconds
    checkGeofence();
    checkIntervalRef.current = setInterval(checkGeofence, 15000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [activeSession, job, user, language, onAutoClockOut]);

  if (!activeSession || !outOfRange) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md"
      >
        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-red-400 flex items-center gap-3 animate-pulse">
          <div className="w-12 h-12 bg-red-700 rounded-xl flex items-center justify-center shadow-lg">
            <MapPinOff className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-black text-base">
              {language === 'es' ? '⚠️ FUERA DEL ÁREA' : '⚠️ OUT OF RANGE'}
            </p>
            <p className="text-sm font-semibold">
              {language === 'es' 
                ? `${distanceFromSite}m del proyecto. Auto cierre en 30s`
                : `${distanceFromSite}m from project. Auto clock-out in 30s`}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}