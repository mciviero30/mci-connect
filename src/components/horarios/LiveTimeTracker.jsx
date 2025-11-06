
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Combobox } from '@/components/ui/combobox';
import { Clock, Play, Square, Coffee, MapPin, Briefcase, AlertCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotificationService } from '../notifications/NotificationService';

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

export default function LiveTimeTracker({ trackingType, onSave, isLoading }) {
  const { t, language } = useLanguage();
  const storageKey = `liveTimeTracker_${trackingType}`;

  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [showWorkTypeDialog, setShowWorkTypeDialog] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // NEW: Prompt #52 - Work Type and Task Details
  const [workType, setWorkType] = useState('normal');
  const [taskDetails, setTaskDetails] = useState('');
  const [selectedJobForStart, setSelectedJobForStart] = useState(null);

  const { data: jobs } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    initialData: [],
  });
  
  // NEW: Get current user for notifications
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  // NEW: Notification service
  const { sendNotification } = useNotificationService(user);

  const jobOptions = jobs.map(j => ({ value: j.id, label: j.name }));

  useEffect(() => {
    const savedSession = JSON.parse(localStorage.getItem(storageKey));
    if (savedSession) {
      setActiveSession(savedSession);
    }
  }, [storageKey]);

  useEffect(() => {
    let interval;
    if (activeSession && !activeSession.onBreak) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeSession.startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  // NEW: Check for clock open from previous day and send notification
  useEffect(() => {
    if (activeSession && user) {
      const sessionDate = new Date(activeSession.startTime);
      const today = new Date();
      
      // Check if session is from a previous day
      if (sessionDate.toDateString() !== today.toDateString()) {
        const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        sendNotification({
          recipientEmail: user.email,
          recipientName: user.full_name,
          type: 'clock_open',
          priority: 'urgent',
          title: language === 'es' ? '⚠️ Reloj Abierto Detectado' : '⚠️ Open Clock Detected',
          message: language === 'es'
            ? `Tienes un reloj activo desde hace ${daysDiff} día${daysDiff > 1 ? 's' : ''} para ${activeSession.jobName}. Por favor ciérralo ahora.`
            : `You have an active clock from ${daysDiff} day${daysDiff > 1 ? 's' : ''} ago for ${activeSession.jobName}. Please close it now.`,
          actionUrl: '/MisHoras',
          relatedEntityType: 'timeentry',
          sendEmail: true // Send email for urgent cases
        });
      }
    }
  }, [activeSession, user, sendNotification, language]);

  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject('Geolocation not supported');
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err.message)
      );
    });
  }, []);

  const handleClockIn = async () => {
    setShowJobSelector(true);
  };
  
  const handleJobSelected = async (jobId) => {
    if (!jobId) return;
    setSelectedJobForStart(jobId);
    setShowJobSelector(false);
    setShowWorkTypeDialog(true); // NEW: Show work type dialog
  };

  // NEW: Modified handleStartSession with geofencing notification
  const handleStartSession = async () => {
    if (!selectedJobForStart) return;
    if (!user) { // Ensure user is loaded for notifications
      setLocationError(language === 'es' ? 'Error: Usuario no cargado. Intenta de nuevo.' : 'Error: User not loaded. Please try again.');
      setShowWorkTypeDialog(false);
      return;
    }
    
    try {
      const location = await getLocation();
      const job = jobs.find(j => j.id === selectedJobForStart);
      
      // NEW: Prompt #51 - Geofencing validation
      let geofenceValidated = true;
      let distanceMeters = 0;
      let requiresReview = false;

      if (job.latitude && job.longitude) {
        distanceMeters = calculateDistance(
          location.lat,
          location.lng,
          job.latitude,
          job.longitude
        );

        // NEW: Send notification if entering job site
        if (distanceMeters <= 500) {
          sendNotification({
            recipientEmail: user.email,
            recipientName: user.full_name,
            type: 'geofence_entry',
            priority: 'medium',
            title: language === 'es' ? '📍 Entrada al Sitio' : '📍 Job Site Entry',
            message: language === 'es'
              ? `Has entrado al sitio de trabajo: ${job.name}`
              : `You've entered the job site: ${job.name}`,
            actionUrl: '/MisHoras',
            relatedEntityType: 'job',
            relatedEntityId: job.id
          });
        }

        if (distanceMeters > 500) {
          geofenceValidated = false;
          const confirmed = window.confirm(
            language === 'es' 
              ? `⚠️ Ubicación fuera del sitio del proyecto (${Math.round(distanceMeters)}m). ¿Confirmar de todos modos?`
              : `⚠️ Location outside project site (${Math.round(distanceMeters)}m). Confirm anyway?`
          );
          
          if (!confirmed) {
            setShowWorkTypeDialog(false);
            return;
          }
          requiresReview = true;
          
          // NEW: Send notification for admin review
          const admins = await base44.entities.User.filter({ role: 'admin' });
          for (const admin of admins) {
            sendNotification({
              recipientEmail: admin.email,
              recipientName: admin.full_name,
              type: 'approval_required',
              priority: 'high',
              title: language === 'es' ? '⚠️ Revisión de Ubicación Requerida' : '⚠️ Location Review Required',
              message: language === 'es'
                ? `${user.full_name} fichó fuera del geofence (${Math.round(distanceMeters)}m) para ${job.name}`
                : `${user.full_name} clocked in outside geofence (${Math.round(distanceMeters)}m) for ${job.name}`,
              actionUrl: '/Horarios',
              relatedEntityType: 'timeentry'
            });
          }
        }
      }

      const session = {
        startTime: Date.now(),
        checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        jobId: selectedJobForStart,
        jobName: job.name,
        location,
        onBreak: false,
        breakDuration: 0,
        workType, // NEW: Store work type
        taskDetails, // NEW: Store task details
        geofenceValidated,
        distanceMeters,
        requiresReview,
      };
      
      localStorage.setItem(storageKey, JSON.stringify(session));
      setActiveSession(session);
      setLocationError(null);
      setShowWorkTypeDialog(false);
      
      // Reset form
      setWorkType('normal');
      setTaskDetails('');
    } catch (error) {
      setLocationError(error.message || error);
      setShowWorkTypeDialog(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) { // Ensure user is loaded for notifications
      setLocationError(language === 'es' ? 'Error: Usuario no cargado. Intenta de nuevo.' : 'Error: User not loaded. Please try again.');
      return;
    }
    try {
      const location = await getLocation();
      const endTime = Date.now();
      const totalHours = (endTime - activeSession.startTime - activeSession.breakDuration) / (1000 * 60 * 60);

      // NEW: Prompt #50 - Validate maximum 14 hours and send notification
      if (totalHours > 14) {
        // Send urgent notification
        sendNotification({
          recipientEmail: user.email,
          recipientName: user.full_name,
          type: 'time_exceeded',
          priority: 'urgent',
          title: language === 'es' ? '🚨 Límite de Horas Excedido' : '🚨 Hour Limit Exceeded',
          message: language === 'es'
            ? `Tu turno ha excedido las 14 horas (${totalHours.toFixed(1)}h). Contacta a tu supervisor.`
            : `Your shift has exceeded 14 hours (${totalHours.toFixed(1)}h). Contact your supervisor.`,
          actionUrl: '/MisHoras',
          relatedEntityType: 'timeentry',
          sendEmail: true
        });
        
        // Notify admins
        const admins = await base44.entities.User.filter({ role: 'admin' });
        for (const admin of admins) {
          sendNotification({
            recipientEmail: admin.email,
            recipientName: admin.full_name,
            type: 'approval_required',
            priority: 'urgent',
            title: language === 'es' ? '🚨 Turno Excede 14 Horas' : '🚨 Shift Exceeds 14 Hours',
            message: language === 'es'
              ? `${user.full_name} ha trabajado ${totalHours.toFixed(1)} horas en ${activeSession.jobName}`
              : `${user.full_name} has worked ${totalHours.toFixed(1)} hours on ${activeSession.jobName}`,
            actionUrl: '/Horarios',
            relatedEntityType: 'timeentry'
          });
        }
        
        alert(
          language === 'es'
            ? '❌ Error: Límite máximo de turno (14 horas) excedido. Por favor contacta a tu supervisor.'
            : '❌ Error: Maximum shift limit (14 hours) exceeded. Please contact your supervisor.'
        );
        return;
      }

      // NEW: Calculate geofence for check-out and send notification
      let checkOutGeofenceValidated = true;
      let checkOutDistanceMeters = 0;
      const job = jobs.find(j => j.id === activeSession.jobId);

      if (job?.latitude && job?.longitude) {
        checkOutDistanceMeters = calculateDistance(
          location.lat,
          location.lng,
          job.latitude,
          job.longitude
        );

        if (checkOutDistanceMeters > 500) {
          checkOutGeofenceValidated = false;
        }
        
        // NEW: Send notification when leaving job site
        if (checkOutDistanceMeters <= 500) {
          sendNotification({
            recipientEmail: user.email,
            recipientName: user.full_name,
            type: 'geofence_exit',
            priority: 'low',
            title: language === 'es' ? '📍 Salida del Sitio' : '📍 Job Site Exit',
            message: language === 'es'
              ? `Has salido del sitio de trabajo: ${job.name}. Tiempo trabajado: ${totalHours.toFixed(1)}h`
              : `You've left the job site: ${job.name}. Time worked: ${totalHours.toFixed(1)}h`,
            actionUrl: '/MisHoras',
            relatedEntityType: 'job',
            relatedEntityId: job.id
          });
        }
      }

      onSave({
        job_id: activeSession.jobId,
        job_name: activeSession.jobName,
        date: new Date().toISOString().split('T')[0],
        check_in: activeSession.checkIn,
        check_out: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        check_in_latitude: activeSession.location.lat,
        check_in_longitude: activeSession.location.lng,
        check_out_latitude: location.lat,
        check_out_longitude: location.lng,
        hours_worked: totalHours,
        lunch_minutes: Math.floor(activeSession.breakDuration / (1000 * 60)),
        work_type: activeSession.workType, // NEW
        task_details: activeSession.taskDetails, // NEW
        geofence_validated: activeSession.geofenceValidated && checkOutGeofenceValidated, // NEW
        geofence_distance_meters: Math.max(activeSession.distanceMeters, checkOutDistanceMeters), // NEW
        requires_location_review: activeSession.requiresReview || !checkOutGeofenceValidated, // NEW
        exceeds_max_hours: false, // NEW - Already validated above
      });

      localStorage.removeItem(storageKey);
      setActiveSession(null);
      setElapsed(0);
      setLocationError(null);
    } catch (error) {
      setLocationError(error.message || error);
    }
  };

  const handleToggleBreak = () => {
    const now = Date.now();
    let updatedSession;

    if (activeSession.onBreak) {
      const breakTime = now - activeSession.breakStartTime;
      updatedSession = {
        ...activeSession,
        onBreak: false,
        breakDuration: activeSession.breakDuration + breakTime,
        breakStartTime: null,
      };
    } else {
      updatedSession = {
        ...activeSession,
        onBreak: true,
        breakStartTime: now,
      };
    }
    localStorage.setItem(storageKey, JSON.stringify(updatedSession));
    setActiveSession(updatedSession);
  };
  
  if (activeSession) {
    // NEW: Prompt #50 - Check if session exceeds 14 hours
    const sessionHours = elapsed / 3600;
    const exceedsMaxHours = sessionHours > 14;

    return (
      <Card className={`border-0 shadow-xl mb-8 ${exceedsMaxHours ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-blue-600 to-blue-800'} text-white overflow-hidden`}>
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Briefcase className="w-5 h-5 opacity-80"/>
            <Badge variant="secondary">{activeSession.jobName}</Badge>
            {activeSession.workType !== 'normal' && (
              <Badge variant="outline" className="bg-white/20 border-white/30">
                {activeSession.workType === 'driving' ? (language === 'es' ? 'Manejo' : 'Driving') :
                 activeSession.workType === 'setup' ? (language === 'es' ? 'Preparación' : 'Setup') :
                 (language === 'es' ? 'Limpieza' : 'Cleanup')}
              </Badge>
            )}
          </div>

          {/* NEW: Warning for exceeding 14 hours */}
          {exceedsMaxHours && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-400 rounded-lg flex items-center justify-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold text-sm">
                {language === 'es' 
                  ? '¡LÍMITE EXCEDIDO! Contacta a tu supervisor' 
                  : 'LIMIT EXCEEDED! Contact your supervisor'}
              </span>
            </div>
          )}

          <h1 className="text-7xl font-bold font-mono tracking-tighter">
            {activeSession.onBreak ? formatTime(activeSession.breakDuration / 1000) : formatTime(elapsed)}
          </h1>
          
          <div className="flex items-center justify-center gap-2 text-sm opacity-80 mt-2">
             <MapPin className="w-4 h-4"/>
             <span>{language === 'es' ? 'Fichado a las' : 'Clocked in at'} {activeSession.checkIn}</span>
          </div>

          {/* NEW: Show geofence warning if location was out of range */}
          {activeSession.requiresReview && (
            <div className="mt-2 text-center text-yellow-300">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <span className="text-xs">
                {language === 'es' 
                  ? 'Ubicación marcada para revisión' 
                  : 'Location flagged for review'}
              </span>
            </div>
          )}

          {locationError && (
            <div className="mt-4 text-center text-red-300">
                <p className="text-sm font-semibold">{locationError}</p>
                <p className="text-xs mt-1">
                  {language === 'es' 
                    ? 'Por favor, activa la ubicación y refresca la página.' 
                    : 'Please enable location and refresh the page.'}
                </p>
            </div>
          )}
          
          <div className="flex gap-4 justify-center mt-6">
            <Button onClick={handleToggleBreak} variant="secondary" size="lg" className="rounded-full">
              <Coffee className="w-5 h-5 mr-2"/>
              {activeSession.onBreak ? (language === 'es' ? 'Reanudar Trabajo' : 'Resume Work') : (language === 'es' ? 'Iniciar Pausa' : 'Start Break')}
            </Button>
            <Button 
              onClick={handleClockOut} 
              variant="destructive" 
              size="lg" 
              className="rounded-full" 
              disabled={isLoading || exceedsMaxHours}
            >
              <Square className="w-5 h-5 mr-2"/>
              {t('checkOut')}
            </Button>
          </div>

          {exceedsMaxHours && (
            <p className="text-xs text-white/70 mt-3">
              {language === 'es' 
                ? 'No puedes cerrar automáticamente. Requiere revisión manual.' 
                : 'Cannot auto clock-out. Requires manual review.'}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-lg mb-8">
        <CardContent className="p-6 text-center">
          <Button
            onClick={handleClockIn}
            size="lg"
            className="h-24 w-24 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-lg"
            disabled={isLoading}
          >
            <Clock className="w-8 h-8 mb-1"/>
          </Button>
          <p className="mt-4 font-semibold text-xl text-slate-800">{t('checkIn')}</p>
          {locationError && (
            <div className="mt-2 text-center text-red-500">
                <AlertCircle className="mx-auto h-6 w-6" />
                <p className="text-sm font-semibold mt-1">{locationError}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'es' 
                    ? 'Por favor, activa la ubicación y refresca la página.' 
                    : 'Please enable location and refresh the page.'}
                </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Job Selection Dialog */}
      <Dialog open={showJobSelector} onOpenChange={setShowJobSelector}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{language === 'es' ? 'Selecciona un Trabajo' : 'Select a Job'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Combobox
                options={jobOptions}
                onValueChange={handleJobSelected}
                placeholder={t('search') + '...'}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobSelector(false)}>{t('cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW: Prompt #52 - Work Type and Task Details Dialog */}
      <Dialog open={showWorkTypeDialog} onOpenChange={setShowWorkTypeDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'es' ? 'Tipo de Trabajo' : 'Type of Work'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-slate-700 mb-2">{language === 'es' ? 'Tipo de Trabajo' : 'Work Type'}</Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="normal">{language === 'es' ? 'Normal' : 'Normal'}</SelectItem>
                  <SelectItem value="driving">{language === 'es' ? 'Manejo' : 'Driving'}</SelectItem>
                  <SelectItem value="setup">{language === 'es' ? 'Preparación' : 'Setup'}</SelectItem>
                  <SelectItem value="cleanup">{language === 'es' ? 'Limpieza' : 'Cleanup'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700 mb-2">
                {language === 'es' ? 'Detalles de Tarea (Opcional)' : 'Task Details (Optional)'}
              </Label>
              <Textarea
                value={taskDetails}
                onChange={(e) => setTaskDetails(e.target.value)}
                placeholder={language === 'es' 
                  ? 'Ej: Instalación de gabinetes, Esperando inspección...' 
                  : 'Ex: Cabinet installation, Waiting for inspection...'}
                className="h-24 bg-white border-slate-300"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWorkTypeDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleStartSession} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Play className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Iniciar' : 'Start'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
