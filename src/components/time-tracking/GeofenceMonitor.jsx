import { useEffect, useRef, useState } from 'react';
import { calculateDistance } from '@/components/utils/geolocation';
import { MapPinOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function GeofenceMonitor({ activeSession, job, onGeofenceExit, onGeofenceReturn }) {
  const { language } = useLanguage();
  const [outOfRange, setOutOfRange] = useState(false);
  const [distanceFromSite, setDistanceFromSite] = useState(0);
  const watchIdRef = useRef(null);
  const exitFiredRef = useRef(false);
  const lastCheckRef = useRef(0);
  const isOutRef = useRef(false);

  useEffect(() => {
    if (!activeSession || !job?.latitude || !job?.longitude) return;
    if (activeSession.workType === 'driving') return;
    if (!navigator.geolocation) return;

    const handlePosition = (position) => {
      const now = Date.now();
      // Adaptive throttle: 30s when in-range, 10s when out-of-range
      const throttle = isOutRef.current ? 10000 : 30000;
      if (now - lastCheckRef.current < throttle) return;
      lastCheckRef.current = now;

      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        job.latitude,
        job.longitude
      );

      const roundedDist = Math.round(distance);
      setDistanceFromSite(roundedDist);
      const maxRadius = job.geofence_radius || 100;

      if (distance > maxRadius) {
        isOutRef.current = true;
        setOutOfRange(true);
        if (!exitFiredRef.current) {
          exitFiredRef.current = true;
          onGeofenceExit?.({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            distance: roundedDist,
          });
        }
      } else {
        isOutRef.current = false;
        if (exitFiredRef.current) {
          exitFiredRef.current = false;
          setOutOfRange(false);
          onGeofenceReturn?.({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        } else {
          setOutOfRange(false);
        }
      }
    };

    const handleError = (err) => {
      console.warn('[GeofenceMonitor] GPS error:', err.message);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeSession?.jobId, job?.id, job?.latitude, job?.longitude, activeSession?.workType]);

  if (!activeSession || !outOfRange || activeSession.workType === 'driving') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 z-[10001] w-[90%] max-w-md"
      >
        <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-red-400 flex items-center gap-3">
          <div className="w-12 h-12 bg-red-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 animate-bounce">
            <MapPinOff className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-black text-base">
              {language === 'es' ? '⚠️ TIEMPO PAUSADO' : '⚠️ TIME PAUSED'}
            </p>
            <p className="text-sm font-semibold">
              {language === 'es'
                ? `Estás a ${distanceFromSite}m del proyecto.`
                : `You are ${distanceFromSite}m from the project.`}
            </p>
            <p className="text-xs mt-1 opacity-90 font-bold">
              {language === 'es'
                ? '↩ Regresa al sitio para reanudar'
                : '↩ Return to site to resume'}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}