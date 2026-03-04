import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Clock, Navigation, CheckCircle, XCircle, X, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { isMyShift as checkIsMyShift } from '@/components/calendario/calendarHelpers';

export default function ShiftDetailCard({ 
  open, 
  onOpenChange, 
  shift, 
  job, 
  employees = [], 
  onConfirm, 
  onReject, 
  currentUser, 
  language = 'en' 
}) {
  if (!shift) return null;
  
  const isMyShift = checkIsMyShift(shift, currentUser);
  const isPending = shift.status === 'scheduled' && isMyShift;
  
  const handleGetDirections = () => {
    if (job?.address) {
      const encodedAddress = encodeURIComponent(job.address);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  };

  const getStatusBadge = () => {
    if (shift.status === 'confirmed') {
      return (
        <Badge className="bg-green-100 text-green-700 border border-green-300 px-3 py-1 text-xs font-medium">
          <CheckCircle className="w-3 h-3 mr-1.5" />
          {language === 'es' ? 'Confirmado' : 'Confirmed'}
        </Badge>
      );
    }
    if (shift.status === 'rejected') {
      return (
        <Badge className="bg-red-100 text-red-700 border border-red-300 px-3 py-1 text-xs font-medium">
          <XCircle className="w-3 h-3 mr-1.5" />
          {language === 'es' ? 'Rechazado' : 'Rejected'}
        </Badge>
      );
    }
    if (shift.status === 'scheduled') {
      return (
        <Badge className="bg-blue-100 text-blue-700 border border-blue-300 px-3 py-1 text-xs font-medium">
          <Clock className="w-3 h-3 mr-1.5" />
          {language === 'es' ? 'Programado' : 'Scheduled'}
        </Badge>
      );
    }
    return null;
  };

  // Get assigned crew member — dual-key: user_id first, email fallback
  const assignedEmployee = employees.find(emp => 
    shift.user_id ? emp.id === shift.user_id : emp.email === shift.employee_email
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-2xl shadow-2xl border-0 max-w-lg p-0 gap-0 overflow-hidden sm:max-w-lg">
        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-start justify-between mb-3">
            <h2 className="text-2xl font-bold text-[#1E3A8A] leading-tight pr-4">
              {shift.job_name || shift.shift_title || (language === 'es' ? 'Turno' : 'Shift')}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full -mt-2 -mr-2 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          {getStatusBadge()}
        </div>

        {/* Content - Spacious Layout */}
        <div className="px-8 pb-8 space-y-6">
          {/* Time & Date */}
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-slate-50 rounded-xl flex-shrink-0">
              <CalendarIcon className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
                {language === 'es' ? 'Fecha y Hora' : 'Date & Time'}
              </p>
              <p className="text-slate-900 font-semibold text-base">{format(new Date(shift.date), 'EEEE, MMMM dd, yyyy')}</p>
              <p className="text-slate-700 text-sm mt-0.5">{shift.start_time} - {shift.end_time}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Crew Assigned */}
          {assignedEmployee && (
            <>
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-slate-50 rounded-xl flex-shrink-0">
                  <Users className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">
                    {language === 'es' ? 'Equipo Asignado' : 'Crew Assigned'}
                  </p>
                  <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                    {assignedEmployee.profile_photo_url || assignedEmployee.avatar_image_url ? (
                      <img
                        src={assignedEmployee.profile_photo_url || assignedEmployee.avatar_image_url}
                        alt={assignedEmployee.full_name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {assignedEmployee.full_name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{assignedEmployee.full_name}</p>
                      <p className="text-xs text-slate-500">{assignedEmployee.position || assignedEmployee.department}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-100" />
            </>
          )}

          {/* Address & Navigation */}
          {job?.address && (
            <>
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-slate-50 rounded-xl flex-shrink-0">
                  <MapPin className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                    {language === 'es' ? 'Ubicación' : 'Location'}
                  </p>
                  <p className="text-slate-700 text-sm leading-relaxed mb-4">{job.address}</p>
                  <Button
                    onClick={handleGetDirections}
                    className="w-full bg-white border-2 border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white transition-all shadow-sm font-semibold"
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Obtener Direcciones' : 'Get Directions'}
                  </Button>
                </div>
              </div>
              <div className="border-t border-slate-100" />
            </>
          )}

          {/* Notes */}
          {shift.notes && (
            <>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-2">
                  {language === 'es' ? 'Notas' : 'Notes'}
                </p>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-4">
                  {shift.notes}
                </p>
              </div>
              <div className="border-t border-slate-100" />
            </>
          )}

          {/* Confirm/Reject Actions */}
          {isPending && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => {
                  onConfirm(shift.id);
                  onOpenChange(false);
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md font-semibold"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Confirmar' : 'Confirm'}
              </Button>
              <Button
                onClick={() => {
                  onReject(shift.id);
                  onOpenChange(false);
                }}
                variant="outline"
                className="flex-1 border-2 border-red-300 text-red-700 hover:bg-red-50 font-semibold"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Rechazar' : 'Reject'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}