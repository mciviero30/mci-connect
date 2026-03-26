import React, { useState, useRef, useEffect } from 'react';
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
import { FieldContextProvider } from './FieldContextProvider';
import { FieldSessionManager } from './services/FieldSessionManager';

// ============================================
// 🔒 FROZEN — MCI FIELD CERTIFICATION v1.0
// DO NOT MODIFY WITHOUT NEW PHASE AUTHORIZATION
// Certified: 2026-02-02
// ============================================
// CRITICAL: Measurement session lifecycle
// - Generate session ID on mount
// - Clear session ID on unmount
// - Filter all queries by session ID
// Breaking this logic causes data leakage
// ============================================

// FASE 5 PERF: Memoized for stable rendering
const FieldDimensionsView = React.memo(function FieldDimensionsView({ jobId, jobName }) {
  // ============================================
  // 🔒 FROZEN — Session ID Generation
  // DO NOT MODIFY WITHOUT NEW PHASE
  // ============================================
  // CRITICAL: Timestamp-based session ID
  // Format: ms_${jobId}_${timestamp}
  // Prevents cross-job contamination
  // ============================================
  const [measurementSessionId] = useState(() => {
    const existing = FieldSessionManager.getMeasurementSession();
    if (existing?.job_id === jobId && existing?.isActive) {
      return existing.measurement_session_id;
    }
    return FieldSessionManager.startMeasurementSession(jobId);
  });

  // ============================================
  // 🔒 FROZEN — Session Cleanup
  // DO NOT MODIFY WITHOUT NEW PHASE
  // ============================================
  // CRITICAL: Clear session on unmount
  // Prevents session leakage
  // ============================================
  useEffect(() => {
    return () => {
      FieldSessionManager.clearMeasurementSession();
    };
  }, []);

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
  const [pdfCanvas, setPdfCanvas] = useState(null);
  const canvasRef = useRef(null);

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

  // ============================================
  // 🔒 FROZEN — Measurement Plans Query
  // DO NOT MODIFY WITHOUT NEW PHASE
  // ============================================
  // CRITICAL: Three filters REQUIRED
  // 1. job_id = current job
  // 2. purpose = "measurement"
  // 3. measurement_session_id = current session
  // Missing any filter causes data leakage
  // ============================================
  const { data: plans = [] } = useQuery({
    queryKey: ['field-measurement-plans', jobId, measurementSessionId],
    queryFn: () => base44.entities.Plan.filter({ 
      job_id: jobId, 
      purpose: 'measurement', // 🔒 FROZEN: Do not change
      measurement_session_id: measurementSessionId // 🔒 FROZEN: Required
    }, '-created_date'),
    enabled: !!jobId && !!measurementSessionId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const createDimensionMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldDimension.create({
      ...data,
      job_id: jobId,
      job_name: jobName,
      measured_by: user?.email,
      measured_by_name: user?.full_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-dimensions', jobId], exact: true });
      setShowDimensionDialog(false);
      setActiveDimension(null);
      toast.success('Dimension saved');
    },
    onError: (error) => {
      console.error('[createDimensionMutation] Error:', error);
      toast.error('Failed to save dimension: ' + (error.message || 'Unknown error'));
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
      // FASE 3C-5: CRITICAL - Always include measurement_session_id for measurement plans
      const result = await base44.entities.Plan.create({
        ...data,
        purpose: 'measurement',
        measurement_session_id: measurementSessionId  // Session ownership
      });
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['field-measurement-plans', jobId, measurementSessionId] });
      setShowUploadPlan(false);
      setNewPlan({ name: '', file: null });
      setCreditError(null);
      toast.success('Measurement drawing uploaded successfully');
    },
    onError: (error) => {
      console.error('[createPlanMutation] onError:', error);
      const errorMsg = error?.message || 'Failed to save drawing';
      toast.error(errorMsg);
      // Don't clear newPlan on error - let user retry
    },
  });

  // FASE 5 PERF: Stable callbacks to prevent child re-renders
  const handleStartDimension = React.useCallback((type) => {
    setActiveDimension({
      dimension_type: type,
      measurement_type: type === 'horizontal' ? 'FF-FF' : 'BM-C',
      unit_system: projectUnitSystem,
    });
  }, [projectUnitSystem]);

  const handleDimensionPlace = React.useCallback((canvasData) => {
    setEditingDimension(prev => ({
      ...activeDimension,
      canvas_data: canvasData,
    }));
    setShowDimensionDialog(true);
  }, [activeDimension]);

  const handleSaveDimension = React.useCallback((data) => {
    createDimensionMutation.mutate(data);
  }, [createDimensionMutation]);

  const handleExportPDF = React.useCallback(() => {
    if (dimensions.length === 0) {
      toast.error('No dimensions to export');
      return;
    }
    setShowExportDialog(true);
  }, [dimensions.length]);

  const handleSaveDrawing = React.useCallback(() => {
    
    if (!newPlan.file || !newPlan.name) {
      toast.error('Please enter name and select file');
      return;
    }

    if (typeof newPlan.file !== 'string' || !newPlan.file.startsWith('https://')) {
      console.error('[Save Drawing] Invalid file_url:', newPlan.file);
      toast.error('Invalid file URL - upload may have failed. Try again.');
      setNewPlan({ name: '', file: null });
      return;
    }

    const payload = {
      job_id: jobId,
      name: newPlan.name,
      file_url: newPlan.file,
      order: plans.length,
      image_url: newPlan.file,
    };
    createPlanMutation.mutate(payload);
  }, [newPlan, jobId, plans.length, createPlanMutation]);

  // Load PDF using pdf.js CDN
  const loadPdfWithPdfJs = React.useCallback(async (pdfUrl) => {
    try {
      // Load pdf.js from CDN if not already loaded
      if (!window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load PDF.js'));
          document.head.appendChild(script);
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      }

      if (!window.pdfjsLib) {
        throw new Error('PDF.js library not available');
      }

      // Load the PDF document
      const loadingTask = window.pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;

      // Render ALL pages into one canvas
      const scale = 2.0;
      const canvases = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        canvases.push(canvas);
      }

      // Combine all pages into one vertical canvas
      const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);
      const maxWidth = Math.max(...canvases.map(c => c.width));

      const combinedCanvas = document.createElement('canvas');
      combinedCanvas.width = maxWidth;
      combinedCanvas.height = totalHeight;
      const ctx = combinedCanvas.getContext('2d');

      let currentY = 0;
      canvases.forEach(canvas => {
        ctx.drawImage(canvas, 0, currentY);
        currentY += canvas.height;
      });

      const imageDataUrl = combinedCanvas.toDataURL('image/jpeg', 0.92);
      setPdfCanvas(imageDataUrl);
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Failed to load PDF for measurement');
    }
  }, []);

  // FASE 5 PERF: Memoized image options to prevent recreation
  const imageOptions = React.useMemo(() => [
    ...plans.map(p => {
      const isPDF = p.file_url?.toLowerCase?.().endsWith('.pdf');
      return {
        value: `plan_${p.id}`,
        label: `Plan: ${p.name}`,
        url: isPDF ? p.file_url : (p.image_url || p.file_url),
        type: 'plan',
        fileType: isPDF ? 'pdf' : 'image',
        isPDF,
        id: p.id,
      };
    }),
    ...photos.map(p => ({ 
      value: `photo_${p.id}`, 
      label: `Photo: ${p.caption || 'Untitled'}`, 
      url: p.photo_url, 
      type: 'photo', 
      fileType: 'image', 
      isPDF: false 
    })),
  ], [plans, photos]);

  // FASE 5 PERF: Handle PDF conversion when selected image changes
  useEffect(() => {
    if (selectedImage && !pdfCanvas) {
      const selectedOption = imageOptions.find(o => o.value === selectedImage);
      if (selectedOption?.isPDF) {
        loadPdfWithPdfJs(selectedOption.url);
      }
    }
  }, [selectedImage, imageOptions, pdfCanvas, loadPdfWithPdfJs]);

  // FASE 5 PERF: Memoized dimension filtering
  const filteredDimensions = React.useMemo(() => {
    if (!selectedImage) return dimensions;
    const [type, id] = selectedImage.split('_');
    return dimensions.filter(d => 
      (type === 'plan' && d.blueprint_id === id) || 
      (type === 'photo' && d.photo_id === id)
    );
  }, [selectedImage, dimensions]);

  // FASE 3C-4: Wrap in FieldContextProvider with measurement_session_id
  return (
    <FieldContextProvider jobId={jobId} measurementSessionId={measurementSessionId}>
      {/* FASE 3C-4: Debug indicator (dev only) */}
      {import.meta.env?.DEV && (
        <div className="bg-purple-900/20 border-b border-purple-500/30 px-4 py-2">
          <span className="text-xs text-purple-300 font-mono">
            Measurement Session: {measurementSessionId}
          </span>
        </div>
      )}
      
      <div className="h-full flex flex-col bg-slate-900">
      {/* FASE 4 POLISH: Calm, focused measurement header */}
      <div className="flex-shrink-0 p-4 sm:p-6 bg-slate-800 border-b border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Measure</h2>
            <p className="text-sm text-slate-400">
              Precision site measurements
            </p>
          </div>

          {/* FASE 4 POLISH: Cleaner unit toggle & export */}
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
              <button
                onClick={() => setProjectUnitSystem('imperial')}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[48px] ${
                  projectUnitSystem === 'imperial'
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Imperial
              </button>
              <button
                onClick={() => setProjectUnitSystem('metric')}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[48px] ${
                  projectUnitSystem === 'metric'
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Metric
              </button>
            </div>

            <Button
              onClick={handleExportPDF}
              className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 min-h-[52px] font-semibold"
            >
              <Download className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* FASE 4 POLISH: Cleaner drawing selector */}
        <div className="mt-5 flex gap-3">
          <Select value={selectedImage || ''} onValueChange={setSelectedImage} className="flex-1">
            <SelectTrigger className="min-h-[56px] bg-slate-900 border-slate-700 text-white font-medium rounded-xl">
              <SelectValue placeholder="Select drawing to measure..." />
            </SelectTrigger>
            <SelectContent 
              className="bg-slate-900 border-slate-700 max-h-[60vh]"
              position="popper"
              sideOffset={8}
            >
              <div className="py-2">
                {imageOptions.map(opt => (
                  <SelectItem 
                    key={opt.value} 
                    value={opt.value}
                    disabled={opt.isPDF}
                    className={`py-3 px-4 min-h-[52px] text-base ${
                      opt.isPDF 
                        ? 'text-slate-600 cursor-not-allowed opacity-50' 
                        : 'text-white hover:bg-slate-800'
                    }`}
                  >
                    {opt.isPDF ? '📄 (view only)' : (opt.type === 'plan' ? '📐' : '📷')} {opt.label}
                  </SelectItem>
                ))}
              </div>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowUploadPlan(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold min-h-[56px] px-5 rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="hidden sm:inline">Upload</span>
          </Button>
        </div>

        {/* FASE 4 POLISH: Collapsible legend for cleaner UI */}
        <div className="mt-4">
          <DimensionLegend unitSystem={projectUnitSystem} />
        </div>
      </div>

      {/* FASE 4 POLISH: Clean canvas area - full focus on measurement */}
      <div className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col bg-slate-950">
        {selectedImage ? (() => {
            const selectedOption = imageOptions.find(o => o.value === selectedImage);

            return (
              <DimensionCanvas
                imageUrl={selectedOption?.isPDF ? pdfCanvas : selectedOption?.url}
                dimensions={filteredDimensions}
                activeDimension={activeDimension}
                onDimensionPlace={handleDimensionPlace}
                unitSystem={projectUnitSystem}
              />
            );
          })() : (
          <div className="h-full flex items-center justify-center bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700">
            <div className="text-center px-6">
              <Ruler className="w-20 h-20 text-slate-700 mx-auto mb-6" />
              <p className="text-lg font-bold text-white mb-2">Ready to Measure</p>
              <p className="text-slate-500 max-w-sm">Select a drawing above to begin capturing dimensions</p>
            </div>
          </div>
        )}
      </div>

      {/* FASE 4 POLISH: Cleaner dimensions list */}
      {filteredDimensions.length > 0 && (
        <div className="flex-shrink-0 max-h-72 overflow-y-auto bg-slate-800 border-t-2 border-slate-700 p-4 sm:p-5">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
            Dimensions ({filteredDimensions.length})
          </h3>
          <div className="space-y-2">
            {filteredDimensions.map(dim => {
              const validation = validateDimension(dim);
              const hasErrors = !validation.isValid;
              const hasWarnings = validation.hasWarnings;

              return (
                <div
                  key={dim.id} 
                  className={`bg-slate-900 rounded-xl p-4 border-2 transition-all ${
                    hasErrors 
                      ? 'border-red-500 bg-red-500/5' 
                      : hasWarnings 
                      ? 'border-yellow-500 bg-yellow-500/5' 
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {hasErrors && <AlertTriangle className="w-5 h-5 text-red-400" />}
                        {!hasErrors && hasWarnings && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                        {!hasErrors && !hasWarnings && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                        <span className="font-bold text-lg text-white">
                          {formatDimensionValue(dim)}
                        </span>
                        <span className="text-xs font-bold text-orange-400 bg-orange-500/20 px-2.5 py-1 rounded-full border border-orange-500/30">
                          {dim.measurement_type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-1">
                        {dim.area || 'No area'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(dim.created_date), 'MMM d, h:mm a')} • {dim.measured_by_name}
                      </p>
                    </div>
                    <Button
                      onClick={() => deleteDimensionMutation.mutate(dim.id)}
                      className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 min-h-[48px] min-w-[48px] rounded-xl active:scale-95"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
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
        measurementSessionId={measurementSessionId}
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
                         <span className="text-sm text-slate-600 dark:text-slate-300">Click to upload drawing</span>
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
                 type="button"
                 onClick={handleSaveDrawing}
                 disabled={!newPlan.file || !newPlan.name || uploading || createPlanMutation.isPending}
                 className="bg-blue-600 hover:bg-blue-700 text-white min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createPlanMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : creditError ? '❌ Uploads Disabled' : 'Save Drawing'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </FieldContextProvider>
  );
});

// FASE 5 PERF: Utility function outside component (no recreation)
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

export default FieldDimensionsView;