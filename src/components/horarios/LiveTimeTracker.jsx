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
import GeofenceMonitor from '../time-tracking/GeofenceMonitor';

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
  let language = 'en';
  let t = (key) => key;
  try {
    const langCtx = useLanguage();
    if (langCtx) {
      language = langCtx.language || 'en';
      t = langCtx.t || ((key) => key);
    }
  } catch (e) {
    // Fallback if useLanguage fails
  }
  
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

  // NEW: Get current user for notifications
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: jobs } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    initialData: [],
  });

  // Fetch today's scheduled shift for validation
  const { data: todayAssignments = [] } = useQuery({
    queryKey: ['today-assignments', user?.email],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().split('T')[0];
      return base44.entities.ScheduleShift.filter({
        employee_email: user.email,
        date: today,
      });
    },
    enabled: !!user,
    staleTime: 60000,
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
        return reject(language === 'es' ? 'GPS no soportado por tu dispositivo' : 'Geolocation not supported');
      }
      
      // Request high accuracy position with mock location detection
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Check for mock locations (Android)
          if (pos.coords.accuracy > 100) {
            return reject(language === 'es' 
              ? '⚠️ Precisión GPS muy baja. Asegúrate de estar al aire libre y tener señal GPS fuerte.' 
              : '⚠️ GPS accuracy too low. Make sure you are outdoors with strong GPS signal.');
          }
          
          resolve({ 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        (err) => {
          if (err.code === 1) {
            return reject(language === 'es' 
              ? '❌ Permiso de ubicación denegado. Debes habilitar GPS para fichar.' 
              : '❌ Location permission denied. You must enable GPS to clock in.');
          } else if (err.code === 2) {
            return reject(language === 'es' 
              ? '❌ GPS no disponible. Verifica que el GPS esté activado.' 
              : '❌ GPS unavailable. Check that GPS is enabled.');
          } else {
            return reject(language === 'es' 
              ? '❌ Error obteniendo ubicación. Intenta de nuevo.' 
              : '❌ Error getting location. Try again.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0 // Don't use cached location
        }
      );
    });
  }, [language]);

  const handleClockIn = async () => {
    setShowJobSelector(true);
  };
  
  const handleJobSelected = async (jobId) => {
    if (!jobId) return;
    setSelectedJobForStart(jobId);
    setShowJobSelector(false);
    setShowWorkTypeDialog(true); // NEW: Show work type dialog
  };

  // GEOFENCING - Strict enforcement with 100m radius (EXCEPT for driving hours)
  const handleStartSession = async () => {
    if (!selectedJobForStart) return;
    if (!user) {
      setLocationError(language === 'es' ? 'Error: Usuario no cargado. Intenta de nuevo.' : 'Error: User not loaded. Please try again.');
      setShowWorkTypeDialog(false);
      return;
    }
    
    setLocationError(null);
    
    try {
      const location = await getLocation();
      const job = jobs.find(j => j.id === selectedJobForStart);
      
      // Find scheduled shift for this job today
      const todayShift = todayAssignments.find(a => a.job_id === selectedJobForStart && a.enforce_scheduled_hours);
      
      // SCHEDULED HOURS CONTROL: Adjust clock-in time if shift enforces hours
      let adjustedCheckIn = new Date();
      if (todayShift && todayShift.scheduled_start_time) {
        const [schedHour, schedMin] = todayShift.scheduled_start_time.split(':').map(Number);
        const scheduledStart = new Date();
        scheduledStart.setHours(schedHour, schedMin, 0, 0);
        
        // If clocking in BEFORE scheduled start, set to scheduled start
        if (adjustedCheckIn < scheduledStart) {
          adjustedCheckIn = scheduledStart;
          setLocationError(language === 'es'
            ? `⏰ Entrada ajustada a ${todayShift.scheduled_start_time} (hora programada)`
            : `⏰ Clock-in adjusted to ${todayShift.scheduled_start_time} (scheduled time)`);
        }
      }
      
      // Skip geofence validation only for driving hours
      if (workType === 'driving') {
        const session = {
          startTime: adjustedCheckIn.getTime(),
          checkIn: adjustedCheckIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          jobId: selectedJobForStart,
          jobName: job.name,
          location,
          onBreak: false,
          breaks: [],
          breakDuration: 0,
          workType,
          taskDetails,
          geofenceValidated: false, // Not applicable for driving or testing jobs
          distanceMeters: 0,
          requiresReview: false,
          scheduledShift: todayShift || null, // Store shift rules
        };
        
        localStorage.setItem(storageKey, JSON.stringify(session));
        setActiveSession(session);
        setLocationError(null);
        setShowWorkTypeDialog(false);
        
        // Reset form
        setWorkType('normal');
        setTaskDetails('');
        return;
      }
      
      if (!job.latitude || !job.longitude) {
        // Show a detailed error dialog instead of alert
        setLocationError(language === 'es' 
          ? '❌ Este proyecto no tiene coordenadas GPS configuradas.\n\n✅ Soluciones:\n1. Pídele a tu supervisor que configure las coordenadas del proyecto\n2. O que habilite "skip_geofence" para permitir check-in sin GPS'
          : '❌ This project has no GPS coordinates configured.\n\n✅ Solutions:\n1. Ask your supervisor to set up project coordinates\n2. Or enable "skip_geofence" to allow check-in without GPS');
        setShowWorkTypeDialog(false);
        return;
      }

      const distanceMeters = calculateDistance(
        location.lat,
        location.lng,
        job.latitude,
        job.longitude
      );

      // CUSTOMIZABLE GEOFENCING: Use job's configured radius (default 100m)
      const MAX_DISTANCE = job.geofence_radius || 100;
      
      if (distanceMeters > MAX_DISTANCE) {
        setLocationError(language === 'es' 
          ? `❌ FUERA DEL ÁREA: Estás a ${Math.round(distanceMeters)}m del proyecto. Debes estar a menos de ${MAX_DISTANCE}m para fichar.`
          : `❌ OUT OF RANGE: You are ${Math.round(distanceMeters)}m from project. You must be within ${MAX_DISTANCE}m to clock in.`);
        
        // Notify admins of attempted fraud
        const admins = await base44.entities.User.filter({ role: 'admin' });
        for (const admin of admins) {
          sendNotification({
            recipientEmail: admin.email,
            recipientName: admin.full_name,
            type: 'security_alert',
            priority: 'urgent',
            title: language === 'es' ? '🚨 Intento de Fichaje Fuera de Geofence' : '🚨 Clock-In Attempt Outside Geofence',
            message: language === 'es'
              ? `${user.full_name} intentó fichar a ${Math.round(distanceMeters)}m de ${job.name} (límite: ${MAX_DISTANCE}m)`
              : `${user.full_name} attempted to clock in ${Math.round(distanceMeters)}m from ${job.name} (limit: ${MAX_DISTANCE}m)`,
            actionUrl: '/Horarios',
            relatedEntityType: 'timeentry',
            sendEmail: true
          });
        }
        
        setShowWorkTypeDialog(false);
        return;
      }

      // SUCCESS: Within geofence
      sendNotification({
        recipientEmail: user.email,
        recipientName: user.full_name,
        type: 'geofence_entry',
        priority: 'low',
        title: language === 'es' ? '✅ Entrada Registrada' : '✅ Clock In Successful',
        message: language === 'es'
          ? `Entrada registrada en ${job.name} (${Math.round(distanceMeters)}m del centro)`
          : `Clocked in at ${job.name} (${Math.round(distanceMeters)}m from center)`,
        actionUrl: '/MisHoras',
        relatedEntityType: 'job',
        relatedEntityId: job.id
      });

      const session = {
        startTime: adjustedCheckIn.getTime(),
        checkIn: adjustedCheckIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        jobId: selectedJobForStart,
        jobName: job.name,
        location,
        onBreak: false,
        breaks: [],
        breakDuration: 0,
        workType,
        taskDetails,
        geofenceValidated: true,
        distanceMeters: Math.round(distanceMeters),
        requiresReview: false,
        scheduledShift: todayShift || null, // Store shift rules
      };
      
      localStorage.setItem(storageKey, JSON.stringify(session));
      setActiveSession(session);
      setLocationError(null);
      setShowWorkTypeDialog(false);
      
      // Reset form
      setWorkType('normal');
      setTaskDetails('');
    } catch (error) {
      setLocationError(error);
      setShowWorkTypeDialog(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) {
      setLocationError(language === 'es' ? 'Error: Usuario no cargado. Intenta de nuevo.' : 'Error: User not loaded. Please try again.');
      return;
    }
    
    setLocationError(null);
    
    try {
      const location = await getLocation();
      let clockOutTime = new Date();
      
      // SCHEDULED HOURS CONTROL: Adjust clock-out time if shift enforces hours
      const shift = activeSession.scheduledShift;
      if (shift && shift.enforce_scheduled_hours && shift.scheduled_end_time) {
        const [endHour, endMin] = shift.scheduled_end_time.split(':').map(Number);
        const scheduledEnd = new Date();
        scheduledEnd.setHours(endHour, endMin, 0, 0);
        
        // Calculate grace period cutoff (default 5 minutes before scheduled end)
        const gracePeriod = shift.early_clockout_grace_minutes || 5;
        const graceStart = new Date(scheduledEnd);
        graceStart.setMinutes(graceStart.getMinutes() - gracePeriod);
        
        // If clocking out WITHIN grace period before scheduled end, use actual time
        // If clocking out AFTER scheduled end (even 1 second), cap at scheduled end
        if (clockOutTime >= graceStart && clockOutTime < scheduledEnd) {
          // Grace period: use actual time
        } else if (clockOutTime >= scheduledEnd) {
          // After scheduled end: cap at scheduled end
          clockOutTime = scheduledEnd;
          setLocationError(language === 'es'
            ? `⏰ Salida ajustada a ${shift.scheduled_end_time} (hora máxima programada)`
            : `⏰ Clock-out adjusted to ${shift.scheduled_end_time} (max scheduled time)`);
        }
      }
      
      const endTime = clockOutTime.getTime();
      const totalHours = (endTime - activeSession.startTime - activeSession.breakDuration) / (1000 * 60 * 60);
      
      // Validate against max daily hours if shift enforces it
      if (shift && shift.enforce_scheduled_hours && totalHours > (shift.max_daily_hours || 8)) {
        setLocationError(language === 'es'
          ? `❌ Excediste el máximo de ${shift.max_daily_hours || 8} horas diarias permitidas para este turno.`
          : `❌ You exceeded the maximum ${shift.max_daily_hours || 8} daily hours allowed for this shift.`);
        return;
      }

      // Validate maximum 14 hours
      if (totalHours > 14) {
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
        
        alert(language === 'es'
          ? '❌ Error: Límite máximo de turno (14 horas) excedido. Por favor contacta a tu supervisor.'
          : '❌ Error: Maximum shift limit (14 hours) exceeded. Please contact your supervisor.');
        return;
      }

      // Skip geofence validation only for driving hours
      const job = jobs.find(j => j.id === activeSession.jobId);
      if (activeSession.workType !== 'driving') {
        // STRICT GEOFENCING for clock-out: Use job's configured radius
        const MAX_DISTANCE = job?.geofence_radius || 100;

        if (job?.latitude && job?.longitude) {
          const checkOutDistanceMeters = calculateDistance(
            location.lat,
            location.lng,
            job.latitude,
            job.longitude
          );

          if (checkOutDistanceMeters > MAX_DISTANCE) {
            setLocationError(language === 'es' 
              ? `❌ FUERA DEL ÁREA: Estás a ${Math.round(checkOutDistanceMeters)}m del proyecto. Debes estar a menos de ${MAX_DISTANCE}m para fichar salida.`
              : `❌ OUT OF RANGE: You are ${Math.round(checkOutDistanceMeters)}m from project. You must be within ${MAX_DISTANCE}m to clock out.`);
            
            // Notify admins
            const admins = await base44.entities.User.filter({ role: 'admin' });
            for (const admin of admins) {
              sendNotification({
                recipientEmail: admin.email,
                recipientName: admin.full_name,
                type: 'security_alert',
                priority: 'urgent',
                title: language === 'es' ? '🚨 Intento de Salida Fuera de Geofence' : '🚨 Clock-Out Attempt Outside Geofence',
                message: language === 'es'
                  ? `${user.full_name} intentó fichar salida a ${Math.round(checkOutDistanceMeters)}m de ${job.name} (límite: ${MAX_DISTANCE}m)`
                  : `${user.full_name} attempted to clock out ${Math.round(checkOutDistanceMeters)}m from ${job.name} (limit: ${MAX_DISTANCE}m)`,
                actionUrl: '/Horarios',
                relatedEntityType: 'timeentry',
                sendEmail: true
              });
            }
            return;
          }

          // SUCCESS: Within geofence
          sendNotification({
            recipientEmail: user.email,
            recipientName: user.full_name,
            type: 'clock_out',
            priority: 'low',
            title: language === 'es' ? '✅ Salida Registrada' : '✅ Clock Out Successful',
            message: language === 'es'
              ? `Salida registrada en ${job.name}. Tiempo trabajado: ${totalHours.toFixed(1)}h`
              : `Clocked out at ${job.name}. Time worked: ${totalHours.toFixed(1)}h`,
            actionUrl: '/MisHoras',
            relatedEntityType: 'job',
            relatedEntityId: job.id
          });
        }
      }

      // CRITICAL FIX: Include ALL required TimeEntry fields + Job linkage
      onSave({
        employee_email: user.email,
        employee_name: user.full_name,
        job_id: activeSession.jobId,
        job_name: activeSession.jobName,
        date: new Date().toISOString().split('T')[0],
        check_in: activeSession.checkIn,
        check_out: clockOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        check_in_latitude: activeSession.location.lat,
        check_in_longitude: activeSession.location.lng,
        check_out_latitude: location.lat,
        check_out_longitude: location.lng,
        hours_worked: Number(totalHours.toFixed(2)),
        breaks: activeSession.breaks || [],
        total_break_minutes: Math.floor(activeSession.breakDuration / (1000 * 60)),
        hour_type: totalHours > 8 ? 'overtime' : 'normal',
        work_type: activeSession.workType || 'normal',
        task_details: activeSession.taskDetails || '',
        status: 'pending',
        geofence_validated: activeSession.workType === 'driving' ? false : true,
        geofence_distance_meters: activeSession.distanceMeters,
        requires_location_review: false,
        exceeds_max_hours: false,
      });

      localStorage.removeItem(storageKey);
      setActiveSession(null);
      setElapsed(0);
      setLocationError(null);
    } catch (error) {
      setLocationError(error);
    }
  };

  const handleToggleBreak = () => {
    const now = Date.now();
    let updatedSession;

    if (activeSession.onBreak) {
      // End break
      const breakTime = now - activeSession.breakStartTime;
      const durationMinutes = Math.floor(breakTime / (1000 * 60));
      
      // Update last break in breaks array
      const breaks = [...(activeSession.breaks || [])];
      const lastBreak = breaks[breaks.length - 1];
      if (lastBreak && !lastBreak.end_time) {
        lastBreak.end_time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastBreak.duration_minutes = durationMinutes;
      }
      
      updatedSession = {
        ...activeSession,
        onBreak: false,
        breakDuration: activeSession.breakDuration + breakTime,
        breakStartTime: null,
        breaks
      };
    } else {
      // Start break
      const breaks = [...(activeSession.breaks || [])];
      breaks.push({
        type: 'lunch',
        start_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        end_time: null,
        duration_minutes: 0
      });
      
      updatedSession = {
        ...activeSession,
        onBreak: true,
        breakStartTime: now,
        breaks
      };
    }
    localStorage.setItem(storageKey, JSON.stringify(updatedSession));
    setActiveSession(updatedSession);
  };
  
  if (activeSession) {
    const sessionHours = elapsed / 3600;
    const exceedsMaxHours = sessionHours > 14;

    return (
      <Card className={`border-0 shadow-2xl mb-8 overflow-hidden ${
        exceedsMaxHours 
          ? 'bg-gradient-to-br from-red-600 via-red-700 to-red-800 ring-4 ring-red-500/50' 
          : 'bg-gradient-to-br from-green-600 via-green-700 to-green-800'
      } text-white animate-pulse-slow`}>
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Briefcase className="w-6 h-6"/>
            </div>
            <div className="text-left">
              <Badge variant="secondary" className="text-base font-bold px-3 py-1 shadow-md">{activeSession.jobName}</Badge>
              {activeSession.workType !== 'normal' && (
                <Badge variant="outline" className="bg-white/20 border-white/40 text-white ml-2 font-semibold">
                  {activeSession.workType === 'driving' ? (language === 'es' ? 'Manejo' : 'Driving') :
                   activeSession.workType === 'setup' ? (language === 'es' ? 'Preparación' : 'Setup') :
                   (language === 'es' ? 'Limpieza' : 'Cleanup')}
                </Badge>
              )}
            </div>
          </div>

          {exceedsMaxHours && (
            <div className="mb-6 p-4 bg-red-900/60 border-2 border-red-300 rounded-2xl flex items-center justify-center gap-3 shadow-lg animate-pulse">
              <AlertTriangle className="w-6 h-6" />
              <span className="font-black text-base">
                {language === 'es' 
                  ? '¡LÍMITE EXCEDIDO! Contacta a tu supervisor AHORA' 
                  : 'LIMIT EXCEEDED! Contact your supervisor NOW'}
              </span>
            </div>
          )}

          <div className="bg-black/20 rounded-3xl p-6 mb-6 shadow-inner">
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-black font-mono tracking-tight mb-2 drop-shadow-lg">
              {activeSession.onBreak ? formatTime(activeSession.breakDuration / 1000) : formatTime(elapsed)}
            </h1>
            <div className="flex items-center justify-center gap-3 text-base font-bold opacity-90">
              <MapPin className="w-5 h-5"/>
              <span>{language === 'es' ? 'Entrada' : 'Started'}: {activeSession.checkIn}</span>
              <Badge variant="outline" className="bg-white/10 border-white/30 text-white">
                {Math.round(activeSession.distanceMeters)}m
              </Badge>
            </div>
          </div>

          {activeSession.onBreak && (
            <div className="mb-4 p-3 bg-amber-500/30 border border-amber-300 rounded-2xl flex items-center justify-center gap-2">
              <Coffee className="w-5 h-5" />
              <span className="font-bold text-sm">
                {language === 'es' ? 'EN PAUSA' : 'ON BREAK'}
              </span>
            </div>
          )}

          {locationError && (
            <div className="mb-4 p-4 bg-red-900/60 border-2 border-red-300 rounded-2xl shadow-lg">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-bold whitespace-pre-line">
                {typeof locationError === 'string' ? locationError : 'Location error'}
              </p>
              <p className="text-xs mt-2 opacity-90">
                {language === 'es' 
                  ? 'Acércate al sitio del proyecto o contacta a tu supervisor.' 
                  : 'Move closer to project site or contact your supervisor.'}
              </p>
            </div>
          )}
          
          <div className="flex gap-4 justify-center mt-6">
            <Button 
              onClick={handleToggleBreak} 
              variant="secondary" 
              size="lg" 
              className="rounded-2xl h-14 px-8 font-bold text-base shadow-lg hover:scale-105 transition-transform"
            >
              <Coffee className="w-5 h-5 mr-2"/>
              {activeSession.onBreak ? (language === 'es' ? 'Reanudar' : 'Resume') : (language === 'es' ? 'Pausa' : 'Break')}
            </Button>
            <Button 
              onClick={handleClockOut} 
              variant="destructive" 
              size="lg" 
              className="rounded-2xl h-14 px-8 font-bold text-base shadow-lg hover:scale-105 transition-transform bg-red-600 hover:bg-red-700" 
              disabled={isLoading || exceedsMaxHours}
            >
              <Square className="w-5 h-5 mr-2"/>
              {language === 'es' ? 'Salida' : 'Clock Out'}
            </Button>
          </div>

          {exceedsMaxHours && (
            <p className="text-sm text-white/90 mt-4 font-semibold bg-red-900/40 p-3 rounded-xl">
              {language === 'es' 
                ? '⚠️ No puedes cerrar automáticamente. Requiere revisión manual del supervisor.' 
                : '⚠️ Cannot auto clock-out. Requires manual supervisor review.'}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleAutoClockOut = async () => {
    if (!activeSession || !user) return;

    try {
      const location = await getLocation();
      const endTime = Date.now();
      const totalHours = (endTime - activeSession.startTime - activeSession.breakDuration) / (1000 * 60 * 60);

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
        work_type: activeSession.workType,
        task_details: activeSession.taskDetails,
        geofence_validated: false, // Auto clock-out due to geofence exit
        geofence_distance_meters: activeSession.distanceMeters,
        requires_location_review: true, // Flagged for review
        exceeds_max_hours: false,
      });

      localStorage.removeItem(storageKey);
      setActiveSession(null);
      setElapsed(0);
      setLocationError(null);
    } catch (error) {
      console.error('Auto clock-out error:', error);
    }
  };

  return (
    <>
      {/* Real-time Geofence Monitor */}
      <GeofenceMonitor 
        activeSession={activeSession} 
        onAutoClockOut={handleAutoClockOut}
      />

      <Card className="border-0 shadow-2xl mb-8 bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-8 text-center">
          <div className="relative inline-block">
            <Button
              onClick={handleClockIn}
              size="lg"
              className="h-32 w-32 rounded-full bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-2xl shadow-blue-500/30 hover:scale-110 transition-all duration-300"
              disabled={isLoading}
            >
              <Play className="w-12 h-12"/>
            </Button>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <Badge className="bg-green-500 text-white font-bold text-xs shadow-lg">
                {language === 'es' ? 'LISTO' : 'READY'}
              </Badge>
            </div>
          </div>
          <p className="mt-6 font-black text-2xl text-slate-900 dark:text-white tracking-tight">
            {language === 'es' ? 'Iniciar Jornada' : 'Start Work Day'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">
            {language === 'es' 
              ? 'Geofencing activo - Debes estar en el sitio del proyecto' 
              : 'Geofencing active - Must be at project site'}
          </p>
          {locationError && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-700 rounded-2xl">
              <AlertCircle className="mx-auto h-8 w-8 text-red-600 dark:text-red-400 mb-2" />
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{locationError}</p>
              <p className="text-xs text-red-500 dark:text-red-300 mt-2">
                {language === 'es' 
                  ? 'Verifica que el GPS esté activado y que no estés usando ubicaciones falsas.' 
                  : 'Verify GPS is enabled and you are not using mock locations.'}
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