import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link2, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TaskDependencyManager({ 
  tasks = [], 
  dependencies = [], 
  onAddDependency, 
  onRemoveDependency 
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedDependency, setSelectedDependency] = useState('');
  const [dependencyType, setDependencyType] = useState('finish_to_start');

  const handleAddDependency = () => {
    if (!selectedTask || !selectedDependency) return;
    
    onAddDependency({
      task_id: selectedTask,
      depends_on_task_id: selectedDependency,
      dependency_type: dependencyType
    });

    setSelectedTask('');
    setSelectedDependency('');
    setDependencyType('finish_to_start');
    setShowDialog(false);
  };

  const getTaskName = (taskId) => {
    return tasks.find(t => t.id === taskId)?.title || 'Unknown Task';
  };

  const dependencyTypeLabels = {
    finish_to_start: 'Finish → Start',
    start_to_start: 'Start → Start',
    finish_to_finish: 'Finish → Finish'
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[#507DB4]" />
            Task Dependencies
          </CardTitle>
          <Button 
            onClick={() => setShowDialog(true)} 
            size="sm"
            className="bg-[#507DB4] hover:bg-[#507DB4]/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Dependency
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {dependencies.length === 0 ? (
          <div className="text-center py-8">
            <Link2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No dependencies defined. Tasks can run in parallel.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dependencies.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {getTaskName(dep.depends_on_task_id)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {getTaskName(dep.task_id)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {dependencyTypeLabels[dep.dependency_type] || dep.dependency_type}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDependency(dep.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Dependency Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Add Task Dependency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                This Task
              </label>
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Select task that depends..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  {tasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Depends On
              </label>
              <Select value={selectedDependency} onValueChange={setSelectedDependency}>
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Select dependency task..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  {tasks
                    .filter(t => t.id !== selectedTask)
                    .map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                Dependency Type
              </label>
              <Select value={dependencyType} onValueChange={setDependencyType}>
                <SelectTrigger className="bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800">
                  <SelectItem value="finish_to_start">
                    Finish → Start (most common)
                  </SelectItem>
                  <SelectItem value="start_to_start">
                    Start → Start (parallel start)
                  </SelectItem>
                  <SelectItem value="finish_to_finish">
                    Finish → Finish (sync completion)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {dependencyType === 'finish_to_start' && 'Task B starts after Task A finishes'}
                {dependencyType === 'start_to_start' && 'Task B starts when Task A starts'}
                {dependencyType === 'finish_to_finish' && 'Task B finishes when Task A finishes'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddDependency}
                disabled={!selectedTask || !selectedDependency || selectedTask === selectedDependency}
                className="bg-[#507DB4] hover:bg-[#507DB4]/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Dependency
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}