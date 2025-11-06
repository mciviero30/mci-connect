import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subQuarters } from 'date-fns';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function DateRangeFilter({ onDateRangeChange, defaultRange = 'this_month' }) {
  const { language } = useLanguage();
  const [selectedRange, setSelectedRange] = useState(defaultRange);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const presetRanges = {
    this_month: {
      label: language === 'es' ? 'Este Mes' : 'This Month',
      getRange: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })
    },
    last_month: {
      label: language === 'es' ? 'Mes Pasado' : 'Last Month',
      getRange: () => {
        const lastMonth = subMonths(new Date(), 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
    },
    this_quarter: {
      label: language === 'es' ? 'Este Trimestre' : 'This Quarter',
      getRange: () => ({ start: startOfQuarter(new Date()), end: endOfQuarter(new Date()) })
    },
    last_quarter: {
      label: language === 'es' ? 'Último Trimestre' : 'Last Quarter',
      getRange: () => {
        const lastQuarter = subQuarters(new Date(), 1);
        return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
      }
    },
    this_year: {
      label: language === 'es' ? 'Este Año' : 'This Year',
      getRange: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) })
    },
    last_3_months: {
      label: language === 'es' ? 'Últimos 3 Meses' : 'Last 3 Months',
      getRange: () => ({ start: subMonths(new Date(), 3), end: new Date() })
    },
    last_6_months: {
      label: language === 'es' ? 'Últimos 6 Meses' : 'Last 6 Months',
      getRange: () => ({ start: subMonths(new Date(), 6), end: new Date() })
    },
    custom: {
      label: language === 'es' ? 'Personalizado' : 'Custom',
      getRange: () => ({ start: new Date(customStart), end: new Date(customEnd) })
    }
  };

  const handleRangeChange = (range) => {
    setSelectedRange(range);
    
    if (range === 'custom') {
      setShowCustom(true);
      return;
    }
    
    setShowCustom(false);
    const { start, end } = presetRanges[range].getRange();
    onDateRangeChange({ start, end, preset: range });
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      onDateRangeChange({ start, end, preset: 'custom' });
      setShowCustom(false);
    }
  };

  const getCurrentRangeLabel = () => {
    if (selectedRange === 'custom' && customStart && customEnd) {
      return `${format(new Date(customStart), 'MMM d, yyyy')} - ${format(new Date(customEnd), 'MMM d, yyyy')}`;
    }
    return presetRanges[selectedRange]?.label || presetRanges.this_month.label;
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Popover open={showCustom} onOpenChange={setShowCustom}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 min-w-[200px] justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{getCurrentRangeLabel()}</span>
            </div>
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-white border-slate-200 p-0">
          <div className="p-4 space-y-3">
            <div className="space-y-2">
              <Label className="text-slate-700 text-xs font-semibold uppercase">
                {language === 'es' ? 'Rangos Predefinidos' : 'Preset Ranges'}
              </Label>
              {Object.entries(presetRanges).filter(([key]) => key !== 'custom').map(([key, value]) => (
                <Button
                  key={key}
                  variant="ghost"
                  className={`w-full justify-start text-sm ${
                    selectedRange === key 
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  onClick={() => handleRangeChange(key)}
                >
                  {value.label}
                </Button>
              ))}
            </div>
            
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <Label className="text-slate-700 text-xs font-semibold uppercase">
                {language === 'es' ? 'Rango Personalizado' : 'Custom Range'}
              </Label>
              <div className="space-y-2">
                <Label className="text-slate-600 text-xs">
                  {language === 'es' ? 'Fecha Inicio' : 'Start Date'}
                </Label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-600 text-xs">
                  {language === 'es' ? 'Fecha Fin' : 'End Date'}
                </Label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  min={customStart}
                  className="bg-slate-50 border-slate-200"
                />
              </div>
              <Button
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd}
                className="w-full bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
              >
                {language === 'es' ? 'Aplicar' : 'Apply'}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}