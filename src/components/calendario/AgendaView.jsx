import React from 'react';
import { format, isSameDay, parseISO, isToday } from 'date-fns';
import { Clock, MapPin, User, Briefcase, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const SHIFT_COLORS = {
  job_work: 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20',
  appointment: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
  time_off: 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20',
};

const STATUS_ICONS = {
  pending: <AlertCircle className="w-4 h-4 text-amber-500" />,
  confirmed: <CheckCircle className="w-4 h-4 text-green-500" />,
  rejected: <XCircle className="w-4 h-4 text-red-500" />,
};

export default function AgendaView({ 
  currentDate, 
  shifts, 
  onShiftClick,
  onConfirmShift,
  onRejectShift,
  isAdmin,
  currentUser,
  language = 'en'
}) {
  // Get shifts for the selected day
  const dayShifts = shifts
    .filter(s => s.date && isSameDay(parseISO(s.date), currentDate))
    .sort((a, b) => {
      if (!a.start_time) return 1;
      if (!b.start_time) return -1;
      return a.start_time.localeCompare(b.start_time);
    });

  const isMyShift = (shift) => shift.employee_email === currentUser?.email;

  return (
    <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {language === 'es' ? 'Agenda del Día' : 'Day Agenda'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
              {isToday(currentDate) && (
                <Badge className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {language === 'es' ? 'Hoy' : 'Today'}
                </Badge>
              )}
            </p>
          </div>
          <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
            {dayShifts.length} {language === 'es' ? 'eventos' : 'events'}
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="p-4 space-y-3">
          {dayShifts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{language === 'es' ? 'No hay eventos programados' : 'No events scheduled'}</p>
            </div>
          ) : (
            dayShifts.map(shift => (
              <div
                key={shift.id}
                onClick={() => onShiftClick(shift)}
                className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${SHIFT_COLORS[shift.shift_type] || SHIFT_COLORS.appointment}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {shift.title || shift.job_name || (language === 'es' ? 'Sin título' : 'Untitled')}
                      </span>
                      {STATUS_ICONS[shift.status]}
                    </div>
                    
                    <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      {shift.start_time && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{shift.start_time} - {shift.end_time || '?'}</span>
                        </div>
                      )}
                      
                      {shift.employee_name && (
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{shift.employee_name}</span>
                        </div>
                      )}
                      
                      {shift.job_name && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          <span>{shift.job_name}</span>
                        </div>
                      )}
                      
                      {shift.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{shift.location}</span>
                        </div>
                      )}
                    </div>

                    {shift.notes && (
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                        {shift.notes}
                      </p>
                    )}
                  </div>

                  {/* Action buttons for employee */}
                  {isMyShift(shift) && shift.status === 'pending' && (
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfirmShift(shift.id);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {language === 'es' ? 'Confirmar' : 'Confirm'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRejectShift(shift.id);
                        }}
                        className="border-red-300 text-red-600 hover:bg-red-50 h-7 text-xs"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        {language === 'es' ? 'Rechazar' : 'Reject'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}