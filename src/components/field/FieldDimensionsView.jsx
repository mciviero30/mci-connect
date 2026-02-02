import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Ruler, Download, Image as ImageIcon, FileText, Trash2, Info, CheckCircle2, AlertTriangle, Upload, Loader2, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import DimensionCanvas from './dimensions/DimensionCanvas';
import DimensionDialog from './dimensions/DimensionDialog';
import DimensionLegend from './dimensions/DimensionLegend';
import ProductionConfirmationDialog from './dimensions/ProductionConfirmationDialog';
import MeasurementExportDialog from './MeasurementExportDialog';
import { validateDimension } from './dimensions/DimensionValidation';
import { FIELD_STABLE_QUERY_CONFIG } from './config/fieldQueryConfig';
import { format } from 'date-fns';

export default function FieldDimensionsView({ jobId, jobName }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDimensionDialog, setShowDimensionDialog] = useState(false);
  const [activeDimension, setActiveDimension] = useState(null);
  const [editingDimension, setEditingDimension] = useState(null);
  const [projectUnitSystem, setProjectUnitSystem] = useState('imperial');
  const [showProductionConfirm, setShowProductionConfirm] = useState(false);
  const [showUploadPlan, setShowUploadPlan] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', file: null });
  const [creditError, setCreditError] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['field-currentUser', jobId],
    queryFn: () => base44.auth.me(),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: dimensions = [] } = useQuery({
    queryKey: ['field-dimensions', jobId],
    queryFn: () => base44.entities.FieldDimension.filter({ job_id: jobId }, '-created_date'),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['field-photos', jobId],
    queryFn: () => base44.entities.Photo.filter({ job_id: jobId }),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['field-measurement-plans', jobId],
    queryFn: () => base44.entities.Plan.filter({ job_id: jobId, purpose: 'measurement' }, '-created_date'),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const createDimensionMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldDimension.create({
      ...data,
      job_id: jobId,
      job_name: jobName,
      measured_by: user.email,
      measured_by_name: user.full_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-dimensions', jobId], exact: true });
      setShowDimensionDialog(false);
      setActiveDimension(null);
      toast.success('Dimension saved');
    },
  });

  const deleteDimensionMutation = useMutation({
    mutationFn: (id) => base44.entities.FieldDimension.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-dimensions', jobId], exact: true });
      toast.success('Dimension deleted');
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data) => {
      console.log('[createPlanMutation] Saving measurement plan:', data);
      const result = await base44.entities.Plan.create({
        ...data,
        purpose: 'measurement'
      });
      console.log('[createPlanMutation] Success:', result);
      return result;
    },
    onSuccess: () => {
      console.log('[createPlanMutation] onSuccess triggered');
      queryClient.invalidateQueries({ queryKey: ['field-measurement-plans', jobId] });
      setShowUploadPlan(false);
      setNewPlan({ name: '', file: null });
      toast.success('Measurement drawing uploaded successfully');
    },
    onError: (error) => {
      console.error('[createPlanMutation] onError:', error);
      toast.error('Failed to upload plan: ' + (error.message || 'Unknown error'));
    },
  });

  const handleStartDimension = (type) => {
    setActiveDimension({
      dimension_type: type,
      measurement_type: type === 'horizontal' ? 'FF-FF' : 'BM-C',
      unit_system: projectUnitSystem,
    });
  };

  const handleDimensionPlace = (canvasData) => {
    setEditingDimension({
      ...activeDimension,
      canvas_data: canvasData,
    });
    setShowDimensionDialog(true);
  };

  const handleSaveDimension = (data) => {
    createDimensionMutation.mutate(data);
  };

  const handleExportPDF = () => {
    if (dimensions.length === 0) {
      toast.error('No dimensions to export');
      return;
    }
    setShowExportDialog(true);
  };

  const imageOptions = [
    ...plans.map(p => {
      const isPDF = p.file_url?.toLowerCase?.().endsWith('.pdf');
      return {
        value: `plan_${p.id}`,
        label: `Plan: ${p.name}`,
        url: isPDF ? p.file_url : (p.image_url || p.file_url),
        type: 'plan',
        fileType: isPDF ? 'pdf' : 'image',
        isPDF,
      };
    }),
    ...photos.map(p => ({ value: `photo_${p.id}`, label: `Photo: ${p.caption || 'Untitled'}`, url: p.photo_url, type: 'photo', fileType: 'image', isPDF: false })),
  ];

  const filteredDimensions = selectedImage 
    ? dimensions.filter(d => {
        const [type, id] = selectedImage.split('_');
        return (type === 'plan' && d.blueprint_id === id) || (type === 'photo' && d.photo_id === id);
      })
    : dimensions;

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900">
      {/* Header - Primary action removed (moved to bottom rail) */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Ruler className="w-5 h-5 text-orange-500" />
              Field Dimensions
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Professional measurement documentation
            </p>
          </div>

          {/* Secondary actions - Unit system & Export */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setProjectUnitSystem('imperial')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all min-h-[48px] touch-manipulation active:scale-95 ${
                  projectUnitSystem === 'imperial'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Imperial
              </button>
              <button
                onClick={() => setProjectUnitSystem('metric')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all min-h-[48px] touch-manipulation active:scale-95 ${
                  projectUnitSystem === 'metric'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Metric
              </button>
            </div>

            <Button
              onClick={handleExportPDF}
              variant="outline"
              className="min-h-[52px] touch-manipulation active:scale-95 font-semibold"
            >
              <Download className="w-5 h-5 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Image Selector with Upload Button */}
        <div className="mt-4 flex gap-3">
          <Select value={selectedImage || ''} onValueChange={setSelectedImage} className="flex-1">
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select drawing or photo to dimension..." />
            </SelectTrigger>
            <SelectContent 
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-h-[60vh]"
              position="popper"
              sideOffset={5}
              style={{ 
                overflowY: 'auto', 
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y'
              }}
            >
              <div className="py-1" style={{ touchAction: 'pan-y' }}>
                {imageOptions.map(opt => (
                  <SelectItem 
                    key={opt.value} 
                    value={opt.value}
                    disabled={opt.isPDF}
                    className={`py-3 px-4 cursor-pointer min-h-[48px] ${
                      opt.isPDF 
                        ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60' 
                        : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {opt.isPDF ? '📄 (view-only)' : (opt.type === 'plan' ? '🖼️' : '📷')} {opt.label}
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowUploadPlan(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold min-h-[48px] px-4 rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Drawing
          </Button>
        </div>

        {/* Legend */}
        <div className="mt-4">
          <DimensionLegend unitSystem={projectUnitSystem} />
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 min-h-0 p-4 flex flex-col">
        {selectedImage ? (() => {
          const selectedOption = imageOptions.find(o => o.value === selectedImage);
          
          if (selectedOption?.isPDF) {
            return (
              <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                {/* PDF Viewer Header */}
                <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {selectedOption.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        📄 View Only – Measurements Disabled
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* PDF Iframe */}
                <iframe
                  src={`${selectedOption.url}#toolbar=1&navpanes=0&scrollbar=1`}
                  className="flex-1 min-h-0 w-full border-none"
                  title={selectedOption.label}
                  allow="fullscreen"
                />
              </div>
            );
          }
          
          return (
            <DimensionCanvas
              imageUrl={selectedOption?.url}
              dimensions={filteredDimensions}
              activeDimension={activeDimension}
              onDimensionPlace={handleDimensionPlace}
              unitSystem={projectUnitSystem}
            />
          );
        })() : (
          <div className="h-full flex items-center justify-center bg-slate-800 rounded-xl">
            <div className="text-center">
              <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">Select a drawing or photo to start dimensioning</p>
            </div>
          </div>
        )}
      </div>

      {/* Dimensions List */}
      {filteredDimensions.length > 0 && (
        <div className="flex-shrink-0 max-h-64 overflow-y-auto bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
          <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3">
            Dimensions on this image ({filteredDimensions.length})
          </h3>
          <div className="space-y-2">
            {filteredDimensions.map(dim => {
              const validation = validateDimension(dim);
              const hasErrors = !validation.isValid;
              const hasWarnings = validation.hasWarnings;

              return (
                <Card 
                  key={dim.id} 
                  className={`bg-slate-50 dark:bg-slate-900 ${
                    hasErrors ? 'border-2 border-red-500' : hasWarnings ? 'border-2 border-yellow-500' : ''
                  }`}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {hasErrors && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        {!hasErrors && hasWarnings && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                        {!hasErrors && !hasWarnings && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {formatDimensionValue(dim)}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                          {dim.measurement_type}
                        </span>
                        {hasWarnings && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 rounded font-bold">
                            Review
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {dim.area || 'No area specified'} • {format(new Date(dim.created_date), 'MMM d, h:mm a')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        By {dim.measured_by_name} • {dim.device_type || 'unknown'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDimensionMutation.mutate(dim.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Dimension Dialog */}
      <DimensionDialog
        open={showDimensionDialog}
        onOpenChange={setShowDimensionDialog}
        dimension={editingDimension}
        jobId={jobId}
        jobName={jobName}
        onSave={handleSaveDimension}
      />

      {/* Measurement Export Dialog */}
      <MeasurementExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        jobName={jobName}
        dimensions={dimensions}
        unitSystem={projectUnitSystem}
      />

      {/* Upload Plan Dialog */}
      <Dialog open={showUploadPlan} onOpenChange={setShowUploadPlan}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle>Upload Drawing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {creditError && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
                <h4 className="font-bold text-red-900 dark:text-red-100 mb-1">Uploads Temporarily Unavailable</h4>
                <p className="text-sm text-red-800 dark:text-red-200">
                  Your integration credits are exhausted. Your data is safe. Please contact your admin or wait for your plan's monthly reset to continue uploading.
                </p>
                <button
                  onClick={() => setCreditError(null)}
                  className="text-xs text-red-600 dark:text-red-400 hover:underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}
            <div>
              <Label className="text-slate-600 dark:text-slate-300">Drawing Name</Label>
              <Input 
                value={newPlan.name}
                onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                placeholder="e.g., Floor Plan Level 1"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-slate-600 dark:text-slate-300">Image File</Label>
              <div className="mt-1.5">
                {newPlan.file ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img 
                      src={newPlan.file} 
                      alt="Preview" 
                      className="w-full h-full object-contain"
                    />
                    <button 
                      onClick={() => setNewPlan({...newPlan, file: null})}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Click to upload image</span>
                        <span className="text-xs text-slate-500 mt-1">JPG, PNG, PDF (max 100MB)</span>
                      </>
                    )}
                    <input 
                       type="file" 
                       accept="image/*,.pdf"
                       onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;

                          setUploading(true);
                          setCreditError(null);
                          try {
                            const response = await base44.integrations.Core.UploadFile({ file });

                            if (!response) {
                              throw new Error('No response from server');
                            }

                            // HANDLE STRUCTURED ERROR OBJECTS
                            if (response.error) {
                              console.log('[UploadFile] Error response:', response.error);

                              const errorCode = response.error?.code || response.error?.status;
                              const errorMsg = response.error?.message || String(response.error);

                              // Explicit credit-limit detection
                              if (errorCode === 402 || errorMsg.includes('credit')) {
                                setCreditError('integration_credits_limit_reached');
                                throw new Error('Integration credits exhausted');
                              }

                              throw new Error(errorMsg);
                            }

                            // ONLY CONTINUE IF FILE WAS ACTUALLY STORED
                            const fileUrl = response.file_url;
                            if (!fileUrl) {
                              throw new Error('No file URL returned (file not stored)');
                            }

                           setNewPlan({
                             ...newPlan,
                             file: fileUrl,
                             name: newPlan.name || file.name.split('.')[0]
                           });
                           toast.success('Drawing uploaded successfully');
                         } catch (error) {
                           console.error('[FieldDimensionsView] Upload error:', error);
                           // Clear preview on any error
                           setNewPlan({ name: '', file: null });
                           if (!creditError) {
                             toast.error(error.message || 'Upload failed');
                           }
                         } finally {
                           setUploading(false);
                         }
                       }}
                       className="hidden"
                       disabled={uploading}
                     />
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowUploadPlan(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                   // HARD BLOCK: Validate file_url is valid HTTPS URL
                   if (!newPlan.file || !newPlan.name) {
                     toast.error('Please enter name and select file');
                     return;
                   }

                   if (typeof newPlan.file !== 'string' || !newPlan.file.startsWith('https://')) {
                     console.error('[FieldDimensionsView] Invalid file_url:', newPlan.file);
                     toast.error('Invalid file URL - upload may have failed. Try again.');
                     setNewPlan({ name: '', file: null });
                     return;
                   }

                   createPlanMutation.mutate({
                     job_id: jobId,
                     name: newPlan.name,
                     file_url: newPlan.file,
                     order: plans.length,
                     image_url: newPlan.file,
                   });
                 }}
                disabled={!newPlan.file || !newPlan.name || uploading || createPlanMutation.isPending || !!creditError}
                className="bg-blue-600 hover:bg-blue-700 text-white min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createPlanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving Drawing...
                  </>
                ) : creditError ? '❌ Uploads Disabled' : 'Save Drawing'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatDimensionValue(dim) {
  if (dim.unit_system === 'imperial') {
    const ft = dim.value_feet || 0;
    const inches = dim.value_inches || 0;
    const frac = dim.value_fraction || '0';
    
    let result = `${ft}' ${inches}"`;
    if (frac !== '0') {
      result = `${ft}' ${inches} ${frac}"`;
    }
    return result;
  } else {
    return `${dim.value_mm || 0}mm`;
  }
}