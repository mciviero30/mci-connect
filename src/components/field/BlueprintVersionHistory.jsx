import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { History, Upload, RotateCcw, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function BlueprintVersionHistory({ plan, jobId, onVersionRestore }) {
  const [open, setOpen] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newVersion, setNewVersion] = useState({ file: null, description: '' });
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: versions = [] } = useQuery({
    queryKey: ['plan-versions', plan.id],
    queryFn: () => base44.entities.PlanVersion.filter({ plan_id: plan.id }, '-version_number'),
    enabled: !!plan.id && open,
  });

  const createVersionMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanVersion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-versions', plan.id] });
      setShowUpload(false);
      setNewVersion({ file: null, description: '' });
      toast.success('New version created');
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async ({ version }) => {
      // Set all versions to inactive
      await Promise.all(
        versions.map(v => 
          base44.entities.PlanVersion.update(v.id, { is_active: false })
        )
      );
      // Set selected version to active
      await base44.entities.PlanVersion.update(version.id, { is_active: true });
      // Update the plan with this version's file
      await base44.entities.Plan.update(plan.id, { file_url: version.file_url });
      return version;
    },
    onSuccess: (version) => {
      queryClient.invalidateQueries({ queryKey: ['plan-versions', plan.id] });
      queryClient.invalidateQueries({ queryKey: ['field-plans', jobId] });
      toast.success(`Restored to version ${version.version_number}`);
      if (onVersionRestore) onVersionRestore(version);
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewVersion({ ...newVersion, file: file_url });
    } catch (error) {
      toast.error('Error uploading file');
    }
    setUploading(false);
  };

  const handleCreateVersion = () => {
    if (!newVersion.file) return;

    const nextVersion = versions.length > 0 
      ? Math.max(...versions.map(v => v.version_number)) + 1 
      : 1;

    // Set all current versions to inactive
    versions.forEach(v => {
      base44.entities.PlanVersion.update(v.id, { is_active: false });
    });

    createVersionMutation.mutate({
      plan_id: plan.id,
      job_id: jobId,
      version_number: nextVersion,
      file_url: newVersion.file,
      created_by_email: user?.email,
      created_by_name: user?.full_name,
      change_description: newVersion.description,
      is_active: true,
    });

    // Update plan to use new version
    base44.entities.Plan.update(plan.id, { file_url: newVersion.file });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-slate-300 dark:border-slate-700"
      >
        <History className="w-4 h-4 mr-2" />
        Version History
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Version History - {plan.name}</span>
              <Button
                size="sm"
                onClick={() => setShowUpload(true)}
                className="bg-[#FFB800] hover:bg-[#E5A600]"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New Version
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6 space-y-3 max-h-96 overflow-y-auto">
            {versions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No version history yet</p>
              </div>
            ) : (
              versions.map((version) => (
                <div
                  key={version.id}
                  className={`p-4 rounded-lg border ${
                    version.is_active
                      ? 'border-[#FFB800] bg-[#FFB800]/5'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          Version {version.version_number}
                        </h4>
                        {version.is_active && (
                          <Badge className="bg-[#FFB800] text-white">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        {version.change_description || 'No description'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{version.created_by_name}</span>
                        <span>•</span>
                        <span>{format(new Date(version.created_date), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(version.file_url, '_blank')}
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!version.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(`Restore to version ${version.version_number}?`)) {
                              restoreVersionMutation.mutate({ version });
                            }
                          }}
                          title="Restore this version"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload New Version Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle>Upload New Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                File
              </label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#FFB800] file:text-white hover:file:bg-[#E5A600]"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                What changed?
              </label>
              <Textarea
                value={newVersion.description}
                onChange={(e) => setNewVersion({ ...newVersion, description: e.target.value })}
                placeholder="Describe the changes in this version..."
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUpload(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateVersion}
                disabled={!newVersion.file || uploading}
                className="bg-[#FFB800] hover:bg-[#E5A600]"
              >
                {uploading ? 'Uploading...' : 'Create Version'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}