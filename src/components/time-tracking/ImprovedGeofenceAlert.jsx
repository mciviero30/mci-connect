import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Enhanced Geofence Alert
 * Provides clear, actionable guidance when geofence validation fails
 */
export default function ImprovedGeofenceAlert({ 
  distance, 
  threshold, 
  jobName, 
  jobAddress,
  jobLat,
  jobLng,
  accuracy,
  onRetry,
  language = 'en' 
}) {
  const excessDistance = Math.round(distance - threshold);

  // Generate Google Maps link
  const mapsUrl = jobLat && jobLng 
    ? `https://www.google.com/maps/dir/?api=1&destination=${jobLat},${jobLng}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Alert className="border-2 border-red-300 bg-red-50 dark:bg-red-900/20 shadow-lg">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-900 dark:text-red-300 font-bold text-lg">
          {language === 'es' ? '❌ Fuera del Área de Trabajo' : '❌ Outside Work Area'}
        </AlertTitle>
        <AlertDescription className="mt-3 space-y-4">
          {/* Distance Info */}
          <div className="flex items-center gap-4 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Navigation className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900 dark:text-red-300">
                {language === 'es' ? 'Distancia actual:' : 'Current distance:'} {Math.round(distance)}m
              </p>
              <p className="text-xs text-red-700 dark:text-red-400">
                {language === 'es' 
                  ? `Debes estar ${excessDistance}m más cerca` 
                  : `Must be ${excessDistance}m closer`}
              </p>
              <div className="mt-2 w-full bg-red-200 dark:bg-red-900/50 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (distance / (threshold * 2)) * 100)}%` }}
                  className="h-full bg-red-600"
                />
              </div>
            </div>
            <Badge variant="outline" className="border-red-300 text-red-700 dark:text-red-400">
              ±{Math.round(accuracy)}m
            </Badge>
          </div>

          {/* Job Location */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                {jobName}
              </span>
            </div>
            {jobAddress && (
              <p className="text-xs text-blue-800 dark:text-blue-400 ml-6">
                {jobAddress}
              </p>
            )}
          </div>

          {/* Action Steps */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {language === 'es' ? '📍 Qué hacer:' : '📍 What to do:'}
            </p>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 ml-4 list-disc">
              <li>
                {language === 'es' 
                  ? `Acércate al menos ${threshold}m del proyecto` 
                  : `Move within ${threshold}m of the project`}
              </li>
              <li>
                {language === 'es' 
                  ? 'Asegúrate de estar al aire libre para mejor GPS' 
                  : 'Make sure you are outdoors for better GPS'}
              </li>
              <li>
                {language === 'es' 
                  ? 'Espera 10-15 segundos para que el GPS mejore' 
                  : 'Wait 10-15 seconds for GPS to improve'}
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Abrir Mapa' : 'Open Map'}
                </Button>
              </a>
            )}
            <Button 
              onClick={onRetry}
              variant="default"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Reintentar' : 'Retry'}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}