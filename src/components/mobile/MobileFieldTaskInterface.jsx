import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { 
  Clock, 
  MapPin, 
  CheckCircle, 
  PlayCircle, 
  StopCircle,
  Camera,
  FileText,
  AlertCircle,
  Navigation,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useEnhancedOfflineSync } from '@/components/offline/EnhancedOfflineSync';

// Touch-optimized field task interface for mobile workers
export default function MobileFieldTaskInterface({ user }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isOnline, queueMutation } = useEnhancedOfflineSync();
  const [activeTask, setActiveTask] = useState(null);
  const [location, setLocation] = useState(null);

  // Get today's assignments
  const { data: todayAssignments = [] } = useQuery({
    queryKey: ['todayAssignments', user?.email],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      return await base44.entities.JobAssignment.filter({
        employee_email: user.email,
        date: today
      });
    },
    enabled: !!user?.email,
    staleTime: 30000
  });

  // Get active time entry
  const { data: activeEntry } = useQuery({
    queryKey: ['activeTimeEntry', user?.email],
    queryFn: async () => {
      const entries = await base44.entities.TimeEntry.filter({
        employee_email: user.email,
        date: new Date().toISOString().split('T')[0]
      });
      return entries.find(e => e.check_in && !e.check_out);
    },
    enabled: !!user?.email,
    staleTime: 10000
  });

  // Track user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async (assignment) => {
      const entry = {
        employee_email: user.email,
        employee_name: user.full_name,
        job_id: assignment.job_id,
        job_name: assignment.job_name,
        date: new Date().toISOString().split('T')[0],
        check_in: new Date().toTimeString().split(' ')[0],
        check_in_latitude: location?.latitude,
        check_in_longitude: location?.longitude,
        status: 'pending'
      };

      if (isOnline) {
        return await base44.entities.TimeEntry.create(entry);
      } else {
        queueMutation({ entity: 'TimeEntry', operation: 'create', data: entry });
        return entry;
      }
    },
    onSuccess: (data, assignment) => {
      toast.success(`✅ Clocked in to ${assignment.job_name}`);
      queryClient.invalidateQueries({ queryKey: ['activeTimeEntry'] });
      setActiveTask(assignment);
    }
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const updateData = {
        check_out: new Date().toTimeString().split(' ')[0],
        check_out_latitude: location?.latitude,
        check_out_longitude: location?.longitude
      };

      if (isOnline) {
        return await base44.entities.TimeEntry.update(activeEntry.id, updateData);
      } else {
        queueMutation({
          entity: 'TimeEntry',
          operation: 'update',
          recordId: activeEntry.id,
          data: updateData
        });
        return { ...activeEntry, ...updateData };
      }
    },
    onSuccess: () => {
      toast.success('✅ Clocked out successfully');
      queryClient.invalidateQueries({ queryKey: ['activeTimeEntry'] });
      setActiveTask(null);
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 pb-24">
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Today's Tasks
        </h1>
        <Badge variant={isOnline ? 'default' : 'destructive'} className="gap-2">
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {/* Active Time Entry Card */}
      {activeEntry && (
        <Card className="mb-4 border-2 border-green-500 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600 animate-pulse" />
                Currently Working
              </CardTitle>
              <Badge className="bg-green-600">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Job</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {activeEntry.job_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Clocked in</p>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {activeEntry.check_in}
                </p>
              </div>
              <Button
                onClick={() => clockOutMutation.mutate()}
                disabled={clockOutMutation.isPending}
                className="w-full h-14 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-lg font-semibold"
              >
                <StopCircle className="w-5 h-5 mr-2" />
                Clock Out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Assignments */}
      <div className="space-y-3">
        {todayAssignments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">
                No assignments for today
              </p>
            </CardContent>
          </Card>
        ) : (
          todayAssignments.map((assignment) => (
            <Card
              key={assignment.id}
              className="hover:shadow-lg transition-shadow touch-manipulation"
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                        {assignment.job_name || assignment.event_title}
                      </h3>
                      {assignment.start_time && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Clock className="w-4 h-4" />
                          {assignment.start_time}
                          {assignment.end_time && ` - ${assignment.end_time}`}
                        </div>
                      )}
                    </div>
                    {activeEntry?.job_id === assignment.job_id ? (
                      <Badge className="bg-green-600 ml-2">In Progress</Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2">Scheduled</Badge>
                    )}
                  </div>

                  {assignment.notes && (
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <p className="text-slate-600 dark:text-slate-400">
                        {assignment.notes}
                      </p>
                    </div>
                  )}

                  {!activeEntry && (
                    <Button
                      onClick={() => clockInMutation.mutate(assignment)}
                      disabled={clockInMutation.isPending}
                      className="w-full h-14 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white text-lg font-semibold"
                    >
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Clock In
                    </Button>
                  )}

                  {location && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Navigation className="w-3 h-3" />
                      Location tracked (±{location.accuracy?.toFixed(0)}m)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}