import React, { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Upload, X, ZoomIn, ZoomOut, Move, Trash2, MoreVertical, AlertTriangle, Loader2, Wand2, Settings2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BlueprintViewer from './BlueprintViewer.jsx';
import PlanAnalyzer from './PlanAnalyzer.jsx';
import WallTemplatesManager from './WallTemplatesManager.jsx';
import PDFProcessor from './PDFProcessor.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import BatchPlanUploadDialog from './BatchPlanUploadDialog.jsx';
import { Badge } from '@/components/ui/badge';
import PlanGridSection from './PlanGridSection.jsx';
import PlanSectionAccordion from './PlanSectionAccordion.jsx';

const MAX_FILE_SIZE_MB = 100;
const WARNING_FILE_SIZE_MB = 50;

// ============================================
// 🔒 FROZEN — MCI FIELD CERTIFICATION v1.0
// DO NOT MODIFY WITHOUT NEW PHASE AUTHORIZATION
// Certified: 2026-02-02
// ============================================
// CRITICAL: Production plans view (job_final)
// - Shows approved drawings only
// - NO measurement_session_id filter
// - Query: purpose="job_final"
// Breaking this logic requires new phase
// ============================================

// FASE 5 PERF: Memoized component for better performance
const FieldPlansView = React.memo(function FieldPlansView({ jobId, plans: plansFromProp = [], tasks = [] }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileSizeWarning, setFileSizeWarning] = useState('');
  const [fileError, setFileError] = useState('');
  const [newPlan, setNewPlan] = useState({ name: '', file: null, fileSize: 0 });
  const [analyzePlan, setAnalyzePlan] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [processingPdf, setProcessingPdf] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  
  const queryClient = useQueryClient();

  // ============================================
  // 🔒 FROZEN — Production Plans Query
  // DO NOT MODIFY WITHOUT NEW PHASE
  // ============================================
  // CRITICAL: purpose="job_final" ONLY
  // NO measurement_session_id filter
  // This ensures production/measurement separation
  // ============================================
  const { data: jobFinalPlans = [] } = useQuery({
    queryKey: ['field-job-final-plans', jobId],
    queryFn: () => base44.entities.Plan.filter({ 
      job_id: jobId, 
      purpose: 'job_final' // 🔒 FROZEN: Do not change
    }, '-created_date'),
    enabled: !!jobId,
  });

  // FASE 5 PERF: Stable plans reference
  const plans = React.useMemo(() => jobFinalPlans, [jobFinalPlans]);

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.Plan.create({
      ...data,
      purpose: 'job_final'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-job-final-plans', jobId] });
      queryClient.invalidateQueries({ queryKey: ['field-plans', jobId] });
      setShowUpload(false);
      setNewPlan({ name: '', file: null });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId) => {
      // Delete all tasks associated with this plan
      const planTasks = tasks.filter(t => t.blueprint_id === planId);
      for (const task of planTasks) {
        await base44.entities.Task.delete(task.id);
      }
      // Delete the plan
      await base44.entities.Plan.delete(planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-job-final-plans', jobId] });
      queryClient.invalidateQueries({ queryKey: ['field-plans', jobId] });
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
    },
  });

  // FASE 5 PERF: Stable validation callback
  const validateFile = React.useCallback((file) => {
    const fileSizeMB = file.size / (1024 * 1024);
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    // Reset warnings/errors
    setFileSizeWarning('');
    setFileError('');

    // Validate extension
    if (!validExtensions.includes(extension)) {
      setFileError('Invalid file type. Only JPG, PNG, GIF, WebP, SVG, PDF allowed');
      return false;
    }

    // Check file size
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setFileError(`File exceeds ${MAX_FILE_SIZE_MB}MB limit. Please compress before uploading.`);
      return false;
    }

    if (fileSizeMB > WARNING_FILE_SIZE_MB) {
      setFileSizeWarning(`⚠️ Large file (${fileSizeMB.toFixed(1)}MB). Consider compressing for faster upload.`);
    }

    return true;
  }, []);

  // FASE 5 PERF: Stable file upload handler
  const handleFileUpload = React.useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!validateFile(file)) {
      return;
    }

    // Check if PDF - if so, process it differently
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setUploading(false);
        setShowUpload(false);
        setProcessingPdf(file_url);
      } catch (error) {
        console.error('Upload error:', error);
        setFileError('Error uploading PDF');
        setUploading(false);
      }
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress for large files
    const fileSizeMB = file.size / (1024 * 1024);
    let progressInterval;
    if (fileSizeMB > 5) {
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 10;
        });
      }, 300);
    }

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (progressInterval) clearInterval(progressInterval);
      setUploadProgress(100);
      
      // FASE A2.1: Use backend function for versioning (job_final purpose)
      const planName = newPlan.name || file.name.split('.')[0];
      const { plan } = await base44.functions.invoke('uploadPlanVersion', {
        job_id: jobId,
        name: planName,
        file_url: file_url,
        order: plans.length,
        purpose: 'job_final',
      });
      
      toast.success(`Plan version ${plan.version_number || plan.version} created`);
      setNewPlan({ name: '', file: null, fileSize: 0 });
      setUploadProgress(0);
    } catch (error) {
      console.error('Upload error:', error);
      if (progressInterval) clearInterval(progressInterval);
      setFileError('Error uploading file. Please try again.');
    }
    setUploading(false);
  }, [jobId, plans.length, newPlan.name, queryClient, validateFile]);

  // FASE 5 PERF: Stable create handler
  const handleCreatePlan = React.useCallback(() => {
    if (!newPlan.file || !newPlan.name) return;
    createPlanMutation.mutate({
      job_id: jobId,
      name: newPlan.name,
      file_url: newPlan.file,
      order: plans.length,
    });
  }, [newPlan, jobId, plans.length, createPlanMutation]);

  // FASE 5 PERF: Memoized task filtering
  const planTasks = React.useMemo(() => 
    selectedPlan ? tasks.filter(t => t.blueprint_id === selectedPlan.id) : [],
    [selectedPlan, tasks]
  );

  if (selectedPlan) {
    return (
      <BlueprintViewer 
        plan={selectedPlan}
        tasks={planTasks}
        jobId={jobId}
        onBack={() => setSelectedPlan(null)}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-slate-900">
      {/* FASE 4 POLISH: Cleaner header with better spacing */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Plans</h1>
          <p className="text-sm text-slate-400">Final approved drawings</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button 
            onClick={() => setShowTemplates(true)}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 min-h-[48px] touch-manipulation"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Templates</span>
          </Button>
          <Button 
            onClick={() => setShowBulkUpload(true)}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 min-h-[48px] touch-manipulation"
          >
            <Upload className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Bulk</span>
          </Button>
          <Button 
            onClick={() => setShowUpload(true)}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black font-bold min-h-[52px] px-6 shadow-lg active:scale-95 transition-transform touch-manipulation"
          >
            <Plus className="w-5 h-5 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-16 text-center">
          <Upload className="w-20 h-20 text-slate-600 mx-auto mb-6" />
          <h3 className="text-xl font-bold text-white mb-3">No Plans Yet</h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">Upload approved drawings to begin field work</p>
          <Button 
            onClick={() => setShowUpload(true)}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black font-bold min-h-[56px] px-8 shadow-xl rounded-xl active:scale-95 transition-transform"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload First Plan
          </Button>
        </div>
      ) : (
        <PlanSectionAccordion plans={plans} tasks={tasks} setSelectedPlan={setSelectedPlan} setAnalyzePlan={setAnalyzePlan} deletePlanMutation={deletePlanMutation} jobId={jobId} />
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-[#1a1a1a] border-orange-500/30 text-white backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
              Upload New Plan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Plan Name</Label>
              <Input 
                value={newPlan.name}
                onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                placeholder="e.g., Floor Plan Level 1"
                className="mt-1.5 bg-black/40 border-orange-500/30 text-white focus:border-orange-400 backdrop-blur-sm"
              />
            </div>
            <div>
              <Label className="text-slate-300">File</Label>
              <div className="mt-1.5">
                {newPlan.file ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black/40 border border-orange-500/20">
                    {newPlan.file.toLowerCase().endsWith('.pdf') || newPlan.file.includes('.pdf') ? (
                      <div className="w-full h-full flex items-center justify-center bg-black/60">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📄</div>
                          <p className="text-white text-sm">{newPlan.name || 'PDF subido'}</p>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={newPlan.file} 
                        alt="Preview" 
                        className="w-full h-full object-contain relative z-10"
                      />
                    )}
                    <button 
                      onClick={() => {
                        setNewPlan({...newPlan, file: null, fileSize: 0});
                        setFileSizeWarning('');
                        setFileError('');
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600 z-20"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    {newPlan.fileSize > 0 && (
                      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white z-20">
                        {(newPlan.fileSize / (1024 * 1024)).toFixed(1)} MB
                      </div>
                    )}
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors backdrop-blur-sm ${
                    fileError ? 'border-red-500/50 bg-red-500/5' : 'border-orange-500/30 hover:border-orange-400 hover:bg-orange-500/5'
                  }`}>
                    {uploading ? (
                      <div className="flex flex-col items-center w-full px-8">
                        <Loader2 className="w-8 h-8 text-orange-400 animate-spin mb-2" />
                        <span className="text-sm text-slate-300 mb-2">Uploading file...</span>
                        {uploadProgress > 0 && (
                          <div className="w-full">
                            <Progress value={uploadProgress} className="h-2" />
                            <p className="text-center text-xs text-slate-500 mt-1">
                              {Math.round(uploadProgress)}%
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-orange-400/60 mb-2" />
                        <span className="text-sm text-slate-300">Click to upload image or PDF</span>
                        <span className="text-xs text-slate-500 mt-1">Max {MAX_FILE_SIZE_MB}MB</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
                
                {/* File Size Warning */}
                {fileSizeWarning && (
                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400">{fileSizeWarning}</p>
                  </div>
                )}
                
                {/* File Error */}
                {fileError && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">{fileError}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowUpload(false);
                  setNewPlan({ name: '', file: null, fileSize: 0 });
                  setFileSizeWarning('');
                  setFileError('');
                }}
                className="border-orange-500/30 text-slate-300 hover:bg-orange-500/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Analyzer */}
      {analyzePlan && (
        <PlanAnalyzer
          open={!!analyzePlan}
          onOpenChange={(open) => !open && setAnalyzePlan(null)}
          plan={analyzePlan}
          jobId={jobId}
          onTasksCreated={(count) => {
            toast.success(`${count} tasks created successfully`);
            setAnalyzePlan(null);
          }}
        />
      )}

      {/* Wall Templates Manager */}
      <WallTemplatesManager
        open={showTemplates}
        onOpenChange={setShowTemplates}
      />

      {/* PDF Processor */}
      {processingPdf && (
        <PDFProcessor
          pdfFile={processingPdf}
          jobId={jobId}
          onComplete={(count) => {
            toast.success(`${count} plans created from PDF`);
            setProcessingPdf(null);
            queryClient.invalidateQueries({ queryKey: ['field-plans', jobId] });
          }}
          onCancel={() => setProcessingPdf(null)}
        />
      )}

      {/* FASE 3B-I5: Batch Plan Upload Dialog */}
      <BatchPlanUploadDialog
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        jobId={jobId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['field-plans', jobId] });
          setShowBulkUpload(false);
        }}
      />
    </div>
  );
});

export default FieldPlansView;