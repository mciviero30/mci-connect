import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Play, Pause, Clock, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function TaskTimeTracker({ taskId, jobId }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: activeLog } = useQuery({
    queryKey: ['active-time-log', taskId, user?.email],
    queryFn: async () => {
      const logs = await base44.entities.TaskTimeLog.filter({
        task_id: taskId,
        user_email: user?.email,
        is_active: true
      });
      return logs[0] || null;
    },
    enabled: !!user?.email && !!taskId,
  });

  const { data: totalTime = 0 } = useQuery({
    queryKey: ['task-total-time', taskId],
    queryFn: async () => {
      const logs = await base44.entities.TaskTimeLog.filter({
        task_id: taskId,
        is_active: false
      });
      return logs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
    },
    enabled: !!taskId,
  });

  const startTimerMutation = useMutation({
    mutationFn: () => base44.entities.TaskTimeLog.create({
      task_id: taskId,
      job_id: jobId,
      user_email: user?.email,
      user_name: user?.full_name,
      start_time: new Date().toISOString(),
      is_active: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-time-log', taskId] });
      setIsRunning(true);
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      if (!activeLog) return;
      const endTime = new Date();
      const startTime = new Date(activeLog.start_time);
      const durationMinutes = Math.round((endTime - startTime) / 60000);
      
      return base44.entities.TaskTimeLog.update(activeLog.id, {
        end_time: endTime.toISOString(),
        duration_minutes: durationMinutes,
        is_active: false,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-time-log', taskId] });
      queryClient.invalidateQueries({ queryKey: ['task-total-time', taskId] });
      setIsRunning(false);
      setElapsedTime(0);
    },
  });

  useEffect(() => {
    if (activeLog) {
      setIsRunning(true);
      const startTime = new Date(activeLog.start_time);
      setElapsedTime(Math.round((new Date() - startTime) / 1000));
    }
  }, [activeLog]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="bg-slate-900/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">Tiempo</span>
        </div>
        <span className="text-xs text-slate-500">
          Total: {formatMinutes(totalTime)}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`font-mono text-xl ${isRunning ? 'text-green-400' : 'text-white'}`}>
          {formatTime(elapsedTime)}
        </span>
        
        {isRunning ? (
          <Button
            size="sm"
            onClick={() => stopTimerMutation.mutate()}
            className="bg-red-500 hover:bg-red-600"
          >
            <StopCircle className="w-4 h-4 mr-1" />
            Detener
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => startTimerMutation.mutate()}
            className="bg-green-500 hover:bg-green-600"
          >
            <Play className="w-4 h-4 mr-1" />
            Iniciar
          </Button>
        )}
      </div>
    </div>
  );
}