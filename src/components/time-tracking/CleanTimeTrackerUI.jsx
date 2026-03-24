import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Square, Coffee, ArrowLeft, MapPinOff } from 'lucide-react';
import ReturnFromBreakModal from './ReturnFromBreakModal';

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
  onSwitchJob,
  language = 'en',
  geofencePaused = false
}) {
  const [breakElapsed, setBreakElapsed] = React.useState(0);
  const [showReturnModal, setShowReturnModal] = React.useState(false);

  // Count up break timer when on break
  React.useEffect(() => {
    if (!activeSession?.onBreak || !activeSession?.breakStartTime) {
      setBreakElapsed(0);
      return;
    }
    const update = () => setBreakElapsed(Math.floor((Date.now() - activeSession.breakStartTime) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.onBreak, activeSession?.breakStartTime]);

  if (!activeSession) return null;

  const sessionHours = elapsed / 3600;
  const maxHours = activeSession.workType === 'driving' ? 16 : 10;
  const exceedsMaxHours = sessionHours >= maxHours;

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-[#F1F5F9] via-[#E8F1FA] to-[#F0F6FD] dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {showReturnModal && (
        <ReturnFromBreakModal
          jobName={activeSession.jobName}
          language={language}
          onReturn={() => { setShowReturnModal(false); onBreakToggle(); }}
          onSwitchJob={() => { setShowReturnModal(false); onBreakToggle(); if (onSwitchJob) onSwitchJob(); }}
          onEndShift={() => { setShowReturnModal(false); onClockOut(); }}
        />
      )}
      {/* Top Bar - Hidden */}

        {/* Time Display */}
        <div className="text-center">
          <div className={`text-8xl font-black font-mono tracking-tighter mb-4 ${
            geofencePaused
              ? 'text-red-400 opacity-60'
              : exceedsMaxHours
              ? 'text-red-600 dark:text-red-400 animate-pulse'
              : 'text-slate-900 dark:text-white drop-shadow-lg'
          }`}>
            {formatTime(elapsed)}
          </div>

          {exceedsMaxHours && !geofencePaused && (
            <Badge className="bg-red-600 text-white px-4 py-2 text-base font-bold">
              {language === 'es'
                ? `¡LÍMITE DE ${maxHours}H ALCANZADO!`
                : `${maxHours}H LIMIT REACHED!`}
            </Badge>
          )}
        </div>

        {/* Geofence Paused Banner */}
        {geofencePaused && (
          <div className="w-full bg-red-600/90 border-2 border-red-400 rounded-2xl p-4 text-center">
            <MapPinOff className="w-8 h-8 text-white mx-auto mb-2 animate-bounce" />
            <p className="text-white font-black text-base">
              {language === 'es' ? '⏸ TIEMPO PAUSADO' : '⏸ TIME PAUSED'}
            </p>
            <p className="text-white/90 text-sm font-semibold">
              {language === 'es'
                ? 'Saliste del área de trabajo'
                : 'You left the work area'}
            </p>
            <p className="text-white/80 text-xs mt-1 font-bold">
              {language === 'es'
                ? '↩ Regresa al sitio para reanudar automáticamente'
                : '↩ Return to site to resume automatically'}
            </p>
          </div>
        )}

        {/* Status Badges */}
        <div className="flex gap-2">
          {activeSession.onBreak && !geofencePaused && (
            <Badge className="bg-amber-600 text-white px-3 py-1 font-bold">
              <Coffee className="w-3 h-3 mr-1" />
              {language === 'es' ? 'EN PAUSA' : 'ON BREAK'}
            </Badge>
          )}
          {geofencePaused && (
            <Badge className="bg-red-600 text-white px-3 py-1 font-bold">
              <MapPinOff className="w-3 h-3 mr-1" />
              {language === 'es' ? 'FUERA DEL ÁREA' : 'OUT OF AREA'}
            </Badge>
          )}

          {activeSession.workType !== 'normal' && (
            <Badge className="bg-blue-500 text-white px-3 py-1 font-bold">
              {activeSession.workType === 'driving'
                ? (language === 'es' ? 'Manejo' : 'Driving')
                : (language === 'es' ? 'Setup' : 'Setup')}
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="px-6 pt-4 pb-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex gap-3">
          <Button
            onClick={() => {
              if (activeSession.onBreak && !geofencePaused) {
                // Show return modal instead of directly resuming
                setShowReturnModal(true);
              } else {
                onBreakToggle();
              }
            }}
            disabled={geofencePaused}
            className={`flex-1 h-14 rounded-2xl font-bold text-base text-white ${
              geofencePaused
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : activeSession.onBreak
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <Coffee className="w-5 h-5 mr-2" />
            {activeSession.onBreak && !geofencePaused
              ? (language === 'es' ? 'Volver' : 'End Break')
              : (language === 'es' ? 'Pausa' : 'Break')
            }
          </Button>

          <Button
            onClick={onClockOut}
            className="flex-1 h-14 rounded-2xl font-bold text-base bg-red-600 hover:bg-red-700 text-white"
          >
            <Square className="w-5 h-5 mr-2" />
            {language === 'es' ? 'Clock Out' : 'Clock Out'}
          </Button>
        </div>

        {exceedsMaxHours && !geofencePaused && (
          <p className="mt-4 text-center text-xs text-red-300 font-semibold">
            {language === 'es'
              ? `⚠️ Límite de ${maxHours}h alcanzado. Horas serán revisadas.`
              : `⚠️ ${maxHours}h limit reached. Hours will be reviewed.`}
          </p>
        )}

        {geofencePaused && (
          <p className="mt-4 text-center text-xs text-red-300 font-semibold animate-pulse">
            {language === 'es'
              ? '📍 GPS monitoreando tu ubicación cada 15 segundos...'
              : '📍 GPS monitoring your location every 15 seconds...'}
          </p>
        )}
      </div>
    </div>
  );
}