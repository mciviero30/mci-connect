import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import GanttChartView from '@/components/gantt/GanttChartView';
import TaskDependencyManager from '@/components/gantt/TaskDependencyManager';
import { Calendar, Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function JobTimeline() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedJobId, setSelectedJobId] = useState('');

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'ceo';

  // Fetch all jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const allJobs = await base44.entities.Job.list('-created_date');
      return allJobs.filter(job => job.authorization_id && job.status !== 'archived');
    },
    enabled: !!user,
  });

  // Fetch tasks for selected job
  const { data: tasks = [] } = useQuery({
    queryKey: ['job-tasks', selectedJobId],
    queryFn: () => base44.entities.Task.filter({ job_id: selectedJobId }),
    enabled: !!selectedJobId,
  });

  // Fetch milestones for selected job
  const { data: milestones = [] } = useQuery({
    queryKey: ['job-milestones', selectedJobId],
    queryFn: () => base44.entities.ProjectMilestone.filter({ job_id: selectedJobId }),
    enabled: !!selectedJobId,
  });

  // Fetch dependencies for selected job
  const { data: dependencies = [] } = useQuery({
    queryKey: ['job-dependencies', selectedJobId],
    queryFn: () => base44.entities.TaskDependency.filter({ job_id: selectedJobId }),
    enabled: !!selectedJobId,
  });

  // Selected job object
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }) => base44.entities.Task.update(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['job-tasks', selectedJobId]);
      toast({
        title: language === 'es' ? 'Tarea actualizada' : 'Task updated',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Add dependency mutation
  const addDependencyMutation = useMutation({
    mutationFn: (data) => base44.entities.TaskDependency.create({
      ...data,
      job_id: selectedJobId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['job-dependencies', selectedJobId]);
      toast({
        title: language === 'es' ? 'Dependencia agregada' : 'Dependency added',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Remove dependency mutation
  const removeDependencyMutation = useMutation({
    mutationFn: (depId) => base44.entities.TaskDependency.delete(depId),
    onSuccess: () => {
      queryClient.invalidateQueries(['job-dependencies', selectedJobId]);
      toast({
        title: language === 'es' ? 'Dependencia eliminada' : 'Dependency removed',
        variant: 'success'
      });
    }
  });

  // Calculate project health metrics
  const projectHealth = useMemo(() => {
    if (!tasks.length) return null;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

    const completionRate = Math.round((completedTasks / totalTasks) * 100);
    const onTimeRate = totalTasks > 0 ? Math.round(((totalTasks - overdueTasks) / totalTasks) * 100) : 100;

    return {
      completionRate,
      onTimeRate,
      overdueTasks,
      blockedTasks,
      health: completionRate >= 80 && onTimeRate >= 90 ? 'healthy' :
              completionRate >= 50 && onTimeRate >= 70 ? 'warning' : 'critical'
    };
  }, [tasks]);

  // Access control
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400">
              Only administrators and CEOs can access project timelines.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <PageHeader
          title={language === 'es' ? 'Línea de Tiempo del Proyecto' : 'Project Timeline'}
          description={language === 'es' 
            ? 'Visualiza tareas, dependencias y ruta crítica' 
            : 'Visualize tasks, dependencies, and critical path'}
          icon={Calendar}
        />

        {/* Job Selector */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              {language === 'es' ? 'Seleccionar Proyecto' : 'Select Project'}
            </label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600">
                <SelectValue placeholder={language === 'es' ? 'Selecciona un proyecto...' : 'Select a project...'} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-800">
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{job.job_number || job.id.substring(0, 8)}</span>
                      <span>-</span>
                      <span>{job.name || job.job_name_field}</span>
                      <Badge 
                        variant="outline" 
                        className={`ml-2 ${
                          job.status === 'active' ? 'bg-blue-50 text-blue-700' : 
                          job.status === 'completed' ? 'bg-green-50 text-green-700' : 
                          'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {job.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedJobId && (
          <>
            {/* Project Health */}
            {projectHealth && (
              <Card className={`border-2 ${
                projectHealth.health === 'healthy' ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' :
                projectHealth.health === 'warning' ? 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10' :
                'border-red-200 bg-red-50/50 dark:bg-red-900/10'
              }`}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className={`w-8 h-8 ${
                        projectHealth.health === 'healthy' ? 'text-green-600' :
                        projectHealth.health === 'warning' ? 'text-yellow-600' :
                        'text-red-600'
                      }`} />
                      <div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Project Health</div>
                        <div className={`text-xl font-bold ${
                          projectHealth.health === 'healthy' ? 'text-green-700 dark:text-green-400' :
                          projectHealth.health === 'warning' ? 'text-yellow-700 dark:text-yellow-400' :
                          'text-red-700 dark:text-red-400'
                        }`}>
                          {projectHealth.health === 'healthy' ? 'Healthy' :
                           projectHealth.health === 'warning' ? 'At Risk' : 'Critical'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Completion</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {projectHealth.completionRate}%
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">On-Time Rate</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {projectHealth.onTimeRate}%
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Issues</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {projectHealth.overdueTasks + projectHealth.blockedTasks}
                      </div>
                      {(projectHealth.overdueTasks > 0 || projectHealth.blockedTasks > 0) && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {projectHealth.overdueTasks} overdue, {projectHealth.blockedTasks} blocked
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gantt Chart */}
            <GanttChartView
              job={selectedJob}
              tasks={tasks}
              milestones={milestones}
              dependencies={dependencies}
              onTaskUpdate={(taskId, data) => updateTaskMutation.mutate({ taskId, data })}
              readOnly={false}
            />

            {/* Task Dependencies Manager */}
            <TaskDependencyManager
              tasks={tasks}
              dependencies={dependencies}
              onAddDependency={(data) => addDependencyMutation.mutate(data)}
              onRemoveDependency={(depId) => removeDependencyMutation.mutate(depId)}
            />
          </>
        )}

        {!selectedJobId && (
          <Card className="border-2 border-dashed border-slate-300 dark:border-slate-600">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {language === 'es' ? 'Selecciona un Proyecto' : 'Select a Project'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {language === 'es' 
                  ? 'Elige un proyecto arriba para ver su línea de tiempo y dependencias de tareas'
                  : 'Choose a project above to view its timeline and task dependencies'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}