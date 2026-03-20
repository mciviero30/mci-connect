import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, Clock, Car, Hotel, UtensilsCrossed, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';

export default function PunchTripCalculator({ 
  isOpen, 
  onClose, 
  onAddItems, 
  itemType = 'punch', // 'punch' or 'field_verification'
  jobAddress,
  travelTimeHours: initialTravelHours = 0,
  travelMiles: initialTravelMiles = 0,
  language = 'en'
}) {
  const [techCount, setTechCount] = useState(itemType === 'field_verification' ? 1 : 2);
  const [workHours, setWorkHours] = useState(itemType === 'field_verification' ? 4 : 4);
  const [travelTimeHours, setTravelTimeHours] = useState(initialTravelHours);
  const [travelMiles, setTravelMiles] = useState(initialTravelMiles);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isOutOfTown, setIsOutOfTown] = useState(false);
  
  // Auto-calculate distance when dialog opens if job address exists
  useEffect(() => {
    if (isOpen && jobAddress) {
      console.log('🚗 [PunchTripCalculator] Auto-calculating distance for:', jobAddress);
      calculateDistance();
    }
  }, [isOpen]);
  
  // Recalculate when "Out of Town" is enabled and we don't have travel data
  useEffect(() => {
    if (isOutOfTown && jobAddress && travelTimeHours === 0 && travelMiles === 0) {
      console.log('🚗 [PunchTripCalculator] Out of Town enabled - calculating distance');
      calculateDistance();
    }
  }, [isOutOfTown]);
  
  const calculateDistance = async () => {
    if (!jobAddress) {
      console.log('⚠️ [PunchTripCalculator] No job address - skipping calculation');
      return;
    }
    
    setIsCalculating(true);
    console.log('🔍 [PunchTripCalculator] Fetching distance for:', jobAddress);
    
    try {
      const { calculateTravelDistance } = await import('@/functions/calculateTravelDistance');
      const result = await calculateTravelDistance({ destination: jobAddress });
      
      console.log('📊 [PunchTripCalculator] Backend response:', result);
      
      if (result.success) {
        console.log('✅ [PunchTripCalculator] Calculated:', { miles: result.miles, hours: result.hours });
        setTravelMiles(result.miles);
        setTravelTimeHours(result.hours);
      } else {
        console.error('❌ [PunchTripCalculator] Calculation failed:', result.error);
      }
    } catch (error) {
      console.error('❌ [PunchTripCalculator] Fetch error:', error);
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Calcular total de horas del día
  const totalDayHours = (travelTimeHours * 2) + workHours; // Round trip + trabajo
  const needsHotel = totalDayHours > 10;
  const nightsNeeded = needsHotel ? 1 : 0;
  
  // Determinar si se cobran viaje/millas: si es out of town O si necesitan hotel
  const shouldChargeTravel = isOutOfTown || needsHotel;
  
  // Costos
  const DRIVING_RATE = 55; // $55/hr
  const MILEAGE_RATE = 0.70; // $0.70/milla
  const HOTEL_RATE = 120; // $120/noche por habitación
  const PER_DIEM_RATE = 75; // $75/día por persona
  const WORK_RATE = 60; // $60/hr para trabajo
  
  // Cálculos
  const drivingCost = shouldChargeTravel ? (travelTimeHours * 2 * techCount * DRIVING_RATE) : 0; // Round trip
  const mileageCost = shouldChargeTravel ? (travelMiles * 2 * MILEAGE_RATE) : 0; // Round trip para todo el equipo
  const workCost = workHours * techCount * WORK_RATE;
  const hotelCost = needsHotel ? (Math.ceil(techCount / 2) * HOTEL_RATE * nightsNeeded) : 0;
  const perDiemCost = needsHotel ? (techCount * PER_DIEM_RATE * (nightsNeeded + 1)) : 0; // +1 porque comen el día de salida también
  
  const totalCost = drivingCost + mileageCost + workCost + hotelCost + perDiemCost;
  
  const handleAddToQuote = () => {
    const items = [];
    
    // 1. Trabajo principal (Punch Trip o Field Verification)
    items.push({
      item_name: itemType === 'punch' ? 'Punch Trip' : 'Field Verification',
      description: itemType === 'punch' 
        ? `Punch list work - ${techCount} tech(s) × ${workHours}hrs`
        : `Field verification - ${techCount} tech(s) × ${workHours}hrs (4hr minimum)`,
      quantity: techCount * workHours,
      unit: 'hrs',
      unit_price: WORK_RATE,
      total: workCost,
      installation_time: workHours,
      calculation_type: 'punch_trip',
      tech_count: techCount,
      duration_value: workHours,
      auto_calculated: true
    });
    
    // 2. Driving Time (si es out of town o necesitan hotel)
    if (shouldChargeTravel && travelTimeHours > 0) {
      items.push({
        item_name: 'Driving Time',
        description: `Travel time - ${techCount} tech(s) × ${travelTimeHours}hrs × 2 (round trip)`,
        quantity: travelTimeHours * 2 * techCount,
        unit: 'hrs',
        unit_price: DRIVING_RATE,
        total: drivingCost,
        installation_time: 0,
        calculation_type: 'hours',
        tech_count: techCount,
        duration_value: travelTimeHours,
        is_travel_item: true,
        travel_item_type: 'driving_time',
        auto_calculated: true
      });
    }
    
    // 3. Mileage (si es out of town o necesitan hotel)
    if (shouldChargeTravel && travelMiles > 0) {
      items.push({
        item_name: 'Mileage',
        description: `${travelMiles} miles × 2 (round trip) @ $${MILEAGE_RATE}/mile`,
        quantity: travelMiles * 2,
        unit: 'miles',
        unit_price: MILEAGE_RATE,
        total: mileageCost,
        installation_time: 0,
        calculation_type: 'mileage',
        is_travel_item: true,
        travel_item_type: 'mileage',
        auto_calculated: true
      });
    }
    
    // 4. Hotel (solo si necesitan quedarse)
    if (needsHotel) {
      const rooms = Math.ceil(techCount / 2);
      items.push({
        item_name: 'Hotel',
        description: `${rooms} room(s) × ${nightsNeeded} night(s) - ${techCount} techs`,
        quantity: rooms * nightsNeeded,
        unit: 'nights',
        unit_price: HOTEL_RATE,
        total: hotelCost,
        installation_time: 0,
        calculation_type: 'hotel',
        tech_count: techCount,
        duration_value: nightsNeeded,
        is_travel_item: true,
        travel_item_type: 'hotel',
        auto_calculated: true
      });
    }
    
    // 5. Per Diem (solo si necesitan quedarse)
    if (needsHotel) {
      const days = nightsNeeded + 1; // Si duermen 1 noche = comen 2 días
      items.push({
        item_name: 'Per Diem',
        description: `Meals - ${techCount} tech(s) × ${days} day(s) @ $${PER_DIEM_RATE}/day`,
        quantity: techCount * days,
        unit: 'days',
        unit_price: PER_DIEM_RATE,
        total: perDiemCost,
        installation_time: 0,
        calculation_type: 'per_diem',
        tech_count: techCount,
        duration_value: days,
        is_travel_item: true,
        travel_item_type: 'per_diem',
        auto_calculated: true
      });
    }
    
    onAddItems(items);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            {language === 'es' ? 'Calculadora de Punch Trip' : 'Punch Trip Calculator'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === 'es' ? 'Número de Técnicos' : 'Number of Technicians'}</Label>
              <Input 
                type="number" 
                min="1" 
                max="10" 
                value={techCount}
                onChange={(e) => setTechCount(parseInt(e.target.value) || 1)}
                className="text-lg font-semibold"
              />
            </div>
            
            <div>
              <Label>
                {language === 'es' ? 'Horas de Trabajo' : 'Work Hours'}
                {itemType === 'field_verification' && (
                  <span className="text-xs text-slate-500 ml-1">(min 4hrs)</span>
                )}
              </Label>
              <Input 
                type="number" 
                min={itemType === 'field_verification' ? 4 : 1}
                max="12" 
                value={workHours}
                onChange={(e) => setWorkHours(parseInt(e.target.value) || (itemType === 'field_verification' ? 4 : 1))}
                className="text-lg font-semibold"
              />
            </div>
          </div>
          
          {/* Out of Town Toggle - Show if job has address and doesn't need hotel */}
          {!needsHotel && jobAddress && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-blue-900">
                      {language === 'es' ? '🚗 Trabajo Fuera de la Ciudad' : '🚗 Out of Town Work'}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {language === 'es' 
                        ? 'Activar para cobrar tiempo de manejo y millas aunque regresen el mismo día'
                        : 'Enable to charge driving time and mileage even if returning same day'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-4">
                    <input
                      type="checkbox"
                      checked={isOutOfTown}
                      onChange={(e) => setIsOutOfTown(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Job Info */}
          {jobAddress && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-blue-900">
                    {language === 'es' ? '📍 Ubicación del Trabajo' : '📍 Job Location'}
                  </p>
                  {isCalculating && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {language === 'es' ? 'Calculando...' : 'Calculating...'}
                    </div>
                  )}
                </div>
                <p className="text-blue-700">{jobAddress}</p>
                {travelMiles > 0 && travelTimeHours > 0 && (
                  <div className="flex gap-4 mt-2 text-xs text-blue-600">
                    <span>🚗 {travelTimeHours.toFixed(1)}hrs one-way</span>
                    <span>📏 {travelMiles} miles one-way</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Auto-detection logic */}
          <Card className={needsHotel ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-300'}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {needsHotel ? (
                  <Hotel className="w-5 h-5 text-amber-600 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm mb-1">
                    {needsHotel 
                      ? (language === 'es' ? '🏨 Hotel Requerido' : '🏨 Hotel Required')
                      : (language === 'es' ? '✅ Mismo Día (No Hotel)' : '✅ Same Day (No Hotel)')
                    }
                  </p>
                  <p className="text-xs text-slate-700">
                    {language === 'es' ? 'Cálculo:' : 'Calculation:'} {travelTimeHours.toFixed(1)}h ida + {workHours}h trabajo + {travelTimeHours.toFixed(1)}h vuelta = <strong>{totalDayHours.toFixed(1)}h total</strong>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {needsHotel 
                      ? (language === 'es' ? '⚠️ Más de 10 horas → necesitan hotel' : '⚠️ Over 10 hours → hotel needed')
                      : (language === 'es' ? '👍 Menos de 10 horas → pueden regresar' : '👍 Under 10 hours → can return same day')
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Breakdown */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-slate-700 mb-3">
              {language === 'es' ? '💰 Desglose de Costos' : '💰 Cost Breakdown'}
            </h3>
            
            {/* Trabajo */}
            <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm">
                  {itemType === 'punch' ? 'Punch Trip Work' : 'Field Verification'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">{techCount} tech × {workHours}hrs × ${WORK_RATE}/hr</p>
                <p className="font-bold text-blue-700">${workCost.toFixed(2)}</p>
              </div>
            </div>
            
            {/* Driving Time */}
            {shouldChargeTravel && travelTimeHours > 0 && (
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm">Driving Time</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{techCount} tech × {travelTimeHours.toFixed(1)}hrs × 2 × ${DRIVING_RATE}/hr</p>
                  <p className="font-bold text-orange-700">${drivingCost.toFixed(2)}</p>
                </div>
              </div>
            )}
            
            {/* Mileage */}
            {shouldChargeTravel && travelMiles > 0 && (
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Mileage</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{travelMiles} miles × 2 × ${MILEAGE_RATE}/mile</p>
                  <p className="font-bold text-green-700">${mileageCost.toFixed(2)}</p>
                </div>
              </div>
            )}
            
            {/* Hotel (solo si necesitan) */}
            {needsHotel && (
              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <Hotel className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium">Hotel</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{Math.ceil(techCount / 2)} room × {nightsNeeded} night × ${HOTEL_RATE}</p>
                  <p className="font-bold text-amber-700">${hotelCost.toFixed(2)}</p>
                </div>
              </div>
            )}
            
            {/* Per Diem (solo si necesitan) */}
            {needsHotel && (
              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium">Per Diem</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{techCount} tech × {nightsNeeded + 1} days × ${PER_DIEM_RATE}</p>
                  <p className="font-bold text-amber-700">${perDiemCost.toFixed(2)}</p>
                </div>
              </div>
            )}
            
            {/* Total */}
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg mt-4">
              <span className="text-white font-bold">TOTAL</span>
              <span className="text-white text-2xl font-bold">${totalCost.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Warnings */}
          {!jobAddress && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-3 flex gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  {language === 'es' 
                    ? '⚠️ No se detectó dirección del trabajo. Los cálculos de viaje pueden no ser precisos.'
                    : '⚠️ No job address detected. Travel calculations may not be accurate.'}
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleAddToQuote}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white"
            >
              {language === 'es' ? 'Agregar al Estimado' : 'Add to Quote'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}