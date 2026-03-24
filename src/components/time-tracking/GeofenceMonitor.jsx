import { useEffect, useRef, useState } from 'react';
import { calculateDistance } from '@/components/utils/geolocation';
import { MapPinOff, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';

const CHECK_INTERVAL_MS = 15000; // Check every 15 seconds

export default function GeofenceMonitor({ activeSession, job, onGeofenceExit, onGeofenceReturn }) {
  const { language } = useLanguage();
  const [outOfRange, setOutOfRange] = useState(false);
  const [distanceFromSite, setDistanceFromSite] = useState(0);
  const checkIntervalRef = useRef(null);
  const exitFiredRef = useRef(false); // Prevent multiple exit callbacks per exit event

  useEffect(() => {
    // Don't monitor driving sessions or sessions without job GPS
    if (!activeSession || !job?.latitude || !job?.longitude) return;
    if (activeSession.workType === 'driving') return;
    // Don't monitor if already geofence-paused (avoid double-triggering)
    
    const checkGeofence = async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 10000
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
          // Fire exit callback only once per exit event
          if (!exitFiredRef.current) {
            exitFiredRef.current = true;
            onGeofenceExit?.({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              distance: Math.round(distance)
            });
          }
        } else {
          // Employee is back in range
          if (exitFiredRef.current) {
            // Was out of range, now returned
            exitFiredRef.current = false;
            setOutOfRange(false);
            onGeofenceReturn?.({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          } else {
            setOutOfRange(false);
          }
        }
      } catch (error) {
        // GPS unavailable — don't trigger pause, just log
        console.warn('[GeofenceMonitor] GPS check failed:', error.message);
      }
    };

    checkGeofence();
    checkIntervalRef.current = setInterval(checkGeofence, CHECK_INTERVAL_MS);

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
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