import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Hotel, Coffee, Users, Moon, Bed, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function TripCalculator({ jobAddress, selectedTeamIds, onAddAllItems, totalLaborHours }) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [techCount, setTechCount] = useState(2);
  const [roundTrips, setRoundTrips] = useState(1);
  const [nightsPerTrip, setNightsPerTrip] = useState(2);
  const [daysPerTrip, setDaysPerTrip] = useState(2);
  const [roomsPerNight, setRoomsPerNight] = useState(1);

  useEffect(() => {
    setRoomsPerNight(Math.ceil(techCount / 2));
  }, [techCount]);

  const { data: companySettings = {} } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const data = await base44.entities.CompanySettings.list();
      return data[0] || {};
    },
    staleTime: Infinity,
  });

  const { data: quoteItems = [] } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list(),
    initialData: [],
  });

  const hotelItem = quoteItems.find(qi => qi.name?.toLowerCase().includes('hotel') || qi.name === 'Hotel Rooms');
  const perDiemItem = quoteItems.find(qi => qi.name?.toLowerCase().includes('per') && qi.name?.toLowerCase().includes('diem'));

  const hotelRate = hotelItem?.unit_price || 200;
  const perDiemRate = perDiemItem?.unit_price || 55;
  const hotelName = hotelItem?.name || 'Hotel Rooms';
  const perDiemName = perDiemItem?.name || 'Per-Diem';

  const totalNights = nightsPerTrip * roundTrips;
  const totalDays = daysPerTrip * roundTrips;
  const totalHotelRooms = roomsPerNight * totalNights;
  const totalPerDiemDays = techCount * totalDays;

  const hotelTotal = totalHotelRooms * hotelRate;
  const perDiemTotal = totalPerDiemDays * perDiemRate;
  const grandTotal = hotelTotal + perDiemTotal;

  const handleAddItems = () => {
    const items = [
      {
        item_name: hotelName,
        description: `${roomsPerNight} room${roomsPerNight > 1 ? 's' : ''} × ${totalNights} night${totalNights > 1 ? 's' : ''}`,
        quantity: totalHotelRooms,
        unit: hotelItem?.unit || 'night',
        unit_price: hotelRate,
        total: hotelTotal,
        is_travel_item: false,
        travel_item_type: 'hotel',
        account_category: 'expense_travel_per_diem',
        auto_calculated: true,
        manual_override: false,
        rooms_per_night: roomsPerNight,
        nights_per_trip: nightsPerTrip,
        round_trips: roundTrips,
      },
      {
        item_name: perDiemName,
        description: `${techCount} tech${techCount > 1 ? 's' : ''} × ${totalDays} day${totalDays > 1 ? 's' : ''}`,
        quantity: totalPerDiemDays,
        unit: perDiemItem?.unit || 'day',
        unit_price: perDiemRate,
        total: perDiemTotal,
        is_travel_item: false,
        travel_item_type: 'per_diem',
        account_category: 'expense_travel_per_diem',
        auto_calculated: true,
        manual_override: false,
        tech_count: techCount,
        days_per_trip: daysPerTrip,
        round_trips: roundTrips,
      },
    ];

    onAddAllItems(items, {
      round_trips: roundTrips,
      days_per_trip: daysPerTrip,
      nights_per_trip: nightsPerTrip,
      total_nights: totalNights,
      total_calendar_days: totalDays,
    });
  };

  return (
    <Card className="border border-purple-200 bg-purple-50/30">
      <CardHeader
        className="py-2 px-3 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm text-slate-800">
            <Hotel className="w-4 h-4 text-purple-600" />
            {language === 'es' ? 'Hotel & Per Diem' : 'Hotel & Per Diem'}
            <Badge className="bg-purple-100 text-purple-700 text-[9px] border border-purple-200">
              ${grandTotal.toFixed(0)}
            </Badge>
          </CardTitle>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="px-3 pb-3 space-y-3">
          {/* Inputs grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <Label className="text-[10px] flex items-center gap-1 mb-1">
                <Users className="w-3 h-3 text-purple-500" />
                {language === 'es' ? 'Técnicos' : 'Technicians'}
              </Label>
              <Input type="number" min="1" max="20" value={techCount}
                onChange={e => setTechCount(parseInt(e.target.value) || 1)}
                className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] flex items-center gap-1 mb-1">
                <Moon className="w-3 h-3 text-purple-500" />
                {language === 'es' ? 'Viajes' : 'Round Trips'}
              </Label>
              <Input type="number" min="1" max="10" value={roundTrips}
                onChange={e => setRoundTrips(parseInt(e.target.value) || 1)}
                className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] flex items-center gap-1 mb-1">
                <Coffee className="w-3 h-3 text-purple-500" />
                {language === 'es' ? 'Días/Viaje' : 'Days/Trip'}
              </Label>
              <Input type="number" min="1" max="30" value={daysPerTrip}
                onChange={e => setDaysPerTrip(parseInt(e.target.value) || 1)}
                className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] flex items-center gap-1 mb-1">
                <Bed className="w-3 h-3 text-purple-500" />
                {language === 'es' ? 'Noches/Viaje' : 'Nights/Trip'}
              </Label>
              <Input type="number" min="1" max="30" value={nightsPerTrip}
                onChange={e => setNightsPerTrip(parseInt(e.target.value) || 1)}
                className="h-7 text-sm" />
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 bg-white rounded border border-purple-200">
              <p className="text-slate-500 mb-0.5">{hotelName}</p>
              <p className="font-bold text-slate-800">{roomsPerNight} × {totalNights} nts = <span className="text-purple-700">{totalHotelRooms} × ${hotelRate} = ${hotelTotal.toFixed(0)}</span></p>
            </div>
            <div className="p-2 bg-white rounded border border-purple-200">
              <p className="text-slate-500 mb-0.5">{perDiemName}</p>
              <p className="font-bold text-slate-800">{techCount} × {totalDays} days = <span className="text-purple-700">{totalPerDiemDays} × ${perDiemRate} = ${perDiemTotal.toFixed(0)}</span></p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleAddItems}
            className="w-full h-7 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold"
          >
            <Plus className="w-3 h-3 mr-1" />
            <span className="text-[10px]">
              {language === 'es' ? `Agregar Hotel + Per Diem ($${grandTotal.toFixed(0)})` : `Add Hotel + Per Diem ($${grandTotal.toFixed(0)})`}
            </span>
          </Button>
        </CardContent>
      )}
    </Card>
  );
}