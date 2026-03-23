import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Users, Moon, Bed, Plus, ChevronDown, ChevronUp, Car, Clock, Coffee } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function FieldVerificationCalculator({ onAddAllItems }) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [itemName, setItemName] = useState('Field Verification');
  const [techCount, setTechCount] = useState(1);
  const [roundTrips, setRoundTrips] = useState(1);
  const [hoursPerTech, setHoursPerTech] = useState(4);
  const [nightsPerTrip, setNightsPerTrip] = useState(0);
  const [daysPerTrip, setDaysPerTrip] = useState(1);
  const [includeLabor, setIncludeLabor] = useState(true);
  const [includeDriving, setIncludeDriving] = useState(true);
  const [includeVehicle, setIncludeVehicle] = useState(false);
  const [includeHotel, setIncludeHotel] = useState(false);
  const [includePerDiem, setIncludePerDiem] = useState(false);

  const roomsPerNight = Math.ceil(techCount / 2);

  const { data: quoteItems = [] } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list(),
    initialData: [],
    staleTime: Infinity,
  });

  const { data: companySettings = {} } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const data = await base44.entities.CompanySettings.list();
      return data[0] || {};
    },
    staleTime: Infinity,
  });

  // Use hardcoded rates (user-specified)
  const laborRate = 60;
  const drivingRatePerTech = 55;
  const vehicleRate = 175.84;
  const hotelRate = 200;
  const perDiemRate = 55;

  const laborCost = includeLabor ? hoursPerTech * techCount * roundTrips * laborRate : 0;
  const drivingCost = includeDriving ? roundTrips * techCount * drivingRatePerTech : 0;
  const vehicleCost = includeVehicle ? roundTrips * vehicleRate : 0;
  const totalNights = nightsPerTrip * roundTrips;
  const totalHotelRooms = roomsPerNight * totalNights;
  const hotelCost = includeHotel ? totalHotelRooms * hotelRate : 0;
  const totalPerDiemDays = techCount * daysPerTrip * roundTrips;
  const perDiemCost = includePerDiem ? totalPerDiemDays * perDiemRate : 0;
  const grandTotal = laborCost + drivingCost + vehicleCost + hotelCost + perDiemCost;

  const buildDescription = () => {
    const lines = [];
    if (includeLabor) lines.push(`${hoursPerTech}h x ${techCount} tech${techCount > 1 ? 's' : ''} x ${roundTrips} trip${roundTrips > 1 ? '(s)' : ''} - $${laborCost.toFixed(0)}`);
    if (includeDriving) lines.push(`${roundTrips} round trip${roundTrips > 1 ? '(s)' : ''} x ${techCount} tech${techCount > 1 ? 's' : ''} - $${drivingCost.toFixed(0)}`);
    if (includeVehicle) lines.push(`1 vehicle x ${roundTrips} trip${roundTrips > 1 ? '(s)' : ''} - $${vehicleCost.toFixed(2)}`);
    if (includeHotel && totalNights > 0) lines.push(`${roomsPerNight} room${roomsPerNight > 1 ? '(s)' : ''} x ${totalNights} night${totalNights > 1 ? '(s)' : ''} - $${hotelCost.toFixed(0)}`);
    if (includePerDiem) lines.push(`${techCount} tech${techCount > 1 ? '(s)' : ''} x ${daysPerTrip * roundTrips} day${(daysPerTrip * roundTrips) > 1 ? '(s)' : ''} - $${perDiemCost.toFixed(0)}`);
    return lines.join('\n');
  };

  const handleAddItem = () => {
    const consolidatedItem = {
      item_name: itemName || 'Field Verification',
      description: buildDescription(),
      quantity: 1,
      unit: 'visit',
      unit_price: grandTotal,
      total: grandTotal,
      is_travel_item: true,
      travel_item_type: 'consolidated_trip',
      auto_calculated: true,
      manual_override: false,
    };

    onAddAllItems([consolidatedItem], {
      round_trips: roundTrips,
      days_per_trip: daysPerTrip,
      nights_per_trip: nightsPerTrip,
      total_nights: nightsPerTrip * roundTrips,
      total_calendar_days: daysPerTrip * roundTrips,
    });
  };

  const Toggle = ({ checked, onChange, label }) => (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-emerald-600"
      />
      <span className="text-[10px] text-slate-600">{label}</span>
    </label>
  );

  return (
    <Card className="border border-emerald-200 bg-emerald-50/30">
      <CardHeader className="py-2 px-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm text-slate-800">
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            {language === 'es' ? 'Verificación de Campo' : 'Field Verification'}
            <Badge className="bg-emerald-100 text-emerald-700 text-[9px] border border-emerald-200">
              ${grandTotal.toFixed(2)}
            </Badge>
          </CardTitle>
          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="px-3 pb-3 space-y-3">
          {/* Item Name */}
          <div>
            <Label className="text-[10px] mb-1 block">{language === 'es' ? 'Nombre del Item' : 'Item Name'}</Label>
            <Input
              value={itemName}
              onChange={e => setItemName(e.target.value)}
              placeholder="Field Verification / Site Survey..."
              className="h-7 text-sm"
            />
          </div>

          {/* Main inputs */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <Label className="text-[10px] flex items-center gap-1 mb-1">
                <Users className="w-3 h-3 text-emerald-500" />
                {language === 'es' ? 'Técnicos' : 'Techs'}
              </Label>
              <Input type="number" min="1" max="20" value={techCount}
                onChange={e => setTechCount(parseInt(e.target.value) || 1)} className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] flex items-center gap-1 mb-1">
                <Moon className="w-3 h-3 text-emerald-500" />
                {language === 'es' ? 'Viajes' : 'Round Trips'}
              </Label>
              <Input type="number" min="1" max="10" value={roundTrips}
                onChange={e => setRoundTrips(parseInt(e.target.value) || 1)} className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-emerald-500" />
                {language === 'es' ? 'Hrs/Técnico' : 'Hrs/Tech'}
              </Label>
              <Input type="number" min="1" max="16" value={hoursPerTech}
                onChange={e => setHoursPerTech(parseInt(e.target.value) || 1)} className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] flex items-center gap-1 mb-1">
                <Bed className="w-3 h-3 text-emerald-500" />
                {language === 'es' ? 'Noches/Viaje' : 'Nights/Trip'}
              </Label>
              <Input type="number" min="0" max="30" value={nightsPerTrip}
                onChange={e => setNightsPerTrip(parseInt(e.target.value) || 0)} className="h-7 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] flex items-center gap-1 mb-1">
                <Coffee className="w-3 h-3 text-emerald-500" />
                {language === 'es' ? 'Días/Viaje' : 'Days/Trip'}
              </Label>
              <Input type="number" min="1" max="30" value={daysPerTrip}
                onChange={e => setDaysPerTrip(parseInt(e.target.value) || 1)} className="h-7 text-sm" />
            </div>
          </div>

          {/* Include toggles */}
          <div className="flex flex-wrap gap-3 p-2 bg-white rounded border border-emerald-100">
            <Toggle checked={includeLabor} onChange={setIncludeLabor} label={`Labor ($${laborRate}/h)`} />
            <Toggle checked={includeDriving} onChange={setIncludeDriving} label={`Driving ($${drivingRatePerTech}/tech)`} />
            <Toggle checked={includeVehicle} onChange={setIncludeVehicle} label={`Vehicle ($${vehicleRate})`} />
            <Toggle checked={includeHotel} onChange={setIncludeHotel} label={`Hotel ($${hotelRate}/nt)`} />
            <Toggle checked={includePerDiem} onChange={setIncludePerDiem} label={`Per Diem ($${perDiemRate}/day)`} />
          </div>

          {/* Preview */}
          <div className="p-2 bg-white rounded border border-emerald-200 text-[10px]">
            <p className="font-bold text-slate-800 mb-1">{itemName || 'Field Verification'} — {roundTrips} visit{roundTrips > 1 ? '(s)' : ''} — ${grandTotal.toFixed(2)}</p>
            <div className="text-slate-500 space-y-0.5">
              {buildDescription().split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>

          <Button
            type="button"
            onClick={handleAddItem}
            className="w-full h-7 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold"
          >
            <Plus className="w-3 h-3 mr-1" />
            <span className="text-[10px]">
              {language === 'es'
                ? `Agregar "${itemName}" ($${grandTotal.toFixed(2)})`
                : `Add "${itemName}" ($${grandTotal.toFixed(2)})`}
            </span>
          </Button>
        </CardContent>
      )}
    </Card>
  );
}