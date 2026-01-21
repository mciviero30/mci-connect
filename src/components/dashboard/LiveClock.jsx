import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Briefcase, PlayCircle, StopCircle, AlertTriangle, Loader2, Coffee, Utensils, Play } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function LiveClock() {
  const queryClient = useQueryClient();
  const [clockedInData, setClockedInData] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedJob, setSelectedJob] = useState('');
  const [locationStatus, setLocationStatus] = useState('idle');
  const [currentBreak, setCurrentBreak] = useState(null);
  const [totalBreakTime, setTotalBreakTime] = useState(0);
  const [breaks, setBreaks] = useState([]);
  const [locationError, setLocationError] = useState(null);

  const user = queryClient.getQueryData(['currentUser']);
  
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: async () => {
      console.log('Loading active jobs...');
      const result = await base44.entities.Job.filter({ status: 'active' }, 'name');
      console.log('Active jobs loaded:', result);
      return result;
    },
    staleTime: 120000,
    initialData: [],
  });
  
  const createTimeEntry = useMutation({
    mutationFn: (data) => {
      console.log('Creating time entry:', data);
      return base44.entities.TimeEntry.create(data);
    },
    onSuccess: (data) => {
      console.log('Time entry created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    },
    onError: (error) => {
      console.error('Error creating time entry:', error);
      alert(`Error: ${error.message}`);
    }
  });

  const createBreakLog = useMutation({
    mutationFn: (data) => {
      console.log('Creating break log:', data);
      return base44.entities.BreakLog.create(data);
    },
  });

  useEffect(() => {
    const savedData = localStorage.getItem('clockedInData');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setClockedInData(parsed);
        setBreaks(parsed.breaks || []);
        setTotalBreakTime(parsed.totalBreakTime || 0);
        if (parsed.currentBreak) {
          setCurrentBreak(parsed.currentBreak);
        }
      } catch (error) {
        console.error('Error parsing saved clock data:', error);
        localStorage.removeItem('clockedInData');
      }
    }
  }, []);

  // PERSIST STATE - separate from interval to prevent recreation
  useEffect(() => {
    if (clockedInData) {
      const dataToSave = {
        ...clockedInData,
        breaks,
        totalBreakTime,
        currentBreak
      };
      localStorage.setItem('clockedInData', JSON.stringify(dataToSave));
    } else {
      localStorage.removeItem('clockedInData');
    }
  }, [clockedInData, breaks, totalBreakTime, currentBreak]);

  // TIMER - stable deps, no localStorage writes in hot path
  useEffect(() => {
    let interval;
    if (clockedInData) {
      interval = setInterval(() => {
        const now = Date.now();
        setElapsedTime(now - clockedInData.startTime);
        
        if (currentBreak) {
          const breakElapsed = now - currentBreak.startTime;
          setCurrentBreak(prev => ({ ...prev, elapsed: breakElapsed }));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockedInData, currentBreak]); // REDUCED DEPS - only what interval uses

  const getLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation not supported');
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location obtained:', position.coords);
          resolve({ 
            latitude: position.coords.latitude, 
            longitude: position.coords.longitude 
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          reject(error.message || 'Could not get location');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const handleClockIn = async () => {
    console.log('Clock in clicked. Selected job:', selectedJob);
    console.log('Available jobs:', jobs);
    
    if (!selectedJob) {
      alert('Please select a job first');
      return;
    }
    
    setLocationStatus('getting');
    setLocationError(null);

    try {
      const location = await getLocation();
      console.log('Clock in location:', location);
      
      const now = Date.now();
      const job = jobs.find(j => j.id === selectedJob);
      
      if (!job) {
        console.error('Job not found! Selected job ID:', selectedJob);
        alert('Error: Job not found. Please try again.');
        setLocationStatus('idle');
        return;
      }
      
      const session = { 
        startTime: now, 
        checkIn: format(new Date(), 'HH:mm:ss'),
        jobId: selectedJob, 
        jobName: job.name,
        latitude: location.latitude,
        longitude: location.longitude,
        onBreak: false,
        breakDuration: 0,
      };
      
      console.log('Starting session:', session);
      localStorage.setItem('clockedInData', JSON.stringify(session));
      setClockedInData(session);
      setBreaks([]);
      setTotalBreakTime(0);
      setCurrentBreak(null);
      setSelectedJob('');
      setLocationStatus('idle');
    } catch (error) {
      console.error('Clock in error:', error);
      setLocationError(error.toString());
      setLocationStatus('error');
    }
  };

  const handleStartBreak = (breakType) => {
    const now = Date.now();
    setCurrentBreak({
      type: breakType,
      startTime: now,
      elapsed: 0
    });
  };

  const handleEndBreak = () => {
    if (!currentBreak) return;
    
    const now = Date.now();
    const breakDuration = now - currentBreak.startTime;
    
    const newBreak = {
      type: currentBreak.type,
      startTime: currentBreak.startTime,
      endTime: now,
      duration: breakDuration
    };
    
    setBreaks(prev => [...prev, newBreak]);
    setTotalBreakTime(prev => prev + breakDuration);
    setCurrentBreak(null);
  };

  const handleClockOut = async () => {
    if (currentBreak) {
      alert('Please end your break before clocking out');
      return;
    }

    setLocationStatus('getting');
    setLocationError(null);
    
    try {
      const location = await getLocation();
      console.log('Clock out location:', location);
      
      const endTime = new Date();
      const startTime = new Date(clockedInData.startTime);
      
      const totalElapsedHours = (endTime - startTime) / (1000 * 60 * 60);
      const breakHours = totalBreakTime / (1000 * 60 * 60);
      const workedHours = totalElapsedHours - breakHours;

      const timeEntryData = {
        employee_email: user.email,
        employee_name: user.full_name || user.email,
        job_id: clockedInData.jobId,
        job_name: clockedInData.jobName,
        date: format(startTime, 'yyyy-MM-dd'),
        check_in: clockedInData.checkIn,
        check_out: format(endTime, 'HH:mm:ss'),
        hours_worked: Math.max(0, workedHours),
        lunch_minutes: Math.floor(totalBreakTime / (1000 * 60)),
        status: 'pending',
        check_in_latitude: clockedInData.latitude,
        check_in_longitude: clockedInData.longitude,
        check_out_latitude: location.latitude,
        check_out_longitude: location.longitude,
      };

      console.log('Submitting time entry:', timeEntryData);
      const createdEntry = await createTimeEntry.mutateAsync(timeEntryData);
      console.log('Time entry created:', createdEntry);
      
      if (breaks.length > 0) {
        for (const breakItem of breaks) {
          await createBreakLog.mutateAsync({
            time_entry_id: createdEntry.id,
            employee_email: user.email,
            break_type: breakItem.type,
            start_time: format(new Date(breakItem.startTime), 'HH:mm:ss'),
            end_time: format(new Date(breakItem.endTime), 'HH:mm:ss'),
            duration_minutes: breakItem.duration / (1000 * 60),
            date: format(startTime, 'yyyy-MM-dd')
          });
        }
      }
      
      setClockedInData(null);
      setElapsedTime(0);
      setBreaks([]);
      setTotalBreakTime(0);
      setLocationStatus('idle');
      setLocationError(null);
      localStorage.removeItem('clockedInData');
      
      alert('✅ Clocked out successfully!');
    } catch (error) {
      console.error('Clock out error:', error);
      setLocationError(error.toString());
      setLocationStatus('error');
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const isProcessing = locationStatus === 'getting' || createTimeEntry.isPending;
  const workedTime = elapsedTime - totalBreakTime - (currentBreak?.elapsed || 0);

  return (
    <Card className="border-slate-200 bg-white/90 backdrop-blur-sm shadow-xl">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Clock className="w-5 h-5 text-[#3B9FF3]" />
          Live Clock
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {clockedInData ? (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-slate-600 mb-2">
                <Briefcase className="w-4 h-4"/>
                <span className="font-medium">{clockedInData.jobName}</span>
              </div>
              
              <div className="p-4 bg-white rounded-lg shadow-inner border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Total Time</p>
                <p className="text-4xl font-mono font-bold text-slate-800">{formatTime(elapsedTime)}</p>
              </div>

              {currentBreak && (
                <div className="p-3 bg-amber-50 rounded-lg border-2 border-amber-300">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {currentBreak.type === 'lunch' ? <Utensils className="w-4 h-4 text-amber-700" /> : <Coffee className="w-4 h-4 text-amber-700" />}
                    <p className="text-sm font-semibold text-amber-900">
                      {currentBreak.type === 'lunch' ? 'Lunch Break' : 'Coffee Break'}
                    </p>
                  </div>
                  <p className="text-2xl font-mono font-bold text-amber-900">{formatTime(currentBreak.elapsed)}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-red-50 rounded border border-red-200">
                  <p className="text-xs text-red-600">Total Breaks</p>
                  <p className="font-mono font-bold text-red-700">{formatTime(totalBreakTime)}</p>
                </div>
                <div className="p-2 bg-green-50 rounded border border-green-200">
                  <p className="text-xs text-green-600">Work Time</p>
                  <p className="font-mono font-bold text-green-700">{formatTime(workedTime)}</p>
                </div>
              </div>
            </div>

            {locationError && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm font-medium">{locationError}</p>
                </div>
                <p className="text-xs text-red-600 mt-1">Please enable location and try again</p>
              </div>
            )}

            {!currentBreak ? (
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => handleStartBreak('lunch')} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 bg-white" disabled={isProcessing}>
                  <Utensils className="w-4 h-4 mr-2" />
                  Lunch
                </Button>
                <Button onClick={() => handleStartBreak('break')} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 bg-white" disabled={isProcessing}>
                  <Coffee className="w-4 h-4 mr-2" />
                  Break
                </Button>
              </div>
            ) : (
              <Button onClick={handleEndBreak} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg" disabled={isProcessing}>
                <Play className="w-5 h-5 mr-2" />
                End Break
              </Button>
            )}

            <Button onClick={handleClockOut} className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg" size="lg" disabled={isProcessing || currentBreak}>
              {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <StopCircle className="w-5 h-5 mr-2" />}
              {isProcessing ? 'Processing...' : 'Clock Out'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Select Job</label>
              {jobsLoading ? (
                <div className="flex items-center justify-center p-4 bg-slate-50 rounded-lg">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                  <span className="text-sm text-slate-600">Loading jobs...</span>
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800 font-medium">No active jobs available</p>
                  <p className="text-xs text-amber-600 mt-1">Please contact your administrator</p>
                </div>
              ) : (
                <Select 
                  value={selectedJob} 
                  onValueChange={(value) => {
                    console.log('Job selected:', value);
                    setSelectedJob(value);
                  }}
                  disabled={isProcessing}
                >
                  <SelectTrigger className="w-full bg-white border-slate-300 text-slate-900">
                    <SelectValue placeholder="Choose a job to start" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {jobs.map(job => (
                      <SelectItem key={job.id} value={job.id} className="cursor-pointer text-slate-900 hover:bg-slate-100">
                        {job.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {!selectedJob && !isProcessing && jobs.length > 0 && (
              <div className="flex items-center text-sm text-amber-600 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0"/>
                <span>Please select a job to clock in</span>
              </div>
            )}
            
            {locationError && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-sm font-medium">{locationError}</p>
                </div>
                <p className="text-xs text-red-600 mt-1">Please enable location in your browser settings</p>
              </div>
            )}
            
            <Button 
              onClick={handleClockIn} 
              disabled={!selectedJob || isProcessing || jobs.length === 0} 
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-green-500/30" 
              size="lg"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <PlayCircle className="w-5 h-5 mr-2" />}
              {isProcessing ? 'Getting location...' : 'Clock In'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}