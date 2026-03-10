import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotificationService } from '../notifications/NotificationService';
import GeofenceMonitor from '../time-tracking/GeofenceMonitor';
import { calculateDistance, getCurrentLocation } from '@/components/utils/geolocation';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';
import { checkGeolocationPermission, markDeniedPromptSeen, hasSeenDeniedPrompt } from '@/components/utils/geolocationPermissions';
import LocationPermissionPrompt from '@/components/shared/LocationPermissionPrompt';
import telemetry from '@/components/telemetry/GeofenceTelemetry';
import { usePerformanceMonitor } from '@/components/field/hooks/usePerformanceMonitor';
import { buildUserQuery } from '@/components/utils/userResolution';
import { SyncStatusBadge } from '@/components/feedback/SyncStatusBadge';
import GPSHealthMonitor from '@/components/time-tracking/GPSHealthMonitor';
import { useGPSPreWarmer } from '@/components/time-tracking/GPSPreWarmer';
import { getLocationWithFallback } from '@/components/time-tracking/EnhancedGeolocation';
import ClockInButton from '@/components/time-tracking/ClockInButton';

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
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
  
  // FASE 10: Performance monitoring (only in field mode)
  usePerformanceMonitor('LiveTimeTracker', true);
  
  // GPS Pre-warming for instant location
  const { getCachedLocation } = useGPSPreWarmer(true);
  
  const storageKey = `liveTimeTracker_${trackingType}`;

  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [showWorkTypeDialog, setShowWorkTypeDialog] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [gpsProgress, setGpsProgress] = useState(null);
  const [nearestJob, setNearestJob] = useState(null);
  
  // PASO 3: GPS Permission state
  const [showLocationDenied, setShowLocationDenied] = useState(false);
  const [isBreakAction, setIsBreakAction] = useState(false);
  
  // Check if pending sync from session storage
  const [pendingSync, setPendingSync] = useState(false);
  
  useEffect(() => {
    const checkPending = () => {
      try {
        const queue = JSON.parse(localStorage.getItem('offline_mutation_queue') || '[]');
        const hasPending = queue.some(op => op.entity === 'TimeEntry' && op.status !== 'completed');
        setPendingSync(hasPending);
      } catch (e) {
        setPendingSync(false);
      }
    };
    
    checkPending();
    const interval = setInterval(checkPending, 3000);
    return () => clearInterval(interval);
  }, []);
  
  // NEW: Prompt #52 - Work Type and Task Details
  const [workType, setWorkType] = useState('normal');
  const [taskDetails, setTaskDetails] = useState('');
  const [selectedJobForStart, setSelectedJobForStart] = useState(null);

  // NEW: Get current user for notifications
  const { data: user } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    staleTime: 30000, // Reduced from 5min to 30sec for faster updates
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Fetch today's scheduled shift for validation — from JobAssignment (calendar source of truth)
  const { data: todayAssignments = [] } = useQuery({
    queryKey: ['today-assignments', user?.id, user?.email],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().split('T')[0];
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return base44.entities.JobAssignment.filter({
        ...query,
        date: today,
      });
    },
    enabled: !!user,
    staleTime: 60000,
  });

  // NEW: Notification service
  const { sendNotification } = useNotificationService(user);

  const jobOptions = jobs.map(j => ({ value: j.id, label: j.name }));

  // Find nearest job for GPS health monitor
  useEffect(() => {
    const findNearest = async () => {
      const cached = getCachedLocation();
      if (!cached || !jobs.length) return;

      const jobsWithGPS = jobs.filter(j => j.latitude && j.longitude);
      if (jobsWithGPS.length === 0) return;

      const distances = jobsWithGPS.map(job => ({
        job,
        distance: calculateDistance(cached.lat, cached.lng, job.latitude, job.longitude)
      }));

      distances.sort((a, b) => a.distance - b.distance);
      setNearestJob(distances[0].job);
    };

    findNearest();
    const interval = setInterval(findNearest, 5000);
    return () => clearInterval(interval);
  }, [jobs, getCachedLocation]);

  useEffect(() => {
    // B5 FIX: Cleanup old sessions (>7 days) to prevent localStorage bloat
    try {
      const cleanupOldSessions = () => {
        const keys = Object.keys(localStorage);
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        keys.forEach(key => {
          if (key.startsWith('liveTimeTracker_')) {
            try {
              const session = JSON.parse(localStorage.getItem(key));
              if (session?.startTime && (now - session.startTime) > sevenDays) {
                localStorage.removeItem(key);
                console.log(`🧹 Cleaned up old session: ${key}`);
              }
            } catch (e) {
              // Invalid session data - remove it
              localStorage.removeItem(key);
            }
          }
        });
      };
      
      cleanupOldSessions();
    } catch (error) {
      console.warn('Session cleanup failed:', error);
    }
    
    const savedSession = JSON.parse(localStorage.getItem(storageKey));
    if (savedSession) {
      setActiveSession(savedSession);
    }
  }, [storageKey]);

  // Auto clock-out ref to prevent multiple triggers
  const autoClockOutFiredRef = useRef(false);

  useEffect(() => {
    let interval;
    if (activeSession && !activeSession.onBreak) {
      interval = setInterval(() => {
        const secs = Math.floor((Date.now() - activeSession.startTime) / 1000);
        setElapsed(secs);

        // AUTO CLOCK-OUT when limit is reached — use shift limit if set
        const shiftMax = activeSession.scheduledShift?.enforce_scheduled_hours && activeSession.scheduledShift?.max_daily_hours
          ? activeSession.scheduledShift.max_daily_hours
          : (activeSession.workType === 'driving' ? 16 : 10);
        const maxSecs = shiftMax * 3600;
        if (secs >= maxSecs && !autoClockOutFiredRef.current) {
          autoClockOutFiredRef.current = true;
          clearInterval(interval);
          handleAutoClockOut();
        }
      }, 1000);
    }
    // Reset flag when session changes
    if (!activeSession) autoClockOutFiredRef.current = false;
    return () => clearInterval(interval);
  }, [activeSession]);

  // NEW: Check for clock open from previous day and send notification
  // USE REF to prevent multiple notifications on re-renders
  const notificationSentRef = useRef(false);
  
  useEffect(() => {
    if (activeSession && user && !notificationSentRef.current) {
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
        notificationSentRef.current = true;
      }
    }
    
    // Reset ref when session changes
    if (!activeSession) {
      notificationSentRef.current = false;
    }
  }, [activeSession?.startTime, user?.email]); // STABLE DEPS - only primitives

  // PASO 1: Auto-create calendar shift after successful clock-in (fire-and-forget)
  const autoCreateCalendarShift = async (jobId, jobName, wType, startTimestamp) => {
    if (!user?.id) return;
    const today = format(new Date(startTimestamp), 'yyyy-MM-dd');
    try {
      const existing = await base44.entities.ScheduleShift.filter({
        user_id: user.id,
        job_id: jobId,
        date: today,
      });
      if (existing.length > 0) return; // Already has a shift for this employee+job+day
      const checkInHour = new Date(startTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      await base44.entities.ScheduleShift.create({
        user_id: user.id,
        employee_email: user.email,
        employee_name: user.full_name,
        job_id: jobId,
        job_name: jobName,
        date: today,
        start_time: checkInHour,
        shift_type: wType === 'driving' ? 'appointment' : 'job_work',
        shift_title: wType === 'driving' ? `Driving – ${jobName}` : jobName,
        status: 'confirmed',
        notes: 'auto_generated',
      });
    } catch (e) {
      console.warn('[AutoCalendar] Could not create shift:', e);
    }
  };

  const getLocation = useCallback(async (progressCallback = null) => {
    return getLocationWithFallback(language, {
      onProgress: progressCallback,
      useCachedIfAvailable: true,
      maxRetries: 3,
      timeout: 10000
    });
  }, [language]);

  const handleClockIn = async () => {
    // PASO 3: Pre-check GPS permissions BEFORE showing job selector
    const permission = await checkGeolocationPermission();
    
    if (permission === 'denied' && !hasSeenDeniedPrompt()) {
      // PASO 4: Log permission denial (deduplicated)
      telemetry.log({
        event_type: 'geolocation_permission_denied',
        user_email: user?.email || 'unknown',
        job_id: null,
        source: 'frontend',
        metadata: { action: 'clock_in_precheck' }
      });
      
      setIsBreakAction(false); // Clock in/out BLOCKS
      setShowLocationDenied(true);
      markDeniedPromptSeen();
      return;
    }
    
    // Permission granted or prompt → continue normal flow
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
    setGpsProgress('acquiring');
    
    try {
      const location = await getLocation((status, message) => {
        setGpsProgress(message);
      });
      setGpsProgress(null);
      
      let job = jobs.find(j => j.id === selectedJobForStart);
      
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
        autoCreateCalendarShift(selectedJobForStart, job.name, 'driving', adjustedCheckIn.getTime());
        
        // Reset form
        setWorkType('normal');
        setTaskDetails('');
        return;
      }
      
      if (!job.latitude || !job.longitude) {
        // Auto-geocode the job address on the fly
        if (job.address) {
          setGpsProgress(language === 'es' ? 'Obteniendo coordenadas del proyecto...' : 'Getting project coordinates...');
          try {
            const { geocodeAddress } = await import('@/components/utils/geocoding');
            const geo = await geocodeAddress(job.address);
            // Persist coordinates to the job entity so it doesn't happen again
            base44.entities.Job.update(job.id, { latitude: geo.latitude, longitude: geo.longitude });
            // Update local jobs list reference
            job = { ...job, latitude: geo.latitude, longitude: geo.longitude };
          } catch (geoError) {
            setLocationError(language === 'es' 
              ? '❌ No se pudieron obtener coordenadas GPS del proyecto. Verifica que la dirección sea correcta.'
              : '❌ Could not get GPS coordinates for this project. Check that the address is correct.');
            setShowWorkTypeDialog(false);
            setGpsProgress(null);
            return;
          }
          setGpsProgress(null);
        } else {
          setLocationError(language === 'es' 
            ? '❌ Este proyecto no tiene dirección configurada. Pídele a tu supervisor que la agregue.'
            : '❌ This project has no address configured. Ask your supervisor to add it.');
          setShowWorkTypeDialog(false);
          return;
        }
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
        // PASO 4: Log geofence failure (deduplicated)
        telemetry.log({
          event_type: 'clock_in_geofence_failed',
          user_email: user.email,
          job_id: selectedJobForStart,
          distance_meters: distanceMeters,
          accuracy: location.accuracy,
          source: 'frontend',
          metadata: { 
            job_name: job.name,
            max_distance: MAX_DISTANCE,
            work_type: workType
          }
        });
        
        setLocationError(language === 'es' 
          ? `❌ FUERA DEL ÁREA: Estás a ${Math.round(distanceMeters)}m del proyecto. Debes estar a menos de ${MAX_DISTANCE}m para fichar.`
          : `❌ OUT OF RANGE: You are ${Math.round(distanceMeters)}m from project. You must be within ${MAX_DISTANCE}m to clock in.`);
        
        // Notify admins of attempted fraud (parallel)
        const admins = await base44.entities.EmployeeDirectory.filter({ role: 'admin', employment_status: 'active' });
        await Promise.all(admins.map(admin => sendNotification({
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
          })));
        
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
      autoCreateCalendarShift(selectedJobForStart, job.name, workType, adjustedCheckIn.getTime());
      
      // Reset form
      setWorkType('normal');
      setTaskDetails('');
    } catch (error) {
      setLocationError(error);
      setShowWorkTypeDialog(false);
      setGpsProgress(null);
    }
  };

  const handleClockOut = async () => {
    if (!user) {
      setLocationError(language === 'es' ? 'Error: Usuario no cargado. Intenta de nuevo.' : 'Error: User not loaded. Please try again.');
      return;
    }
    
    // PASO 3: Pre-check GPS permissions BEFORE clock out
    const permission = await checkGeolocationPermission();
    
    if (permission === 'denied' && !hasSeenDeniedPrompt()) {
      // PASO 4: Log permission denial
      telemetry.log({
        event_type: 'geolocation_permission_denied',
        user_email: user?.email || 'unknown',
        job_id: activeSession?.jobId || null,
        source: 'frontend',
        metadata: { action: 'clock_out_precheck' }
      });
      
      setIsBreakAction(false); // Clock out BLOCKS
      setShowLocationDenied(true);
      markDeniedPromptSeen();
      return;
    }
    
    setLocationError(null);
    setGpsProgress('acquiring');
    
    try {
      const location = await getLocation((status, message) => {
        setGpsProgress(message);
      });
      setGpsProgress(null);
      
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
      // MIDNIGHT CROSS FIX: Use actual timestamps (ms), not time strings — always correct
      const rawHours = (endTime - activeSession.startTime - activeSession.breakDuration) / (1000 * 60 * 60);
      const totalHours = Math.max(0, rawHours);
      
      // Validate against max daily hours if shift enforces it
      if (shift && shift.enforce_scheduled_hours && totalHours > (shift.max_daily_hours || 8)) {
        setLocationError(language === 'es'
          ? `❌ Excediste el máximo de ${shift.max_daily_hours || 8} horas diarias permitidas para este turno.`
          : `❌ You exceeded the maximum ${shift.max_daily_hours || 8} daily hours allowed for this shift.`);
        return;
      }

      // HOUR LIMITS: work=10h, driving=16h, mixed work+driving=12h combined
      const isDriving = activeSession.workType === 'driving';
      const maxAllowed = isDriving ? 16 : 10;
      
      if (totalHours > maxAllowed) {
        // AUTO CLOCK-OUT: cap hours at the limit and save the entry
        const cappedHours = maxAllowed;
        const capMsg = isDriving
          ? (language === 'es' ? `Límite de conducción (${maxAllowed}h) alcanzado` : `Driving limit (${maxAllowed}h) reached`)
          : (language === 'es' ? `Límite de trabajo (${maxAllowed}h) alcanzado` : `Work limit (${maxAllowed}h) reached`);

        sendNotification({
          recipientEmail: user.email,
          recipientName: user.full_name,
          type: 'time_exceeded',
          priority: 'urgent',
          title: language === 'es' ? '⏰ Límite de Horas Alcanzado' : '⏰ Hour Limit Reached',
          message: language === 'es'
            ? `Tu turno fue cerrado automáticamente: ${capMsg}.`
            : `Your shift was auto-closed: ${capMsg}.`,
          actionUrl: '/MisHoras',
          relatedEntityType: 'timeentry',
          sendEmail: true
        });

        const admins = await base44.entities.EmployeeDirectory.filter({ role: 'admin', employment_status: 'active' });
        await Promise.all(admins.map(admin => sendNotification({
          recipientEmail: admin.employee_email || admin.email,
          recipientName: admin.full_name,
          type: 'approval_required',
          priority: 'urgent',
          title: language === 'es' ? '🚨 Cierre Automático por Límite de Horas' : '🚨 Auto Clock-Out: Hour Limit',
          message: language === 'es'
            ? `${user.full_name} fue cerrado automáticamente (${cappedHours}h) en ${activeSession.jobName}`
            : `${user.full_name} was auto-clocked out (${cappedHours}h) at ${activeSession.jobName}`,
          actionUrl: '/Horarios',
          relatedEntityType: 'timeentry'
        })));

        // Save with capped hours and flag for review, then exit
        const cappedData = {
          user_id: user?.id,
          employee_email: user.email,
          employee_name: user.full_name,
          job_id: activeSession.jobId,
          job_name: activeSession.jobName,
          date: format(new Date(), 'yyyy-MM-dd'),
          check_in: activeSession.checkIn,
          check_out: clockOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          check_in_latitude: activeSession.location.lat,
          check_in_longitude: activeSession.location.lng,
          check_out_latitude: location.lat,
          check_out_longitude: location.lng,
          hours_worked: Number(cappedHours.toFixed(2)),
          breaks: activeSession.breaks || [],
          total_break_minutes: Math.floor(activeSession.breakDuration / (1000 * 60)),
          hour_type: 'overtime',
          work_type: activeSession.workType || 'normal',
          task_details: activeSession.taskDetails || '',
          status: 'pending',
          geofence_validated: activeSession.workType === 'driving' ? false : true,
          geofence_distance_meters: activeSession.distanceMeters,
          requires_location_review: true,
          exceeds_max_hours: true,
          breaks_require_review: false,
          notes: capMsg,
        };

        if (!user?.id) return;
        onSave(cappedData);
        localStorage.removeItem(storageKey);
        setActiveSession(null);
        setElapsed(0);
        setLocationError(null);
        return;
      }

      // Skip geofence validation only for driving hours
      if (activeSession.workType !== 'driving') {
        const job = jobs.find(j => j.id === activeSession.jobId);
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
            // PASO 4: Log geofence failure
            telemetry.log({
              event_type: 'clock_out_geofence_failed',
              user_email: user.email,
              job_id: activeSession.jobId,
              distance_meters: checkOutDistanceMeters,
              accuracy: location.accuracy,
              source: 'frontend',
              metadata: { 
                job_name: job.name,
                max_distance: MAX_DISTANCE
              }
            });
            
            setLocationError(language === 'es' 
              ? `❌ FUERA DEL ÁREA: Estás a ${Math.round(checkOutDistanceMeters)}m del proyecto. Debes estar a menos de ${MAX_DISTANCE}m para fichar salida.`
              : `❌ OUT OF RANGE: You are ${Math.round(checkOutDistanceMeters)}m from project. You must be within ${MAX_DISTANCE}m to clock out.`);
            
            // Notify admins (parallel)
            const admins = await base44.entities.EmployeeDirectory.filter({ role: 'admin', employment_status: 'active' });
            await Promise.all(admins.map(admin => sendNotification({
                recipientEmail: admin.employee_email || admin.email,
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
              })));
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

      // Check if any breaks require review
      const breaksRequireReview = (activeSession.breaks || []).some(b => 
        b.location_unknown || b.start_outside_geofence || b.end_outside_geofence
      );

      // WRITE GUARD — STRICT MODE for TimeEntry (blocks without user_id)
      const timeEntryData = {
        user_id: user?.id,
        employee_email: user.email,
        employee_name: user.full_name,
        job_id: activeSession.jobId,
        job_name: activeSession.jobName,
        date: format(new Date(), 'yyyy-MM-dd'),
        check_in: activeSession.checkIn,
        check_out: clockOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        check_in_latitude: activeSession.location.lat,
        check_in_longitude: activeSession.location.lng,
        check_out_latitude: location.lat,
        check_out_longitude: location.lng,
        hours_worked: Number(totalHours.toFixed(2)),
        breaks: activeSession.breaks || [],
        total_break_minutes: Math.floor(activeSession.breakDuration / (1000 * 60)),
        hour_type: 'normal', // OT is calculated weekly (>40h work hrs), not per shift
        work_type: activeSession.workType || 'normal',
        task_details: activeSession.taskDetails || '',
        status: 'pending',
        geofence_validated: activeSession.workType === 'driving' ? false : true,
        geofence_distance_meters: activeSession.distanceMeters,
        requires_location_review: false,
        exceeds_max_hours: false,
        breaks_require_review: breaksRequireReview,
      };

      // STRICT MODE: Block if user_id missing
      if (!user?.id) {
        console.error('[WRITE GUARD] 🚫 STRICT MODE: Blocking TimeEntry without user_id', {
          email: user?.email,
          job: activeSession.jobName
        });
        
        setLocationError(language === 'es'
          ? '🔒 Error de identidad. Cierra sesión y vuelve a iniciar sesión antes de registrar horas.'
          : '🔒 Identity error. Please logout and login again before logging hours.');
        return;
      }

      onSave(timeEntryData);

      localStorage.removeItem(storageKey);
      setActiveSession(null);
      setElapsed(0);
      setLocationError(null);
    } catch (error) {
      setLocationError(error);
      setGpsProgress(null);
    }
  };

  const handleToggleBreak = async () => {
    // PASO 3: Pre-check GPS for breaks (non-blocking, just inform)
    const permission = await checkGeolocationPermission();
    
    if (permission === 'denied' && !hasSeenDeniedPrompt()) {
      // PASO 4: Log permission denial for break
      telemetry.log({
        event_type: 'geolocation_permission_denied',
        user_email: user?.email || 'unknown',
        job_id: activeSession?.jobId || null,
        source: 'frontend',
        metadata: { action: 'break_precheck' }
      });
      
      setIsBreakAction(true); // Breaks DON'T block
      setShowLocationDenied(true);
      markDeniedPromptSeen();
      // Continue execution - don't return, just show prompt
    }
    
    const now = Date.now();
    let updatedSession;

    // GEOFENCE HARDENING PASO 2: Registrar ubicación en breaks (no bloqueante)
    const captureBreakLocation = async () => {
      try {
        const location = await getCurrentLocation(language);
        const job = jobs.find(j => j.id === activeSession.jobId);
        
        if (!job?.latitude || !job?.longitude) {
          return { location_unknown: true };
        }

        const distanceMeters = calculateDistance(
          location.lat,
          location.lng,
          job.latitude,
          job.longitude
        );

        const maxDistance = job.geofence_radius || 100;
        const outsideGeofence = distanceMeters > maxDistance;

        // PASO 4: Log if break outside geofence (deduplicated)
        if (outsideGeofence) {
          telemetry.log({
            event_type: 'break_outside_geofence',
            user_email: user?.email || activeSession.employee_email || 'unknown',
            job_id: activeSession.jobId,
            distance_meters: distanceMeters,
            accuracy: location.accuracy,
            source: 'frontend',
            metadata: { 
              job_name: job.name,
              max_distance: maxDistance,
              break_action: activeSession.onBreak ? 'end' : 'start'
            }
          });
        }

        return {
          latitude: location.lat,
          longitude: location.lng,
          accuracy: location.accuracy,
          distance_meters: Math.round(distanceMeters),
          outside_geofence: outsideGeofence,
          location_unknown: false,
        };
      } catch (error) {
        // Silent failure - location not available
        console.log('[Break Location] GPS unavailable:', error);
        return { location_unknown: true };
      }
    };

    if (activeSession.onBreak) {
      // End break
      const breakTime = now - activeSession.breakStartTime;
      const durationMinutes = Math.floor(breakTime / (1000 * 60));
      
      // Capture location silently (non-blocking)
      const endLocation = await captureBreakLocation();
      
      // Update last break in breaks array
      const breaks = [...(activeSession.breaks || [])];
      const lastBreak = breaks[breaks.length - 1];
      if (lastBreak && !lastBreak.end_time) {
        lastBreak.end_time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastBreak.duration_minutes = durationMinutes;
        
        // Add end location data (PASO 2)
        if (endLocation.location_unknown) {
          lastBreak.location_unknown = true;
        } else {
          lastBreak.end_latitude = endLocation.latitude;
          lastBreak.end_longitude = endLocation.longitude;
          lastBreak.end_accuracy = endLocation.accuracy;
          lastBreak.end_distance_meters = endLocation.distance_meters;
          lastBreak.end_outside_geofence = endLocation.outside_geofence;
        }
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
      // Capture location silently (non-blocking)
      const startLocation = await captureBreakLocation();
      
      const breaks = [...(activeSession.breaks || [])];
      const newBreak = {
        type: 'lunch',
        start_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        end_time: null,
        duration_minutes: 0,
      };
      
      // Add start location data (PASO 2)
      if (startLocation.location_unknown) {
        newBreak.location_unknown = true;
      } else {
        newBreak.start_latitude = startLocation.latitude;
        newBreak.start_longitude = startLocation.longitude;
        newBreak.start_accuracy = startLocation.accuracy;
        newBreak.start_distance_meters = startLocation.distance_meters;
        newBreak.start_outside_geofence = startLocation.outside_geofence;
      }
      
      breaks.push(newBreak);
      
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
    // MAX HOURS: use scheduled shift if available, otherwise defaults (work=10h, driving=16h)
    const getMaxHours = (workType, scheduledShift) => {
      if (scheduledShift?.enforce_scheduled_hours && scheduledShift?.max_daily_hours) {
        return scheduledShift.max_daily_hours;
      }
      if (workType === 'driving') return 16;
      return 10;
    };
    const maxHours = getMaxHours(activeSession.workType, activeSession.scheduledShift);
    const exceedsMaxHours = sessionHours >= maxHours;

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
                  ? `¡LÍMITE DE ${maxHours}H ALCANZADO! Cierra tu turno ahora` 
                  : `${maxHours}H LIMIT REACHED! Clock out now`}
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

          {/* Driving: show captured clock-in location */}
          {activeSession.workType === 'driving' && activeSession.location && (
            <div className="mb-4 p-3 bg-blue-500/20 border border-blue-300 rounded-2xl flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="font-semibold text-xs">
                {language === 'es' ? '📍 Inicio:' : '📍 Start:'} {activeSession.location.lat?.toFixed(5)}, {activeSession.location.lng?.toFixed(5)}
              </span>
            </div>
          )}

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
              disabled={isLoading}
            >
              <Square className="w-5 h-5 mr-2"/>
              {language === 'es' ? 'Salida' : 'Clock Out'}
            </Button>
          </div>

          {exceedsMaxHours && (
            <p className="text-sm text-white/90 mt-4 font-semibold bg-red-900/40 p-3 rounded-xl">
              {language === 'es' 
                ? `⚠️ Límite de ${maxHours}h alcanzado. Al cerrar, las horas serán registradas para revisión del supervisor.` 
                : `⚠️ ${maxHours}h limit reached. On clock-out, hours will be flagged for supervisor review.`}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleAutoClockOut = async () => {
    if (!activeSession || !user) return;

    // PASO 4: Log auto clock-out event
    telemetry.log({
      event_type: 'auto_clock_out_triggered',
      user_email: user.email,
      job_id: activeSession.jobId,
      source: 'frontend',
      metadata: { 
        job_name: activeSession.jobName,
        trigger: 'geofence_exit'
      }
    });

    try {
      const location = await getLocation();
      const endTime = Date.now();
      // MIDNIGHT CROSS FIX: Use actual timestamps (ms) — always correct across midnight
      const totalHours = Math.max(0, (endTime - activeSession.startTime - activeSession.breakDuration) / (1000 * 60 * 60));

      // WRITE GUARD — STRICT MODE for TimeEntry (blocks without user_id)
      const autoClockOutData = {
        user_id: user?.id,
        employee_email: user.email,
        employee_name: user.full_name,
        job_id: activeSession.jobId,
        job_name: activeSession.jobName,
        date: format(new Date(), 'yyyy-MM-dd'),
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
        geofence_validated: false,
        geofence_distance_meters: activeSession.distanceMeters,
        requires_location_review: true,
        exceeds_max_hours: false,
      };

      // STRICT MODE: Block if user_id missing (silent failure for auto clock-out)
      if (!user?.id) {
        console.error('[WRITE GUARD] 🚫 STRICT MODE: Auto clock-out blocked without user_id', {
          email: user?.email,
          job: activeSession.jobName
        });
        // Don't throw - just fail silently and keep session active
        return;
      }

      onSave(autoClockOutData);

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
      {/* PASO 3: Location Permission Prompt */}
      {showLocationDenied && (
        <div className="mb-6">
          <LocationPermissionPrompt
            language={language}
            blocking={!isBreakAction}
            onDismiss={isBreakAction ? () => setShowLocationDenied(false) : undefined}
          />
        </div>
      )}

      {/* GPS Health Monitor - Real-time */}
      {!activeSession && (
        <GPSHealthMonitor 
          nearestJob={nearestJob} 
          language={language}
        />
      )}

      {/* Real-time Geofence Monitor */}
      <GeofenceMonitor 
        activeSession={activeSession} 
        onAutoClockOut={handleAutoClockOut}
      />

      <Card className="border-0 shadow-2xl mb-8 bg-gradient-to-br from-slate-100 to-white dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-8 text-center">
          {pendingSync && (
            <div className="mb-4">
              <SyncStatusBadge status="pending" />
            </div>
          )}
          <div className="relative inline-block">
            <ClockInButton
              onClick={(progressCallback) => {
                setGpsProgress('starting');
                return new Promise((resolve, reject) => {
                  handleClockIn()
                    .then(resolve)
                    .catch(reject);
                });
              }}
              disabled={isLoading}
              isLoading={isLoading}
              language={language}
            />
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
              <p className="text-sm font-bold text-red-600 dark:text-red-400 whitespace-pre-line">
                {typeof locationError === 'string' ? locationError : 'Location error'}
              </p>
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
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'es' ? 'Selecciona un Trabajo' : 'Select a Job'}</DialogTitle>
            {jobOptions.length === 0 && (
              <p className="text-xs text-red-600 mt-2">⚠️ No jobs found ({jobs.length} active jobs in DB)</p>
            )}
          </DialogHeader>
          <div className="py-4">
            {jobOptions.length > 0 ? (
              <Select onValueChange={handleJobSelected}>
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue placeholder={t('search') + '...'} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {jobOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                {language === 'es' 
                  ? '⚠️ No hay trabajos disponibles. Verifica que existan trabajos activos.'
                  : '⚠️ No jobs available. Check that there are active jobs.'}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJobSelector(false)}>{t('cancel')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW: Prompt #52 - Work Type and Task Details Dialog */}
      <Dialog open={showWorkTypeDialog} onOpenChange={setShowWorkTypeDialog}>
        <DialogContent className="bg-white sm:max-w-md">
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