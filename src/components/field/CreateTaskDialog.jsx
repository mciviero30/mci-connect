import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, MapPin, Plus, CheckSquare, Calendar, User } from 'lucide-react';

export default function CreateTaskDialog({ open, onOpenChange, jobId, blueprintId, pinPosition, onCreated }) {
  const [task, setTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    status: 'pending',
    due_date: '',
    assigned_to: '',
  });
  const [checklist, setChecklist] = useState([]);
  const [newCheckItem, setNewCheckItem] = useState('');

  // Fetch plan details for mini map
  const { data: plan } = useQuery({
    queryKey: ['plan', blueprintId],
    queryFn: () => base44.entities.Plan.filter({ id: blueprintId }).then(plans => plans[0]),
    enabled: !!blueprintId && open,
  });

  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
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
      onCreated?.();
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
      checklist: checklist,
    });
  };

  const addChecklistItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist([...checklist, { text: newCheckItem, completed: false }]);
    setNewCheckItem('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-4xl p-0">
        {/* Split layout like Fieldwire */}
        <div className="flex flex-col md:flex-row">
          {/* Left Panel - Task Details */}
          <div className="flex-1 p-6 border-r border-slate-200 dark:border-slate-700">
            {/* Close button */}
            <button 
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Pin icon and inline title */}
            <div className="flex items-start gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <Input 
                  value={task.title}
                  onChange={(e) => setTask({...task, title: e.target.value})}
                  placeholder="Enter title"
                  className="text-lg font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0 placeholder:text-slate-400"
                />
                <p className="text-sm text-slate-500 mt-1">#{jobId?.slice(0, 8) || 'New'} | {plan?.name || 'Plan'}</p>
              </div>
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">Checklist:</h3>
              <div className="space-y-2">
                {checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-slate-400" />
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input 
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    placeholder="+ New item"
                    className="text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                  />
                  <Button 
                    onClick={addChecklistItem}
                    size="sm"
                    variant="ghost"
                    className="text-blue-500"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <Textarea 
                value={task.description}
                onChange={(e) => setTask({...task, description: e.target.value})}
                placeholder="Detalles de la tarea..."
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                rows={4}
              />
            </div>
          </div>

          {/* Right Panel - Attributes & Mini Map */}
          <div className="w-full md:w-96 p-6 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-4">Task Attributes</h3>
            
            <div className="space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <span className="text-lg">#</span> Category
                </label>
                <Select value={task.category} onValueChange={(v) => setTask({...task, category: v})}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="change_order">Change Order</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="rfi">RFI</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="issue">Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Priority</label>
                <Select value={task.priority} onValueChange={(v) => setTask({...task, priority: v})}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <User className="w-3 h-3" /> Assignee
                </label>
                <Input 
                  value={task.assigned_to}
                  onChange={(e) => setTask({...task, assigned_to: e.target.value})}
                  placeholder="usuario@ejemplo.com"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Mini Map */}
              {plan && pinPosition && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                  <div className="relative aspect-video">
                    <img 
                      src={plan.file_url}
                      alt={plan.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Pin on mini map */}
                    <div 
                      className="absolute w-4 h-4 -ml-2 -mt-4"
                      style={{ left: `${pinPosition.x}%`, top: `${pinPosition.y}%` }}
                    >
                      <MapPin className="w-4 h-4 text-amber-500" fill="currentColor" />
                    </div>
                  </div>
                  <div className="p-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{plan.name}</p>
                  </div>
                </div>
              )}

              {/* Due Date */}
              <div>
                <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Due date
                </label>
                <Input 
                  type="date"
                  value={task.due_date}
                  onChange={(e) => setTask({...task, due_date: e.target.value})}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!task.title || createTaskMutation.isPending}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {createTaskMutation.isPending ? 'Creando...' : 'Crear Tarea'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}