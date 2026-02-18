import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, Clock, Car, Calculator, Plus, Minus, Hotel, Coffee, Users, Calendar, Info, CalendarDays, Moon, Bed, Briefcase } from 'lucide-react';
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
  onRoomsPerNightChange,
  onStayConfigChange,
  editMode = false // NEW: when true, suppress auto-recalculation effects
}) {
  const { language } = useLanguage();
  const [travelMetrics, setTravelMetrics] = useState([]);
  const [error, setError] = useState(null);
  const [vehicleCounts, setVehicleCounts] = useState({});
  const [roundTrips, setRoundTrips] = useState(1);
  const [daysPerTrip, setDaysPerTrip] = useState(2);
  const [nightsPerTrip, setNightsPerTrip] = useState(2);
  const [isCalculating, setIsCalculating] = useState(false);

  // Notify parent when stay config changes — skip in edit mode to avoid overwriting saved items
  React.useEffect(() => {
    if (editMode) return;
    if (onStayConfigChange) {
      onStayConfigChange({ roundTrips, daysPerTrip, nightsPerTrip });
    }
  }, [roundTrips, daysPerTrip, nightsPerTrip, onStayConfigChange, editMode]);
  
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
      // metric.totalMiles = round-trip miles for 1 trip (already ida+vuelta)
      // metric.drivingHours = round-trip hours for 1 trip (already ida+vuelta)
      const milesPerTrip = parseFloat(metric.totalMiles) * vehicleCount; // miles for 1 trip, all vehicles
      const hoursPerTrip = parseFloat(metric.drivingHours); // round-trip hours for 1 trip (already ida+vuelta)
      // Total = hours × techs × trips
      const totalDrivingHours = hoursPerTrip * techCount * roundTrips;
      const totalMiles = milesPerTrip * roundTrips;
      // base_qty_per_trip = hours × techs for 1 round trip (so round_trips field scales correctly)
      const drivingBasePerTrip = hoursPerTrip * techCount;

      // Driving Time item
      travelItems.push({
        item_name: `Driving Time - ${metric.teamName}`,
        description: `${roundTrips} round trip${roundTrips > 1 ? 's' : ''} from ${metric.teamLocation} to job site (${metric.roundTripMiles} mi each)\nTechs traveling = ${techCount}`,
        quantity: totalDrivingHours,
        unit: 'hours',
        unit_price: drivingRate,
        total: totalDrivingHours * drivingRate,
        is_travel_item: true,
        travel_item_type: 'driving_time',
        team_id: metric.teamId,
        round_trips: roundTrips,
        base_qty_per_trip: drivingBasePerTrip, // hours × techs for 1 trip — used by editor to scale
        account_category: 'expense_travel_per_diem',
        duration_value: hoursPerTrip,
        tech_count: techCount,
        auto_calculated: false,
        manual_override: false
      });

      // Miles per Vehicle item
      travelItems.push({
        item_name: `Miles per Vehicle - ${metric.teamName}`,
        description: `${vehicleCount} vehicle${vehicleCount > 1 ? 's' : ''} × ${parseFloat(metric.totalMiles)} miles × ${roundTrips} trip${roundTrips > 1 ? 's' : ''}`,
        quantity: totalMiles,
        unit: 'miles',
        unit_price: mileageRate,
        total: totalMiles * mileageRate,
        is_travel_item: true,
        travel_item_type: 'miles_per_vehicle',
        team_id: metric.teamId,
        vehicle_count: vehicleCount,
        round_trips: roundTrips,
        base_qty_per_trip: milesPerTrip, // miles for exactly 1 trip
        account_category: 'expense_travel_per_diem',
        auto_calculated: false,
        manual_override: false
      });
    });

    // PART 2: Stay items (hotel + per diem)
    // C3 FIX: always add hotel/perdiem using derivedValues when available,
    // otherwise fall back to manual nightsPerTrip/daysPerTrip inputs.
    const stayItems = [];
    
    {
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

      // CRITICAL: derivedValues.nights already includes trip calculations from computeQuoteDerived
      // DO NOT add trips again here - it causes double-counting
      const totalNights = derivedValues.nights; // Already includes all trips
      const totalCalendarDays = derivedValues.totalCalendarDays; // Already includes all trips
      const totalHotelRooms = roomsPerNight * totalNights;
      const totalPerDiemDays = techCount * totalCalendarDays;

      // Hotel Rooms - derivedValues.nights already includes all trips
      const hotelDescription = `${roomsPerNight} room${roomsPerNight > 1 ? 's' : ''} × ${totalNights} night${totalNights > 1 ? 's' : ''}`;
      
      stayItems.push({
        item_name: hotelName,
        description: hotelDescription,
        quantity: totalHotelRooms,
        unit: hotelItem?.unit || 'night',
        unit_price: hotelRate,
        total: totalHotelRooms * hotelRate,
        is_travel_item: false,
        travel_item_type: 'hotel',
        account_category: 'expense_travel_per_diem',
        round_trips: 1,
        nights_per_trip: nightsPerTrip,
        rooms_per_night: roomsPerNight,
        // HYBRID OVERRIDE ARCHITECTURE
        auto_calculated: true,
        derived_quantity_snapshot: totalHotelRooms,
        manual_override: false
      });

      // Per-Diem - derivedValues.totalCalendarDays already includes all trips
      const perDiemDescription = `${techCount} tech${techCount > 1 ? 's' : ''} × ${totalCalendarDays} day${totalCalendarDays > 1 ? 's' : ''}`;
      
      stayItems.push({
        item_name: perDiemName,
        description: perDiemDescription,
        quantity: totalPerDiemDays,
        unit: perDiemItem?.unit || 'day',
        unit_price: perDiemRate,
        total: totalPerDiemDays * perDiemRate,
        is_travel_item: false,
        travel_item_type: 'per_diem',
        account_category: 'expense_travel_per_diem',
        round_trips: 1,
        days_per_trip: daysPerTrip,
        tech_count: techCount,
        // HYBRID OVERRIDE ARCHITECTURE
        auto_calculated: true,
        derived_quantity_snapshot: totalPerDiemDays,
        manual_override: false
      });
    }

    // Combine and send - derivedValues already includes all trips
    const totalNights = derivedValues ? derivedValues.nights : nightsPerTrip * roundTrips;
    const totalCalendarDays = derivedValues ? derivedValues.totalCalendarDays : daysPerTrip * roundTrips;
    const totalHotelRooms = roomsPerNight * totalNights;
    const totalPerDiemDays = techCount * totalCalendarDays;
    
    onAddAllItems([...travelItems, ...stayItems], {
      hotel_quantity: totalHotelRooms,
      per_diem_quantity: totalPerDiemDays,
      tech_count: techCount,
      round_trips: roundTrips,
      days_per_trip: daysPerTrip,
      nights_per_trip: nightsPerTrip,
      total_nights: totalNights,
      total_calendar_days: totalCalendarDays
    });
  };

  // C3 FIX: allow adding travel items even if there are no labor items yet.
  // Hotel/PerDiem will show with manually entered days/nights configuration.
  const hasCalculations = derivedValues && derivedValues.totalLaborHours > 0;
  // Can always add once distances are calculated — hotel/perdiem use nightsPerTrip/daysPerTrip as fallback
  const canAddToQuote = travelMetrics.length > 0 && travelMetrics.some(m => m.success);

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

        {/* SECTION 1: Tech Count, Round Trips & Rooms per Night - Always visible */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-200">
            <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Label className="text-[10px] font-semibold whitespace-nowrap block">
                {language === 'es' ? 'Técnicos' : 'Technicians'}
              </Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={techCount}
                onChange={(e) => onTechCountChange(parseInt(e.target.value) || 1)}
                className="w-full h-7 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-200">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Label className="text-[10px] font-semibold whitespace-nowrap block">
                {language === 'es' ? 'Viajes' : 'Round Trips'}
              </Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={roundTrips}
                onChange={(e) => setRoundTrips(parseInt(e.target.value) || 1)}
                className="w-full h-7 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-200">
            <Bed className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Label className="text-[10px] font-semibold whitespace-nowrap block">
                {language === 'es' ? 'Cuartos/Noche' : 'Rooms/Night'}
              </Label>
              <Input
                type="number"
                min="1"
                max="20"
                value={roomsPerNight}
                onChange={(e) => onRoomsPerNightChange(parseInt(e.target.value) || 1)}
                className="w-full h-7 text-sm"
              />
            </div>
          </div>
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
              : (language === 'es' ? 'Calcular Fuera de Área' : 'Calculate Out of Area')}
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
                          <div className="w-full">
                            <p className="text-[10px] text-slate-600 mb-0.5">{language === 'es' ? 'Tiempo Total' : 'Total Time'}</p>
                            <p className="font-bold text-slate-900">{metric.drivingHours}H x {roundTrips} = {(parseFloat(metric.drivingHours) * roundTrips).toFixed(1)}H</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 p-1 bg-slate-50 rounded">
                          <Car className="w-3 h-3 text-blue-600" />
                          <div className="w-full">
                            <p className="text-[10px] text-slate-600 mb-0.5">{language === 'es' ? 'Millas Totales' : 'Total Miles'}</p>
                            <p className="font-bold text-slate-900">{metric.totalMiles}mi x {vehicleCounts[metric.teamId] || 1}V x {roundTrips} = {(parseFloat(metric.totalMiles) * (vehicleCounts[metric.teamId] || 1) * roundTrips).toFixed(1)}mi</p>
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
                            × {roundTrips} {language === 'es' ? 'viajes' : 'trips'} = {(parseFloat(metric.totalMiles) * (vehicleCounts[metric.teamId] || 1) * roundTrips).toFixed(1)} {language === 'es' ? 'millas' : 'miles'}
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

            {/* Project Duration (from items) - READ-ONLY */}
            {hasCalculations && (
              <div className="p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-300 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-slate-700" />
                  <h5 className="text-xs font-bold text-slate-700">
                    {language === 'es' ? 'Duración del Proyecto Completo' : 'Full Project Duration'}
                  </h5>
                  <Badge className="bg-slate-200 text-slate-700 text-[10px]">
                    {language === 'es' ? 'Auto-calculado' : 'Auto-calculated'}
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[10px] text-slate-600 mb-0.5">{language === 'es' ? 'Días Laborales' : 'Work Days'}</p>
                    <p className="text-lg font-bold text-green-700">{derivedValues.workDays}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[10px] text-slate-600 mb-0.5">{language === 'es' ? 'Días Calendario' : 'Calendar Days'}</p>
                    <p className="text-lg font-bold text-purple-700">{derivedValues.totalCalendarDays}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[10px] text-slate-600 mb-0.5">{language === 'es' ? 'Noches' : 'Nights'}</p>
                    <p className="text-lg font-bold text-indigo-700">{derivedValues.nights}</p>
                  </div>
                  <div className="p-2 bg-white rounded border border-slate-200">
                    <p className="text-[10px] text-slate-600 mb-0.5">{language === 'es' ? 'Horas Total' : 'Total Hours'}</p>
                    <p className="text-lg font-bold text-blue-700">{derivedValues.totalLaborHours}h</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stay Configuration - Per Trip Basis */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-white rounded border border-purple-200">
                  <Label className="text-[10px] font-semibold text-slate-600 mb-1 block">
                    {language === 'es' ? 'Días por Viaje' : 'Days per Trip'}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={daysPerTrip}
                    onChange={(e) => setDaysPerTrip(parseInt(e.target.value) || 2)}
                    className="w-full h-8 text-sm font-bold"
                  />
                </div>

                <div className="p-2 bg-white rounded border border-purple-200">
                  <Label className="text-[10px] font-semibold text-slate-600 mb-1 block">
                    {language === 'es' ? 'Noches por Viaje' : 'Nights per Trip'}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={nightsPerTrip}
                    onChange={(e) => setNightsPerTrip(parseInt(e.target.value) || 2)}
                    className="w-full h-8 text-sm font-bold"
                  />
                </div>
              </div>

              {/* Total Calculations Display */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-purple-50 rounded border border-purple-300">
                  <p className="text-[10px] font-semibold text-slate-600 mb-0.5">Per Diems {language === 'es' ? 'Total' : 'Total'}</p>
                  <p className="text-sm font-bold text-purple-900 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-600" />
                    {techCount} × {derivedValues?.totalCalendarDays || 0} = {techCount * (derivedValues?.totalCalendarDays || 0)}
                  </p>
                </div>

                <div className="p-2 bg-purple-50 rounded border border-purple-300">
                  <p className="text-[10px] font-semibold text-slate-600 mb-0.5">{language === 'es' ? 'Cuartos Total' : 'Total Rooms'}</p>
                  <p className="text-sm font-bold text-purple-900 flex items-center gap-1">
                    <Bed className="w-3.5 h-3.5 text-purple-600" />
                    {roomsPerNight} × {derivedValues?.nights || 0} = {roomsPerNight * (derivedValues?.nights || 0)}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* SECTION 5: Add All Button (only when calculations ready) */}
        {travelMetrics.length > 0 && (
          <div className="flex gap-2 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTravelMetrics([]);
                setVehicleCounts({});
              }}
              size="sm"
              className="flex-1 text-xs"
            >
              {language === 'es' ? 'Recalcular' : 'Recalculate'}
            </Button>
            <Button
              type="button"
              onClick={addAllToQuote}
              disabled={!canAddToQuote}
              size="sm"
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              {language === 'es' ? 'Agregar Todo' : 'Add All'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}