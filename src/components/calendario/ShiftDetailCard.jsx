import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Clock, Navigation, CheckCircle, XCircle, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

export default function ShiftDetailCard({ shift, job, employees, onClose, onConfirm, onReject, currentUser, language = 'en' }) {
  const isMyShift = currentUser && shift.employee_email === currentUser.email;
  const isPending = shift.status === 'scheduled' && isMyShift;
  
  const handleGetDirections = () => {
    if (job?.address) {
      const encodedAddress = encodeURIComponent(job.address);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  };

  const getStatusBadge = () => {
    if (shift.status === 'confirmed') {
      return <Badge className="badge-soft-green"><CheckCircle className="w-3 h-3 mr-1" /> {language === 'es' ? 'Confirmado' : 'Confirmed'}</Badge>;
    }
    if (shift.status === 'rejected') {
      return <Badge className="badge-soft-red"><XCircle className="w-3 h-3 mr-1" /> {language === 'es' ? 'Rechazado' : 'Rejected'}</Badge>;
    }
    if (shift.status === 'scheduled') {
      return <Badge className="badge-soft-blue"><Clock className="w-3 h-3 mr-1" /> {language === 'es' ? 'Programado' : 'Scheduled'}</Badge>;
    }
    return null;
  };

  return (
    <Card className="bg-white shadow-lg border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#1E3A8A]" />
            {shift.job_name || shift.shift_title || (language === 'es' ? 'Turno' : 'Shift')}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Clock className="w-4 h-4 text-slate-500" />
          <span className="font-medium">{format(new Date(shift.date), 'MMM dd, yyyy')}</span>
          <span className="text-slate-500">•</span>
          <span>{shift.start_time} - {shift.end_time}</span>
        </div>

        {shift.employee_name && (
          <div className="flex items-center gap-2 text-slate-700">
            <Users className="w-4 h-4 text-slate-500" />
            <span>{shift.employee_name}</span>
          </div>
        )}

        {job?.address && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-slate-500 mt-1" />
              <span>{job.address}</span>
            </div>
            <Button
              onClick={handleGetDirections}
              className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white"
            >
              <Navigation className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Obtener Direcciones' : 'Get Directions'}
            </Button>
          </div>
        )}

        {shift.notes && (
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-700">{shift.notes}</p>
          </div>
        )}

        {isPending && (
          <div className="flex gap-2 pt-4 border-t border-slate-200">
            <Button
              onClick={() => onConfirm(shift.id)}
              className="flex-1 soft-green-bg"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Confirmar' : 'Confirm'}
            </Button>
            <Button
              onClick={() => onReject(shift.id)}
              variant="outline"
              className="flex-1 soft-red-bg"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Rechazar' : 'Reject'}
            </Button>
          </div>
        )}

        <Button
          onClick={onClose}
          variant="outline"
          className="w-full"
        >
          {language === 'es' ? 'Cerrar' : 'Close'}
        </Button>
      </CardContent>
    </Card>
  );
}