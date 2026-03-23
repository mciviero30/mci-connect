import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Plus, Clock, Car, Plane, MapPin, Briefcase, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function TripCalculator({ jobAddress, selectedTeamIds, onAddAllItems }) {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [tripType, setTripType] = useState('standard');
  const [verificationMode, setVerificationMode] = useState('flight');

  const [techCount, setTechCount] = useState(2);
  const [roundTrips, setRoundTrips] = useState(1);
  const [roomsPerNight, setRoomsPerNight] = useState(1);
  const [punchLaborHours, setPunchLaborHours] = useState(8);
  const [punchNeedsTravel, setPunchNeedsTravel] = useState(false);
  const [verificationHours, setVerificationHours] = useState(4);
  const [verificationDays, setVerificationDays] = useState(1);
  const [verificationNights, setVerificationNights] = useState(1);
  const [daysPerTrip, setDaysPerTrip] = useState(2);
  const [nightsPerTrip, setNightsPerTrip] = useState(2);
  const [travelMetrics, setTravelMetrics] = useState([]);
  const [vehicleCounts, setVehicleCounts] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  const { data: companySettings = {} } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => { const s = await base44.entities.CompanySettings.list(); return s[0] || {}; },
    initialData: {},
    staleTime: Infinity
  });

  const { data: quoteItems = [] } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list(),
    initialData: [],
  });

  const calculateDistances = async () => {
    if (!jobAddress || !selectedTeamIds || selectedTeamIds.length === 0) {
      setError(language === 'es' ? 'Ingresa dirección del trabajo y selecciona al menos un equipo' : 'Enter job address and select at least one team');
      return;
    }
    setIsCalculating(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('calculateTravelMetrics', { jobAddress, teamIds: selectedTeamIds });
      if (response.data.error) { setError(response.data.error); setIsCalculating(false); return; }
      if (response.data.results) {
        setTravelMetrics(response.data.results);
        const counts = {};
        response.data.results.forEach(r => { if (r.success) counts[r.teamId] = 1; });
        setVehicleCounts(counts);
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to calculate distances');
    }
    setIsCalculating(false);
  };

  const generateItems = () => {
    const items = [];
    const drivingRate = companySettings?.travel_driving_time_rate || 60;
    const mileageRate = companySettings?.travel_mileage_rate || 0.70;
    const laborRate = companySettings?.regular_hourly_rate || 60;

    const hotelItem = quoteItems.find(qi => qi.name?.toLowerCase().includes('hotel'));
    const perDiemItem = quoteItems.find(qi => qi.name?.toLowerCase().includes('per') && qi.name?.toLowerCase().includes('diem'));
    const flightItem = quoteItems.find(qi => qi.name?.toLowerCase().includes('flight') || qi.name?.toLowerCase().includes('avión'));
    const uberItem = quoteItems.find(qi => qi.name?.toLowerCase().includes('uber') || qi.name?.toLowerCase().includes('taxi'));

    const hotelRate = hotelItem?.unit_price || 200;
    const perDiemRate = perDiemItem?.unit_price || 55;
    const flightRate = flightItem?.unit_price || 350;
    const uberRate = uberItem?.unit_price || 100;

    if (tripType === 'punch') {
      const totalLaborHrs = punchLaborHours * techCount * roundTrips;
      const laborTotal = totalLaborHrs * laborRate;

      let drivingTotal = 0;
      let milesTotal = 0;
      let descParts = [`${punchLaborHours}h x ${techCount} techs x ${roundTrips} trip(s)`];

      if (punchNeedsTravel) {
        // Driving + Miles: only if distances were calculated
        if (travelMetrics.length > 0) {
          travelMetrics.forEach(metric => {
            if (!metric.success) return;
            const vehicleCount = vehicleCounts[metric.teamId] || 1;
            const totalDrivingHours = parseFloat(metric.drivingHours) * techCount * roundTrips;
            const totalMiles = parseFloat(metric.totalMiles) * vehicleCount * roundTrips;
            drivingTotal += totalDrivingHours * drivingRate;
            milesTotal += totalMiles * mileageRate;
            descParts.push(`${totalDrivingHours.toFixed(1)}h driving + ${totalMiles.toFixed(0)} miles (${metric.teamName})`);
          });
        }
        // Hotel + Per Diem: always included when out-of-area is checked
        if (nightsPerTrip > 0) {
          const totalNights = nightsPerTrip * roundTrips;
          const totalDays = daysPerTrip * roundTrips;
          const hotelTotal = roomsPerNight * totalNights * hotelRate;
          const perDiemTotal = techCount * totalDays * perDiemRate;
          drivingTotal += hotelTotal + perDiemTotal;
          descParts.push(`${roomsPerNight} room(s) x ${totalNights} nights + per diem ${techCount} techs x ${totalDays} days`);
        }
      }

      const grandTotal = laborTotal + drivingTotal + milesTotal;
      items.push({
        item_name: 'Punch Trip',
        description: descParts.join(' | '),
        quantity: 1,
        unit: 'trip',
        unit_price: grandTotal,
        total: grandTotal,
        is_travel_item: false,
        calculation_type: 'punch_trip',
        tech_count: techCount,
        duration_value: roundTrips,
        auto_calculated: true
      });
    }

    if (tripType === 'verification') {
      const totalVerifHours = verificationHours * techCount * roundTrips;
      const laborTotal = totalVerifHours * laborRate;
      let travelTotal = 0;
      let descParts = [`${verificationHours}h x ${techCount} tech(s) x ${roundTrips} trip(s)`];

      if (verificationMode === 'flight') {
        const totalFlights = techCount * roundTrips * 2;
        const totalUbers = techCount * roundTrips * 4;
        travelTotal += totalFlights * flightRate + totalUbers * uberRate;
        descParts.push(`${totalFlights} flights + ${totalUbers} ubers`);
      } else if (travelMetrics.length > 0) {
        travelMetrics.forEach(metric => {
          if (!metric.success) return;
          const vehicleCount = vehicleCounts[metric.teamId] || 1;
          const totalDrivingHours = parseFloat(metric.drivingHours) * techCount * roundTrips;
          const totalMiles = parseFloat(metric.totalMiles) * vehicleCount * roundTrips;
          travelTotal += totalDrivingHours * drivingRate + totalMiles * mileageRate;
          descParts.push(`${totalDrivingHours.toFixed(1)}h driving + ${totalMiles.toFixed(0)} miles (${metric.teamName})`);
        });
      }

      const totalNights = verificationNights * roundTrips;
      const totalDays = verificationDays * roundTrips;
      travelTotal += roomsPerNight * totalNights * hotelRate + techCount * totalDays * perDiemRate;
      descParts.push(`${roomsPerNight} room(s) x ${totalNights} nights + per diem`);

      const grandTotal = laborTotal + travelTotal;
      items.push({
        item_name: 'Field Verification Trip',
        description: descParts.join(' | '),
        quantity: 1,
        unit: 'trip',
        unit_price: grandTotal,
        total: grandTotal,
        is_travel_item: false,
        calculation_type: 'verification_trip',
        tech_count: techCount,
        duration_value: roundTrips,
        auto_calculated: true
      });
    }

    if (tripType === 'standard') {
      travelMetrics.forEach(metric => {
        if (!metric.success) return;
        const vehicleCount = vehicleCounts[metric.teamId] || 1;
        const totalDrivingHours = parseFloat(metric.drivingHours) * techCount * roundTrips;
        const totalMiles = parseFloat(metric.totalMiles) * vehicleCount * roundTrips;
        items.push({ item_name: `Driving Time - ${metric.teamName}`, description: `${roundTrips} round trip(s) x ${techCount} techs`, quantity: totalDrivingHours, unit: 'hours', unit_price: drivingRate, total: totalDrivingHours * drivingRate, is_travel_item: true, travel_item_type: 'driving_time', auto_calculated: true });
        items.push({ item_name: `Miles - ${metric.teamName}`, description: `${vehicleCount} vehicle(s) x ${roundTrips} trip(s)`, quantity: totalMiles, unit: 'miles', unit_price: mileageRate, total: totalMiles * mileageRate, is_travel_item: true, travel_item_type: 'miles_per_vehicle', auto_calculated: true });
      });
      const totalNights = nightsPerTrip * roundTrips;
      const totalDays = daysPerTrip * roundTrips;
      items.push({ item_name: hotelItem?.name || 'Hotel Rooms', description: `${roomsPerNight} room(s) x ${totalNights} night(s)`, quantity: roomsPerNight * totalNights, unit: 'night', unit_price: hotelRate, total: roomsPerNight * totalNights * hotelRate, is_travel_item: false, travel_item_type: 'hotel', auto_calculated: true });
      items.push({ item_name: perDiemItem?.name || 'Per-Diem', description: `${techCount} tech(s) x ${totalDays} day(s)`, quantity: techCount * totalDays, unit: 'day', unit_price: perDiemRate, total: techCount * totalDays * perDiemRate, is_travel_item: false, travel_item_type: 'per_diem', auto_calculated: true });
    }

    onAddAllItems(items);
  };

  // Auto-sync roomsPerNight with techCount for standard Out of Area trips
  useEffect(() => {
    if (tripType === 'standard') {
      setRoomsPerNight(techCount);
    }
  }, [techCount, tripType]);

  const needsDistanceCalc = tripType === 'standard' || (tripType === 'punch' && punchNeedsTravel) || (tripType === 'verification' && verificationMode === 'driving');

  return (
    <Card className="bg-gradient-to-br from-blue-50/40 via-purple-50/30 to-pink-50/20 border border-blue-300">
      {/* Collapsed header - always visible */}
      <div
        className="flex items-center justify-between px-2 py-1.5 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <CardTitle className="flex items-center gap-1.5 text-slate-900 text-[10px]">
          <Briefcase className="w-3 h-3 text-blue-600" />
          {language === 'es' ? 'Calculadora de Viajes' : 'Trip Calculator'}
        </CardTitle>
        <input
          type="checkbox"
          checked={expanded}
          onChange={() => setExpanded(e => !e)}
          onClick={e => e.stopPropagation()}
          className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
        />
      </div>

      {/* Expanded body */}
      {expanded && (
        <CardContent className="space-y-1.5 p-2 border-t border-blue-200">
          {/* Trip Type */}
          <div>
            <Label className="text-[8px] font-bold mb-0.5 block">
              {language === 'es' ? 'Tipo de Viaje' : 'Trip Type'}
            </Label>
            <Select value={tripType} onValueChange={val => { setTripType(val); setTravelMetrics([]); setError(null); }}>
              <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-blue-600" />
                    <span className="text-[10px]">{language === 'es' ? 'Fuera de Area (Estandar)' : 'Out of Area (Standard)'}</span>
                  </div>
                </SelectItem>
                <SelectItem value="punch">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-green-600" />
                    <span className="text-[10px]">Punch Trip</span>
                  </div>
                </SelectItem>
                <SelectItem value="verification">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-purple-600" />
                    <span className="text-[10px]">Field Verification Trip</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="p-1.5 bg-red-50 border border-red-200 rounded">
              <p className="text-[9px] text-red-600">{error}</p>
            </div>
          )}

          {/* PUNCH TRIP */}
          {tripType === 'punch' && (
            <div className="space-y-1 p-1.5 bg-green-50/50 rounded border border-green-200">
              <div className="flex items-center gap-1 pb-0.5 border-b border-green-200">
                <Clock className="w-2.5 h-2.5 text-green-600" />
                <h4 className="text-[8px] font-bold text-slate-700">Punch Trip Setup</h4>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Horas/Tec' : 'Hrs/Tech'}</Label>
                  <Input type="number" min="1" max="24" value={punchLaborHours} onChange={e => setPunchLaborHours(parseFloat(e.target.value) || 8)} className="h-6 text-[10px]" />
                </div>
                <div>
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Tecnicos' : 'Techs'}</Label>
                  <Input type="number" min="1" max="20" value={techCount} onChange={e => setTechCount(parseInt(e.target.value) || 2)} className="h-6 text-[10px]" />
                </div>
              </div>
              <div>
                <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Viajes' : 'Trips'}</Label>
                <Input type="number" min="1" max="10" value={roundTrips} onChange={e => setRoundTrips(parseInt(e.target.value) || 1)} className="h-6 text-[10px]" />
              </div>
              <div className="flex items-center gap-1 p-1 bg-white rounded border border-green-300">
                <input type="checkbox" checked={punchNeedsTravel} onChange={e => setPunchNeedsTravel(e.target.checked)} className="w-2.5 h-2.5" />
                <Label className="text-[8px] font-semibold cursor-pointer" onClick={() => setPunchNeedsTravel(!punchNeedsTravel)}>
                  {language === 'es' ? 'Fuera del area? (viaje + estadia)' : 'Out of area? (travel + stay)'}
                </Label>
              </div>
              {punchNeedsTravel && (
                <div className="space-y-0.5 pl-2 border-l border-green-300">
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Dias/Viaje' : 'Days/Trip'}</Label>
                      <Input type="number" min="1" value={daysPerTrip} onChange={e => setDaysPerTrip(parseInt(e.target.value) || 2)} className="h-5 text-[10px]" />
                    </div>
                    <div>
                      <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Noches/Viaje' : 'Nights/Trip'}</Label>
                      <Input type="number" min="0" value={nightsPerTrip} onChange={e => setNightsPerTrip(parseInt(e.target.value) || 2)} className="h-5 text-[10px]" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Cuartos/Noche' : 'Rooms/Night'}</Label>
                    <Input type="number" min="1" value={roomsPerNight} onChange={e => setRoomsPerNight(parseInt(e.target.value) || 1)} className="h-5 text-[10px]" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FIELD VERIFICATION */}
          {tripType === 'verification' && (
            <div className="space-y-1 p-1.5 bg-purple-50/50 rounded border border-purple-200">
              <div className="flex items-center gap-1 pb-0.5 border-b border-purple-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-purple-600" />
                <h4 className="text-[8px] font-bold text-slate-700">Field Verification Setup</h4>
              </div>
              <div>
                <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Modo de Viaje' : 'Travel Mode'}</Label>
                <Select value={verificationMode} onValueChange={val => { setVerificationMode(val); setTravelMetrics([]); }}>
                  <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flight">
                      <div className="flex items-center gap-1">
                        <Plane className="w-3 h-3 text-purple-600" />
                        <span className="text-[9px]">{language === 'es' ? 'Avion (Vuelo + Uber + Hotel + Per Diem)' : 'Flight (Flight + Uber + Hotel + Per Diem)'}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="driving">
                      <div className="flex items-center gap-1">
                        <Car className="w-3 h-3 text-purple-600" />
                        <span className="text-[9px]">{language === 'es' ? 'Carro (Millas + Manejo + Hotel + Per Diem)' : 'Driving (Miles + Drive Time + Hotel + Per Diem)'}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Hrs Verif.' : 'Verif. Hrs'}</Label>
                  <Input type="number" min="1" max="24" value={verificationHours} onChange={e => setVerificationHours(parseFloat(e.target.value) || 4)} className="h-5 text-[10px]" />
                </div>
                <div>
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Tecnicos' : 'Techs'}</Label>
                  <Input type="number" min="1" max="20" value={techCount} onChange={e => setTechCount(parseInt(e.target.value) || 2)} className="h-5 text-[10px]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Viajes' : 'Trips'}</Label>
                  <Input type="number" min="1" value={roundTrips} onChange={e => setRoundTrips(parseInt(e.target.value) || 1)} className="h-5 text-[10px]" />
                </div>
                <div>
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Dias' : 'Days'}</Label>
                  <Input type="number" min="1" value={verificationDays} onChange={e => setVerificationDays(parseInt(e.target.value) || 1)} className="h-5 text-[10px]" />
                </div>
                <div>
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Noches' : 'Nights'}</Label>
                  <Input type="number" min="0" value={verificationNights} onChange={e => setVerificationNights(parseInt(e.target.value) || 1)} className="h-5 text-[10px]" />
                </div>
              </div>
              <div>
                <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Cuartos/Noche' : 'Rooms/Night'}</Label>
                <Input type="number" min="1" value={roomsPerNight} onChange={e => setRoomsPerNight(parseInt(e.target.value) || 1)} className="h-5 text-[10px]" />
              </div>
            </div>
          )}

          {/* STANDARD OUT OF AREA */}
          {tripType === 'standard' && (
            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-1">
                <div className="p-0.5 bg-white rounded border border-blue-200">
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Tecnicos' : 'Techs'}</Label>
                  <Input type="number" min="1" value={techCount} onChange={e => setTechCount(parseInt(e.target.value) || 2)} className="h-5 text-[10px]" />
                </div>
                <div className="p-0.5 bg-white rounded border border-blue-200">
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Viajes' : 'Trips'}</Label>
                  <Input type="number" min="1" value={roundTrips} onChange={e => setRoundTrips(parseInt(e.target.value) || 1)} className="h-5 text-[10px]" />
                </div>
                <div className="p-0.5 bg-white rounded border border-blue-200">
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Cuartos' : 'Rooms'}</Label>
                  <Input type="number" min="1" value={roomsPerNight} onChange={e => setRoomsPerNight(parseInt(e.target.value) || 1)} className="h-5 text-[10px]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div className="p-0.5 bg-white rounded border border-purple-200">
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Dias/Viaje' : 'Days/Trip'}</Label>
                  <Input type="number" min="1" value={daysPerTrip} onChange={e => setDaysPerTrip(parseInt(e.target.value) || 2)} className="h-5 text-[10px]" />
                </div>
                <div className="p-0.5 bg-white rounded border border-purple-200">
                  <Label className="text-[8px] mb-0 block font-semibold">{language === 'es' ? 'Noches/Viaje' : 'Nights/Trip'}</Label>
                  <Input type="number" min="1" value={nightsPerTrip} onChange={e => setNightsPerTrip(parseInt(e.target.value) || 2)} className="h-5 text-[10px]" />
                </div>
              </div>
            </div>
          )}

          {/* Distance results */}
          {needsDistanceCalc && travelMetrics.length > 0 && (
            <div className="space-y-1 p-1.5 bg-white rounded border border-slate-200">
              <h4 className="text-[9px] font-bold text-slate-700 flex items-center gap-1">
                <Car className="w-2.5 h-2.5 text-blue-600" />
                {language === 'es' ? 'Distancias Calculadas' : 'Calculated Distances'}
              </h4>
              {travelMetrics.map(metric => (
                <div key={metric.teamId} className="p-1 bg-slate-50 rounded border border-slate-200">
                  <p className="text-[9px] font-semibold text-slate-900">{metric.teamName}</p>
                  {metric.success ? (
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[9px] text-slate-600">{metric.roundTripMiles} miles round-trip</p>
                      <div className="flex items-center gap-1">
                        <Label className="text-[8px] text-slate-500">Vehicles:</Label>
                        <Input
                          type="number" min="1"
                          value={vehicleCounts[metric.teamId] || 1}
                          onChange={e => setVehicleCounts(prev => ({ ...prev, [metric.teamId]: parseInt(e.target.value) || 1 }))}
                          className="w-12 h-5 text-[9px] text-center"
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9px] text-red-600">{metric.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-1 pt-1 border-t border-slate-200">
            {needsDistanceCalc && travelMetrics.length === 0 && (
              <Button
                type="button"
                onClick={calculateDistances}
                disabled={isCalculating || !jobAddress || !selectedTeamIds || selectedTeamIds.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-6"
              >
                <Calculator className="w-3 h-3 mr-1" />
                <span className="text-[10px]">
                  {isCalculating
                    ? (language === 'es' ? 'Calculando...' : 'Calculating...')
                    : (language === 'es' ? 'Calcular Distancias (Opcional)' : 'Calculate Distances (Optional)')}
                </span>
              </Button>
            )}
            {needsDistanceCalc && travelMetrics.length > 0 && (
              <Button
                type="button" variant="outline"
                onClick={() => { setTravelMetrics([]); setVehicleCounts({}); }}
                className="w-full h-6"
              >
                <span className="text-[10px]">{language === 'es' ? 'Recalcular Distancias' : 'Recalculate Distances'}</span>
              </Button>
            )}
            <Button
              type="button"
              onClick={generateItems}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold h-6"
            >
              <Plus className="w-3 h-3 mr-1" />
              <span className="text-[10px]">
                {travelMetrics.length > 0
                  ? (language === 'es' ? 'Agregar Todo al Estimado' : 'Add All to Quote')
                  : (language === 'es' ? 'Agregar Hotel + Per Diem' : 'Add Hotel + Per Diem')}
              </span>
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}