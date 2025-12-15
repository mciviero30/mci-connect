import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Image as ImageIcon, X, Users, DollarSign, Plus, Check, Minus } from 'lucide-react';

// Predefined checklist templates
const CHECKLIST_TEMPLATES = {
  glass_wall: [
    { id: 1, text: 'Staging product', status: 'not_started' },
    { id: 2, text: 'Check Dimension', status: 'not_started' },
    { id: 3, text: 'Cut Horizontal', status: 'not_started' },
    { id: 4, text: 'Built Glass Extrusion frame', status: 'not_started' },
    { id: 5, text: 'Properly attach extrusion to the building', status: 'not_started' },
    { id: 6, text: 'Check for plumb', status: 'not_started' },
    { id: 7, text: 'Install glass', status: 'not_started' },
    { id: 8, text: 'Install covers', status: 'not_started' },
    { id: 9, text: 'Install doors hardware (sliding, Pivot, Hinge)', status: 'not_started' },
    { id: 10, text: 'Install door and adjustment', status: 'not_started' },
    { id: 11, text: 'Clean', status: 'not_started' },
  ],
  solid_wall: [
    { id: 1, text: 'Staging Product', status: 'not_started' },
    { id: 2, text: 'Check Demension/Layout', status: 'not_started' },
    { id: 3, text: 'Base track', status: 'not_started' },
    { id: 4, text: 'Ceiling Track / SW Cornice Rail', status: 'not_started' },
    { id: 5, text: 'Studs', status: 'not_started' },
    { id: 6, text: 'Horizontal', status: 'not_started' },
    { id: 7, text: 'Power', status: 'not_started' },
    { id: 8, text: 'Level/Plumb', status: 'not_started' },
    { id: 9, text: 'Floor Base/ Foam', status: 'not_started' },
    { id: 10, text: 'Support Post', status: 'not_started' },
    { id: 11, text: 'Cladding', status: 'not_started' },
    { id: 12, text: 'Outlet Cover plates', status: 'not_started' },
    { id: 13, text: 'Clean', status: 'not_started' },
  ],
};

export default function CreateTaskDialog({ open, onOpenChange, jobId, blueprintId, pinPosition, onCreated, planImageUrl, existingTask }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [task, setTask] = useState({
    title: '',
    description: '',
    priority: 'high',
    category: 'general',
    status: 'in_progress',
    due_date: '',
    assigned_to: '',
    checklist: [],
    photo_urls: [],
    manpower: '',
    cost: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showNewItemInput, setShowNewItemInput] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Fetch plan details if blueprintId is provided
  const { data: plan } = useQuery({
    queryKey: ['plan', blueprintId],
    queryFn: () => base44.entities.Plan.filter({ id: blueprintId }).then(plans => plans[0]),
    enabled: !!blueprintId,
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      onCreated?.(newTask?.id);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      setTask({
        title: '',
        description: '',
        priority: 'high',
        category: 'general',
        status: 'in_progress',
        due_date: '',
        assigned_to: '',
        checklist: [],
        photo_urls: [],
        manpower: '',
        cost: '',
      });
      setShowNewItemInput(false);
      setNewChecklistItem('');
      onOpenChange(false);
    },
  });

  // Auto-create task when dialog opens (only for new tasks)
  React.useEffect(() => {
    if (open && !task.id && pinPosition && !existingTask) {
      const autoTitle = `Wall ${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;
      
      createTaskMutation.mutate({
        title: autoTitle,
        job_id: jobId,
        blueprint_id: blueprintId,
        pin_x: pinPosition?.x,
        pin_y: pinPosition?.y,
        status: 'in_progress',
        priority: 'high',
        category: 'general',
      });
    }
  }, [open, pinPosition, existingTask]);

  // Load existing task data
  React.useEffect(() => {
    if (existingTask) {
      setTask({
        id: existingTask.id,
        title: existingTask.title || '',
        description: existingTask.description || '',
        priority: existingTask.priority || 'high',
        category: existingTask.category || 'general',
        status: existingTask.status || 'in_progress',
        due_date: existingTask.due_date || '',
        assigned_to: existingTask.assigned_to || '',
        checklist: existingTask.checklist || [],
        photo_urls: existingTask.photo_urls || [],
        manpower: existingTask.manpower || '',
        cost: existingTask.cost || '',
      });
    }
  }, [existingTask]);

  // Update task data when mutation succeeds (for new tasks)
  React.useEffect(() => {
    if (createTaskMutation.data) {
      setTask({
        ...createTaskMutation.data,
        checklist: [],
        photo_urls: [],
      });
    }
  }, [createTaskMutation.data]);

  const handleSave = () => {
    if (!task.id) return;
    
    updateTaskMutation.mutate({
      id: task.id,
      data: {
        ...task,
        checklist: task.checklist.length > 0 ? task.checklist : undefined,
        photo_urls: task.photo_urls.length > 0 ? task.photo_urls : undefined,
      }
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setTask(prev => ({
        ...prev,
        photo_urls: [...prev.photo_urls, ...uploadedUrls]
      }));
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index) => {
    setTask(prev => ({
      ...prev,
      photo_urls: prev.photo_urls.filter((_, i) => i !== index)
    }));
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setTask(prev => ({
      ...prev,
      checklist: [...prev.checklist, { 
        id: Date.now(), 
        text: newChecklistItem.trim(), 
        status: 'not_started'
      }]
    }));
    setNewChecklistItem('');
    setShowNewItemInput(false);
  };

  const toggleChecklistItemStatus = (index) => {
    setTask(prev => {
      const newChecklist = [...prev.checklist];
      const currentStatus = newChecklist[index].status;
      // Cycle: not_started -> in_progress -> completed -> not_started
      if (currentStatus === 'not_started') {
        newChecklist[index].status = 'in_progress';
      } else if (currentStatus === 'in_progress') {
        newChecklist[index].status = 'completed';
      } else {
        newChecklist[index].status = 'not_started';
      }
      return { ...prev, checklist: newChecklist };
    });
  };

  const getChecklistIcon = (status) => {
    if (status === 'completed') {
      return <Check className="w-4 h-4 text-green-500" />;
    } else if (status === 'in_progress') {
      return <Minus className="w-4 h-4 text-[#FFB800]" />;
    } else {
      return <X className="w-4 h-4 text-red-500" />;
    }
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
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded"
                      onClick={() => toggleChecklistItemStatus(idx)}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        {getChecklistIcon(item.status)}
                      </div>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">No checklist items yet. Select a template above.</p>
              )}

              {/* Add New Checklist Item */}
              <div className="flex gap-2 mt-3">
                {showNewItemInput ? (
                  <>
                    <Input 
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="New item"
                      className="flex-1 h-8 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddChecklistItem}
                      className="h-8 px-3"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewItemInput(true)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Photos Grid - no labels */}
              {task.photo_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-6">
                  {task.photo_urls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                      <button
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Message Input */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <Textarea 
                value={task.description}
                onChange={(e) => setTask({...task, description: e.target.value})}
                placeholder="Enter message here..."
                className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white resize-none mb-2"
                rows={2}
              />
              {/* Photo buttons below */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="text-xs h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="camera-input"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => document.getElementById('camera-input')?.click()}
                  disabled={uploadingPhoto}
                  className="text-xs h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Task Attributes */}
          <div className="w-80 flex flex-col bg-slate-50 dark:bg-slate-800/50">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">Task Attributes</h3>
              {task.id && (
                <Button 
                  onClick={handleSave}
                  disabled={updateTaskMutation.isPending}
                  size="sm"
                  className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
                >
                  {updateTaskMutation.isPending ? 'Saving...' : 'Done'}
                </Button>
              )}
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
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
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

              {/* Manpower */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Manpower
                </label>
                <Input 
                  value={task.manpower}
                  onChange={(e) => setTask({...task, manpower: e.target.value})}
                  placeholder="e.g., 2 workers"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Cost */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  Cost
                </label>
                <Input 
                  value={task.cost}
                  onChange={(e) => setTask({...task, cost: e.target.value})}
                  placeholder="e.g., $500"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Location with Blueprint Preview */}
              {(pinPosition || existingTask?.pin_x) && (planImageUrl || plan?.file_url) && (
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block">Location</label>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 overflow-hidden">
                    <div className="relative w-full h-40 bg-slate-50 dark:bg-slate-800 rounded overflow-hidden">
                      <img
                        src={planImageUrl || plan?.file_url}
                        alt="Blueprint location"
                        className="w-full h-full object-contain"
                      />
                      {/* Pin marker overlay */}
                      <div 
                        className="absolute transform -translate-x-1/2 -translate-y-full"
                        style={{
                          left: `${pinPosition?.x || existingTask?.pin_x}%`,
                          top: `${pinPosition?.y || existingTask?.pin_y}%`
                        }}
                      >
                        <div className="relative">
                          <div className="w-6 h-6 bg-[#FFB800] border-2 border-white rounded-md shadow-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">📍</span>
                          </div>
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-[#FFB800]" />
                        </div>
                      </div>
                    </div>
                    {plan?.name && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 text-center font-medium">{plan.name}</p>
                    )}
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