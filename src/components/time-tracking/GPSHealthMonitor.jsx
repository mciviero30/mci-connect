import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Wifi, WifiOff, Zap, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getCurrentLocation, calculateDistance } from '@/components/utils/geolocation';

/**
 * Real-time GPS Health Monitor
 * Shows current location, accuracy, and distance to nearest job
 */
export default function GPSHealthMonitor({ nearestJob, language = 'en' }) {
  const [gpsStatus, setGpsStatus] = useState('checking'); // checking, ready, weak, unavailable
  const [location, setLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [distance, setDistance] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    let watchId;
    let mounted = true;

    const startWatching = async () => {
      if (!navigator.geolocation) {
        setGpsStatus('unavailable');
        return;
      }

      // Watch position for real-time updates
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!mounted) return;

          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          const newAccuracy = position.coords.accuracy;

          setLocation(newLocation);
          setAccuracy(newAccuracy);
          setLastUpdate(new Date());

          // Determine GPS quality
          if (newAccuracy <= 20) {
            setGpsStatus('excellent');
          } else if (newAccuracy <= 50) {
            setGpsStatus('good');
          } else if (newAccuracy <= 100) {
            setGpsStatus('fair');
          } else {
            setGpsStatus('weak');
          }

          // Calculate distance to nearest job if available
          if (nearestJob?.latitude && nearestJob?.longitude) {
            const dist = calculateDistance(
              newLocation.lat,
              newLocation.lng,
              nearestJob.latitude,
              nearestJob.longitude
            );
            setDistance(dist);
          }
        },
        (error) => {
          if (!mounted) return;
          console.error('GPS watch error:', error);
          setGpsStatus('unavailable');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000
        }
      );
    };

    startWatching();

    return () => {
      mounted = false;
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [nearestJob]);

  const getStatusConfig = () => {
    switch (gpsStatus) {
      case 'excellent':
        return {
          icon: Zap,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: language === 'es' ? 'GPS Excelente' : 'GPS Excellent',
          badgeClass: 'bg-green-500'
        };
      case 'good':
        return {
          icon: Wifi,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          label: language === 'es' ? 'GPS Bueno' : 'GPS Good',
          badgeClass: 'bg-blue-500'
        };
      case 'fair':
        return {
          icon: Wifi,
          color: 'text-amber-600',
          bgColor: 'bg-amber-100',
          label: language === 'es' ? 'GPS Aceptable' : 'GPS Fair',
          badgeClass: 'bg-amber-500'
        };
      case 'weak':
        return {
          icon: AlertTriangle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          label: language === 'es' ? 'GPS Débil' : 'GPS Weak',
          badgeClass: 'bg-orange-500'
        };
      case 'unavailable':
        return {
          icon: WifiOff,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: language === 'es' ? 'GPS No Disponible' : 'GPS Unavailable',
          badgeClass: 'bg-red-500'
        };
      default:
        return {
          icon: MapPin,
          color: 'text-slate-600',
          bgColor: 'bg-slate-100',
          label: language === 'es' ? 'Verificando GPS...' : 'Checking GPS...',
          badgeClass: 'bg-slate-500'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  // Determine if user can clock in based on distance
  const canClockIn = distance !== null && nearestJob && distance <= (nearestJob.geofence_radius || 100);
  const isWithinRange = distance !== null && nearestJob;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-slate-200 dark:border-slate-700 shadow-lg mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* GPS Status Icon */}
            <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${config.color} ${gpsStatus === 'checking' ? 'animate-pulse' : ''}`} />
            </div>

            {/* Status Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {config.label}
                </h4>
                {accuracy && (
                  <Badge variant="outline" className="text-xs">
                    ±{Math.round(accuracy)}m
                  </Badge>
                )}
              </div>

              {/* Distance to Job */}
              {isWithinRange && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span className={`text-xs font-semibold ${
                    canClockIn ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {Math.round(distance)}m {language === 'es' ? 'de' : 'from'} {nearestJob.name}
                  </span>
                  {canClockIn && (
                    <Badge className="bg-green-500 text-white text-xs ml-auto">
                      ✓ {language === 'es' ? 'EN RANGO' : 'IN RANGE'}
                    </Badge>
                  )}
                </div>
              )}

              {/* Last Update */}
              {lastUpdate && (
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'es' ? 'Actualizado' : 'Updated'}: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Visual Signal Strength */}
            <div className="flex gap-1 items-end">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`w-1.5 rounded-full transition-all ${
                    gpsStatus === 'excellent' && bar <= 4 ? 'bg-green-500 h-6' :
                    gpsStatus === 'good' && bar <= 3 ? 'bg-blue-500 h-5' :
                    gpsStatus === 'fair' && bar <= 2 ? 'bg-amber-500 h-4' :
                    gpsStatus === 'weak' && bar <= 1 ? 'bg-orange-500 h-3' :
                    'bg-slate-300 h-2'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Warning Messages */}
          {gpsStatus === 'weak' && (
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                {language === 'es' 
                  ? '⚠️ Señal GPS débil. Muévete al aire libre para mejor precisión.'
                  : '⚠️ Weak GPS signal. Move outdoors for better accuracy.'}
              </p>
            </div>
          )}

          {gpsStatus === 'unavailable' && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-800 dark:text-red-200">
                {language === 'es' 
                  ? '❌ GPS no disponible. Verifica permisos y configuración.'
                  : '❌ GPS unavailable. Check permissions and settings.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}