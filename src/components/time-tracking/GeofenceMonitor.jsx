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

const GRACE_PERIOD_MS = 15 * 60 * 1000; // 15 minutes
const MAX_DAILY_ADMIN_ALERTS = 4;

// Track how many times we've alerted admin today for this employee+job
function getAdminAlertCount(userId, jobId) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `geofence_alerts_${userId}_${jobId}_${today}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function incrementAdminAlertCount(userId, jobId) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `geofence_alerts_${userId}_${jobId}_${today}`;
  const newCount = getAdminAlertCount(userId, jobId) + 1;
  localStorage.setItem(key, String(newCount));
  return newCount;
}

export default function GeofenceMonitor({ activeSession, onAutoClockOut }) {
  const { language } = useLanguage();
  const [outOfRange, setOutOfRange] = useState(false);
  const [distanceFromSite, setDistanceFromSite] = useState(0);
  const [countdown, setCountdown] = useState(null); // seconds remaining
  const alertSentRef = useRef(false);
  const checkIntervalRef = useRef(null);
  const autoClockOutTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

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

          // Start grace period timer only once per exit event
          if (!alertSentRef.current) {
            alertSentRef.current = true;

            // Notify employee
            sendNotification({
              userEmail: user.email,
              type: 'geofence_exit',
              title: language === 'es' ? '⚠️ Saliste del Área de Trabajo' : '⚠️ You Left Work Area',
              body: language === 'es'
                ? `Has salido del área permitida (${Math.round(distance)}m). Tienes 15 minutos para regresar o se cerrará tu sesión.`
                : `You've left the allowed area (${Math.round(distance)}m). You have 15 minutes to return or your session will auto clock-out.`,
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
                  ? `${user.full_name} salió del área de ${job.name} (${Math.round(distance)}m). Auto clock-out en 15 min si no regresa.`
                  : `${user.full_name} left ${job.name} area (${Math.round(distance)}m). Auto clock-out in 15 min if not returning.`,
                url: '/Horarios',
                priority: 'high'
              })));

            // Start countdown display
            setCountdown(GRACE_PERIOD_MS / 1000);
            countdownIntervalRef.current = setInterval(() => {
              setCountdown(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);

            // Auto clock-out after 15 minutes grace period
            autoClockOutTimerRef.current = setTimeout(() => {
              onAutoClockOut();
            }, GRACE_PERIOD_MS);
          }
        } else {
          // Employee returned to geofence — cancel auto clock-out
          if (autoClockOutTimerRef.current) {
            clearTimeout(autoClockOutTimerRef.current);
            autoClockOutTimerRef.current = null;
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          setOutOfRange(false);
          setCountdown(null);
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
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (autoClockOutTimerRef.current) clearTimeout(autoClockOutTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
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
                ? `${distanceFromSite}m del proyecto.`
                : `${distanceFromSite}m from project.`}
            </p>
            {countdown !== null && (
              <p className="text-xs font-bold mt-1 opacity-90">
                {language === 'es'
                  ? `Auto cierre en ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')} — ¡Regresa al sitio!`
                  : `Auto clock-out in ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')} — Return to site!`}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}