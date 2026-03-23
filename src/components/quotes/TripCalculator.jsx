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
  totalLaborHours = 0
}) {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);
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

  // Can always generate — hotel/per diem don't require distance calc
  // Driving items will simply be skipped if distances not yet calculated
  const canGenerate = true;

  return (
    <Card className="bg-gradient-to-br from-blue-50/40 via-purple-50/30 to-pink-50/20 border border-blue-300">
      {/* Always-visible header row */}
      <div
        className="flex items-center justify-between px-2 py-1.5 cursor-pointer"
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

      {/* Collapsible body */}
      {expanded && (
        <CardContent className="space-y-1.5 p-2 border-t border-blue-200">