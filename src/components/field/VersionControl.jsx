import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, GitBranch, RotateCcw, Eye, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

export default function VersionControl({ planId, jobId, currentPlanUrl }) {
  const [showVersions, setShowVersions] = useState(false);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [versionNotes, setVersionNotes] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);

  const queryClient = useQueryClient();

  const { data: versions = [] } = useQuery({
    queryKey: ['plan-versions', planId],
    queryFn: () => base44.entities.DocumentVersion.filter({ 
      document_id: planId,
      document_type: 'plan' 
    }, '-version_number'),
  });

  const createVersionMutation = useMutation({
    mutationFn: async (notes) => {
      const nextVersion = versions.length + 1;
      return base44.entities.DocumentVersion.create({
        document_id: planId,
        document_type: 'plan',
        job_id: jobId,
        version_number: nextVersion,
        file_url: currentPlanUrl,
        notes: notes,
        created_by_name: (await base44.auth.me()).full_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-versions'] });
      setShowCreateVersion(false);
      setVersionNotes('');
    }
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (version) => {
      await base44.entities.Plan.update(planId, {
        file_url: version.file_url
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-plans'] });
      setShowVersions(false);
    }
  });

  return (
    <>
      <div className="absolute bottom-20 right-4 z-40">
        <Button
          onClick={() => setShowVersions(true)}
          variant="outline"
          size="sm"
          className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg"
        >
          <GitBranch className="w-4 h-4 mr-2" />
          Versions ({versions.length})
        </Button>
      </div>

      {/* Versions Dialog */}
      <Dialog open={showVersions} onOpenChange={setShowVersions}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#FFB800]" />
              Plan Version History
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Current Version */}
            <div className="p-4 bg-[#FFB800]/10 border-2 border-[#FFB800]/30 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#FFB800] text-white">Current</Badge>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Latest Version
                  </span>
                </div>
                <Button
                  onClick={() => setShowCreateVersion(true)}
                  size="sm"
                  className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Save as Version
                </Button>
              </div>
            </div>

            {/* Version History */}
            {versions.map((version) => (
              <div 
                key={version.id}
                className="relative pl-8 pb-4 border-l-2 border-slate-200 dark:border-slate-700 last:border-0"
              >
                <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400">
                          v{version.version_number}
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {format(new Date(version.created_date), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-900 dark:text-white font-medium">
                        {version.created_by_name}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => window.open(version.file_url, '_blank')}
                        size="sm"
                        variant="ghost"
                        className="text-slate-600 dark:text-slate-400"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => restoreVersionMutation.mutate(version)}
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {version.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                      {version.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {versions.length === 0 && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <GitBranch className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No version history yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Version Dialog */}
      <Dialog open={showCreateVersion} onOpenChange={setShowCreateVersion}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Save Plan Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Version Notes</Label>
              <Textarea
                value={versionNotes}
                onChange={(e) => setVersionNotes(e.target.value)}
                placeholder="e.g., Updated room layout, added electrical details..."
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCreateVersion(false)}
                className="border-slate-300 dark:border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createVersionMutation.mutate(versionNotes)}
                disabled={createVersionMutation.isPending}
                className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {createVersionMutation.isPending ? 'Saving...' : 'Save Version'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}