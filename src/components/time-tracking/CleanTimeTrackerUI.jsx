import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Square, Coffee, ArrowLeft } from 'lucide-react';

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
  if (!activeSession) return null;

  const sessionHours = elapsed / 3600;
  const maxHours = activeSession.workType === 'driving' ? 16 : 10;
  const exceedsMaxHours = sessionHours >= maxHours;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-blue-900 via-blue-800 to-slate-900">
      {/* Top Bar */}
      <div className="p-4 flex items-center justify-between">
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-xs font-bold text-white/70 uppercase tracking-widest">
            {language === 'es' ? 'Control de Tiempo' : 'Time Tracking'}
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 space-y-6 pb-4">
        {/* Job Info */}
        <div className="text-center">
          <p className="text-white/60 text-sm mb-2">
            {language === 'es' ? 'Proyecto' : 'Project'}
          </p>
          <h2 className="text-2xl font-bold text-white mb-2">{activeSession.jobName}</h2>
          <Badge className="bg-blue-600 text-white">
            {Math.round(activeSession.distanceMeters)}m {language === 'es' ? 'del sitio' : 'from site'}
          </Badge>
        </div>

        {/* Time Display */}
        <div className="text-center">
          <div className={`text-8xl font-black font-mono tracking-tighter mb-4 ${
            exceedsMaxHours
              ? 'text-red-500 animate-pulse'
              : 'text-white drop-shadow-lg'
          }`}>
            {formatTime(elapsed)}
          </div>

          {exceedsMaxHours && (
            <Badge className="bg-red-600 text-white px-4 py-2 text-base font-bold">
              {language === 'es'
                ? `¡LÍMITE DE ${maxHours}H ALCANZADO!`
                : `${maxHours}H LIMIT REACHED!`}
            </Badge>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex gap-2">
          {activeSession.onBreak && (
            <Badge className="bg-amber-600 text-white px-3 py-1 font-bold">
              <Coffee className="w-3 h-3 mr-1" />
              {language === 'es' ? 'EN PAUSA' : 'ON BREAK'}
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

      {/* Bottom Action Bar - extra padding so buttons don't hide behind banner */}
      <div className="px-6 pt-4 pb-20 bg-gradient-to-t from-slate-900 to-transparent border-t border-white/10">
        <div className="flex gap-3">
          <Button
            onClick={onBreakToggle}
            className="flex-1 h-14 rounded-2xl font-bold text-base bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Coffee className="w-5 h-5 mr-2" />
            {activeSession.onBreak
              ? (language === 'es' ? 'Reanudar' : 'Resume')
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

        {exceedsMaxHours && (
          <p className="mt-4 text-center text-xs text-red-300 font-semibold">
            {language === 'es'
              ? `⚠️ Límite de ${maxHours}h alcanzado. Horas serán revisadas.`
              : `⚠️ ${maxHours}h limit reached. Hours will be reviewed.`}
          </p>
        )}
      </div>
    </div>
  );
}