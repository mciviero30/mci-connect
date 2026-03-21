import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Square, Coffee, MapPin, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

export default function CleanTimeTrackerUI({
  activeSession,
  elapsed,
  onBreakToggle,
  onClockOut,
  onBack,
  language = 'en'
}) {
  const mapRef = useRef(null);
  
  if (!activeSession) return null;

  const sessionHours = elapsed / 3600;
  const maxHours = activeSession.workType === 'driving' ? 16 : 10;
  const exceedsMaxHours = sessionHours >= maxHours;

  // Map marker setup
  const mapCenter = activeSession.location 
    ? [activeSession.location.lat, activeSession.location.lng]
    : [40, -95];

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-slate-900">
      {/* Map Background */}
      <div className="absolute inset-0 opacity-60">
        <MapContainer 
          center={mapCenter} 
          zoom={15} 
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          {activeSession.location && (
            <Marker position={[activeSession.location.lat, activeSession.location.lng]}>
              <Popup>{activeSession.jobName}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Top Bar */}
      <div className="relative z-10 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-md px-4 py-2 flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            {language === 'es' ? 'Control de Tiempo' : 'Time Tracking'}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Main Content - Centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-32">
        {/* Job Info Pill */}
        <div className="mb-8 px-4 py-2 bg-white/95 dark:bg-slate-800/95 rounded-full shadow-xl backdrop-blur-sm flex items-center gap-3 border border-slate-200 dark:border-slate-700">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            {activeSession.jobName}
          </span>
          <Badge variant="secondary" className="text-xs">
            {Math.round(activeSession.distanceMeters)}m
          </Badge>
        </div>

        {/* Time Display - Large & Clean */}
        <div className="text-center mb-8">
          <div className={`text-7xl md:text-8xl font-black font-mono tracking-tighter mb-2 ${
            exceedsMaxHours 
              ? 'text-red-500 animate-pulse' 
              : 'text-white drop-shadow-lg'
          }`}>
            {formatTime(elapsed)}
          </div>
          
          {exceedsMaxHours && (
            <div className="px-4 py-2 bg-red-600/95 rounded-full text-white font-bold text-sm shadow-lg">
              {language === 'es' 
                ? `¡LÍMITE DE ${maxHours}H ALCANZADO!` 
                : `${maxHours}H LIMIT REACHED!`}
            </div>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex gap-3 mb-12">
          {activeSession.onBreak && (
            <Badge className="bg-amber-600 text-white px-4 py-2 text-sm font-bold shadow-lg">
              <Coffee className="w-3 h-3 mr-1" />
              {language === 'es' ? 'EN PAUSA' : 'ON BREAK'}
            </Badge>
          )}
          
          {activeSession.workType !== 'normal' && (
            <Badge className="bg-blue-600 text-white px-4 py-2 text-sm font-bold shadow-lg">
              {activeSession.workType === 'driving' 
                ? (language === 'es' ? 'Manejo' : 'Driving')
                : (language === 'es' ? 'Preparación' : 'Setup')}
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom Action Bar - Sticky */}
      <div className="relative z-10 bg-gradient-to-t from-slate-900/98 to-slate-900/90 backdrop-blur-lg px-4 py-6 border-t border-slate-700/50">
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            onClick={onBreakToggle}
            variant="secondary"
            className="flex-1 h-16 rounded-2xl font-bold text-base shadow-lg hover:scale-105 transition-transform bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Coffee className="w-5 h-5 mr-2" />
            {activeSession.onBreak 
              ? (language === 'es' ? 'Reanudar' : 'Resume')
              : (language === 'es' ? 'Pausa' : 'Break')
            }
          </Button>
          
          <Button
            onClick={onClockOut}
            className="flex-1 h-16 rounded-2xl font-bold text-base shadow-lg hover:scale-105 transition-transform bg-red-600 hover:bg-red-700 text-white"
          >
            <Square className="w-5 h-5 mr-2" />
            {language === 'es' ? 'Salida' : 'Clock Out'}
          </Button>
        </div>
        
        {exceedsMaxHours && (
          <p className="mt-4 text-center text-xs text-red-300 font-semibold">
            {language === 'es' 
              ? `⚠️ Límite de ${maxHours}h alcanzado. Al cerrar, horas serán revisadas.` 
              : `⚠️ ${maxHours}h limit reached. Hours will be flagged for review.`}
          </p>
        )}
      </div>
    </div>
  );
}