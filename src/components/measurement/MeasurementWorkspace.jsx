import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Ruler, Download, Trash2, CheckCircle2, AlertTriangle, Upload, Loader2, X, Lock, LockOpen } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import DimensionCanvas from '@/components/field/dimensions/DimensionCanvas';
import DimensionDialog from '@/components/field/dimensions/DimensionDialog';
import DimensionLegend from '@/components/field/dimensions/DimensionLegend';
import MeasurementExportDialog from '@/components/field/MeasurementExportDialog';
import MeasurementToolbar from '@/components/measurement/MeasurementToolbar';
import { validateDimension } from '@/components/field/dimensions/DimensionValidation';
import { FIELD_STABLE_QUERY_CONFIG } from '@/components/field/config/fieldQueryConfig';
import { format } from 'date-fns';
import PDFProcessor from '@/components/field/PDFProcessor';

// ============================================
// MEASUREMENT DOMAIN - AUTÓNOMO
// Separado completamente de MCI Field
// ============================================

const MeasurementWorkspace = React.memo(function MeasurementWorkspace({ jobId, jobName, onExit }) {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [showDimensionDialog, setShowDimensionDialog] = useState(false);
  const [activeDimension, setActiveDimension] = useState(null);
  const [editingDimension, setEditingDimension] = useState(null);
  const [projectUnitSystem, setProjectUnitSystem] = useState('imperial');
  const [showUploadPlan, setShowUploadPlan] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', file: null });
  const [creditError, setCreditError] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [lockedMeasurements, setLockedMeasurements] = useState(new Set());
  const [processingPdf, setProcessingPdf] = useState(null);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [showExportWarning, setShowExportWarning] = useState(false);
  
  // FASE D1: Markup state (local only, not persisted)
  const [markupsByPlan, setMarkupsByPlan] = useState({});
  const [activeTool, setActiveTool] = useState(null);
  const [markupOptions, setMarkupOptions] = useState({ color: '#EF4444', thickness: 2 });
  
  // FASE D2.1: Local dimension overlays (instant feedback, optional save)
  const [dimensionOverlays, setDimensionOverlays] = useState([]);
  
  const canvasRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['measurement-currentUser', jobId],
    queryFn: () => base44.auth.me(),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: dimensions = [] } = useQuery({
    queryKey: ['measurement-dimensions', jobId],
    queryFn: () => base44.entities.FieldDimension.filter({ job_id: jobId }, '-created_date'),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['measurement-photos', jobId],
    queryFn: () => base44.entities.Photo.filter({ job_id: jobId }),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['measurement-plans', jobId],
    queryFn: () => base44.entities.Plan.filter({ 
      job_id: jobId, 
      purpose: 'measurement'
    }, '-created_date'),
    enabled: !!jobId,
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
      queryClient.invalidateQueries({ queryKey: ['measurement-dimensions', jobId], exact: true });
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
      queryClient.invalidateQueries({ queryKey: ['measurement-dimensions', jobId], exact: true });
      toast.success('Dimension deleted');
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.Plan.create({
        ...data,
        purpose: 'measurement'
      });
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['measurement-plans', jobId] });
      setShowUploadPlan(false);
      setNewPlan({ name: '', file: null });
      setCreditError(null);
      toast.success('Drawing uploaded successfully');
    },
    onError: (error) => {
      console.error('[createPlanMutation] onError:', error);
      const errorMsg = error?.message || 'Failed to save drawing';
      toast.error(errorMsg);
    },
  });



  const handleDimensionPlace = React.useCallback((canvasData) => {
    // FASE D2.2: Store canvas geometry for overlay rendering
    const [type, id] = selectedImage.split('_');
    setEditingDimension({
      ...activeDimension,
      canvas_data: canvasData,
      blueprint_id: type === 'plan' ? id : null,
      photo_id: type === 'photo' ? id : null,
    });
    setShowDimensionDialog(true);
  }, [activeDimension, selectedImage]);

  const handleSaveDimension = React.useCallback((data) => {
    // FASE D2.2: Merge canvas geometry + user values for instant rendering
    const overlay = {
      id: `overlay_${Date.now()}`,
      ...editingDimension,  // Includes canvas_data, blueprint_id, photo_id, dimension_type, measurement_type, unit_system
      ...data,  // User-entered values from dialog
      created_date: new Date().toISOString(),
      measured_by_name: user?.full_name || 'You',
    };
    
    setDimensionOverlays(prev => [...prev, overlay]);
    setShowDimensionDialog(false);
    setEditingDimension(null);
    setActiveDimension(null);
    toast.success('Measurement rendered on canvas');
    
    // OPTIONAL: Save to backend in background (user doesn't wait)
    createDimensionMutation.mutate(data);
  }, [editingDimension, user, createDimensionMutation]);

  // FASE D1: Markup handlers
  const currentMarkups = markupsByPlan[selectedImage] || [];

  const handleToolSelect = React.useCallback((tool) => {
    setActiveTool(prev => prev === tool ? null : tool);
    
    // Convert measurement tool to activeDimension
    const measurementTypes = ['FF-FF', 'CL-CL', 'FF-CL', 'CL-FF', 'SFF-SFF', 'BM-FF-UP', 'BM-FF-DOWN', 'BM-C'];
    if (measurementTypes.includes(tool)) {
      const dimensionType = tool.startsWith('BM-') ? 'vertical' : 'horizontal';
      setActiveDimension({
        dimension_type: dimensionType,
        measurement_type: tool,
        unit_system: projectUnitSystem,
        construction_state: 'with_drywall',
      });
    } else {
      setActiveDimension(null);
    }
  }, [projectUnitSystem]);

  const handleAddMarkup = React.useCallback((markup) => {
    setMarkupsByPlan(prev => ({
      ...prev,
      [selectedImage]: [...(prev[selectedImage] || []), markup]
    }));
  }, [selectedImage]);

  const handleRemoveMarkup = React.useCallback((markupId) => {
    setMarkupsByPlan(prev => ({
      ...prev,
      [selectedImage]: (prev[selectedImage] || []).filter(m => m.id !== markupId)
    }));
  }, [selectedImage]);

  const handleClearMarkups = React.useCallback(() => {
    setMarkupsByPlan(prev => ({
      ...prev,
      [selectedImage]: []
    }));
    toast.success('All markups cleared');
  }, [selectedImage]);

  // FASE C3.1: Detect unlocked measurements in progress (must be before handleExportPDF)
  const hasUnlockedMeasurements = React.useMemo(() => {
    if (dimensions.length === 0) return false;
    return dimensions.some(d => !lockedMeasurements.has(d.id));
  }, [dimensions, lockedMeasurements]);

  const handleExportPDF = React.useCallback(() => {
    if (dimensions.length === 0) {
      toast.error('No dimensions to export');
      return;
    }

    // FASE C3.2: Warn if exporting unverified measurements
    if (hasUnlockedMeasurements) {
      setShowExportWarning(true);
      return;
    }

    setShowExportDialog(true);
  }, [dimensions.length, hasUnlockedMeasurements]);

  const confirmExport = React.useCallback(() => {
    setShowExportWarning(false);
    setShowExportDialog(true);
  }, []);

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



  const imageOptions = React.useMemo(() => [
    ...plans.map((p, index) => ({
      value: `plan_${p.id}`,
      label: `Page ${index + 1} — ${p.name}`,
      url: p.image_url || p.file_url,
      type: 'plan',
      fileType: 'image',
      id: p.id,
    })),
    ...photos.map(p => ({ 
      value: `photo_${p.id}`, 
      label: `Photo: ${p.caption || 'Untitled'}`, 
      url: p.photo_url, 
      type: 'photo', 
      fileType: 'image'
    })),
  ], [plans, photos]);



  // Auto-select first plan when plans are loaded
  useEffect(() => {
    if (plans.length > 0 && !selectedImage) {
      setSelectedImage(`plan_${plans[0].id}`);
    }
  }, [plans, selectedImage]);

  const filteredDimensions = React.useMemo(() => {
    if (!selectedImage) return dimensions;
    const [type, id] = selectedImage.split('_');
    return dimensions.filter(d => 
      (type === 'plan' && d.blueprint_id === id) || 
      (type === 'photo' && d.photo_id === id)
    );
  }, [selectedImage, dimensions]);

  // FASE D2.1: Combine saved dimensions + local overlays for rendering
  // Filter overlays to current selected image
  const filteredOverlays = React.useMemo(() => {
    if (!selectedImage) return [];
    const [type, id] = selectedImage.split('_');
    return dimensionOverlays.filter(d => 
      (type === 'plan' && d.blueprint_id === id) || 
      (type === 'photo' && d.photo_id === id)
    );
  }, [selectedImage, dimensionOverlays]);

  const allDimensionsForCanvas = React.useMemo(() => {
    return [...filteredDimensions, ...filteredOverlays];
  }, [filteredDimensions, filteredOverlays]);

  const allValid = React.useMemo(() => {
    return filteredDimensions.every(d => validateDimension(d).isValid);
  }, [filteredDimensions]);

  const allLockedOrReviewed = React.useMemo(() => {
    if (filteredDimensions.length === 0) return false;
    return filteredDimensions.every(d => lockedMeasurements.has(d.id));
  }, [filteredDimensions, lockedMeasurements]);

  const isReadyForExport = allValid && allLockedOrReviewed;

  const toggleLock = React.useCallback((dimensionId) => {
    setLockedMeasurements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dimensionId)) {
        newSet.delete(dimensionId);
      } else {
        newSet.add(dimensionId);
      }
      return newSet;
    });
  }, []);

  // FASE C3.1: Browser refresh/close protection
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnlockedMeasurements) {
        e.preventDefault();
        e.returnValue = 'You have measurements in progress. Leaving may lose your work.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnlockedMeasurements]);

  // FASE C3.1: Handle internal navigation with confirmation
  const handleNavigation = React.useCallback((action) => {
    if (hasUnlockedMeasurements) {
      setPendingNavigation(() => action);
      setShowExitWarning(true);
    } else {
      action();
    }
  }, [hasUnlockedMeasurements]);

  const confirmNavigation = React.useCallback(() => {
    if (pendingNavigation) {
      pendingNavigation();
    }
    setShowExitWarning(false);
    setPendingNavigation(null);
  }, [pendingNavigation]);

  const cancelNavigation = React.useCallback(() => {
    setShowExitWarning(false);
    setPendingNavigation(null);
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header with Back, Units, Export */}
      <div className="flex-shrink-0 p-4 sm:p-6 bg-slate-800 border-b border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Measure</h2>
            <p className="text-sm text-slate-400">
              Precision site measurements for {jobName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => handleNavigation(() => onExit ? onExit() : navigate(-1))}
              variant="outline"
              className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600 min-h-[52px] font-semibold"
            >
              ← Back
            </Button>

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

        <div className="mt-5 flex flex-col gap-2">
          {plans.length > 1 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
              📄 PDF procesado en {plans.length} páginas
            </p>
          )}
          <div className="flex gap-3">
            <Select 
              value={selectedImage || ''} 
              onValueChange={(newValue) => {
                handleNavigation(() => setSelectedImage(newValue));
              }}
              className="flex-1"
            >
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
                    className="py-3 px-4 min-h-[52px] text-base text-white hover:bg-slate-800"
                  >
                    {opt.type === 'plan' ? '📐' : '📷'} {opt.label}
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
        </div>
      </div>

      {/* FASE D1: Measurement + Markup Toolbar */}
      <MeasurementToolbar
        activeTool={activeTool}
        onSelectTool={handleToolSelect}
        markupOptions={markupOptions}
        onChangeMarkupOptions={setMarkupOptions}
        onClearMarkups={handleClearMarkups}
      />

      {/* Review Hint */}
       {filteredDimensions.length > 0 && (
         <div className="flex-shrink-0 px-4 sm:px-6 py-3 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
             <span className="text-sm font-medium text-slate-400">Review measurements before export</span>
           </div>
           {isReadyForExport && (
             <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-500/40">
               <CheckCircle2 className="w-4 h-4 text-green-400" />
               <span className="text-xs font-bold text-green-400">Ready for export</span>
             </div>
           )}
         </div>
       )}

      <div className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col bg-slate-950">
         {selectedImage ? (() => {
             const selectedOption = imageOptions.find(o => o.value === selectedImage);

             return (
               <DimensionCanvas
                 imageUrl={selectedOption?.url}
                 dimensions={allDimensionsForCanvas}
                 activeDimension={activeDimension}
                 onDimensionPlace={handleDimensionPlace}
                 onDimensionUpdate={(updated) => {
                   // FASE D2.4: Update overlay in real-time (no save yet)
                   setDimensionOverlays(prev => 
                     prev.map(d => d.id === updated.id ? updated : d)
                   );
                 }}
                 onDimensionDelete={(id) => {
                   const isOverlay = id?.startsWith('overlay_');
                   if (isOverlay) {
                     setDimensionOverlays(prev => prev.filter(d => d.id !== id));
                     toast.success('Local dimension removed');
                   } else {
                     deleteDimensionMutation.mutate(id);
                   }
                 }}
                 unitSystem={projectUnitSystem}
                 lockedMeasurements={lockedMeasurements}
                 markups={currentMarkups}
                 activeTool={activeTool}
                 markupOptions={markupOptions}
                 onAddMarkup={handleAddMarkup}
                 onRemoveMarkup={handleRemoveMarkup}
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

      {allDimensionsForCanvas.length > 0 && (
        <div className="flex-shrink-0 max-h-72 overflow-y-auto bg-slate-800 border-t-2 border-slate-700 p-4 sm:p-5">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">
            Dimensions ({allDimensionsForCanvas.length})
          </h3>
          <div className="space-y-2">
            {allDimensionsForCanvas.map(dim => {
              const validation = validateDimension(dim);
              const hasErrors = !validation.isValid;
              const hasWarnings = validation.hasWarnings;
              const isLocked = lockedMeasurements.has(dim.id);
              const isOverlay = dim.id?.startsWith('overlay_');

              return (
                <div
                  key={dim.id} 
                  className={`bg-slate-900 rounded-xl p-4 border-2 transition-all ${
                    isLocked ? 'opacity-75' : ''
                  } ${
                    isOverlay ? 'border-orange-500 bg-orange-500/10' : ''
                  } ${
                    hasErrors 
                      ? 'border-red-500 bg-red-500/5' 
                      : hasWarnings 
                      ? 'border-yellow-500 bg-yellow-500/5' 
                      : !isOverlay ? 'border-slate-700 hover:border-slate-600' : ''
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
                        {isLocked && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full border border-green-500/40">
                            <Lock className="w-3 h-3 text-green-400" />
                            <span className="text-[10px] font-bold text-green-400">Locked</span>
                          </div>
                        )}
                        {isOverlay && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 rounded-full border border-orange-500/40">
                            <span className="text-[10px] font-bold text-orange-400">Local</span>
                          </div>
                        )}
                        </div>
                      <p className="text-sm text-slate-400 mb-1">
                        {dim.area || 'No area'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(new Date(dim.created_date), 'MMM d, h:mm a')} • {dim.measured_by_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isOverlay && (
                        <Button
                          onClick={() => toggleLock(dim.id)}
                          className={`min-h-[48px] min-w-[48px] rounded-xl active:scale-95 transition-all ${
                            isLocked
                              ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40'
                              : 'bg-slate-700/50 hover:bg-slate-700 text-slate-400 border border-slate-600'
                          }`}
                          title={isLocked ? 'Unlock' : 'Lock'}
                        >
                          {isLocked ? <Lock className="w-5 h-5" /> : <LockOpen className="w-5 h-5" />}
                        </Button>
                      )}
                      <Button
                        onClick={() => {
                          if (isOverlay) {
                            setDimensionOverlays(prev => prev.filter(d => d.id !== dim.id));
                            toast.success('Local dimension removed');
                          } else {
                            deleteDimensionMutation.mutate(dim.id);
                          }
                        }}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 min-h-[48px] min-w-[48px] rounded-xl active:scale-95"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <DimensionDialog
        open={showDimensionDialog}
        onOpenChange={setShowDimensionDialog}
        dimension={editingDimension}
        jobId={jobId}
        jobName={jobName}
        onSave={handleSaveDimension}
      />

      <MeasurementExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        jobId={jobId}
        jobName={jobName}
        dimensions={dimensions}
        unitSystem={projectUnitSystem}
        measurementSessionId={null}
        plans={plans}
        markupsByPlan={markupsByPlan}
        />

      {processingPdf && (
        <PDFProcessor
          pdfFile={processingPdf}
          jobId={jobId}
          onComplete={(count) => {
            toast.success(`${count} plans created from PDF`);
            setProcessingPdf(null);
            queryClient.invalidateQueries({ queryKey: ['measurement-plans', jobId] });
          }}
          onCancel={() => setProcessingPdf(null)}
        />
      )}

      {/* FASE C3.1: Exit Warning Dialog */}
      <AlertDialog open={showExitWarning} onOpenChange={setShowExitWarning}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Measurements in progress
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              You have measurements in progress. Leaving may lose your work. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={cancelNavigation}>
              Stay
            </Button>
            <Button 
              onClick={confirmNavigation}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Leave anyway
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FASE C3.2: Export Warning Dialog */}
      <AlertDialog open={showExportWarning} onOpenChange={setShowExportWarning}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Some measurements are not verified
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              Some measurements are not verified. Are you sure you want to export?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowExportWarning(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmExport}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Export anyway
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

                          // Check if PDF - route to PDFProcessor (same as Field)
                          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                            setUploading(true);
                            setCreditError(null);
                            try {
                              const { file_url } = await base44.integrations.Core.UploadFile({ file });
                              setUploading(false);
                              setShowUploadPlan(false);
                              setNewPlan({ name: '', file: null });
                              setProcessingPdf(file_url);
                              toast.success('PDF uploaded - processing...');
                            } catch (error) {
                              console.error('[PDF Upload] Error:', error);
                              const errorCode = error?.status || error?.code;
                              if (errorCode === 402 || error?.message?.includes('credit')) {
                                setCreditError('integration_credits_limit_reached');
                              }
                              toast.error(error?.message || 'PDF upload failed');
                              setUploading(false);
                            }
                            return;
                          }

                          // Images: continue with current flow
                          setUploading(true);
                          setCreditError(null);
                          try {
                            const response = await base44.integrations.Core.UploadFile({ file });

                            if (!response) {
                              throw new Error('No response from server');
                            }

                            if (response.error) {

                              const errorCode = response.error?.code || response.error?.status;
                              const errorMsg = response.error?.message || String(response.error);

                              if (errorCode === 402 || errorMsg.includes('credit')) {
                                setCreditError('integration_credits_limit_reached');
                                throw new Error('Integration credits exhausted');
                              }

                              throw new Error(errorMsg);
                            }

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
                           console.error('[MeasurementWorkspace] Upload error:', error);
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
  );
});

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

export default MeasurementWorkspace;