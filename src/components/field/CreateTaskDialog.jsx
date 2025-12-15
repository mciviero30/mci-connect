import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Predefined checklist templates
const CHECKLIST_TEMPLATES = {
  glass_wall: [
    { id: 1, text: 'Staging product', completed: false },
    { id: 2, text: 'Check Dimension', completed: false },
    { id: 3, text: 'Cut Horizontal', completed: false },
    { id: 4, text: 'Built Glass Extrusion frame', completed: false },
    { id: 5, text: 'Properly attach extrusion to the building', completed: false },
    { id: 6, text: 'Check for plumb', completed: false },
    { id: 7, text: 'Install glass', completed: false },
    { id: 8, text: 'Install covers', completed: false },
    { id: 9, text: 'Install doors hardware (sliding, Pivot, Hinge)', completed: false },
    { id: 10, text: 'Install door and adjustment', completed: false },
    { id: 11, text: 'Clean', completed: false },
  ],
  solid_wall: [
    { id: 1, text: 'Staging Product', completed: false },
    { id: 2, text: 'Check Demension/Layout', completed: false },
    { id: 3, text: 'Base track', completed: false },
    { id: 4, text: 'Ceiling Track / SW Cornice Rail', completed: false },
    { id: 5, text: 'Studs', completed: false },
    { id: 6, text: 'Horizontal', completed: false },
    { id: 7, text: 'Power', completed: false },
    { id: 8, text: 'Level/Plumb', completed: false },
    { id: 9, text: 'Floor Base/ Foam', completed: false },
    { id: 10, text: 'Support Post', completed: false },
    { id: 11, text: 'Cladding', completed: false },
    { id: 12, text: 'Outlet Cover plates', completed: false },
    { id: 13, text: 'Clean', completed: false },
  ],
};

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
    checklist: [],
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
        checklist: [],
      });
      onOpenChange(false);
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
      checklist: task.checklist.length > 0 ? task.checklist : undefined,
    });
  };

  const handleTemplateSelect = (templateKey) => {
    if (templateKey && CHECKLIST_TEMPLATES[templateKey]) {
      setTask(prev => ({
        ...prev,
        checklist: CHECKLIST_TEMPLATES[templateKey]
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-5xl h-[90vh] p-0 overflow-hidden">
        {/* Two Column Layout */}
        <div className="flex h-full">
          {/* Left Column - Task Details */}
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-700">
            {/* Header with editable title */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#FFB800] rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">📋</span>
                </div>
                <Input 
                  value={task.title}
                  onChange={(e) => setTask({...task, title: e.target.value})}
                  placeholder="Enter title"
                  className="text-xl font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Checklist Section */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Checklist:</h3>
                <Select onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="w-48 h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="+ Add checklist" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="glass_wall" className="text-slate-900 dark:text-white text-xs">Glass Wall Installation</SelectItem>
                    <SelectItem value="solid_wall" className="text-slate-900 dark:text-white text-xs">Solid Wall Installation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {task.checklist.length > 0 ? (
                <div className="space-y-2">
                  {task.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <div className="w-4 h-4 border-2 border-slate-300 dark:border-slate-600 rounded"></div>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">No checklist items yet. Select a template above.</p>
              )}
            </div>

            {/* Bottom Message Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <Textarea 
                value={task.description}
                onChange={(e) => setTask({...task, description: e.target.value})}
                placeholder="Enter message here..."
                className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
                rows={2}
              />
              <Button 
                onClick={handleSubmit}
                disabled={!task.title || createTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {createTaskMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>

          {/* Right Column - Task Attributes */}
          <div className="w-80 flex flex-col bg-slate-50 dark:bg-slate-800/50">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">Task Attributes</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Status</label>
                <Select value={task.status} onValueChange={(v) => setTask({...task, status: v})}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Priority</label>
                <Select value={task.priority} onValueChange={(v) => setTask({...task, priority: v})}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Category</label>
                <Select value={task.category} onValueChange={(v) => setTask({...task, category: v})}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="change_order">Change Order</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="rfi">RFI</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Assignee</label>
                <Input 
                  value={task.assigned_to}
                  onChange={(e) => setTask({...task, assigned_to: e.target.value})}
                  placeholder="user@example.com"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Due Date</label>
                <Input 
                  type="date"
                  value={task.due_date}
                  onChange={(e) => setTask({...task, due_date: e.target.value})}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Blueprint thumbnail (if available) */}
              {blueprintId && (
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-2 block">Location</label>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                    <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center">
                      <span className="text-xs text-slate-400">Blueprint Pin</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}