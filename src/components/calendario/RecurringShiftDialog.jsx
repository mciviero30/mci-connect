import React, { useState } from 'react';
import { Repeat, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { addDays, addWeeks, addMonths, format } from 'date-fns';

export default function RecurringShiftDialog({ 
  open, 
  onOpenChange, 
  baseShift,
  onCreateRecurring,
  language = 'en'
}) {
  const [recurrenceType, setRecurrenceType] = useState('weekly');
  const [interval, setInterval] = useState(1);
  const [endType, setEndType] = useState('count');
  const [occurrences, setOccurrences] = useState(4);
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);

  const weekDays = [
    { value: 0, label: language === 'es' ? 'Dom' : 'Sun' },
    { value: 1, label: language === 'es' ? 'Lun' : 'Mon' },
    { value: 2, label: language === 'es' ? 'Mar' : 'Tue' },
    { value: 3, label: language === 'es' ? 'Mié' : 'Wed' },
    { value: 4, label: language === 'es' ? 'Jue' : 'Thu' },
    { value: 5, label: language === 'es' ? 'Vie' : 'Fri' },
    { value: 6, label: language === 'es' ? 'Sáb' : 'Sat' },
  ];

  const toggleDay = (day) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const generateDates = () => {
    if (!baseShift?.date) return [];
    
    const dates = [];
    let currentDate = new Date(baseShift.date);
    let count = 0;
    const maxDate = endDate ? new Date(endDate) : addMonths(currentDate, 12);
    const maxCount = endType === 'count' ? occurrences : 52;

    while (count < maxCount && currentDate <= maxDate) {
      if (recurrenceType === 'daily') {
        dates.push(new Date(currentDate));
        currentDate = addDays(currentDate, interval);
      } else if (recurrenceType === 'weekly') {
        if (selectedDays.length === 0 || selectedDays.includes(currentDate.getDay())) {
          dates.push(new Date(currentDate));
        }
        currentDate = addDays(currentDate, 1);
        if (currentDate.getDay() === 0) {
          currentDate = addDays(currentDate, (interval - 1) * 7);
        }
      } else if (recurrenceType === 'monthly') {
        dates.push(new Date(currentDate));
        currentDate = addMonths(currentDate, interval);
      }
      count++;
    }

    return dates.slice(0, maxCount);
  };

  const handleCreate = () => {
    const dates = generateDates();
    onCreateRecurring(dates);
    onOpenChange(false);
  };

  const previewDates = generateDates().slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Repeat className="w-5 h-5 text-[#3B9FF3]" />
            {language === 'es' ? 'Turno Recurrente' : 'Recurring Shift'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recurrence Type */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Repetir' : 'Repeat'}
            </Label>
            <Select value={recurrenceType} onValueChange={setRecurrenceType}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{language === 'es' ? 'Diario' : 'Daily'}</SelectItem>
                <SelectItem value="weekly">{language === 'es' ? 'Semanal' : 'Weekly'}</SelectItem>
                <SelectItem value="monthly">{language === 'es' ? 'Mensual' : 'Monthly'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interval */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Cada' : 'Every'}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="1"
                max="12"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                className="w-20 bg-slate-50 dark:bg-slate-800"
              />
              <span className="text-slate-600 dark:text-slate-400">
                {recurrenceType === 'daily' && (language === 'es' ? 'día(s)' : 'day(s)')}
                {recurrenceType === 'weekly' && (language === 'es' ? 'semana(s)' : 'week(s)')}
                {recurrenceType === 'monthly' && (language === 'es' ? 'mes(es)' : 'month(s)')}
              </span>
            </div>
          </div>

          {/* Weekly day selection */}
          {recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">
                {language === 'es' ? 'Días de la semana' : 'Days of week'}
              </Label>
              <div className="flex gap-1">
                {weekDays.map(day => (
                  <button
                    key={day.value}
                    onClick={() => toggleDay(day.value)}
                    className={`w-9 h-9 rounded-lg text-xs font-medium transition-all ${
                      selectedDays.includes(day.value)
                        ? 'bg-[#3B9FF3] text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End condition */}
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Terminar' : 'End'}
            </Label>
            <Select value={endType} onValueChange={setEndType}>
              <SelectTrigger className="bg-slate-50 dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">{language === 'es' ? 'Después de X ocurrencias' : 'After X occurrences'}</SelectItem>
                <SelectItem value="date">{language === 'es' ? 'En fecha específica' : 'On specific date'}</SelectItem>
              </SelectContent>
            </Select>

            {endType === 'count' ? (
              <Input
                type="number"
                min="1"
                max="52"
                value={occurrences}
                onChange={(e) => setOccurrences(parseInt(e.target.value) || 1)}
                className="bg-slate-50 dark:bg-slate-800"
              />
            ) : (
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800"
              />
            )}
          </div>

          {/* Preview */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              {language === 'es' ? 'Vista previa:' : 'Preview:'}
            </p>
            <div className="space-y-1">
              {previewDates.map((date, idx) => (
                <p key={idx} className="text-sm text-slate-700 dark:text-slate-300">
                  {format(date, 'EEE, MMM d, yyyy')}
                </p>
              ))}
              {generateDates().length > 5 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  +{generateDates().length - 5} {language === 'es' ? 'más...' : 'more...'}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handleCreate} className="bg-[#3B9FF3]">
            <Repeat className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Crear Turnos' : 'Create Shifts'} ({generateDates().length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}