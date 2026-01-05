import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Users, Clock, Briefcase, Moon, Info } from 'lucide-react';
import { calculateStayDuration } from '@/components/domain/calculations/stayDuration';

export default function ProjectDurationSummary({ items, techCount, travelTimeHours, language }) {
  // Calculate duration metrics
  const calculations = calculateStayDuration({
    items,
    techCount,
    travelTimeHours,
    roomsPerNight: Math.ceil(techCount / 2)
  });

  if (!calculations) {
    return null;
  }

  const hasTravelDays = travelTimeHours > 0;
  const hasWeekends = calculations.weekends > 0;

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 shadow-lg">
      <CardHeader className="border-b border-slate-300 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-900 text-base flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            {language === 'es' ? 'Resumen de Duración del Proyecto' : 'Project Duration Summary'}
          </CardTitle>
          <div className="flex gap-2">
            {hasWeekends && (
              <Badge className="bg-purple-100 text-purple-700 border border-purple-300">
                {language === 'es' ? 'Incluye fines de semana' : 'Includes weekends'}
              </Badge>
            )}
            {hasTravelDays && (
              <Badge className="bg-blue-100 text-blue-700 border border-blue-300">
                {language === 'es' ? 'Incluye días de viaje' : 'Travel days included'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Total Labor Hours */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-600">
                {language === 'es' ? 'Horas Laborales' : 'Labor Hours'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{calculations.totalLaborHours}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'es' ? 'horas totales' : 'total hours'}
            </p>
          </div>

          {/* Technicians */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-600">
                {language === 'es' ? 'Técnicos' : 'Technicians'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{techCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'es' ? 'personas' : 'people'}
            </p>
          </div>

          {/* Work Days */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-white rounded-lg p-3 border border-slate-200 cursor-help">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-slate-600">
                      {language === 'es' ? 'Días Laborales' : 'Work Days'}
                    </span>
                    <Info className="w-3 h-3 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{calculations.workDays}</p>
                  <p className="text-xs text-green-600 mt-0.5 font-medium">
                    {language === 'es' ? 'Lun–Vie solamente' : 'Mon–Fri only'}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white max-w-xs">
                <p className="text-sm">
                  {language === 'es'
                    ? 'Días laborales calculados basados en horas de instalación. Solo cuenta lunes a viernes.'
                    : 'Work days calculated based on installation hours. Only counts Monday through Friday.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Calendar Days */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-white rounded-lg p-3 border border-slate-200 cursor-help">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-slate-600">
                      {language === 'es' ? 'Días Calendario' : 'Calendar Days'}
                    </span>
                    <Info className="w-3 h-3 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{calculations.totalCalendarDays}</p>
                  <p className="text-xs text-purple-600 mt-0.5 font-medium">
                    {language === 'es' ? 'Incluye fines de semana' : 'Includes weekends'}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white max-w-xs">
                <p className="text-sm">
                  {language === 'es'
                    ? 'Total de días calendario desde llegada hasta salida. Incluye fines de semana y días de viaje.'
                    : 'Total calendar days from arrival to departure. Includes weekends and travel days.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Total Nights */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="bg-white rounded-lg p-3 border border-slate-200 cursor-help">
                  <div className="flex items-center gap-2 mb-1">
                    <Moon className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs text-slate-600">
                      {language === 'es' ? 'Noches Totales' : 'Total Nights'}
                    </span>
                    <Info className="w-3 h-3 text-slate-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{calculations.totalNights}</p>
                  <p className="text-xs text-indigo-600 mt-0.5 font-medium">
                    {language === 'es' ? 'Viaje + fines de semana' : 'Travel + weekends'}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white max-w-xs">
                <p className="text-sm">
                  {language === 'es'
                    ? 'Noches de hotel necesarias. Incluye noches de viaje (domingos/fines de semana) y fines de semana durante el trabajo.'
                    : 'Hotel nights required. Includes travel nights (Sundays/weekends) and weekends during work period.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Travel Days Status */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-slate-600">
                {language === 'es' ? 'Viaje' : 'Travel'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {hasTravelDays ? (language === 'es' ? 'Sí' : 'Yes') : (language === 'es' ? 'No' : 'No')}
            </p>
            <p className="text-xs text-amber-600 mt-0.5 font-medium">
              {hasTravelDays 
                ? (language === 'es' ? '2 días incluidos' : '2 days included')
                : (language === 'es' ? 'Local' : 'Local')
              }
            </p>
          </div>
        </div>

        {/* Explanation Footer */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="grid md:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-slate-700">
                  {language === 'es' ? 'Días laborales:' : 'Work days:'}
                </strong>{' '}
                {language === 'es'
                  ? 'Lunes a viernes solamente (sin fines de semana)'
                  : 'Monday through Friday only (no weekends)'}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 text-purple-500 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-slate-700">
                  {language === 'es' ? 'Días calendario:' : 'Calendar days:'}
                </strong>{' '}
                {language === 'es'
                  ? 'Incluye fines de semana intercalados'
                  : 'Includes weekends in between'}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 text-indigo-500 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-slate-700">
                  {language === 'es' ? 'Noches de hotel:' : 'Hotel nights:'}
                </strong>{' '}
                {language === 'es'
                  ? 'Incluye viaje + fines de semana durante trabajo'
                  : 'Includes travel + weekends during work'}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-slate-700">
                  {language === 'es' ? 'Días de viaje:' : 'Travel days:'}
                </strong>{' '}
                {language === 'es'
                  ? 'Pueden ocurrir en fines de semana'
                  : 'May occur on weekends'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}