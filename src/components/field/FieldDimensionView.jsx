import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Upload, FileText, Trash2, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import DimensionBlueprintViewer from './DimensionBlueprintViewer';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

export default function FieldDimensionView({ jobId }) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDimension, setSelectedDimension] = useState(null);
  const [newDimension, setNewDimension] = useState({
    name: '',
    description: '',
    file: null,
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch dimensions (using Plan entity with type='dimension')
  const { data: dimensions = [], isLoading } = useQuery({
    queryKey: ['field-dimensions', jobId],
    queryFn: () => {
      if (jobId) {
        return base44.entities.Plan.filter({ job_id: jobId, type: 'dimension' }, '-created_date');
      } else {
        // Fetch all dimensions when no jobId (global view)
        return base44.entities.Plan.filter({ type: 'dimension' }, '-created_date');
      }
    },
  });

  // Fetch tasks for annotations
  const { data: tasks = [] } = useQuery({
    queryKey: ['dimension-tasks', jobId],
    queryFn: () => {
      if (jobId) {
        return base44.entities.Task.filter({ job_id: jobId });
      } else {
        return base44.entities.Task.list();
      }
    },
  });

  const createDimensionMutation = useMutation({
    mutationFn: (data) => base44.entities.Plan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-dimensions', jobId] });
      setShowUpload(false);
      setNewDimension({ name: '', description: '', file: null });
      toast.success('Dimension drawing uploaded successfully');
    },
    onError: (error) => {
      toast.error('Failed to upload dimension drawing');
      console.error('Upload error:', error);
    }
  });

  const deleteDimensionMutation = useMutation({
    mutationFn: (id) => base44.entities.Plan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-dimensions', jobId] });
      toast.success('Dimension drawing deleted');
    },
  });

  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };
    
    // More flexible type checking
    const fileName = file.name.toLowerCase();
    const isValidType = ALLOWED_TYPES.includes(file.type) || 
                       fileName.endsWith('.pdf') || 
                       fileName.endsWith('.jpg') || 
                       fileName.endsWith('.jpeg') || 
                       fileName.endsWith('.png');
    
    if (!isValidType) {
      return { valid: false, error: 'Invalid file type. Only PDF, JPG, and PNG are allowed.' };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large. Maximum size is 50MB.' };
    }
    return { valid: true };
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    console.log('File selected:', file);
    if (file) {
      console.log('File type:', file.type);
      console.log('File size:', file.size);
      const validation = validateFile(file);
      console.log('Validation result:', validation);
      if (!validation.valid) {
        toast.error(validation.error);
        e.target.value = '';
        return;
      }
      setNewDimension({ ...newDimension, file });
      console.log('File set successfully');
    }
  };

  const handleUpload = async () => {
    if (!newDimension.name || !newDimension.file) {
      toast.error('Please provide a name and select a file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      console.log('Starting upload...', newDimension.file.name);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const { file_url } = await base44.integrations.Core.UploadFile({ file: newDimension.file });
      
      console.log('File uploaded:', file_url);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const dimensionData = {
        name: newDimension.name,
        description: newDimension.description,
        file_url,
        type: 'dimension',
      };

      // Only add job_id if it exists
      if (jobId) {
        dimensionData.job_id = jobId;
      }

      console.log('Creating dimension with data:', dimensionData);
      await createDimensionMutation.mutateAsync(dimensionData);
      console.log('Dimension created successfully');

      setUploadProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (dimension) => {
    if (window.confirm(`Delete "${dimension.name}"?`)) {
      await deleteDimensionMutation.mutateAsync(dimension.id);
    }
  };

  if (selectedDimension) {
    return (
      <DimensionBlueprintViewer
        dimension={selectedDimension}
        jobId={jobId}
        onBack={() => setSelectedDimension(null)}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Field Dimensions</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Upload dimension drawings and add annotations
          </p>
        </div>
        <Button
          onClick={() => setShowUpload(true)}
          className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload Drawing
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : dimensions.length === 0 ? (
        <Card className="p-12 text-center bg-white dark:bg-slate-800/30 border-slate-200 dark:border-slate-700/50">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No dimension drawings yet
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Upload your first dimension drawing to start adding annotations
          </p>
          <Button
            onClick={() => setShowUpload(true)}
            className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Drawing
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dimensions.map((dimension) => (
            <Card
              key={dimension.id}
              className="group relative overflow-hidden hover:shadow-lg transition-all cursor-pointer bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50"
              onClick={() => setSelectedDimension(dimension)}
            >
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden">
                {dimension.file_url ? (
                  dimension.file_url.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex items-center justify-center w-full h-full">
                      <FileText className="w-16 h-16 text-slate-400" />
                    </div>
                  ) : (
                    <img
                      src={dimension.file_url}
                      alt={dimension.name}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <FileText className="w-16 h-16 text-slate-400" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Eye className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  {dimension.name}
                </h3>
                {dimension.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {dimension.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(dimension.created_date).toLocaleDateString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(dimension);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>Upload Dimension Drawing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Drawing Name</Label>
              <Input
                value={newDimension.name}
                onChange={(e) => setNewDimension({ ...newDimension, name: e.target.value })}
                placeholder="e.g., Floor 1 Dimensions"
                className="mt-1.5 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <Label>Description (Optional)</Label>
              <Input
                value={newDimension.description}
                onChange={(e) => setNewDimension({ ...newDimension, description: e.target.value })}
                placeholder="Add details about this drawing"
                className="mt-1.5 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <Label>File (PDF, JPG, PNG - Max 50MB)</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="mt-1.5 bg-white dark:bg-slate-800"
              />
              {newDimension.file && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Selected: {newDimension.file.name} ({(newDimension.file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-[#FFB800] h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUpload(false)}
                disabled={uploading}
                className="border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!newDimension.name || !newDimension.file || uploading}
                className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}