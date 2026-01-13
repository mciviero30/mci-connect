import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, Clock, Car, Calculator, Plus, Minus, Hotel, Coffee, Users, Calendar, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function UnifiedOutOfAreaCalculator({ 
  jobAddress, 
  selectedTeamIds,
  onAddAllItems,
  derivedValues,
  techCount,
  onTechCountChange,
  roomsPerNight,
  onRoomsPerNightChange
}) {
  const { language } = useLanguage();
  const [travelMetrics, setTravelMetrics] = useState([]);
  const [error, setError] = useState(null);
  const [vehicleCounts, setVehicleCounts] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Load company settings for rates
  const { data: companySettings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const settings = await base44.entities.CompanySettings.list();
      return settings[0] || {};
    },
    initialData: {},
    staleTime: Infinity
  });

  const { data: quoteItems = [] } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list(),
    initialData: [],
  });

  const calculateMetrics = async () => {
    if (!jobAddress || selectedTeamIds.length === 0) {
      setError(language === 'es' 
        ? 'Ingresa dirección del trabajo y selecciona al menos un equipo'
        : 'Enter job address and select at least one team');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('calculateTravelMetrics', {
        jobAddress,
        teamIds: selectedTeamIds
      });

      if (response.data.error) {
        setError(response.data.error);
        setIsCalculating(false);
        return;
      }

      if (response.data.results) {
        setTravelMetrics(response.data.results);
        
        // Initialize vehicle counts (default 1 per team)
        const counts = {};
        response.data.results.forEach(result => {
          if (result.success) {
            counts[result.teamId] = 1;
          }
        });
        setVehicleCounts(counts);
        
        // Show error if all calculations failed
        const allFailed = response.data.results.every(r => !r.success);
        if (allFailed) {
          const errorMessages = response.data.results.map(r => r.error).filter(Boolean).join(', ');
          setError(errorMessages || (language === 'es' 
            ? 'Error al calcular distancias para todos los equipos.'
            : 'Failed to calculate distances for all teams.'));
        }
      }
      
      setIsCalculating(false);
    } catch (err) {
      console.error('Error calculating travel metrics:', err);
      const errorMessage = err.data?.error || err.message;
      setError(errorMessage || (language === 'es' 
        ? 'Error al calcular distancias. Verifica que GOOGLE_MAPS_API_KEY esté configurado.'
        : 'Failed to calculate distances. Check that GOOGLE_MAPS_API_KEY is configured.'));
      setIsCalculating(false);
    }
  };

  const updateVehicleCount = (teamId, delta) => {
    setVehicleCounts(prev => ({
      ...prev,
      [teamId]: Math.max(1, (prev[teamId] || 1) + delta)
    }));
  };

  const addAllToQuote = () => {
    // PART 1: Travel items (driving + mileage)
    const travelItems = [];
    
    const drivingRate = companySettings?.travel_driving_time_rate || 60;
    const mileageRate = companySettings?.travel_mileage_rate || 0.70;

    travelMetrics.forEach(metric => {
      if (!metric.success) return;

      const vehicleCount = vehicleCounts[metric.teamId] || 1;
      const milesPerVehicle = parseFloat(metric.totalMiles);
      const drivingHours = parseFloat(metric.drivingHours);

      // Driving Time item
      travelItems.push({
        item_name: `Driving Time - ${metric.teamName}`,
        description: `Round trip driving from ${metric.teamLocation} to job site (${metric.roundTripMiles} mi)`,
        quantity: drivingHours,
        unit: 'hours',
        unit_price: drivingRate,
        total: drivingHours * drivingRate,
        is_travel_item: true,
        travel_item_type: 'driving_time',
        team_id: metric.teamId,
        round_trips: 1,
        account_category: 'expense_travel_per_diem',
        duration_value: drivingHours,
        tech_count: 1
      });

      // Miles per Vehicle item
      travelItems.push({
        item_name: `Miles per Vehicle - ${metric.teamName}`,
        description: `${vehicleCount} vehicle${vehicleCount > 1 ? 's' : ''} × ${milesPerVehicle} miles round trip`,
        quantity: milesPerVehicle * vehicleCount,
        unit: 'miles',
        unit_price: mileageRate,
        total: milesPerVehicle * vehicleCount * mileageRate,
        is_travel_item: true,
        travel_item_type: 'miles_per_vehicle',
        team_id: metric.teamId,
        vehicle_count: vehicleCount,
        round_trips: 1,
        account_category: 'expense_travel_per_diem'
      });
    });

    // PART 2: Stay items (hotel + per diem)
    const stayItems = [];
    
    if (derivedValues && derivedValues.totalLaborHours > 0) {
      const hotelItem = quoteItems.find(qi => 
        qi.name?.toLowerCase().includes('hotel') || 
        qi.name === 'Hotel Rooms'
      );
      const perDiemItem = quoteItems.find(qi => 
        qi.name?.toLowerCase().includes('per') && qi.name?.toLowerCase().includes('diem')
      );

      const hotelName = hotelItem?.name || 'Hotel Rooms';
      const perDiemName = perDiemItem?.name || 'Per-Diem';
      const hotelRate = hotelItem?.unit_price || 200;
      const perDiemRate = perDiemItem?.unit_price || 55;

      // Hotel Rooms (auto-calculated)
      stayItems.push({
        item_name: hotelName,
        description: `Rooms per night = ${roomsPerNight}\nNights = ${derivedValues.nights}`,
        quantity: 0, // Will be derived
        unit: hotelItem?.unit || 'night',
        unit_price: hotelRate,
        total: 0, // Will be derived
        is_travel_item: false,
        calculation_type: 'hotel',
        auto_calculated: true,
        manual_override: false,
        installation_time: 0,
        tech_count: techCount,
      });

      // Per-Diem (auto-calculated)
      stayItems.push({
        item_name: perDiemName,
        description: `Days = ${derivedValues.totalCalendarDays} days\nTechs = ${techCount}`,
        quantity: 0, // Will be derived
        unit: perDiemItem?.unit || 'day',
        unit_price: perDiemRate,
        total: 0, // Will be derived
        is_travel_item: false,
        calculation_type: 'per_diem',
        auto_calculated: true,
        manual_override: false,
        installation_time: 0,
        tech_count: techCount,
      });
    }

    // Combine and send
    onAddAllItems([...travelItems, ...stayItems], {
      hotel_quantity: derivedValues?.hotelRooms || 0,
      per_diem_quantity: derivedValues?.perDiemDays || 0,
      tech_count: techCount,
      duration_days: derivedValues?.totalCalendarDays || 0
    });
  };

  const hasCalculations = derivedValues && derivedValues.totalLaborHours > 0;
  const canAddToQuote = travelMetrics.length > 0 && hasCalculations;

  return (
    <Card className="bg-gradient-to-br from-blue-50/40 via-purple-50/30 to-pink-50/20 border-2 border-blue-300">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-slate-900 text-sm">
          <Calculator className="w-4 h-4 text-blue-600" />
          {language === 'es' ? 'Configuración Fuera de Área' : 'Out of Area Configuration'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* SECTION 1: Tech Count - Always visible */}
        <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-blue-200">
          <Users className="w-4 h-4 text-blue-600" />
          <Label className="text-xs font-semibold whitespace-nowrap">
            {language === 'es' ? 'Técnicos:' : 'Technicians:'}
          </Label>
          <Input
            type="number"
            min="1"
            max="20"
            value={techCount}
            onChange={(e) => onTechCountChange(parseInt(e.target.value) || 1)}
            className="w-16 h-7 text-sm"
          />
        </div>

        {/* SECTION 2: Single Calculate Button (for distances) */}
        {!travelMetrics.length && (
          <Button 
            type="button"
            onClick={calculateMetrics}
            disabled={isCalculating || !jobAddress || selectedTeamIds.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {isCalculating 
              ? (language === 'es' ? 'Calculando...' : 'Calculating...') 
              : (language === 'es' ? 'Calcular' : 'Calculate')}
          </Button>
        )}

        {/* SECTION 3: Travel Metrics Results */}
        {travelMetrics.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-blue-200">
              <Car className="w-3 h-3 text-blue-600" />
              <h4 className="text-xs font-semibold text-slate-700">
                {language === 'es' ? 'Viaje y Distancias' : 'Travel & Distances'}
              </h4>
            </div>

            {travelMetrics.map(metric => (
              <Card key={metric.teamId} className="bg-white border-slate-200">
                <CardContent className="p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900">{metric.teamName}</h4>
                      <p className="text-xs text-slate-600">{metric.teamLocation}</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700">
                      {metric.success ? '✓' : '✗'}
                    </Badge>
                  </div>

                  {metric.success ? (
                    <>
                       <div className="grid grid-cols-2 gap-2 text-xs">
                         <div className="flex items-center gap-1 p-1 bg-slate-50 rounded">
                           <Clock className="w-3 h-3 text-blue-600" />
                           <div>
                             <p className="text-[10px] text-slate-600">{language === 'es' ? 'Tiempo' : 'Time'}</p>
                             <p className="font-bold text-slate-900">{metric.drivingHours}h</p>
                           </div>
                         </div>

                         <div className="flex items-center gap-1 p-1 bg-slate-50 rounded">
                           <Car className="w-3 h-3 text-blue-600" />
                           <div>
                             <p className="text-[10px] text-slate-600">{language === 'es' ? 'Millas' : 'Miles'}</p>
                             <p className="font-bold text-slate-900">{metric.totalMiles}mi</p>
                           </div>
                         </div>
                       </div>

                       <div className="pt-1 border-t border-slate-200">
                         <Label className="text-[10px] text-slate-600 mb-1 block">
                           {language === 'es' ? 'Vehículos' : 'Vehicles'}
                         </Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setVehicleCounts(prev => ({
                              ...prev,
                              [metric.teamId]: Math.max(1, (prev[metric.teamId] || 1) - 1)
                            }))}
                            disabled={(vehicleCounts[metric.teamId] || 1) <= 1}
                            className="h-8 w-8 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={vehicleCounts[metric.teamId] || 1}
                            onChange={(e) => setVehicleCounts(prev => ({
                              ...prev,
                              [metric.teamId]: parseInt(e.target.value) || 1
                            }))}
                            className="w-16 text-center h-8"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setVehicleCounts(prev => ({
                              ...prev,
                              [metric.teamId]: (prev[metric.teamId] || 1) + 1
                            }))}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm text-slate-600 ml-2">
                            = {(parseFloat(metric.totalMiles) * (vehicleCounts[metric.teamId] || 1)).toFixed(1)} {language === 'es' ? 'millas totales' : 'total miles'}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-red-600">{metric.error}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* SECTION 4: Stay Calculation Display */}
        {travelMetrics.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1 pb-1 border-t border-purple-200">
              <Hotel className="w-3 h-3 text-purple-600" />
              <h4 className="text-xs font-semibold text-slate-700">
                {language === 'es' ? 'Hotel y Per Diem' : 'Hotel & Per Diem'}
              </h4>
            </div>

            {!hasCalculations ? (
              <Alert className="bg-blue-50 border-blue-300">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  {language === 'es' 
                    ? '🔒 Agrega items con horas de instalación para calcular hotel y per diem automáticamente.' 
                    : '🔒 Add items with installation hours to calculate hotel and per diem automatically.'}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Stay Summary - READ-ONLY - COMPACT */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-white rounded border border-purple-200">
                    <p className="text-[10px] font-semibold text-slate-600">{language === 'es' ? 'Duración' : 'Days'}</p>
                    <p className="text-lg font-bold text-purple-900">{derivedValues.totalCalendarDays}</p>
                  </div>

                  <div className="p-2 bg-white rounded border border-purple-200">
                    <p className="text-[10px] font-semibold text-slate-600">{language === 'es' ? 'Cuartos' : 'Rooms'}</p>
                    <p className="text-lg font-bold text-purple-900">{derivedValues.hotelRooms}</p>
                  </div>

                  <div className="p-2 bg-white rounded border border-purple-200">
                    <p className="text-[10px] font-semibold text-slate-600">Per Diem</p>
                    <p className="text-lg font-bold text-purple-900">{derivedValues.perDiemDays}</p>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* SECTION 5: Add All Button (only when calculations ready) */}
        {travelMetrics.length > 0 && (
          <div className="flex gap-3 pt-4 border-t-2 border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTravelMetrics([]);
                setVehicleCounts({});
              }}
              className="flex-1"
            >
              {language === 'es' ? 'Recalcular' : 'Recalculate'}
            </Button>
            <Button
              type="button"
              onClick={addAllToQuote}
              disabled={!canAddToQuote}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Agregar Todo al Estimado' : 'Add All to Quote'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}