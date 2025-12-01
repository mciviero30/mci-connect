import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MiniCalendar({ 
  currentDate, 
  onDateSelect, 
  shifts = [],
  language = 'en'
}) {
  const [viewDate, setViewDate] = React.useState(currentDate);

  React.useEffect(() => {
    setViewDate(currentDate);
  }, [currentDate]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getShiftCount = (date) => {
    return shifts.filter(s => s.date && isSameDay(new Date(s.date), date)).length;
  };

  const weekDays = language === 'es' 
    ? ['L', 'M', 'X', 'J', 'V', 'S', 'D']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="bg-white dark:bg-[#282828] rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          {format(viewDate, 'MMM yyyy')}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const isCurrentMonth = isSameMonth(d, viewDate);
          const isSelected = isSameDay(d, currentDate);
          const isTodayDate = isToday(d);
          const shiftCount = getShiftCount(d);

          return (
            <button
              key={i}
              onClick={() => onDateSelect(d)}
              className={`
                relative h-8 w-8 rounded-lg text-xs font-medium transition-all
                ${!isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'}
                ${isSelected ? 'bg-[#3B9FF3] text-white' : ''}
                ${isTodayDate && !isSelected ? 'ring-2 ring-[#3B9FF3] ring-inset' : ''}
                ${!isSelected ? 'hover:bg-slate-100 dark:hover:bg-slate-700' : ''}
              `}
            >
              {format(d, 'd')}
              {shiftCount > 0 && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}