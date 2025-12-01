import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link2, Plus, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function TaskDependencies({ taskId, jobId, allTasks = [] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTask, setSelectedTask] = useState('');
  const queryClient = useQueryClient();

  const { data: dependencies = [] } = useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: () => base44.entities.TaskDependency.filter({ task_id: taskId }),
    enabled: !!taskId,
  });

  const { data: dependents = [] } = useQuery({
    queryKey: ['task-dependents', taskId],
    queryFn: () => base44.entities.TaskDependency.filter({ depends_on_task_id: taskId }),
    enabled: !!taskId,
  });

  const addDependencyMutation = useMutation({
    mutationFn: (dependsOnTaskId) => base44.entities.TaskDependency.create({
      job_id: jobId,
      task_id: taskId,
      depends_on_task_id: dependsOnTaskId,
      dependency_type: 'finish_to_start',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
      setShowAdd(false);
      setSelectedTask('');
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: (id) => base44.entities.TaskDependency.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] });
    },
  });

  const getTaskById = (id) => allTasks.find(t => t.id === id);
  
  const availableTasks = allTasks.filter(t => 
    t.id !== taskId && 
    !dependencies.find(d => d.depends_on_task_id === t.id)
  );

  const hasBlockingDependency = dependencies.some(dep => {
    const task = getTaskById(dep.depends_on_task_id);
    return task && task.status !== 'completed';
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 uppercase">Dependencias</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="h-6 text-slate-400 hover:text-white"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {hasBlockingDependency && (
        <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-amber-400">Tiene dependencias sin completar</span>
        </div>
      )}

      {showAdd && (
        <div className="flex gap-2">
          <Select value={selectedTask} onValueChange={setSelectedTask}>
            <SelectTrigger className="flex-1 bg-slate-800 border-slate-700 text-white text-sm h-8">
              <SelectValue placeholder="Seleccionar tarea..." />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {availableTasks.map(task => (
                <SelectItem key={task.id} value={task.id} className="text-white text-sm">
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => addDependencyMutation.mutate(selectedTask)}
            disabled={!selectedTask}
            className="h-8 bg-amber-500 hover:bg-amber-600"
          >
            Añadir
          </Button>
        </div>
      )}

      {dependencies.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-slate-500">Depende de:</span>
          {dependencies.map(dep => {
            const task = getTaskById(dep.depends_on_task_id);
            if (!task) return null;
            return (
              <div key={dep.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    task.status === 'completed' ? 'bg-green-500' : 'bg-amber-500'
                  }`} />
                  <span className="text-sm text-white truncate">{task.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDependencyMutation.mutate(dep.id)}
                  className="h-6 w-6 text-slate-400 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {dependents.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-slate-500">Bloquea a:</span>
          {dependents.map(dep => {
            const task = getTaskById(dep.task_id);
            if (!task) return null;
            return (
              <div key={dep.id} className="flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg">
                <span className="text-sm text-slate-400 truncate">{task.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}