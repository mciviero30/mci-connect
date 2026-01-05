/**
 * ============================================================================
 * CAPA 4 - COMPONENTE SIN ESTADOS INTERMEDIOS
 * ============================================================================
 * 
 * Este componente NO calcula nada.
 * Solo MUESTRA valores derivados del parent.
 * 
 * ⚠️ WARNING: NO agregues useState o useEffect para cálculos.
 * Todos los valores vienen de derivedValues (prop).
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Hotel, Coffee, Clock, Info, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function StayDurationCalculator({ 
  derivedValues,
  techCount = 2, 
  onTechCountChange,
  onAutoGenerateItems,
  language = 'en',
  roomsPerNight,
  onRoomsPerNightChange
}) {
  // ============================================================================
  // CAPA 6 - READ-ONLY DISPLAY (NO CALCULATIONS)
  // ============================================================================
  
  const hasCalculations = derivedValues && derivedValues.totalLaborHours > 0;

  const handleAddToQuote = () => {
    if (!derivedValues || !onAutoGenerateItems) return;

    onAutoGenerateItems({
      hotel_quantity: derivedValues.hotelRooms,
      per_diem_quantity: derivedValues.perDiemDays,
      tech_count: techCount,
      duration_days: derivedValues.totalCalendarDays
    });
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          {language === 'es' ? 'Cálculo Automático de Estadía' : 'Automated Stay Calculation'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tech Count Input - Always visible */}
        <div className="flex items-center gap-4 p-3 bg-white rounded-lg border border-purple-200">
          <Users className="w-5 h-5 text-purple-600" />
          <div className="flex-1">
            <Label className="text-sm font-semibold">
              {language === 'es' ? 'Técnicos en el Proyecto' : 'Technicians on Project'}
            </Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={techCount}
              onChange={(e) => onTechCountChange(parseInt(e.target.value) || 1)}
              className="w-20 h-8 mt-1"
            />
          </div>
        </div>

        {/* CAPA 6 - LEDGER UX (READ-ONLY DISPLAY) */}
        {!hasCalculations && (
          <Alert className="bg-blue-50 border-blue-300">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              {language === 'es' 
                ? '🔒 Agrega items con horas de instalación para activar el cálculo automático de duración, hotel y per diem. Los valores se actualizan automáticamente para prevenir errores de estimación.' 
                : '🔒 Add items with installation hours to activate automatic calculation of duration, hotel, and per diem. Values update automatically to prevent estimation errors.'}
            </AlertDescription>
          </Alert>
        )}
        
        {hasCalculations && (
          <>
        {/* Calculation Summary - READ-ONLY DISPLAY */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-600">
                {language === 'es' ? 'Horas Totales' : 'Total Hours'}
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{derivedValues.totalLaborHours.toFixed(0)}h</p>
            <p className="text-xs text-slate-500">
              {derivedValues.workDays} {language === 'es' ? 'días laborales' : 'work days'}
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-600">
                {language === 'es' ? 'Duración Total' : 'Total Duration'}
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{derivedValues.totalCalendarDays} {language === 'es' ? 'días' : 'days'}</p>
            <p className="text-xs text-slate-500">
              {derivedValues.nights} {language === 'es' ? 'noches' : 'nights'}
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Hotel className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-600">
                {language === 'es' ? 'Habitaciones' : 'Hotel Rooms'}
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{derivedValues.hotelRooms}</p>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min="1"
                max="10"
                value={roomsPerNight}
                onChange={(e) => onRoomsPerNightChange(parseInt(e.target.value) || 1)}
                className="w-14 h-6 text-xs"
              />
              <span className="text-xs text-slate-500">x {derivedValues.nights}n</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Coffee className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-600">Per Diem</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{derivedValues.perDiemDays}</p>
            <p className="text-xs text-slate-500">
              {techCount} techs × {derivedValues.totalCalendarDays}d
            </p>
          </div>
        </div>

        {/* Breakdown - READ-ONLY */}
        <Alert className="bg-purple-50 border-purple-300">
          <Info className="w-4 h-4 text-purple-600" />
          <AlertDescription className="text-xs text-purple-900 space-y-1">
            <p>
              <strong>{language === 'es' ? '🔒 Auto-calculado:' : '🔒 Auto-calculated:'}</strong>{' '}
              {language === 'es' 
                ? 'Estos valores se sincronizan automáticamente con los cambios del proyecto.'
                : 'These values stay synchronized with project changes automatically.'}
            </p>
            <p>
              <strong>{language === 'es' ? 'Capacidad:' : 'Capacity:'}</strong> {techCount * 8}h/day ({techCount} techs × 8h)
            </p>
          </AlertDescription>
        </Alert>

        <Button
          type="button"
          onClick={handleAddToQuote}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Agregar Hotel y Per Diem al Estimado' : 'Add Hotel & Per Diem to Quote'}
        </Button>
        </>
        )}
      </CardContent>
    </Card>
  );
}