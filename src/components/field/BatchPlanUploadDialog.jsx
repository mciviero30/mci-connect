import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X, CheckCircle2, AlertTriangle, Loader2, FileText, Image } from 'lucide-react';
import { toast } from 'sonner';

/**
 * FASE 3B — INITIATIVE #5: Batch Plan Upload Dialog
 * 
 * SAFETY DECISIONS:
 * - Sequential uploads (not parallel) to prevent credit exhaustion
 * - Explicit per-file error handling (including 402 credit errors)
 * - No Plan entity created unless upload succeeds
 * - Section field is optional/nullable (backward compatible)
 * - User can continue/stop batch on error
 * 
 * ROLLBACK: Delete this file, remove "Bulk Upload" button from FieldPlansView
 */

export default function BatchPlanUploadDialog({ open, onOpenChange, jobId, onSuccess }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFilesSelected = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name.split('.')[0],
      section: '',
      status: 'pending', // pending | uploading | success | error
      progress: 0,
      error: null,
      plan_id: null,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateFileStatus = (fileId, updates) => {
    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, ...updates } : f));
  };

  const handleUploadAll = async () => {
    if (files.length === 0) return;

    setUploading(true);

    // SAFETY: Sequential uploads to prevent overwhelming credits/bandwidth
    for (const fileItem of files) {
      if (fileItem.status === 'success') continue; // Skip already uploaded

      try {
        updateFileStatus(fileItem.id, { status: 'uploading', progress: 0, error: null });

        // STEP 1: Upload file via Core.UploadFile
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileItem.file });
        
        updateFileStatus(fileItem.id, { progress: 50 });

        // STEP 2: Create Plan entity (only after successful upload)
        const planData = {
          job_id: jobId,
          name: fileItem.name || fileItem.file.name,
          file_url,
          section: fileItem.section || null, // FASE 3B-I5: Optional section field
          order: files.indexOf(fileItem),
        };

        const plan = await base44.entities.Plan.create(planData);
        
        updateFileStatus(fileItem.id, { 
          status: 'success', 
          progress: 100,
          plan_id: plan.id 
        });

      } catch (error) {
        console.error('Upload error for file:', fileItem.file.name, error);
        
        // SAFETY: Detect structured 402 credit errors
        const is402 = error?.status === 402 || error?.message?.includes('402') || error?.message?.includes('credit');
        const errorMessage = is402 
          ? 'Insufficient credits. Please contact your administrator.'
          : error?.message || 'Upload failed';

        updateFileStatus(fileItem.id, { 
          status: 'error', 
          progress: 0,
          error: errorMessage 
        });

        // SAFETY: Continue with remaining files (failures don't halt batch)
      }
    }

    setUploading(false);

    // Notify success
    const successCount = files.filter(f => f.status === 'success').length;
    const errorCount = files.filter(f => f.status === 'error').length;

    if (successCount > 0) {
      toast.success(`${successCount} plan(s) uploaded successfully`);
      if (onSuccess) onSuccess();
    }

    if (errorCount > 0) {
      toast.error(`${errorCount} upload(s) failed. Review errors below.`);
    }
  };

  const canUpload = files.length > 0 && files.some(f => f.status === 'pending' || f.status === 'error');
  const allComplete = files.length > 0 && files.every(f => f.status === 'success' || f.status === 'error');

  const getFileIcon = (file) => {
    const isPdf = file.file.type === 'application/pdf' || file.file.name.toLowerCase().endsWith('.pdf');
    return isPdf ? FileText : Image;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-orange-500/30 text-white backdrop-blur-xl max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent">
            Bulk Upload Plans
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* File Picker */}
          <div>
            <Label className="text-slate-300">Select Files</Label>
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-orange-500/30 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-500/5 transition-colors mt-1.5">
              <Upload className="w-8 h-8 text-orange-400/60 mb-2" />
              <span className="text-sm text-slate-300">Click to select multiple files</span>
              <span className="text-xs text-slate-500 mt-1">Images or PDFs (max 100MB each)</span>
              <input 
                type="file" 
                accept="image/*,.pdf"
                multiple
                onChange={handleFilesSelected}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label className="text-slate-300">Files to Upload ({files.length})</Label>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {files.map((fileItem) => {
                  const FileIcon = getFileIcon(fileItem);
                  return (
                    <div 
                      key={fileItem.id}
                      className="bg-black/40 border border-orange-500/20 rounded-lg p-3 backdrop-blur-sm"
                    >
                      <div className="flex items-start gap-3">
                        {/* File Icon */}
                        <FileIcon className="w-5 h-5 text-orange-400 flex-shrink-0 mt-1" />

                        {/* File Details */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Filename & Section */}
                          <div className="flex gap-2">
                            <Input
                              value={fileItem.name}
                              onChange={(e) => updateFileStatus(fileItem.id, { name: e.target.value })}
                              placeholder="Plan name"
                              disabled={uploading || fileItem.status === 'success'}
                              className="flex-1 bg-black/40 border-orange-500/30 text-white text-sm h-8"
                            />
                            <Input
                              value={fileItem.section}
                              onChange={(e) => updateFileStatus(fileItem.id, { section: e.target.value })}
                              placeholder="Section (optional)"
                              disabled={uploading || fileItem.status === 'success'}
                              className="w-32 bg-black/40 border-orange-500/30 text-white text-sm h-8"
                            />
                          </div>

                          {/* Status Indicator */}
                          <div className="flex items-center gap-2">
                            {fileItem.status === 'pending' && (
                              <span className="text-xs text-slate-400">Ready to upload</span>
                            )}
                            {fileItem.status === 'uploading' && (
                              <>
                                <Loader2 className="w-3 h-3 text-orange-400 animate-spin" />
                                <span className="text-xs text-orange-400">Uploading...</span>
                                <Progress value={fileItem.progress} className="h-1 flex-1" />
                              </>
                            )}
                            {fileItem.status === 'success' && (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span className="text-xs text-green-400">Uploaded successfully</span>
                              </>
                            )}
                            {fileItem.status === 'error' && (
                              <div className="flex items-start gap-2 flex-1">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <span className="text-xs text-red-400">{fileItem.error}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Remove Button */}
                        {fileItem.status !== 'uploading' && (
                          <button
                            onClick={() => handleRemoveFile(fileItem.id)}
                            className="p-1 rounded hover:bg-red-500/20 transition-colors flex-shrink-0"
                            disabled={uploading}
                          >
                            <X className="w-4 h-4 text-slate-400 hover:text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-orange-500/20">
            <Button 
              variant="outline" 
              onClick={() => {
                if (!uploading) {
                  setFiles([]);
                  onOpenChange(false);
                }
              }}
              disabled={uploading}
              className="border-orange-500/30 text-slate-300 hover:bg-orange-500/10"
            >
              {allComplete ? 'Close' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleUploadAll}
              disabled={!canUpload || uploading}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : allComplete ? (
                'All Done'
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload All ({files.filter(f => f.status === 'pending' || f.status === 'error').length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}