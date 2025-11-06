import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ZoomIn, 
  ZoomOut, 
  Move, 
  MapPin, 
  X, 
  Upload, 
  Eye, 
  EyeOff,
  Camera,
  Save,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

export default function BlueprintViewer({ jobId, jobName, isClientView = false }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [selectedPin, setSelectedPin] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Queries
  const { data: blueprints = [], isLoading: loadingBlueprints } = useQuery({
    queryKey: ['blueprints', jobId],
    queryFn: () => base44.entities.Blueprint.filter({ job_id: jobId, is_current: true }, '-created_date'),
    enabled: !!jobId,
    initialData: []
  });

  const [selectedBlueprint, setSelectedBlueprint] = useState(null);

  useEffect(() => {
    if (blueprints.length > 0 && !selectedBlueprint) {
      setSelectedBlueprint(blueprints[0]);
    }
  }, [blueprints]);

  const { data: planTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['planTasks', selectedBlueprint?.id],
    queryFn: () => base44.entities.PlanTask.filter({ blueprint_id: selectedBlueprint.id }, '-created_date'),
    enabled: !!selectedBlueprint?.id,
    initialData: []
  });

  // Form state for creating/editing tasks
  const [taskForm, setTaskForm] = useState({
    task_type: 'other',
    task_title: '',
    status: 'pending',
    priority: 'medium',
    notes: '',
    client_visible_notes: '',
    assigned_to_email: '',
    assigned_to_name: ''
  });

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planTasks'] });
      setShowTaskDialog(false);
      setIsAddingPin(false);
      resetTaskForm();
      toast({
        title: "✅ Task Created",
        description: "Pin added to blueprint successfully"
      });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planTasks'] });
      setShowTaskDialog(false);
      setSelectedPin(null);
      toast({
        title: "✅ Task Updated",
        description: "Pin updated successfully"
      });
    }
  });

  const createBlueprintMutation = useMutation({
    mutationFn: (data) => base44.entities.Blueprint.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blueprints'] });
      toast({
        title: "✅ Blueprint Uploaded",
        description: "Blueprint added successfully"
      });
    }
  });

  const resetTaskForm = () => {
    setTaskForm({
      task_type: 'other',
      task_title: '',
      status: 'pending',
      priority: 'medium',
      notes: '',
      client_visible_notes: '',
      assigned_to_email: '',
      assigned_to_name: ''
    });
  };

  // Zoom controls
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const handleResetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Pan controls
  const handleMouseDown = (e) => {
    if (isAddingPin) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging && !isAddingPin) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add pin
  const handleImageClick = (e) => {
    if (!isAddingPin || !selectedBlueprint) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setSelectedPin({ location_x: x, location_y: y, isNew: true });
    setShowTaskDialog(true);
  };

  // Upload blueprint
  const handleBlueprintUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await createBlueprintMutation.mutateAsync({
        job_id: jobId,
        job_name: jobName,
        blueprint_name: file.name,
        blueprint_type: 'floor_plan',
        image_url: file_url,
        uploaded_by_email: user.email,
        uploaded_by_name: user.full_name,
        version: blueprints.length + 1,
        is_current: true,
        visible_to_client: true
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: `Failed to upload blueprint: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Save task
  const handleSaveTask = async () => {
    if (!selectedPin) return;

    const taskData = {
      ...taskForm,
      blueprint_id: selectedBlueprint.id,
      job_id: jobId,
      job_name: jobName,
      location_x: selectedPin.location_x,
      location_y: selectedPin.location_y,
      created_by_email: user.email,
      created_by_name: user.full_name
    };

    if (selectedPin.isNew) {
      await createTaskMutation.mutateAsync(taskData);
    } else {
      await updateTaskMutation.mutateAsync({
        id: selectedPin.id,
        data: taskData
      });
    }
  };

  // Edit pin
  const handlePinClick = (task, e) => {
    e.stopPropagation();
    if (isClientView) {
      // Client view - show read-only info
      setSelectedPin(task);
      setTaskForm({
        task_type: task.task_type,
        task_title: task.task_title,
        status: task.status,
        priority: task.priority,
        notes: '',
        client_visible_notes: task.client_visible_notes || '',
        assigned_to_email: task.assigned_to_email || '',
        assigned_to_name: task.assigned_to_name || ''
      });
    } else {
      // Technician view - editable
      setSelectedPin(task);
      setTaskForm({
        task_type: task.task_type,
        task_title: task.task_title,
        status: task.status,
        priority: task.priority,
        notes: task.notes || '',
        client_visible_notes: task.client_visible_notes || '',
        assigned_to_email: task.assigned_to_email || '',
        assigned_to_name: task.assigned_to_name || ''
      });
    }
    setShowTaskDialog(true);
  };

  // Upload photo evidence
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const photoUrls = results.map(r => r.file_url);

      // Update selected pin with new photos
      const currentPhotos = selectedPin?.photo_urls || [];
      setSelectedPin(prev => ({
        ...prev,
        photo_urls: [...currentPhotos, ...photoUrls]
      }));

      toast({
        title: "✅ Photos Uploaded",
        description: `${photoUrls.length} photo(s) added successfully`
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: `Failed to upload photos: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Filter tasks
  const filteredTasks = planTasks.filter(task => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  // Status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'ready_for_inspection': return 'bg-purple-500';
      case 'on_hold': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'ready_for_inspection': return <Eye className="w-4 h-4" />;
      case 'on_hold': return <AlertTriangle className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  if (loadingBlueprints) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-slate-600">Loading blueprints...</span>
      </div>
    );
  }

  if (blueprints.length === 0 && !isClientView) {
    return (
      <Card className="bg-white shadow-lg">
        <CardContent className="p-12 text-center">
          <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Blueprints Yet</h3>
          <p className="text-slate-600 mb-6">Upload a blueprint to start tracking tasks visually</p>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleBlueprintUpload}
            className="hidden"
            id="blueprint-upload"
            disabled={uploadingImage}
          />
          <Button
            onClick={() => document.getElementById('blueprint-upload').click()}
            className="bg-[#3B9FF3] hover:bg-blue-600 text-white"
            disabled={uploadingImage}
          >
            {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Upload Blueprint
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (blueprints.length === 0 && isClientView) {
    return (
      <Card className="bg-white shadow-lg">
        <CardContent className="p-12 text-center">
          <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Blueprints Available</h3>
          <p className="text-slate-600">Blueprints will be visible once uploaded by the project team</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="bg-white shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Select
                value={selectedBlueprint?.id}
                onValueChange={(value) => {
                  const blueprint = blueprints.find(b => b.id === value);
                  setSelectedBlueprint(blueprint);
                  handleResetView();
                }}
              >
                <SelectTrigger className="w-64 bg-white">
                  <SelectValue placeholder="Select blueprint" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {blueprints.map(bp => (
                    <SelectItem key={bp.id} value={bp.id}>
                      {bp.blueprint_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!isClientView && (
                <>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleBlueprintUpload}
                    className="hidden"
                    id="blueprint-upload-2"
                    disabled={uploadingImage}
                  />
                  <Button
                    onClick={() => document.getElementById('blueprint-upload-2').click()}
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    className="bg-white"
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload New
                  </Button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <Button variant="outline" size="sm" onClick={handleZoomOut} className="bg-white">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={handleZoomIn} className="bg-white">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetView} className="bg-white">
                <Move className="w-4 h-4" />
              </Button>

              {/* Add pin button */}
              {!isClientView && (
                <Button
                  variant={isAddingPin ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsAddingPin(!isAddingPin)}
                  className={isAddingPin ? "bg-[#3B9FF3] text-white" : "bg-white"}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {isAddingPin ? 'Cancel' : 'Add Pin'}
                </Button>
              )}

              {/* Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-white">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="ready_for_inspection">Ready</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Blueprint viewer */}
      {selectedBlueprint && (
        <Card className="bg-white shadow-lg overflow-hidden">
          <CardContent className="p-0">
            <div
              ref={containerRef}
              className="relative overflow-hidden bg-slate-100"
              style={{ height: '600px', cursor: isAddingPin ? 'crosshair' : isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: '0 0',
                  transition: isDragging ? 'none' : 'transform 0.2s'
                }}
              >
                <img
                  ref={imageRef}
                  src={selectedBlueprint.image_url}
                  alt={selectedBlueprint.blueprint_name}
                  className="max-w-none"
                  onClick={handleImageClick}
                  style={{ width: '100%', height: 'auto' }}
                />

                {/* Render pins */}
                {filteredTasks.map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "absolute w-8 h-8 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2",
                      "flex items-center justify-center text-white shadow-lg",
                      "hover:scale-125 transition-transform duration-200",
                      getStatusColor(task.status)
                    )}
                    style={{
                      left: `${task.location_x}%`,
                      top: `${task.location_y}%`
                    }}
                    onClick={(e) => handlePinClick(task, e)}
                  >
                    {getStatusIcon(task.status)}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="p-4 border-t bg-slate-50">
              <div className="flex items-center gap-6 text-sm flex-wrap">
                <span className="font-semibold text-slate-700">Legend:</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-400"></div>
                  <span className="text-slate-600">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-slate-600">In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                  <span className="text-slate-600">Ready for Inspection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-slate-600">Completed</span>
                </div>
                <div className="ml-auto text-slate-500">
                  {filteredTasks.length} tasks {filterStatus !== 'all' && `(${filterStatus})`}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPin?.isNew ? '📍 Add New Task' : isClientView ? '📍 Task Details' : '📍 Edit Task'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Task Title */}
            <div>
              <Label>Task Title *</Label>
              <Input
                value={taskForm.task_title}
                onChange={(e) => setTaskForm({ ...taskForm, task_title: e.target.value })}
                placeholder="e.g., Install modular wall section A"
                className="bg-white"
                disabled={isClientView}
              />
            </div>

            {/* Task Type & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Task Type *</Label>
                <Select
                  value={taskForm.task_type}
                  onValueChange={(value) => setTaskForm({ ...taskForm, task_type: value })}
                  disabled={isClientView}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="modular_wall_installation">Modular Wall Installation</SelectItem>
                    <SelectItem value="wiring_review">Wiring Review</SelectItem>
                    <SelectItem value="asset_inspection">Asset Inspection</SelectItem>
                    <SelectItem value="ceiling_installation">Ceiling Installation</SelectItem>
                    <SelectItem value="flooring_installation">Flooring Installation</SelectItem>
                    <SelectItem value="painting">Painting</SelectItem>
                    <SelectItem value="hvac_installation">HVAC Installation</SelectItem>
                    <SelectItem value="electrical_installation">Electrical Installation</SelectItem>
                    <SelectItem value="fixture_installation">Fixture Installation</SelectItem>
                    <SelectItem value="quality_check">Quality Check</SelectItem>
                    <SelectItem value="final_inspection">Final Inspection</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status *</Label>
                <Select
                  value={taskForm.status}
                  onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}
                  disabled={isClientView}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="ready_for_inspection">Ready for Inspection</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Client Visible Notes */}
            <div>
              <Label>Client Notes</Label>
              <Textarea
                value={taskForm.client_visible_notes}
                onChange={(e) => setTaskForm({ ...taskForm, client_visible_notes: e.target.value })}
                placeholder="Notes visible to client..."
                className="bg-white"
                disabled={isClientView}
              />
            </div>

            {/* Internal Notes (hidden from client) */}
            {!isClientView && (
              <div>
                <Label>Internal Notes (Not visible to client)</Label>
                <Textarea
                  value={taskForm.notes}
                  onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
                  placeholder="Internal notes..."
                  className="bg-white"
                />
              </div>
            )}

            {/* Photo Evidence */}
            <div>
              <Label className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Photo Evidence
              </Label>
              {!isClientView && (
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
              )}
              {!isClientView && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('photo-upload').click()}
                  className="mt-2 bg-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photos
                </Button>
              )}

              {/* Display photos */}
              {selectedPin?.photo_urls && selectedPin.photo_urls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {selectedPin.photo_urls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)} className="bg-white">
              {isClientView ? 'Close' : 'Cancel'}
            </Button>
            {!isClientView && (
              <Button
                onClick={handleSaveTask}
                className="bg-[#3B9FF3] hover:bg-blue-600 text-white"
                disabled={!taskForm.task_title || createTaskMutation.isPending || updateTaskMutation.isPending}
              >
                {(createTaskMutation.isPending || updateTaskMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Task
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}