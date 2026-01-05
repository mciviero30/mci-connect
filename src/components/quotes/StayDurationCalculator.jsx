import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Hotel, Coffee, Clock, Info, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { calculateStayDuration } from '@/components/domain/calculations/stayDuration';

export default function StayDurationCalculator({ 
  items = [], 
  techCount = 2, 
  onTechCountChange,
  travelTimeHours = 0,
  onAutoGenerateItems,
  language = 'en'
}) {
  const [roomsPerNight, setRoomsPerNight] = useState(1);
  const [calculations, setCalculations] = useState(null);

  useEffect(() => {
    if (!items || items.length === 0) {
      setCalculations(null);
      return;
    }

    // Call centralized calculation helper
    const result = calculateStayDuration({
      items,
      techCount,
      travelTimeHours,
      roomsPerNight
    });
    
    if (!result) {
      setCalculations(null);
      return;
    }

    // Auto-update rooms per night if it doesn't match suggested
    if (roomsPerNight !== result.suggestedRooms) {
      setRoomsPerNight(result.suggestedRooms);
    }

    setCalculations(result);

  }, [items, techCount, travelTimeHours, roomsPerNight]);

  const handleAddToQuote = () => {
    if (!calculations || !onAutoGenerateItems) return;

    onAutoGenerateItems({
      hotel_quantity: calculations.totalHotelRooms,
      per_diem_quantity: calculations.totalPerDiem,
      tech_count: techCount,
      duration_days: calculations.totalCalendarDays
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
        {!calculations && (
          <Alert className="bg-blue-50 border-blue-300">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              {language === 'es' 
                ? 'Agrega items con horas de instalación para calcular automáticamente la duración del proyecto, habitaciones de hotel y per diem.' 
                : 'Add items with installation hours to automatically calculate project duration, hotel rooms, and per diem.'}
            </AlertDescription>
          </Alert>
        )}
        
        {calculations && (
          <>
        {/* Tech Count Input */}
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

        {/* Calculation Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-600">
                {language === 'es' ? 'Horas Totales' : 'Total Hours'}
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{calculations.totalLaborHours.toFixed(0)}h</p>
            <p className="text-xs text-slate-500">
              {calculations.workDays} {language === 'es' ? 'días laborales' : 'work days'}
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-600">
                {language === 'es' ? 'Duración Total' : 'Total Duration'}
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{calculations.totalCalendarDays} {language === 'es' ? 'días' : 'days'}</p>
            <p className="text-xs text-slate-500">
              {calculations.totalNights} {language === 'es' ? 'noches' : 'nights'}
            </p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Hotel className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-600">
                {language === 'es' ? 'Habitaciones' : 'Hotel Rooms'}
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{calculations.totalHotelRooms}</p>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                min="1"
                max="10"
                value={roomsPerNight}
                onChange={(e) => setRoomsPerNight(parseInt(e.target.value) || 1)}
                className="w-14 h-6 text-xs"
              />
              <span className="text-xs text-slate-500">x {calculations.totalNights}n</span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Coffee className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-600">Per Diem</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{calculations.totalPerDiem}</p>
            <p className="text-xs text-slate-500">
              {techCount} techs × {calculations.totalCalendarDays}d
            </p>
          </div>
        </div>

        {/* Breakdown */}
        <Alert className="bg-purple-50 border-purple-300">
          <Info className="w-4 h-4 text-purple-600" />
          <AlertDescription className="text-xs text-purple-900 space-y-1">
            <p>
              <strong>{language === 'es' ? 'Capacidad:' : 'Capacity:'}</strong> {calculations.dailyCapacity}h/day ({techCount} techs × 8h)
            </p>
            <p>
              <strong>{language === 'es' ? 'Calendario:' : 'Schedule:'}</strong> {calculations.workDays} {language === 'es' ? 'días laborales' : 'work days'} + {calculations.weekends} {language === 'es' ? 'días de fin de semana' : 'weekend days'}
            </p>
            {calculations.extraTravelDays > 0 && (
              <p>
                <strong>{language === 'es' ? 'Viaje:' : 'Travel:'}</strong> +{calculations.extraTravelDays} {language === 'es' ? 'días extra' : 'extra days'} ({language === 'es' ? 'viaje largo' : 'long travel'})
              </p>
            )}
          </AlertDescription>
        </Alert>

        <Button
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