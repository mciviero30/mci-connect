import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Upload, X, ZoomIn, ZoomOut, Move, Trash2, MoreVertical, AlertTriangle, Loader2, Wand2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BlueprintViewer from './BlueprintViewer.jsx';
import PlanAnalyzer from './PlanAnalyzer.jsx';
import WallTemplatesManager from './WallTemplatesManager.jsx';
import PDFProcessor from './PDFProcessor.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const MAX_FILE_SIZE_MB = 100;
const WARNING_FILE_SIZE_MB = 50;

export default function FieldPlansView({ jobId, plans = [], tasks = [] }) {
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
  
  const queryClient = useQueryClient();

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.Plan.create(data),
    onSuccess: () => {
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
      queryClient.invalidateQueries({ queryKey: ['field-plans', jobId] });
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
    },
  });

  const validateFile = (file) => {
    const fileSizeMB = file.size / (1024 * 1024);
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'];
    const extension = file.name.split('.').pop()?.toLowerCase();

    // Reset warnings/errors
    setFileSizeWarning('');
    setFileError('');

    // Validate extension
    if (!validExtensions.includes(extension)) {
      setFileError('Tipo de archivo no válido. Solo se permiten: JPG, PNG, GIF, WebP, SVG, PDF');
      return false;
    }

    // Check file size
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      setFileError(`El archivo excede el límite de ${MAX_FILE_SIZE_MB}MB. Por favor, comprime el archivo antes de subirlo.`);
      return false;
    }

    if (fileSizeMB > WARNING_FILE_SIZE_MB) {
      setFileSizeWarning(`⚠️ Archivo grande (${fileSizeMB.toFixed(1)}MB). Considera comprimir el archivo para una carga más rápida.`);
    }

    return true;
  };

  const handleFileUpload = async (e) => {
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
      setNewPlan({ 
        ...newPlan, 
        file: file_url, 
        name: newPlan.name || file.name.split('.')[0],
        fileSize: file.size 
      });
    } catch (error) {
      console.error('Upload error:', error);
      if (progressInterval) clearInterval(progressInterval);
      setFileError('Error al subir el archivo. Por favor, intenta de nuevo.');
    }
    setUploading(false);
  };

  const handleCreatePlan = () => {
    if (!newPlan.file || !newPlan.name) return;
    createPlanMutation.mutate({
      job_id: jobId,
      name: newPlan.name,
      file_url: newPlan.file,
      order: plans.length,
    });
  };

  const planTasks = selectedPlan 
    ? tasks.filter(t => t.blueprint_id === selectedPlan.id)
    : [];

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
    <div className="p-6 min-h-screen bg-[#0a0a0a]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent" style={{ fontSize: '1.575rem' }}>
          Plans
        </h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowTemplates(true)}
            variant="outline"
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-400 h-10 backdrop-blur-sm"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Templates
          </Button>
          <Button 
            onClick={() => setShowUpload(true)}
            className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-semibold border-none h-10 shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Upload Plan
          </Button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-orange-500/20 rounded-2xl p-12 text-center backdrop-blur-sm">
          <Upload className="w-12 h-12 text-orange-500/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No plans yet</h3>
          <p className="text-slate-400 mb-4">Upload your first plan to get started</p>
          <Button 
            onClick={() => setShowUpload(true)}
            className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-semibold shadow-lg shadow-orange-500/20"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const taskCount = tasks.filter(t => t.blueprint_id === plan.id).length;
            const isPdf = plan.file_url?.toLowerCase().includes('.pdf');
            return (
              <div 
                key={plan.id}
                className="bg-[#1a1a1a] border border-orange-500/30 rounded-xl overflow-hidden hover:border-orange-400 hover:shadow-lg hover:shadow-orange-500/20 transition-all group relative backdrop-blur-sm"
              >
                {/* Action Menu */}
                <div className="absolute top-2 left-2 z-20">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-black/40 backdrop-blur-sm rounded-lg hover:bg-black/60 transition-colors"
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4 text-white" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[#1a1a1a] border-orange-500/30 backdrop-blur-xl">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setAnalyzePlan(plan);
                        }}
                        className="text-white hover:bg-orange-500/10 focus:bg-orange-500/10 cursor-pointer"
                      >
                        <Wand2 className="w-4 h-4 mr-2 text-orange-400" />
                        Analyze & Create Tasks
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this plan and all its tasks?')) {
                            deletePlanMutation.mutate(plan.id);
                          }
                        }}
                        className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div 
                  onClick={() => setSelectedPlan(plan)}
                  className="cursor-pointer"
                >
                  <div className="aspect-video relative overflow-hidden bg-black/40">
                    {isPdf ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-5xl mb-2">📄</div>
                          <p className="text-slate-600 dark:text-white text-sm">PDF</p>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={plan.file_url}
                        alt={plan.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '';
                          e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><div class="text-center"><div class="text-4xl mb-2">🖼️</div><p class="text-slate-400 text-sm">Vista previa no disponible</p></div></div>';
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    {taskCount > 0 && (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-black text-xs px-3 py-1 rounded-full z-10 font-semibold shadow-lg">
                        {taskCount} tasks
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-gradient-to-b from-transparent to-black/20">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors flex-1">
                        {plan.name}
                      </h3>
                      {plan.needs_confirmation && (
                        <div className="flex-shrink-0 px-2 py-1 bg-amber-500/20 border border-amber-500/40 rounded text-[10px] text-amber-400 font-medium backdrop-blur-sm">
                          Pending
                        </div>
                      )}
                    </div>
                    {plan.folder && (
                      <p className="text-sm text-slate-400 mt-1">{plan.folder}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
              <Button variant="outline" onClick={() => setShowUpload(false)} className="border-orange-500/30 text-slate-300 hover:bg-orange-500/10">
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePlan}
                disabled={!newPlan.file || !newPlan.name || createPlanMutation.isPending}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-semibold shadow-lg shadow-orange-500/20"
              >
                {createPlanMutation.isPending ? 'Saving...' : 'Save Plan'}
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
    </div>
  );
}