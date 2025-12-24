import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Users, 
  Clock, 
  Bell, 
  ExternalLink, 
  Navigation,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { remindCrew } from './ShiftNotifications';
import { useToast } from '@/components/ui/toast';

export default function EventDetailCard({ shift, employees, jobs, currentUser, isAdmin, language = 'en' }) {
  const [reminding, setReminding] = useState(false);
  const toast = useToast();

  if (!shift) return null;

  const job = jobs?.find(j => j.id === shift.job_id);
  const assignedCrew = (shift.assigned_crew || [shift.employee_email]).filter(Boolean);
  const crewMembers = employees?.filter(e => assignedCrew.includes(e.email)) || [];

  const handleRemindCrew = async () => {
    setReminding(true);
    try {
      await remindCrew(shift, employees);
      toast.success(language === 'es' 
        ? '✅ Recordatorio enviado al equipo' 
        : '✅ Crew reminder sent');
    } catch (error) {
      toast.error(language === 'es' 
        ? '❌ Error al enviar recordatorio' 
        : '❌ Error sending reminder');
    }
    setReminding(false);
  };

  const handleGetDirections = () => {
    const location = shift.location || job?.address;
    if (!location) return;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const encodedAddress = encodeURIComponent(location);
    
    // Try to open Waze first on mobile, fallback to Google Maps
    if (isMobile) {
      window.open(`https://waze.com/ul?q=${encodedAddress}&navigate=yes`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
    }
  };

  const getStatusBadge = () => {
    if (!job) return null;

    const statusConfig = {
      active: { label: language === 'es' ? 'En Progreso' : 'In Progress', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Loader2 },
      completed: { label: language === 'es' ? 'Completado' : 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle },
      on_hold: { label: language === 'es' ? 'Pendiente' : 'Pending', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: AlertCircle }
    };

    const config = statusConfig[job.status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const shiftDate = shift.date ? new Date(shift.date) : null;
  const timeRange = shift.start_time && shift.end_time 
    ? `${shift.start_time} - ${shift.end_time}` 
    : language === 'es' ? 'Todo el día' : 'All day';

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg">
      <CardHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-slate-900 dark:text-white mb-2">
              {shift.title || shift.job_name || (language === 'es' ? 'Evento sin título' : 'Untitled Event')}
            </CardTitle>
            {shiftDate && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span>{format(shiftDate, 'EEEE, MMMM d, yyyy')} • {timeRange}</span>
              </div>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Location with Directions */}
        {(shift.location || job?.address) && (
          <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <MapPin className="w-5 h-5 text-orange-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                {language === 'es' ? 'Ubicación' : 'Location'}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {shift.location || job?.address}
              </p>
              <Button
                size="sm"
                onClick={handleGetDirections}
                className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-sm"
              >
                <Navigation className="w-3 h-3 mr-1" />
                {language === 'es' ? 'Obtener Direcciones' : 'Get Directions'}
              </Button>
            </div>
          </div>
        )}

        {/* Job Reference */}
        {job && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                {language === 'es' ? 'Proyecto' : 'Project'}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">{job.name}</p>
              {job.customer_name && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {language === 'es' ? 'Cliente: ' : 'Client: '}{job.customer_name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Assigned Crew */}
        {crewMembers.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                {language === 'es' ? 'Equipo Asignado' : 'Assigned Crew'}
              </p>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {crewMembers.length} {language === 'es' ? 'miembro(s)' : 'member(s)'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {crewMembers.map(member => (
                <div 
                  key={member.email} 
                  className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg"
                >
                  {member.profile_photo_url ? (
                    <img 
                      src={member.profile_photo_url} 
                      alt={member.full_name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {member.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <span className="text-sm text-slate-900 dark:text-white">
                    {member.full_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {shift.notes && (
          <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <p className="text-sm text-slate-700 dark:text-slate-300">{shift.notes}</p>
          </div>
        )}

        {/* Admin Actions */}
        {isAdmin && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              onClick={handleRemindCrew}
              disabled={reminding}
              className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-md"
            >
              {reminding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'es' ? 'Enviando...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Recordar al Equipo' : 'Remind Crew'}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}