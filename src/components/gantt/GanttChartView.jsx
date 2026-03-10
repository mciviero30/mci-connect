import React, { useState, useMemo } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ZoomIn, ZoomOut, Maximize2, AlertCircle, Clock } from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

export default function GanttChartView({ 
  job, 
  tasks = [], 
  milestones = [], 
  dependencies = [],
  onTaskUpdate,
  readOnly = false 
}) {
  const [viewMode, setViewMode] = useState(ViewMode.Week);
  const [showCriticalPath, setShowCriticalPath] = useState(true);

  // Helper functions defined before useMemo to avoid uninitialized variable errors
  const calculateJobProgress = (taskList) => {
    if (!taskList || taskList.length === 0) return 0;
    const completedTasks = taskList.filter(t => t.status === 'completed').length;
    return Math.round((completedTasks / taskList.length) * 100);
  };

  const getTaskColor = (status, priority, isCritical) => {
    if (isCritical && showCriticalPath) return '#EF4444';
    if (status === 'completed') return '#10B981';
    if (status === 'blocked') return '#6B7280';
    if (priority === 'urgent' || priority === 'high') return '#F59E0B';
    if (status === 'in_progress') return '#3B82F6';
    return '#507DB4';
  };

  const getTaskBackground = (status, priority, isCritical) => {
    if (isCritical && showCriticalPath) return '#FEE2E2';
    if (status === 'completed') return '#D1FAE5';
    if (status === 'blocked') return '#F3F4F6';
    if (priority === 'urgent' || priority === 'high') return '#FEF3C7';
    if (status === 'in_progress') return '#DBEAFE';
    return '#EBF2FF';
  };

  const getDependenciesForTask = (taskId, deps) => {
    if (!deps) return [];
    return deps.filter(dep => dep.task_id === taskId).map(dep => `task-${dep.depends_on_task_id}`);
  };

  const isTaskCritical = (task, allTasks, deps) => {
    if (!showCriticalPath || !deps) return false;
    const hasDependents = deps.some(dep => dep.depends_on_task_id === task.id);
    const isDependency = deps.some(dep => dep.task_id === task.id);
    return hasDependents || isDependency;
  };

  // Transform tasks and milestones into Gantt format
  const ganttTasks = useMemo(() => {
    const ganttData = [];

    // Add job as root task
    if (job) {
      const startDate = job.start_date_field ? new Date(job.start_date_field) : new Date();
      const endDate = job.end_date_field ? new Date(job.end_date_field) : addDays(startDate, 30);
      
      ganttData.push({
        id: `job-${job.id}`,
        name: job.name || job.job_name_field || 'Project',
        start: startDate,
        end: endDate,
        progress: calculateJobProgress(tasks),
        type: 'project',
        hideChildren: false,
        styles: {
          progressColor: '#507DB4',
          progressSelectedColor: '#6B9DD8',
          backgroundColor: '#EBF2FF',
          backgroundSelectedColor: '#507DB4'
        }
      });
    }

    // Add milestones
    milestones.forEach(milestone => {
      if (milestone.target_date) {
        const milestoneDate = new Date(milestone.target_date);
        ganttData.push({
          id: `milestone-${milestone.id}`,
          name: `🎯 ${milestone.name}`,
          start: milestoneDate,
          end: milestoneDate,
          progress: milestone.status === 'completed' ? 100 : 0,
          type: 'milestone',
          project: job ? `job-${job.id}` : undefined,
          styles: {
            progressColor: milestone.status === 'completed' ? '#10B981' : '#F59E0B',
            progressSelectedColor: milestone.status === 'completed' ? '#059669' : '#D97706',
            backgroundColor: milestone.status === 'completed' ? '#D1FAE5' : '#FEF3C7',
            backgroundSelectedColor: milestone.status === 'completed' ? '#10B981' : '#F59E0B'
          }
        });
      }
    });

    // Add tasks
    tasks.forEach(task => {
      if (task.due_date) {
        // Calculate task duration (default 1 day if no start date)
        const endDate = new Date(task.due_date);
        const startDate = task.start_date ? new Date(task.start_date) : addDays(endDate, -1);
        
        const progress = task.status === 'completed' ? 100 :
                        task.status === 'in_progress' ? 50 :
                        task.status === 'blocked' ? 0 : 0;

        // Check if task is on critical path
        const isOnCriticalPath = isTaskCritical(task, tasks, dependencies);
        
        ganttData.push({
          id: `task-${task.id}`,
          name: task.title,
          start: startDate,
          end: endDate,
          progress,
          type: 'task',
          project: job ? `job-${job.id}` : undefined,
          dependencies: getDependenciesForTask(task.id, dependencies),
          styles: {
            progressColor: getTaskColor(task.status, task.priority, isOnCriticalPath),
            progressSelectedColor: getTaskColor(task.status, task.priority, isOnCriticalPath),
            backgroundColor: getTaskBackground(task.status, task.priority, isOnCriticalPath),
            backgroundSelectedColor: getTaskColor(task.status, task.priority, isOnCriticalPath)
          }
        });
      }
    });

    return ganttData;
  }, [tasks, milestones, job, dependencies, showCriticalPath]);

  // Calculate job progress
  const calculateJobProgress = (tasks) => {
    if (!tasks || tasks.length === 0) return 0;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  // Get task color based on status, priority, and critical path
  const getTaskColor = (status, priority, isCritical) => {
    if (isCritical && showCriticalPath) return '#EF4444'; // Red for critical path
    if (status === 'completed') return '#10B981'; // Green
    if (status === 'blocked') return '#6B7280'; // Gray
    if (priority === 'urgent' || priority === 'high') return '#F59E0B'; // Amber
    if (status === 'in_progress') return '#3B82F6'; // Blue
    return '#507DB4'; // Default corporate blue
  };

  const getTaskBackground = (status, priority, isCritical) => {
    if (isCritical && showCriticalPath) return '#FEE2E2'; // Red background
    if (status === 'completed') return '#D1FAE5'; // Green background
    if (status === 'blocked') return '#F3F4F6'; // Gray background
    if (priority === 'urgent' || priority === 'high') return '#FEF3C7'; // Amber background
    if (status === 'in_progress') return '#DBEAFE'; // Blue background
    return '#EBF2FF'; // Default background
  };

  // Get dependencies for a task
  const getDependenciesForTask = (taskId, dependencies) => {
    if (!dependencies) return [];
    return dependencies
      .filter(dep => dep.task_id === taskId)
      .map(dep => `task-${dep.depends_on_task_id}`);
  };

  // Simple critical path detection (tasks with dependencies and no slack time)
  const isTaskCritical = (task, allTasks, dependencies) => {
    if (!showCriticalPath || !dependencies) return false;
    
    // A task is on critical path if:
    // 1. It has dependencies (blocks other tasks)
    // 2. It has no slack time (delay would delay project)
    const hasDependents = dependencies.some(dep => dep.depends_on_task_id === task.id);
    const isDependency = dependencies.some(dep => dep.task_id === task.id);
    
    return hasDependents || isDependency;
  };

  // Handle task date change
  const handleTaskChange = (task) => {
    if (readOnly || !onTaskUpdate) return;

    // Extract task ID from gantt format
    const taskId = task.id.replace('task-', '');
    const originalTask = tasks.find(t => t.id === taskId);
    
    if (originalTask) {
      onTaskUpdate(taskId, {
        due_date: format(task.end, 'yyyy-MM-dd'),
        start_date: format(task.start, 'yyyy-MM-dd')
      });
    }
  };

  // Handle progress change
  const handleProgressChange = (task) => {
    if (readOnly || !onTaskUpdate) return;

    const taskId = task.id.replace('task-', '');
    const originalTask = tasks.find(t => t.id === taskId);
    
    if (originalTask) {
      const newStatus = task.progress === 100 ? 'completed' :
                       task.progress > 0 ? 'in_progress' : 'pending';
      
      onTaskUpdate(taskId, { status: newStatus });
    }
  };

  const viewModeConfig = [
    { mode: ViewMode.Day, label: 'Day', icon: Calendar },
    { mode: ViewMode.Week, label: 'Week', icon: Calendar },
    { mode: ViewMode.Month, label: 'Month', icon: Calendar },
  ];

  // Stats
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const blockedTasks = tasks.filter(t => t.status === 'blocked').length;
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    }).length;

    return { totalTasks, completedTasks, inProgressTasks, blockedTasks, overdueTasks };
  }, [tasks]);

  if (ganttTasks.length === 0) {
    return (
      <Card className="border-slate-200 dark:border-slate-700">
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            No Timeline Data
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Add tasks with due dates to see the Gantt chart
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Tasks</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalTasks}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="text-xs text-green-700 dark:text-green-400 mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-300">{stats.completedTasks}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">In Progress</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">{stats.inProgressTasks}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">Blocked</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-300">{stats.blockedTasks}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="text-xs text-red-700 dark:text-red-400 mb-1">Overdue</div>
            <div className="text-2xl font-bold text-red-900 dark:text-red-300">{stats.overdueTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#507DB4]" />
              Project Timeline
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCriticalPath(!showCriticalPath)}
                className={showCriticalPath ? 'bg-red-50 border-red-200 text-red-700' : ''}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Critical Path
              </Button>
              {viewModeConfig.map(({ mode, label }) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className={viewMode === mode ? 'bg-[#507DB4] text-white' : ''}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Legend */}
          <div className="mb-4 flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#EBF2FF] border-2 border-[#507DB4]"></div>
              <span className="text-slate-600 dark:text-slate-400">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#DBEAFE] border-2 border-[#3B82F6]"></div>
              <span className="text-slate-600 dark:text-slate-400">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#D1FAE5] border-2 border-[#10B981]"></div>
              <span className="text-slate-600 dark:text-slate-400">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#FEF3C7] border-2 border-[#F59E0B]"></div>
              <span className="text-slate-600 dark:text-slate-400">High Priority</span>
            </div>
            {showCriticalPath && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#FEE2E2] border-2 border-[#EF4444]"></div>
                <span className="text-slate-600 dark:text-slate-400 font-semibold">Critical Path</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#FEF3C7] border-2 border-[#F59E0B]"></div>
              <span className="text-slate-600 dark:text-slate-400">Milestone</span>
            </div>
          </div>

          {/* Gantt Chart */}
          <div className="gantt-container bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <Gantt
              tasks={ganttTasks}
              viewMode={viewMode}
              onDateChange={handleTaskChange}
              onProgressChange={handleProgressChange}
              listCellWidth="200px"
              columnWidth={viewMode === ViewMode.Month ? 60 : viewMode === ViewMode.Week ? 65 : 50}
              ganttHeight={Math.max(400, ganttTasks.length * 50)}
              barBackgroundColor="#EBF2FF"
              barBackgroundSelectedColor="#507DB4"
              barProgressColor="#507DB4"
              barProgressSelectedColor="#6B9DD8"
              todayColor="rgba(255, 140, 0, 0.2)"
              TooltipContent={TaskTooltip}
              TaskListHeader={TaskListHeader}
              TaskListTable={TaskListTable}
            />
          </div>

          {/* Info Banner */}
          {!readOnly && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2 text-sm text-blue-900 dark:text-blue-300">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <strong>Interactive Timeline:</strong> Drag tasks to reschedule, adjust bars to change duration. 
                  {showCriticalPath && <span className="ml-1">Red tasks are on the critical path - delays will impact project completion.</span>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Custom tooltip component
const TaskTooltip = ({ task, fontSize, fontFamily }) => {
  const isTask = task.id.startsWith('task-');
  const isMilestone = task.id.startsWith('milestone-');
  
  return (
    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl max-w-xs" style={{ fontSize, fontFamily }}>
      <div className="font-bold mb-2">{task.name}</div>
      <div className="space-y-1 text-xs">
        <div>Start: {format(task.start, 'MMM d, yyyy')}</div>
        <div>End: {format(task.end, 'MMM d, yyyy')}</div>
        <div>Duration: {differenceInDays(task.end, task.start) + 1} days</div>
        {!isMilestone && (
          <div className="mt-2">
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
            <div className="text-center mt-1">{task.progress}% complete</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Custom task list header
const TaskListHeader = ({ headerHeight }) => {
  return (
    <div 
      className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 flex items-center font-semibold text-slate-900 dark:text-white"
      style={{ height: headerHeight }}
    >
      Task Name
    </div>
  );
};

// Custom task list table
const TaskListTable = ({ rowHeight, rowWidth, tasks, selectedTaskId, setSelectedTask }) => {
  return (
    <div className="bg-white dark:bg-slate-900">
      {tasks.map((task, index) => {
        const isSelected = task.id === selectedTaskId;
        const isProject = task.type === 'project';
        const isMilestone = task.type === 'milestone';
        
        return (
          <div
            key={task.id}
            className={`border-b border-slate-200 dark:border-slate-700 px-4 flex items-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${
              isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
            style={{ height: rowHeight, width: rowWidth }}
            onClick={() => setSelectedTask(task.id)}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isProject && <span className="text-lg">📁</span>}
              {isMilestone && <span className="text-lg">🎯</span>}
              {!isProject && !isMilestone && (
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.progress === 100 ? 'bg-green-500' :
                  task.progress > 0 ? 'bg-blue-500' :
                  'bg-slate-300'
                }`} />
              )}
              <span className={`truncate text-sm ${isProject ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                {task.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};