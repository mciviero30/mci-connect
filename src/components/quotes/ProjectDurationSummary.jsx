/**
 * ============================================================================
 * CAPA 6 - PROJECT DURATION SUMMARY (LEDGER UX - READ-ONLY)
 * ============================================================================
 * 
 * ⚠️ WARNING (CAPA 8 - ANTI FUTURO DEV):
 * This component does NOT perform calculations.
 * It ONLY displays derived values passed from parent.
 * 
 * DO NOT add any calculation logic here.
 * DO NOT call computeQuoteDerived or any calculation functions.
 * 
 * All values are auto-calculated and synchronized with project changes.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar, Users, Clock, Briefcase, Moon, Info, Lock } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function ProjectDurationSummary({ derivedValues, quoteItems, quoteTotal, catalogItems, roundTrips = 1, daysPerTrip = 2, nightsPerTrip = 2, stayConfig }) {
  const { language } = useLanguage();
  // ============================================================================
  // CAPA 6 - PURELY PRESENTATIONAL (NO CALCULATIONS)
  // ============================================================================
  
  if (!derivedValues || derivedValues.totalLaborHours === 0) {
    return null;
  }

  const hasTravelDays = derivedValues.travelDays > 0;
  const hasWeekends = derivedValues.calendarDays > derivedValues.workDays;
  
  // Calculate estimated cost from catalog costs (NOT quote items)
  const estimatedCost = (quoteItems || []).reduce((sum, item) => {
    // Find matching catalog item by name
    const catalogItem = (catalogItems || []).find(ci => ci.name === item.item_name);
    if (!catalogItem) return sum;
    
    const costPerUnit = catalogItem.cost_per_unit || 0;
    const materialCost = catalogItem.material_cost || 0;
    const totalCost = (costPerUnit + materialCost) * (item.quantity || 0);
    return sum + totalCost;
  }, 0);
  
  const profitEstimate = (quoteTotal || 0) - estimatedCost;

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 shadow-lg">
      <CardHeader className="border-b border-slate-300 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-900 text-base flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            {language === 'es' ? 'Resumen de Duración del Proyecto' : 'Project Duration Summary'}
          </CardTitle>
          <div className="flex gap-2">
            <Badge className="bg-blue-100 text-blue-700 border border-blue-300 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {language === 'es' ? 'Auto-calculado' : 'Auto-calculated'}
            </Badge>
            {hasWeekends && (
              <Badge className="bg-purple-100 text-purple-700 border border-purple-300">
                {language === 'es' ? 'Incluye fines de semana' : 'Includes weekends'}
              </Badge>
            )}
            {hasTravelDays && (
              <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
                {language === 'es' ? 'Incluye días de viaje' : 'Travel days included'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Total Job $ */}
          {quoteTotal > 0 && (
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-3 border-2 border-blue-400">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-white" />
                <span className="text-xs text-blue-100">
                  {language === 'es' ? 'Total Trabajo' : 'Total Job'}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">${quoteTotal.toFixed(2)}</p>
              <p className="text-xs text-blue-100 mt-0.5">
                {language === 'es' ? 'Precio al cliente' : 'Client price'}
              </p>
            </div>
          )}

          {/* Total Profit Est. $ */}
          {profitEstimate > 0 && (
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-3 border-2 border-green-400">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-white" />
                <span className="text-xs text-green-100">
                  {language === 'es' ? 'Profit Est.' : 'Total Profit Est.'}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">${profitEstimate.toFixed(2)}</p>
              <p className="text-xs text-green-100 mt-0.5">
                {language === 'es' ? 'Basado en catálogo' : 'Based on catalog'}
              </p>
            </div>
          )}

          {/* Total Labor Hours */}
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-600">
                {language === 'es' ? 'Horas Est.' : 'Est. Hours'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{derivedValues.totalLaborHours}h</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'es' ? '🔒 auto-calculado' : '🔒 auto-calculated'}
            </p>
          </div>

          {/* Work Days - READ-ONLY */}
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
                  <p className="text-2xl font-bold text-slate-900">{derivedValues.workDays}</p>
                  <p className="text-xs text-green-600 mt-0.5 font-medium">
                    {language === 'es' ? '🔒 Lun–Vie' : '🔒 Mon–Fri'}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white max-w-xs">
                <p className="text-sm">
                  {language === 'es'
                    ? '🔒 Auto-calculado: Este valor se deriva automáticamente de las horas de instalación y se mantiene sincronizado con los cambios del proyecto para prevenir errores de estimación.'
                    : '🔒 Auto-calculated: This value is automatically derived from installation hours and stays synchronized with project changes to prevent estimation errors.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Calendar Days - READ-ONLY */}
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
                  <p className="text-2xl font-bold text-slate-900">{stayConfig?.total_calendar_days || derivedValues.totalCalendarDays}</p>
                  <p className="text-xs text-purple-600 mt-0.5 font-medium">
                    {language === 'es' ? '🔒 Incluye fines de semana' : '🔒 Includes weekends'}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white max-w-xs">
                <p className="text-sm">
                  {language === 'es'
                    ? '🔒 Auto-calculado: Total de días calendario desde llegada hasta salida. Incluye fines de semana y días de viaje. Se mantiene sincronizado automáticamente.'
                    : '🔒 Auto-calculated: Total calendar days from arrival to departure. Includes weekends and travel days. Stays synchronized automatically.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Total Nights - READ-ONLY */}
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
                  <p className="text-2xl font-bold text-slate-900">{stayConfig?.total_nights || derivedValues.nights}</p>
                  <p className="text-xs text-indigo-600 mt-0.5 font-medium">
                    {language === 'es' ? '🔒 auto-calculado' : '🔒 auto-calculated'}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 text-white max-w-xs">
                <p className="text-sm">
                  {language === 'es'
                    ? '🔒 Auto-calculado: Noches de hotel necesarias. Se deriva automáticamente de la duración del proyecto y se mantiene sincronizado con los cambios.'
                    : '🔒 Auto-calculated: Hotel nights required. Automatically derived from project duration and stays synchronized with changes.'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Travel Days Status - READ-ONLY */}
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

        {/* CAPA 6 & 8 - Explanation Footer with Lock Icon */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-bold text-blue-900">
                {language === 'es' 
                  ? '¿Por qué estos valores no son editables?' 
                  : 'Why are these values not editable?'}
              </p>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              {language === 'es'
                ? 'Estos valores se calculan automáticamente a partir de los items del proyecto para prevenir errores de estimación. Se mantienen sincronizados con cualquier cambio en las horas de instalación, cantidad de técnicos, o duración del proyecto.'
                : 'These values are automatically calculated from project items to prevent estimation errors. They stay synchronized with any changes to installation hours, technician count, or project duration.'}
            </p>
          </div>
          
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
                  ? 'Auto-calculado de duración total'
                  : 'Auto-calculated from total duration'}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Info className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
              <p>
                <strong className="text-slate-700">
                  {language === 'es' ? 'Días de viaje:' : 'Travel days:'}
                </strong>{' '}
                {language === 'es'
                  ? 'Agregados si viaje > 4h'
                  : 'Added if travel > 4h'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}