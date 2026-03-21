import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calculator, 
  Plus, 
  Users, 
  Clock, 
  Car, 
  Hotel, 
  Coffee, 
  Plane, 
  MapPin,
  DollarSign,
  Briefcase,
  CheckCircle2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/i18n/LanguageContext';

/**
 * Unified Trip Calculator for Quotes
 * Handles 3 trip types:
 * 1. Standard Out of Area (existing)
 * 2. Punch Trip (labor hours + optional travel)
 * 3. Field Verification Trip (flight or driving)
 */
export default function TripCalculator({ 
  jobAddress, 
  selectedTeamIds,
  onAddAllItems,
  totalLaborHours = 0 // from existing quote items
}) {
  const { language } = useLanguage();
  const [tripType, setTripType] = useState('standard'); // 'standard' | 'punch' | 'verification'
  const [verificationMode, setVerificationMode] = useState('flight'); // 'flight' | 'driving'
  
  // Shared config
  const [techCount, setTechCount] = useState(2);
  const [roundTrips, setRoundTrips] = useState(1);
  const [roomsPerNight, setRoomsPerNight] = useState(1);
  
  // Punch trip specific
  const [punchLaborHours, setPunchLaborHours] = useState(8);
  const [punchNeedsTravel, setPunchNeedsTravel] = useState(false);
  
  // Verification trip specific
  const [verificationHours, setVerificationHours] = useState(4);
  const [verificationDays, setVerificationDays] = useState(1);
  const [verificationNights, setVerificationNights] = useState(1);
  
  // Standard out of area
  const [daysPerTrip, setDaysPerTrip] = useState(2);
  const [nightsPerTrip, setNightsPerTrip] = useState(2);
  
  // Travel metrics (from distance calculation)
  const [travelMetrics, setTravelMetrics] = useState([]);
  const [vehicleCounts, setVehicleCounts] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  // Load rates from company settings
  const { data: companySettings = {} } = useQuery({
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

  // Step 1: Calculate distances for travel-based trips
  const calculateDistances = async () => {
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
        
        // Initialize vehicle counts
        const counts = {};
        response.data.results.forEach(result => {
          if (result.success) {
            counts[result.teamId] = 1;
          }
        });
        setVehicleCounts(counts);
      }
      
      setIsCalculating(false);
    } catch (err) {
      console.error('Error calculating travel metrics:', err);
      setError(err.data?.error || err.message || 'Failed to calculate distances');
      setIsCalculating(false);
    }
  };

  // Step 2: Generate items based on trip type
  const generateItems = () => {
    const items = [];
    const drivingRate = companySettings?.travel_driving_time_rate || 60;
    const mileageRate = companySettings?.travel_mileage_rate || 0.70;
    const laborRate = companySettings?.regular_hourly_rate || 60;

    // Find catalog items for hotel/perdiem/flight/uber
    const hotelItem = quoteItems.find(qi => qi.name?.toLowerCase().includes('hotel'));
    const perDiemItem = quoteItems.find(qi => qi.name?.toLowerCase().includes('per') && qi.name?.toLowerCase().includes('diem'));
    const flightItem = quoteItems.find(qi => qi.name?.toLowerCase().includes('flight') || qi.name?.toLowerCase().includes('avión'));
    const uberItem = quoteItems.find(qi => qi.name?.toLowerCase().includes('uber') || qi.name?.toLowerCase().includes('taxi'));

    const hotelRate = hotelItem?.unit_price || 200;
    const perDiemRate = perDiemItem?.unit_price || 55;
    const flightRate = flightItem?.unit_price || 350;
    const uberRate = uberItem?.unit_price || 100;

    // TRIP TYPE 1: PUNCH TRIP
    if (tripType === 'punch') {
      // Labor hours
      const totalLaborHours = punchLaborHours * techCount * roundTrips;
      items.push({
        item_name: 'Punch Labor',
        description: `${punchLaborHours}h × ${techCount} techs × ${roundTrips} trip${roundTrips > 1 ? 's' : ''}`,
        quantity: totalLaborHours,
        unit: 'hours',
        unit_price: laborRate,
        total: totalLaborHours * laborRate,
        is_travel_item: false,
        calculation_type: 'punch_trip_labor',
        auto_calculated: true
      });

      // Travel (if needed and calculated)
      if (punchNeedsTravel && travelMetrics.length > 0) {
        travelMetrics.forEach(metric => {
          if (!metric.success) return;

          const vehicleCount = vehicleCounts[metric.teamId] || 1;
          const milesPerTrip = parseFloat(metric.totalMiles) * vehicleCount;
          const hoursPerTrip = parseFloat(metric.drivingHours);
          
          const totalDrivingHours = hoursPerTrip * techCount * roundTrips;
          const totalMiles = milesPerTrip * roundTrips;

          items.push({
            item_name: `Driving Time - ${metric.teamName}`,
            description: `${roundTrips} round trip${roundTrips > 1 ? 's' : ''} × ${techCount} techs`,
            quantity: totalDrivingHours,
            unit: 'hours',
            unit_price: drivingRate,
            total: totalDrivingHours * drivingRate,
            is_travel_item: true,
            travel_item_type: 'driving_time',
            auto_calculated: true
          });

          items.push({
            item_name: `Miles - ${metric.teamName}`,
            description: `${vehicleCount} vehicle${vehicleCount > 1 ? 's' : ''} × ${roundTrips} trip${roundTrips > 1 ? 's' : ''}`,
            quantity: totalMiles,
            unit: 'miles',
            unit_price: mileageRate,
            total: totalMiles * mileageRate,
            is_travel_item: true,
            travel_item_type: 'miles_per_vehicle',
            auto_calculated: true
          });
        });

        // Hotel + Per Diem for punch trips (if they need to stay)
        if (nightsPerTrip > 0) {
          const totalNights = nightsPerTrip * roundTrips;
          const totalDays = daysPerTrip * roundTrips;
          const totalRooms = roomsPerNight * totalNights;
          const totalPerDiems = techCount * totalDays;

          items.push({
            item_name: hotelItem?.name || 'Hotel Rooms',
            description: `${roomsPerNight} room${roomsPerNight > 1 ? 's' : ''} × ${totalNights} night${totalNights > 1 ? 's' : ''}`,
            quantity: totalRooms,
            unit: 'night',
            unit_price: hotelRate,
            total: totalRooms * hotelRate,
            is_travel_item: false,
            travel_item_type: 'hotel',
            auto_calculated: true
          });

          items.push({
            item_name: perDiemItem?.name || 'Per-Diem',
            description: `${techCount} tech${techCount > 1 ? 's' : ''} × ${totalDays} day${totalDays > 1 ? 's' : ''}`,
            quantity: totalPerDiems,
            unit: 'day',
            unit_price: perDiemRate,
            total: totalPerDiems * perDiemRate,
            is_travel_item: false,
            travel_item_type: 'per_diem',
            auto_calculated: true
          });
        }
      }
    }

    // TRIP TYPE 2: FIELD VERIFICATION TRIP
    if (tripType === 'verification') {
      // Labor hours
      const totalVerificationHours = verificationHours * techCount * roundTrips;
      items.push({
        item_name: 'Field Verification Labor',
        description: `${verificationHours}h × ${techCount} tech${techCount > 1 ? 's' : ''} × ${roundTrips} trip${roundTrips > 1 ? 's' : ''}`,
        quantity: totalVerificationHours,
        unit: 'hours',
        unit_price: laborRate,
        total: totalVerificationHours * laborRate,
        is_travel_item: false,
        calculation_type: 'verification_labor',
        auto_calculated: true
      });

      if (verificationMode === 'flight') {
        // Flight mode: avión + uber + hotel + per diem
        const totalFlights = techCount * roundTrips * 2; // ida y vuelta
        items.push({
          item_name: flightItem?.name || 'Flight Tickets',
          description: `${techCount} tech${techCount > 1 ? 's' : ''} × ${roundTrips} trip${roundTrips > 1 ? 's' : ''} (round-trip)`,
          quantity: totalFlights,
          unit: 'ticket',
          unit_price: flightRate,
          total: totalFlights * flightRate,
          is_travel_item: true,
          travel_item_type: 'flight',
          auto_calculated: true
        });

        const totalUbers = techCount * roundTrips * 4; // aeropuerto-hotel-job-aeropuerto × 2
        items.push({
          item_name: uberItem?.name || 'Uber/Taxi',
          description: `${techCount} tech${techCount > 1 ? 's' : ''} × ${roundTrips} trip${roundTrips > 1 ? 's' : ''} (airport transfers)`,
          quantity: totalUbers,
          unit: 'ride',
          unit_price: uberRate,
          total: totalUbers * uberRate,
          is_travel_item: true,
          travel_item_type: 'uber',
          auto_calculated: true
        });
      } else {
        // Driving mode: mileage + drive time
        if (travelMetrics.length > 0) {
          travelMetrics.forEach(metric => {
            if (!metric.success) return;

            const vehicleCount = vehicleCounts[metric.teamId] || 1;
            const milesPerTrip = parseFloat(metric.totalMiles) * vehicleCount;
            const hoursPerTrip = parseFloat(metric.drivingHours);
            
            const totalDrivingHours = hoursPerTrip * techCount * roundTrips;
            const totalMiles = milesPerTrip * roundTrips;

            items.push({
              item_name: `Driving Time - ${metric.teamName}`,
              description: `${roundTrips} round trip${roundTrips > 1 ? 's' : ''} × ${techCount} techs`,
              quantity: totalDrivingHours,
              unit: 'hours',
              unit_price: drivingRate,
              total: totalDrivingHours * drivingRate,
              is_travel_item: true,
              travel_item_type: 'driving_time',
              auto_calculated: true
            });

            items.push({
              item_name: `Miles - ${metric.teamName}`,
              description: `${vehicleCount} vehicle${vehicleCount > 1 ? 's' : ''} × ${roundTrips} trip${roundTrips > 1 ? 's' : ''}`,
              quantity: totalMiles,
              unit: 'miles',
              unit_price: mileageRate,
              total: totalMiles * mileageRate,
              is_travel_item: true,
              travel_item_type: 'miles_per_vehicle',
              auto_calculated: true
            });
          });
        }
      }

      // Hotel + Per Diem for verification trips
      const totalNights = verificationNights * roundTrips;
      const totalDays = verificationDays * roundTrips;
      const totalRooms = roomsPerNight * totalNights;
      const totalPerDiems = techCount * totalDays;

      items.push({
        item_name: hotelItem?.name || 'Hotel Rooms',
        description: `${roomsPerNight} room${roomsPerNight > 1 ? 's' : ''} × ${totalNights} night${totalNights > 1 ? 's' : ''}`,
        quantity: totalRooms,
        unit: 'night',
        unit_price: hotelRate,
        total: totalRooms * hotelRate,
        is_travel_item: false,
        travel_item_type: 'hotel',
        auto_calculated: true
      });

      items.push({
        item_name: perDiemItem?.name || 'Per-Diem',
        description: `${techCount} tech${techCount > 1 ? 's' : ''} × ${totalDays} day${totalDays > 1 ? 's' : ''}`,
        quantity: totalPerDiems,
        unit: 'day',
        unit_price: perDiemRate,
        total: totalPerDiems * perDiemRate,
        is_travel_item: false,
        travel_item_type: 'per_diem',
        auto_calculated: true
      });
    }

    // TRIP TYPE 3: STANDARD OUT OF AREA (existing logic)
    if (tripType === 'standard') {
      // Travel items
      travelMetrics.forEach(metric => {
        if (!metric.success) return;

        const vehicleCount = vehicleCounts[metric.teamId] || 1;
        const milesPerTrip = parseFloat(metric.totalMiles) * vehicleCount;
        const hoursPerTrip = parseFloat(metric.drivingHours);
        
        const totalDrivingHours = hoursPerTrip * techCount * roundTrips;
        const totalMiles = milesPerTrip * roundTrips;

        items.push({
          item_name: `Driving Time - ${metric.teamName}`,
          description: `${roundTrips} round trip${roundTrips > 1 ? 's' : ''} × ${techCount} techs`,
          quantity: totalDrivingHours,
          unit: 'hours',
          unit_price: drivingRate,
          total: totalDrivingHours * drivingRate,
          is_travel_item: true,
          travel_item_type: 'driving_time',
          auto_calculated: true
        });

        items.push({
          item_name: `Miles - ${metric.teamName}`,
          description: `${vehicleCount} vehicle${vehicleCount > 1 ? 's' : ''} × ${roundTrips} trip${roundTrips > 1 ? 's' : ''}`,
          quantity: totalMiles,
          unit: 'miles',
          unit_price: mileageRate,
          total: totalMiles * mileageRate,
          is_travel_item: true,
          travel_item_type: 'miles_per_vehicle',
          auto_calculated: true
        });
      });

      // Hotel + Per Diem
      const totalNights = nightsPerTrip * roundTrips;
      const totalDays = daysPerTrip * roundTrips;
      const totalRooms = roomsPerNight * totalNights;
      const totalPerDiems = techCount * totalDays;

      items.push({
        item_name: hotelItem?.name || 'Hotel Rooms',
        description: `${roomsPerNight} room${roomsPerNight > 1 ? 's' : ''} × ${totalNights} night${totalNights > 1 ? 's' : ''}`,
        quantity: totalRooms,
        unit: 'night',
        unit_price: hotelRate,
        total: totalRooms * hotelRate,
        is_travel_item: false,
        travel_item_type: 'hotel',
        auto_calculated: true
      });

      items.push({
        item_name: perDiemItem?.name || 'Per-Diem',
        description: `${techCount} tech${techCount > 1 ? 's' : ''} × ${totalDays} day${totalDays > 1 ? 's' : ''}`,
        quantity: totalPerDiems,
        unit: 'day',
        unit_price: perDiemRate,
        total: totalPerDiems * perDiemRate,
        is_travel_item: false,
        travel_item_type: 'per_diem',
        auto_calculated: true
      });
    }

    onAddAllItems(items);
  };

  // Determine if we need distance calculation
  const needsDistanceCalc = 
    tripType === 'standard' || 
    (tripType === 'punch' && punchNeedsTravel) || 
    (tripType === 'verification' && verificationMode === 'driving');

  const canGenerate = 
    (needsDistanceCalc && travelMetrics.length > 0) || 
    (!needsDistanceCalc);

  return (
    <Card className="bg-gradient-to-br from-blue-50/40 via-purple-50/30 to-pink-50/20 border-2 border-blue-300">
      <CardHeader className="py-3 px-4">
        <CardTitle className="flex items-center gap-2 text-slate-900 text-sm">
          <Briefcase className="w-4 h-4 text-blue-600" />
          {language === 'es' ? 'Calculadora de Viajes' : 'Trip Calculator'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {/* Trip Type Selector */}
        <div>
          <Label className="text-xs font-semibold mb-2 block">
            {language === 'es' ? 'Tipo de Viaje' : 'Trip Type'}
          </Label>
          <Select value={tripType} onValueChange={(val) => {
            setTripType(val);
            setTravelMetrics([]);
            setError(null);
          }}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  {language === 'es' ? 'Fuera de Área (Estándar)' : 'Out of Area (Standard)'}
                </div>
              </SelectItem>
              <SelectItem value="punch">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  {language === 'es' ? 'Punch Trip' : 'Punch Trip'}
                </div>
              </SelectItem>
              <SelectItem value="verification">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  {language === 'es' ? 'Field Verification Trip' : 'Field Verification Trip'}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* PUNCH TRIP CONFIGURATION */}
        {tripType === 'punch' && (
          <div className="space-y-3 p-3 bg-green-50/50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 pb-2 border-b border-green-200">
              <Clock className="w-4 h-4 text-green-600" />
              <h4 className="text-xs font-bold text-slate-700">Punch Trip Setup</h4>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Horas por Técnico' : 'Hours per Tech'}</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={punchLaborHours}
                  onChange={(e) => setPunchLaborHours(parseFloat(e.target.value) || 8)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Técnicos' : 'Technicians'}</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={techCount}
                  onChange={(e) => setTechCount(parseInt(e.target.value) || 2)}
                  className="h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">{language === 'es' ? 'Viajes Redondos' : 'Round Trips'}</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={roundTrips}
                onChange={(e) => setRoundTrips(parseInt(e.target.value) || 1)}
                className="h-9"
              />
            </div>

            <div className="flex items-center gap-2 p-2 bg-white rounded border border-green-300">
              <input
                type="checkbox"
                checked={punchNeedsTravel}
                onChange={(e) => setPunchNeedsTravel(e.target.checked)}
                className="w-4 h-4"
              />
              <Label className="text-xs font-medium cursor-pointer" onClick={() => setPunchNeedsTravel(!punchNeedsTravel)}>
                {language === 'es' ? '¿Fuera del área local? (incluir viaje + estadía)' : 'Out of local area? (include travel + stay)'}
              </Label>
            </div>

            {punchNeedsTravel && (
              <div className="space-y-2 pl-6 border-l-2 border-green-300">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs mb-1 block">{language === 'es' ? 'Días por Viaje' : 'Days per Trip'}</Label>
                    <Input
                      type="number"
                      min="1"
                      value={daysPerTrip}
                      onChange={(e) => setDaysPerTrip(parseInt(e.target.value) || 2)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block">{language === 'es' ? 'Noches por Viaje' : 'Nights per Trip'}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={nightsPerTrip}
                      onChange={(e) => setNightsPerTrip(parseInt(e.target.value) || 2)}
                      className="h-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">{language === 'es' ? 'Cuartos por Noche' : 'Rooms per Night'}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={roomsPerNight}
                    onChange={(e) => setRoomsPerNight(parseInt(e.target.value) || 1)}
                    className="h-8"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-green-200">
              <p className="text-xs text-slate-600 mb-1">
                <strong>{language === 'es' ? 'Resumen:' : 'Summary:'}</strong> {punchLaborHours * techCount * roundTrips}h labor
                {punchNeedsTravel && ` + travel + ${roomsPerNight * nightsPerTrip * roundTrips} rooms + ${techCount * daysPerTrip * roundTrips} per diems`}
              </p>
            </div>
          </div>
        )}

        {/* FIELD VERIFICATION TRIP CONFIGURATION */}
        {tripType === 'verification' && (
          <div className="space-y-3 p-3 bg-purple-50/50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 pb-2 border-b border-purple-200">
              <CheckCircle2 className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold text-slate-700">Field Verification Setup</h4>
            </div>

            {/* Mode selector */}
            <div>
              <Label className="text-xs mb-2 block">{language === 'es' ? 'Modo de Viaje' : 'Travel Mode'}</Label>
              <Select value={verificationMode} onValueChange={(val) => {
                setVerificationMode(val);
                setTravelMetrics([]);
              }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flight">
                    <div className="flex items-center gap-2">
                      <Plane className="w-4 h-4 text-purple-600" />
                      {language === 'es' ? 'Avión (Vuelo + Uber + Hotel + Per Diem)' : 'Flight (Flight + Uber + Hotel + Per Diem)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="driving">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-purple-600" />
                      {language === 'es' ? 'Carro (Millas + Manejo + Hotel + Per Diem)' : 'Driving (Miles + Drive Time + Hotel + Per Diem)'}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Horas de Verificación' : 'Verification Hours'}</Label>
                <Input
                  type="number"
                  min="1"
                  max="24"
                  value={verificationHours}
                  onChange={(e) => setVerificationHours(parseFloat(e.target.value) || 4)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Técnicos' : 'Technicians'}</Label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={techCount}
                  onChange={(e) => setTechCount(parseInt(e.target.value) || 2)}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Viajes' : 'Trips'}</Label>
                <Input
                  type="number"
                  min="1"
                  value={roundTrips}
                  onChange={(e) => setRoundTrips(parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Días' : 'Days'}</Label>
                <Input
                  type="number"
                  min="1"
                  value={verificationDays}
                  onChange={(e) => setVerificationDays(parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Noches' : 'Nights'}</Label>
                <Input
                  type="number"
                  min="0"
                  value={verificationNights}
                  onChange={(e) => setVerificationNights(parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">{language === 'es' ? 'Cuartos por Noche' : 'Rooms per Night'}</Label>
              <Input
                type="number"
                min="1"
                value={roomsPerNight}
                onChange={(e) => setRoomsPerNight(parseInt(e.target.value) || 1)}
                className="h-8"
              />
            </div>

            <div className="pt-2 border-t border-purple-200">
              <p className="text-xs text-slate-600">
                <strong>{language === 'es' ? 'Resumen:' : 'Summary:'}</strong> {verificationHours * techCount * roundTrips}h labor + 
                {verificationMode === 'flight' 
                  ? ` ${techCount * roundTrips * 2} flights + ${techCount * roundTrips * 4} ubers` 
                  : ' driving + mileage'} + 
                {roomsPerNight * verificationNights * roundTrips} rooms + 
                {techCount * verificationDays * roundTrips} per diems
              </p>
            </div>
          </div>
        )}

        {/* STANDARD OUT OF AREA CONFIGURATION */}
        {tripType === 'standard' && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-white rounded border border-blue-200">
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Técnicos' : 'Technicians'}</Label>
                <Input
                  type="number"
                  min="1"
                  value={techCount}
                  onChange={(e) => setTechCount(parseInt(e.target.value) || 2)}
                  className="h-8"
                />
              </div>
              <div className="p-2 bg-white rounded border border-blue-200">
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Viajes' : 'Round Trips'}</Label>
                <Input
                  type="number"
                  min="1"
                  value={roundTrips}
                  onChange={(e) => setRoundTrips(parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
              <div className="p-2 bg-white rounded border border-blue-200">
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Cuartos/Noche' : 'Rooms/Night'}</Label>
                <Input
                  type="number"
                  min="1"
                  value={roomsPerNight}
                  onChange={(e) => setRoomsPerNight(parseInt(e.target.value) || 1)}
                  className="h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white rounded border border-purple-200">
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Días por Viaje' : 'Days per Trip'}</Label>
                <Input
                  type="number"
                  min="1"
                  value={daysPerTrip}
                  onChange={(e) => setDaysPerTrip(parseInt(e.target.value) || 2)}
                  className="h-8"
                />
              </div>
              <div className="p-2 bg-white rounded border border-purple-200">
                <Label className="text-xs mb-1 block">{language === 'es' ? 'Noches por Viaje' : 'Nights per Trip'}</Label>
                <Input
                  type="number"
                  min="1"
                  value={nightsPerTrip}
                  onChange={(e) => setNightsPerTrip(parseInt(e.target.value) || 2)}
                  className="h-8"
                />
              </div>
            </div>
          </div>
        )}

        {/* Distance Calculation Results (for trips that need it) */}
        {needsDistanceCalc && travelMetrics.length > 0 && (
          <div className="space-y-2 p-3 bg-white rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Car className="w-3 h-3 text-blue-600" />
              {language === 'es' ? 'Distancias Calculadas' : 'Calculated Distances'}
            </h4>
            {travelMetrics.map(metric => (
              <div key={metric.teamId} className="p-2 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs font-semibold text-slate-900">{metric.teamName}</p>
                {metric.success ? (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-600">{metric.roundTripMiles} miles round-trip</p>
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-slate-500">Vehicles:</Label>
                      <Input
                        type="number"
                        min="1"
                        value={vehicleCounts[metric.teamId] || 1}
                        onChange={(e) => setVehicleCounts(prev => ({
                          ...prev,
                          [metric.teamId]: parseInt(e.target.value) || 1
                        }))}
                        className="w-14 h-6 text-xs text-center"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-red-600">{metric.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-slate-200">
          {needsDistanceCalc && travelMetrics.length === 0 && (
            <Button
              type="button"
              onClick={calculateDistances}
              disabled={isCalculating || !jobAddress || selectedTeamIds.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {isCalculating ? (language === 'es' ? 'Calculando...' : 'Calculating...') : (language === 'es' ? 'Calcular Distancias' : 'Calculate Distances')}
            </Button>
          )}

          {needsDistanceCalc && travelMetrics.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTravelMetrics([]);
                setVehicleCounts({});
              }}
              size="sm"
              className="flex-1"
            >
              {language === 'es' ? 'Recalcular' : 'Recalculate'}
            </Button>
          )}

          <Button
            type="button"
            onClick={generateItems}
            disabled={!canGenerate}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold h-10"
          >
            <Plus className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Agregar Todo al Estimado' : 'Add All to Quote'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}