import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Image as ImageIcon, X, Users, DollarSign, Plus, Check, Minus, Loader2, Trash2 } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import Tesseract from 'tesseract.js';

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
  const [newComment, setNewComment] = useState('');
  const [detectingWallNumber, setDetectingWallNumber] = useState(false);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
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
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
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
      };
      
      autoCreateTask();
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
    
    const dataToSave = {
      ...task,
      checklist: task.checklist.length > 0 ? task.checklist : undefined,
      photo_urls: task.photo_urls.length > 0 ? task.photo_urls : undefined,
      manpower: task.manpower || undefined,
      cost: task.cost ? parseFloat(task.cost) || undefined : undefined,
    };
    
    updateTaskMutation.mutate({
      id: task.id,
      data: dataToSave
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
        id: Date.now().toString(), 
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white max-w-5xl h-[90vh] p-0 overflow-hidden [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>Edit task information and checklist</DialogDescription>
        </VisuallyHidden>
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
                    onChange={(e) => setTask({...task, title: e.target.value})}
                    placeholder="Enter wall number"
                    className="text-xl font-semibold border-none bg-transparent p-0 h-auto focus-visible:ring-0 text-slate-900 dark:text-white"
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewItemInput(!showNewItemInput)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
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
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || createCommentMutation.isPending}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4"
                  >
                    ✓
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-slate-600 dark:text-slate-400"
                  >
                    ✗
                  </Button>
                </div>

                {/* Photo buttons */}
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
              <h3 className="font-semibold text-slate-900 dark:text-white">Task Attributes</h3>
              <div className="flex items-center gap-2">
                {task.id && (
                  <Button 
                    onClick={handleSave}
                    disabled={updateTaskMutation.isPending}
                    size="sm"
                    className="bg-[#FFB800] hover:bg-[#E5A600] text-white px-6"
                  >
                    {updateTaskMutation.isPending ? 'Saving...' : 'Done'}
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(90vh - 200px)' }}>
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

              {/* Location Preview - Screenshot area */}
              {(pinPosition || existingTask?.pin_x) && (planImageUrl || plan?.file_url) && (
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
                            backgroundImage: `url(${planImageUrl || plan?.file_url})`,
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
                  {task.id && (
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