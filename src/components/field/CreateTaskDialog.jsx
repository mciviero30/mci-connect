import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Image as ImageIcon, X, Users, DollarSign, Plus, Check, Minus, Loader2, Trash2, Eye, EyeOff } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Tesseract from 'tesseract.js';
import { Switch } from '@/components/ui/switch';
import { canEditTasks, canToggleClientVisibility } from './rolePermissions';
import { useAutoSave } from './hooks/useAutoSave';
import SaveIndicator from './SaveIndicator';
import { useFieldContext, withFieldContext } from './FieldContextProvider';
import { FIELD_QUERY_KEYS } from '@/components/field/fieldQueryKeys';
import { FIELD_STABLE_QUERY_CONFIG, updateFieldQueryData } from './config/fieldQueryConfig';
import FieldBottomSheet from './FieldBottomSheet';

// Predefined checklist templates
const CHECKLIST_TEMPLATES = {
  glass_wall: [
    { id: '1', text: 'Staging product', status: 'not_started' },
    { id: '2', text: 'Check Dimension', status: 'not_started' },
    { id: '3', text: 'Cut Horizontal', status: 'not_started' },
    { id: '4', text: 'Built Glass Extrusion frame', status: 'not_started' },
    { id: '5', text: 'Properly attach extrusion to the building', status: 'not_started' },
    { id: '6', text: 'Check for plumb', status: 'not_started' },
    { id: '7', text: 'Install glass', status: 'not_started' },
    { id: '8', text: 'Install covers', status: 'not_started' },
    { id: '9', text: 'Install doors hardware (sliding, Pivot, Hinge)', status: 'not_started' },
    { id: '10', text: 'Install door and adjustment', status: 'not_started' },
    { id: '11', text: 'Clean', status: 'not_started' },
  ],
  solid_wall: [
    { id: '1', text: 'Staging Product', status: 'not_started' },
    { id: '2', text: 'Check Demension/Layout', status: 'not_started' },
    { id: '3', text: 'Base track', status: 'not_started' },
    { id: '4', text: 'Ceiling Track / SW Cornice Rail', status: 'not_started' },
    { id: '5', text: 'Studs', status: 'not_started' },
    { id: '6', text: 'Horizontal', status: 'not_started' },
    { id: '7', text: 'Power', status: 'not_started' },
    { id: '8', text: 'Level/Plumb', status: 'not_started' },
    { id: '9', text: 'Floor Base/ Foam', status: 'not_started' },
    { id: '10', text: 'Support Post', status: 'not_started' },
    { id: '11', text: 'Cladding', status: 'not_started' },
    { id: '12', text: 'Outlet Cover plates', status: 'not_started' },
    { id: '13', text: 'Clean', status: 'not_started' },
  ],
};

export default function CreateTaskDialog({ open, onOpenChange, jobId, blueprintId, pinPosition, onCreated, planImageUrl, pdfCanvas, existingTask }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [task, setTask] = useState({
    title: '',
    description: '',
    priority: 'high',
    category: 'installation',
    status: 'in_progress',
    task_type: 'task',
    due_date: '',
    assigned_to: '',
    checklist: [],
    photo_urls: [],
    manpower: '',
    cost: '',
    visible_to_client: false,
    internal_notes: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showNewItemInput, setShowNewItemInput] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newComment, setNewComment] = useState('');
  const [detectingWallNumber, setDetectingWallNumber] = useState(false);
  const fieldContext = useFieldContext();

  // Auto-save for new tasks (not existing tasks from pins)
  const { autoSave, loadDraft, clearDraft, isSaving, lastSaved, isOnline } = useAutoSave({
    entityType: 'tasks',
    jobId,
    enabled: open && !existingTask && !pinPosition,
    debounceMs: 2000
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: FIELD_QUERY_KEYS.USER(jobId),
    queryFn: () => base44.auth.me(),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  // Fetch task comments
  const { data: comments = [] } = useQuery({
    queryKey: ['task-comments', task.id],
    queryFn: () => base44.entities.TaskComment.filter({ task_id: task.id }, '-created_date'),
    enabled: !!task.id,
  });

  // Fetch plan details if blueprintId is provided
  const { data: plan } = useQuery({
    queryKey: ['plan', blueprintId],
    queryFn: () => base44.entities.Plan.filter({ id: blueprintId }).then(plans => plans[0]),
    enabled: !!blueprintId,
  });

  // Fetch all tasks for this job to find the last wall number
  const { data: allJobTasks = [] } = useQuery({
    queryKey: ['field-tasks-for-wall-detection', jobId],
    queryFn: () => base44.entities.Task.filter({ job_id: jobId }, '-created_date'),
    enabled: !!jobId && open,
  });

  // Function to detect wall number from image using OCR
  const detectWallNumber = async (imageUrl, x, y) => {
    try {
      setDetectingWallNumber(true);
      
      // Create a canvas to capture area around pin
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Capture 300x300px area around pin
      const captureSize = 300;
      const captureX = Math.max(0, (x / 100) * img.width - captureSize / 2);
      const captureY = Math.max(0, (y / 100) * img.height - captureSize / 2);
      
      canvas.width = captureSize;
      canvas.height = captureSize;
      ctx.drawImage(img, captureX, captureY, captureSize, captureSize, 0, 0, captureSize, captureSize);
      
      // Convert to blob for Tesseract
      const imageData = canvas.toDataURL('image/png');
      
      // Run OCR
      const result = await Tesseract.recognize(imageData, 'eng', {
        logger: () => {} // Silent
      });
      
      // Extract 3-digit numbers from OCR text
      const numbers = result.data.text.match(/\b\d{3}\b/g);
      if (numbers && numbers.length > 0) {
        return numbers[0]; // Return first 3-digit number found
      }
      
      return null;
    } catch (error) {
      console.error('OCR detection error:', error);
      return null;
    } finally {
      setDetectingWallNumber(false);
    }
  };

  // Function to get next wall number based on last task
  const getNextWallNumber = () => {
    if (!allJobTasks || allJobTasks.length === 0) return '';
    
    // Find tasks with "Wall XXX" pattern
    const wallNumbers = allJobTasks
      .map(t => t.title?.match(/wall\s*(\d{3})/i)?.[1])
      .filter(Boolean)
      .map(n => parseInt(n, 10))
      .sort((a, b) => b - a); // Descending
    
    if (wallNumbers.length > 0) {
      const lastNumber = wallNumbers[0];
      const nextNumber = String(lastNumber + 1).padStart(3, '0');
      return `Wall ${nextNumber}`;
    }
    
    return '';
  };

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: async (newTask) => {
      // Clear persistent draft on successful save
      if (clearTaskDraft) await clearTaskDraft();
      
      // Scoped optimistic update - Field isolation
      updateFieldQueryData(queryClient, jobId, 'TASKS', (old) => old ? [...old, newTask] : [newTask]);
      updateFieldQueryData(queryClient, jobId, 'WORK_UNITS', (old) => old ? [...old, newTask] : [newTask]);
      onCreated?.(newTask?.id);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      queryClient.invalidateQueries({ queryKey: ['work-units', jobId] });
      setTask({
        title: '',
        description: '',
        priority: 'high',
        category: 'installation',
        status: 'in_progress',
        task_type: 'task',
        due_date: '',
        assigned_to: '',
        checklist: [],
        photo_urls: [],
        manpower: '',
        cost: '',
        visible_to_client: false,
        internal_notes: '',
      });
      setShowNewItemInput(false);
      setNewChecklistItem('');
      onOpenChange(false);
    },
  });

  // Mutación para actualizaciones parciales (no cierra el diálogo)
  const partialUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      queryClient.invalidateQueries({ queryKey: ['work-units', jobId] });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: (commentData) => base44.entities.TaskComment.create(commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.id] });
      setNewComment('');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      // Scoped optimistic update - Field isolation
      updateFieldQueryData(queryClient, jobId, 'TASKS', (old) => 
        old ? old.filter(t => t.id !== existingTask?.id) : old
      );
      updateFieldQueryData(queryClient, jobId, 'WORK_UNITS', (old) => 
        old ? old.filter(t => t.id !== existingTask?.id) : old
      );
      onOpenChange(false);
    },
  });

  // Auto-create task when dialog opens (only for new tasks)
  React.useEffect(() => {
    if (open && !task.id && pinPosition && !existingTask && planImageUrl) {
      const autoCreateTask = async () => {
        // Try OCR detection first
        const detectedNumber = await detectWallNumber(planImageUrl, pinPosition.x, pinPosition.y);
        
        let autoTitle = '';
        if (detectedNumber) {
          autoTitle = `Wall ${detectedNumber}`;
        } else {
          // If OCR fails, use incremental logic
          autoTitle = getNextWallNumber();
        }
        
        // CRITICAL: Always link task to job
        if (!jobId) {
          console.error('Cannot create task without job_id');
          return;
        }
        
        const taskData = withFieldContext({
          title: autoTitle,
          blueprint_id: blueprintId,
          pin_x: pinPosition?.x,
          pin_y: pinPosition?.y,
          priority: 'high',
          category: 'installation',
        }, fieldContext, 'tasks');
        
        createTaskMutation.mutate(taskData);
      };
      
      autoCreateTask();
    }
  }, [open, pinPosition, existingTask, fieldContext]);

  // Load existing task data or draft
  useEffect(() => {
    if (!open) return;
    
    if (existingTask) {
      setTask({
        id: existingTask.id,
        title: existingTask.title || '',
        description: existingTask.description || '',
        priority: existingTask.priority || 'high',
        category: existingTask.category || 'installation',
        status: existingTask.status || 'in_progress',
        task_type: existingTask.task_type || 'task',
        due_date: existingTask.due_date || '',
        assigned_to: existingTask.assigned_to || '',
        checklist: existingTask.checklist || [],
        photo_urls: existingTask.photo_urls || [],
        manpower: existingTask.manpower || '',
        cost: existingTask.cost || '',
        visible_to_client: existingTask.visible_to_client || false,
        internal_notes: existingTask.internal_notes || '',
      });
    } else if (!pinPosition) {
      // Load draft only for standalone task creation
      loadDraft().then(draft => {
        if (draft) {
          setTask(draft);
        }
      });
    }
  }, [existingTask, open, pinPosition]);

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

  // Check edit permissions
  const canEdit = canEditTasks(currentUser);
  const canToggleVisibility = canToggleClientVisibility(currentUser);

  const handleFieldChange = (field, value) => {
    const updated = { ...task, [field]: value };
    setTask(updated);
    
    // Auto-save for standalone task creation (not pin-based)
    if (!existingTask && !pinPosition && updated.title) {
      autoSave(updated);
    }
  };

  const handleSave = async () => {
    if (!task.id) return;
    if (!canEdit) return; // Block unauthorized edits
    
    const dataToSave = {
      ...task,
      checklist: task.checklist.length > 0 ? task.checklist : undefined,
      photo_urls: task.photo_urls.length > 0 ? task.photo_urls : undefined,
      manpower: task.manpower || undefined,
      cost: task.cost ? parseFloat(task.cost) || undefined : undefined,
    };
    
    await updateTaskMutation.mutateAsync({
      id: task.id,
      data: dataToSave
    });
    
    await clearDraft();
  };

  const handleClose = async () => {
    if (!existingTask && !pinPosition && task.title) {
      // Keep draft on close for standalone tasks
      onOpenChange(false);
    } else {
      await clearDraft();
      onOpenChange(false);
    }
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
        id: Date.now().toString(), 
        text: newChecklistItem.trim(), 
        status: 'not_started'
      }]
    }));
    setNewChecklistItem('');
    setShowNewItemInput(false);
  };

  const toggleChecklistItemStatus = (index) => {
    const newChecklist = [...task.checklist];
    const currentStatus = newChecklist[index].status;
    // Cycle: not_started -> in_progress -> completed -> not_started
    if (currentStatus === 'not_started') {
      newChecklist[index].status = 'in_progress';
    } else if (currentStatus === 'in_progress') {
      newChecklist[index].status = 'completed';
    } else {
      newChecklist[index].status = 'not_started';
    }
    
    setTask(prev => ({ ...prev, checklist: newChecklist }));
    
    // Auto-save checklist changes if editing existing task
    if (task.id) {
      partialUpdateMutation.mutate({
        id: task.id,
        data: { checklist: newChecklist }
      });
    }
  };

  const getChecklistIcon = (status) => {
    if (status === 'completed') {
      return <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center"><Check className="w-5 h-5 text-white font-bold" /></div>;
    } else if (status === 'in_progress') {
      return <div className="w-7 h-7 rounded-full bg-[#FFB800] flex items-center justify-center"><Minus className="w-5 h-5 text-black font-bold" /></div>;
    } else {
      return <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center"><X className="w-5 h-5 text-white font-bold" /></div>;
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

  const handleAddComment = () => {
    if (!newComment.trim() || !task.id || !currentUser) return;
    
    createCommentMutation.mutate({
      task_id: task.id,
      comment: newComment.trim(),
      author_name: currentUser.full_name,
    });
  };

  const handleDeleteTask = () => {
    if (!task.id) return;
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <FieldBottomSheet open={open} onOpenChange={handleClose} title={task.id ? task.title || 'Task Details' : 'New Task'}>
        {!canEdit && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg mb-4">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold text-center">
              🔒 Read-Only Mode - Only supervisors can edit
            </p>
          </div>
        )}

        {/* Mobile Single Column Layout */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Wall Number</Label>
            <Input 
              value={task.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              placeholder="Wall 101"
              className="mt-1.5 text-lg font-bold min-h-[52px]"
              disabled={!canEdit || detectingWallNumber}
            />
          </div>

          {/* Status */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status</Label>
            <Select value={task.status} onValueChange={(v) => handleFieldChange('status', v)} disabled={!canEdit}>
              <SelectTrigger className="mt-1.5 min-h-[52px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending" className="min-h-[48px]">📋 Assigned</SelectItem>
                <SelectItem value="in_progress" className="min-h-[48px]">⚙️ Working</SelectItem>
                <SelectItem value="completed" className="min-h-[48px]">✅ Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Priority</Label>
            <Select value={task.priority} onValueChange={(v) => handleFieldChange('priority', v)} disabled={!canEdit}>
              <SelectTrigger className="mt-1.5 min-h-[52px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low" className="min-h-[48px]">🟢 Low</SelectItem>
                <SelectItem value="medium" className="min-h-[48px]">🟡 Medium</SelectItem>
                <SelectItem value="high" className="min-h-[48px]">🟠 High</SelectItem>
                <SelectItem value="urgent" className="min-h-[48px]">🔴 Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checklist Template */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Checklist Template</Label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger className="mt-1.5 min-h-[52px]">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="glass_wall" className="min-h-[48px]">🪟 Glass Wall</SelectItem>
                <SelectItem value="solid_wall" className="min-h-[48px]">🧱 Solid Wall</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Checklist Items */}
          {task.checklist.length > 0 && (
            <div>
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Progress</Label>
              <div className="space-y-2">
                {task.checklist.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (canEdit) {
                        if (navigator.vibrate) navigator.vibrate(10);
                        toggleChecklistItemStatus(idx);
                      }
                    }}
                    disabled={!canEdit}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 min-h-[64px] touch-manipulation active:scale-[0.97] active:bg-slate-50 dark:active:bg-slate-700 transition-all"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {getChecklistIcon(item.status)}
                    <span className="flex-1 text-left text-base font-medium text-slate-700 dark:text-slate-300">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Save/Delete Actions - Safe spacing for gloved hands */}
          {task.id && (
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              {canEdit ? (
                <>
                  <Button 
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate(15);
                      handleSave();
                    }}
                    disabled={updateTaskMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white min-h-[60px] touch-manipulation active:scale-95 font-bold shadow-lg"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    onClick={() => {
                      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
                      handleDeleteTask();
                    }}
                    disabled={deleteTaskMutation.isPending}
                    variant="outline"
                    className="border-2 border-red-500/50 text-red-600 min-h-[60px] min-w-[60px] touch-manipulation active:scale-95 active:bg-red-50 dark:active:bg-red-900/20"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <Trash2 className="w-6 h-6" />
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate(10);
                    handleClose();
                  }}
                  className="w-full min-h-[60px] touch-manipulation active:scale-95"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  Close
                </Button>
              )}
            </div>
          )}
        </div>
      </FieldBottomSheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-5xl h-[90vh] p-0 overflow-hidden [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>{canEdit ? 'Edit task information and checklist' : 'View task information'}</DialogDescription>
        </VisuallyHidden>
        
        {/* Read-Only Warning for Technicians */}
        {!canEdit && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-3 text-center">
            <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
              🔒 Read-Only Mode - Only supervisors can edit tasks
            </p>
          </div>
        )}
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
                {detectingWallNumber ? (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Detecting wall number...</span>
                  </div>
                ) : (
                  <Input 
                    value={task.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Enter wall number"
                    className="text-xl font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-slate-900 dark:text-white"
                    disabled={!canEdit}
                  />
                )}
              </div>
            </div>

            {/* Checklist Section */}
            <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-white">Checklist:</h3>
                <div className="flex items-center gap-2">
                  <Select onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="w-48 h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="+ Add checklist" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <SelectItem value="glass_wall" className="text-slate-900 dark:text-white text-xs">Glass Wall Installation</SelectItem>
                      <SelectItem value="solid_wall" className="text-slate-900 dark:text-white text-xs">Solid Wall Installation</SelectItem>
                    </SelectContent>
                  </Select>
                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewItemInput(!showNewItemInput)}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Add New Checklist Item Input */}
              {showNewItemInput && (
                <div className="flex gap-2 mb-3">
                  <Input 
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    placeholder="New item"
                    className="flex-1 h-8 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
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
                </div>
              )}

              {task.checklist.length > 0 ? (
                <div className="space-y-2">
                  {task.checklist.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-3 text-sm text-slate-900 dark:text-slate-100 font-medium cursor-pointer active:bg-slate-100 dark:active:bg-slate-700 p-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 min-h-[48px] touch-manipulation active:scale-[0.98] transition-all bg-white dark:bg-slate-800"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleChecklistItemStatus(idx);
                      }}
                    >
                      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                        {getChecklistIcon(item.status)}
                      </div>
                      <span className="flex-1">{item.text}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 dark:text-slate-500">No checklist items yet. Select a template above.</p>
              )}

              {/* Activity Section */}
              <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Activity:</h3>
                
                {/* Comments List */}
                <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                  {comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {comment.author_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        {/* Comment Content */}
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">
                              {comment.author_name || 'Unknown'}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {new Date(comment.created_date).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {comment.comment}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                      No comments yet
                    </p>
                  )}
                </div>

                {/* Comment Input */}
                <div className="flex gap-2 items-end">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Enter message here..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 min-h-[48px] text-base"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || createCommentMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white min-w-[48px] min-h-[48px] text-xl font-bold touch-manipulation active:scale-95 transition-all"
                  >
                    ✓
                  </Button>
                </div>

                {/* Photo buttons - 44px touch targets */}
                <div className="flex gap-2 mt-2">
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex-1 min-h-[48px] bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white border-2 border-slate-500 font-semibold touch-manipulation active:scale-95 transition-all"
                  >
                    <ImageIcon className="w-5 h-5 mr-2" />
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
                    onClick={() => document.getElementById('camera-input')?.click()}
                    disabled={uploadingPhoto}
                    className="flex-1 min-h-[48px] bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 active:from-orange-800 active:to-yellow-700 text-black border-none font-bold shadow-lg touch-manipulation active:scale-95 transition-all"
                  >
                    <Camera className="w-5 h-5 mr-2" />
                    Take Photo
                  </Button>
                </div>

                {/* Photos Grid */}
                {task.photo_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
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
              </div>
          </div>

          {/* Right Column - Task Attributes */}
          <div className="w-80 flex flex-col bg-slate-50 dark:bg-slate-800/50">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Task Attributes</h3>
                {!existingTask && !pinPosition && (
                  <SaveIndicator isSaving={isSaving} lastSaved={lastSaved} isOnline={isOnline} />
                )}
              </div>
              <div className="flex items-center gap-2">
                {task.id && canEdit && (
                  <Button 
                    onClick={handleSave}
                    disabled={updateTaskMutation.isPending}
                    size="sm"
                    className="bg-[#FFB800] hover:bg-[#E5A600] text-white px-6"
                  >
                    {updateTaskMutation.isPending ? 'Saving...' : 'Done'}
                  </Button>
                )}
                {task.id && !canEdit && (
                  <Button 
                    onClick={handleClose}
                    size="sm"
                    variant="outline"
                    className="px-6"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {/* Status */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Status</label>
                <Select value={task.status} onValueChange={(v) => handleFieldChange('status', v)} disabled={!canEdit}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Priority</label>
                <Select value={task.priority} onValueChange={(v) => handleFieldChange('priority', v)}>
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

              {/* Task Type */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Type</label>
                <Select value={task.task_type} onValueChange={(v) => handleFieldChange('task_type', v)}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="task">📋 Task</SelectItem>
                    <SelectItem value="checklist">✅ Checklist</SelectItem>
                    <SelectItem value="inspection">🔍 Inspection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Category</label>
                <Select value={task.category} onValueChange={(v) => handleFieldChange('category', v)}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="change_order">Change Order</SelectItem>
                    <SelectItem value="rfi">RFI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Assignee</label>
                <Input 
                  value={task.assigned_to}
                  onChange={(e) => handleFieldChange('assigned_to', e.target.value)}
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
                  onChange={(e) => handleFieldChange('due_date', e.target.value)}
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
                  onChange={(e) => handleFieldChange('manpower', e.target.value)}
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
                  onChange={(e) => handleFieldChange('cost', e.target.value)}
                  placeholder="e.g., $500"
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Client Visibility - Only for authorized roles */}
              {canToggleVisibility && (
                <>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {task.visible_to_client ? (
                          <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-500" />
                        )}
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Client Visible
                        </label>
                      </div>
                      <Switch
                        checked={task.visible_to_client}
                        onCheckedChange={(checked) => handleFieldChange('visible_to_client', checked)}
                        disabled={!canToggleVisibility}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {task.visible_to_client 
                        ? 'Visible in Client Portal (title, description, photos, progress)' 
                        : 'Internal only - hidden from client'}
                    </p>
                  </div>

                  {/* Internal Notes */}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">
                      Internal Notes
                      <span className="text-[10px] text-red-500 ml-1">(never visible to client)</span>
                    </label>
                    <Textarea
                      value={task.internal_notes}
                      onChange={(e) => handleFieldChange('internal_notes', e.target.value)}
                      placeholder="Issues, rework, internal communications..."
                      className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-20 text-sm"
                    />
                  </div>
                </>
              )}

              {/* Location Preview - Screenshot area */}
              {(pinPosition || existingTask?.pin_x) && (pdfCanvas || planImageUrl || plan?.file_url) && (
                <div>
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 block">Location</label>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    <div className="relative w-full bg-slate-100 dark:bg-slate-800" style={{ height: '200px' }}>
                      <div className="absolute inset-0 overflow-hidden">
                        <div
                          style={{
                            position: 'absolute',
                            width: '400%',
                            height: '400%',
                            left: `calc(50% - ${(pinPosition?.x || existingTask?.pin_x) * 4}%)`,
                            top: `calc(50% - ${(pinPosition?.y || existingTask?.pin_y) * 4}%)`,
                            backgroundImage: `url(${pdfCanvas || planImageUrl || plan?.file_url})`,
                            backgroundSize: 'contain',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'top left',
                          }}
                        />
                      </div>
                      {/* Pin in center */}
                      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-full z-10">
                        <div className="relative">
                          <div className="w-7 h-7 bg-[#FFB800] border-2 border-white rounded-md shadow-xl flex items-center justify-center">
                            <span className="text-sm">📍</span>
                          </div>
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-[#FFB800]" />
                        </div>
                      </div>
                    </div>
                    {plan?.name && (
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 py-1.5 text-center font-medium truncate px-2 border-t border-slate-200 dark:border-slate-700">{plan.name}</p>
                    )}
                  </div>
                  </div>
                  )}

                  {/* Delete Button */}
                  {task.id && canEdit && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    onClick={handleDeleteTask}
                    disabled={deleteTaskMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="w-full border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteTaskMutation.isPending ? 'Deleting...' : 'Delete Task'}
                  </Button>
                  </div>
                  )}
                  </div>
                  </div>
                  </div>
                  </DialogContent>
                  </Dialog>
                  );
                  }