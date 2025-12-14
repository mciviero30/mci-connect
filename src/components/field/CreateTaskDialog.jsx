import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, MapPin, Plus, CheckSquare, Calendar, User, Check, Minus, Square } from 'lucide-react';
import { CHECKLIST_TEMPLATES, CHECKLIST_STATUS, calculateProgress } from './ChecklistTemplates';

export default function CreateTaskDialog({ open, onOpenChange, jobId, blueprintId, pinPosition, onCreated }) {
  const [task, setTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    status: 'pending',
    due_date: '',
    assigned_to: '',
    wall_type: '', // Track wall type for template
  });
  const [checklist, setChecklist] = useState([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  // Load template when wall type changes
  useEffect(() => {
    if (task.wall_type && CHECKLIST_TEMPLATES[task.wall_type]) {
      setChecklist(CHECKLIST_TEMPLATES[task.wall_type].items.map(item => ({
        text: item.text,
        status: 'pending'
      })));
    }
  }, [task.wall_type]);

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
    setChecklist([...checklist, { text: newCheckItem, status: 'pending' }]);
    setNewCheckItem('');
  };

  const toggleChecklistStatus = (index) => {
    const newChecklist = [...checklist];
    const currentStatus = newChecklist[index].status || 'pending';
    
    // Cycle through statuses: pending -> in_progress -> completed -> not_completed -> pending
    const statusCycle = ['pending', 'in_progress', 'completed', 'not_completed'];
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    
    newChecklist[index].status = statusCycle[nextIndex];
    setChecklist(newChecklist);
  };

  const removeChecklistItem = (index) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const progress = calculateProgress(checklist);

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

            {/* Wall Type Template Selector */}
            <div className="mb-4">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 block">Wall Type:</label>
              <Select value={task.wall_type} onValueChange={(v) => setTask({...task, wall_type: v})}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Select wall type for template..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <SelectItem value="solid_walls">Solid Walls</SelectItem>
                  <SelectItem value="glass_walls">Glass Walls</SelectItem>
                  <SelectItem value="demountable_walls">Demountable Walls</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checklist */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Checklist:</h3>
                {checklist.length > 0 && (
                  <div className="text-xs text-slate-500">
                    {progress.percentage}% complete
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {checklist.length > 0 && (
                <div className="mb-4">
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#FFB800] transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs mt-2">
                    <span className="text-[#FFB800]">✓ {progress.completed}</span>
                    <span className="text-green-500">⊙ {progress.inProgress}</span>
                    <span className="text-red-500">✗ {progress.notCompleted}</span>
                    <span className="text-slate-400">○ {progress.pending}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {checklist.map((item, idx) => {
                  const statusConfig = CHECKLIST_STATUS[item.status || 'pending'];
                  return (
                    <div key={idx} className="flex items-center gap-2 group hover:bg-slate-50 dark:hover:bg-slate-800/50 p-1 rounded">
                      <button
                        onClick={() => toggleChecklistStatus(idx)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          item.status === 'completed' ? 'bg-[#FFB800] border-[#FFB800]' :
                          item.status === 'in_progress' ? 'bg-green-500 border-green-500' :
                          item.status === 'not_completed' ? 'bg-red-500 border-red-500' :
                          'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {item.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                        {item.status === 'in_progress' && <Minus className="w-3 h-3 text-white" />}
                        {item.status === 'not_completed' && <X className="w-3 h-3 text-white" />}
                      </button>
                      <span className={`text-sm flex-1 ${
                        item.status === 'completed' ? 'line-through text-slate-400' : ''
                      }`}>
                        {item.text}
                      </span>
                      <button
                        onClick={() => removeChecklistItem(idx)}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
                <div className="flex gap-2 mt-2">
                  <Input 
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    placeholder="+ Add custom item"
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