import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateTaskDialog({ open, onOpenChange, jobId, blueprintId, pinPosition, onCreated }) {
  const queryClient = useQueryClient();
  const [task, setTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    status: 'pending',
    due_date: '',
    assigned_to: '',
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      setTask({
        title: '',
        description: '',
        priority: 'medium',
        category: 'general',
        status: 'pending',
        due_date: '',
        assigned_to: '',
      });
      onCreated?.(newTask?.id);
    },
  });

  const handleSubmit = () => {
    if (!task.title) return;
    
    createTaskMutation.mutate({
      ...task,
      job_id: jobId,
      blueprint_id: blueprintId,
      pin_x: pinPosition?.x,
      pin_y: pinPosition?.y,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-blue-600 dark:text-[#FFB800]">New Task</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-slate-700 dark:text-slate-300">Title *</Label>
            <Input 
              value={task.title}
              onChange={(e) => setTask({...task, title: e.target.value})}
              placeholder="e.g., Install windows in living room"
              className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-300">Description</Label>
            <Textarea 
              value={task.description}
              onChange={(e) => setTask({...task, description: e.target.value})}
              placeholder="Task details..."
              className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Category</Label>
              <Select value={task.category} onValueChange={(v) => setTask({...task, category: v})}>
                <SelectTrigger className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="general" className="text-slate-900 dark:text-white">General</SelectItem>
                  <SelectItem value="change_order" className="text-slate-900 dark:text-white">Change Order</SelectItem>
                  <SelectItem value="installation" className="text-slate-900 dark:text-white">Installation</SelectItem>
                  <SelectItem value="rfi" className="text-slate-900 dark:text-white">RFI</SelectItem>
                  <SelectItem value="inspection" className="text-slate-900 dark:text-white">Inspection</SelectItem>
                  <SelectItem value="issue" className="text-slate-900 dark:text-white">Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300">Priority</Label>
              <Select value={task.priority} onValueChange={(v) => setTask({...task, priority: v})}>
                <SelectTrigger className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="low" className="text-slate-900 dark:text-white">Low</SelectItem>
                  <SelectItem value="medium" className="text-slate-900 dark:text-white">Medium</SelectItem>
                  <SelectItem value="high" className="text-slate-900 dark:text-white">High</SelectItem>
                  <SelectItem value="urgent" className="text-slate-900 dark:text-white">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-300">Due Date</Label>
            <Input 
              type="date"
              value={task.due_date}
              onChange={(e) => setTask({...task, due_date: e.target.value})}
              className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-300">Assign to (email)</Label>
            <Input 
              value={task.assigned_to}
              onChange={(e) => setTask({...task, assigned_to: e.target.value})}
              placeholder="user@example.com"
              className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!task.title || createTaskMutation.isPending}
              className="bg-gradient-to-r from-[#FFB800] to-orange-500 hover:from-[#E5A600] hover:to-orange-600 text-white"
            >
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}