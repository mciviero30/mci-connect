import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { calculateDistance } from '@/components/utils/geolocation';

/**
 * Live Distance Indicator
 * Shows real-time distance from current location to job site
 * Used during clock in/out to provide visual feedback
 */
export default function LiveDistanceIndicator({ 
  targetJob, 
  currentLocation, 
  threshold = 100,
  language = 'en',
  size = 'default' // 'small' | 'default' | 'large'
}) {
  const [distance, setDistance] = useState(null);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    if (!targetJob?.latitude || !targetJob?.longitude || !currentLocation) {
      setDistance(null);
      setIsCalculating(true);
      return;
    }

    const dist = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      targetJob.latitude,
      targetJob.longitude
    );

    setDistance(Math.round(dist));
    setIsCalculating(false);
  }, [currentLocation, targetJob]);

  if (isCalculating || distance === null) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">
          {language === 'es' ? 'Calculando distancia...' : 'Calculating distance...'}
        </span>
      </div>
    );
  }

  const withinRange = distance <= threshold;
  const percentage = Math.min(100, (distance / threshold) * 100);

  const sizeClasses = {
    small: 'text-xs',
    default: 'text-sm',
    large: 'text-base'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3"
    >
      {/* Distance Circle Indicator */}
      <div className="relative w-16 h-16">
        <svg className="transform -rotate-90 w-16 h-16">
          {/* Background circle */}
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            className="text-slate-200 dark:text-slate-700"
          />
          {/* Progress circle */}
          <motion.circle
            cx="32"
            cy="32"
            r="28"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 28}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
            animate={{ 
              strokeDashoffset: 2 * Math.PI * 28 * (1 - percentage / 100)
            }}
            transition={{ duration: 0.5 }}
            className={withinRange ? 'text-green-500' : 'text-red-500'}
          />
        </svg>
        
        {/* Center Icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {withinRange ? (
            <CheckCircle className="w-6 h-6 text-green-600" />
          ) : (
            <XCircle className="w-6 h-6 text-red-600" />
          )}
        </div>
      </div>

      {/* Distance Info */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Navigation className={`w-4 h-4 ${withinRange ? 'text-green-600' : 'text-red-600'}`} />
          <span className={`font-bold ${sizeClasses[size]} ${
            withinRange ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
          }`}>
            {distance}m
          </span>
        </div>
        
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {language === 'es' ? 'Límite' : 'Limit'}: {threshold}m
        </p>

        <Badge 
          className={`mt-1 text-xs ${
            withinRange 
              ? 'bg-green-100 text-green-700 border-green-300' 
              : 'bg-red-100 text-red-700 border-red-300'
          }`}
        >
          {withinRange 
            ? (language === 'es' ? '✓ En Rango' : '✓ In Range')
            : (language === 'es' ? '✗ Fuera de Rango' : '✗ Out of Range')
          }
        </Badge>
      </div>
    </motion.div>
  );
}