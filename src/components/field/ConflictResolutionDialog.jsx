import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { fieldStorage } from './services/FieldStorageService';

export default function ConflictResolutionDialog({ conflict, onClose, onResolve }) {
  const [resolution, setResolution] = useState(null);

  if (!conflict) return null;

  const handleResolve = async (choice) => {
    setResolution(choice);
    
    const finalData = choice === 'local' 
      ? conflict.local_version 
      : conflict.server_version;

    await fieldStorage.resolveConflict(conflict.id, choice);
    
    // Update the entity with chosen version
    await fieldStorage.update(conflict.entity_type, conflict.entity_id, {
      ...finalData,
      _conflict: false,
      synced: choice === 'server'
    });

    onResolve?.(choice, finalData);
    onClose();
  };

  return (
    <Dialog open={!!conflict} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Sync Conflict Detected
          </DialogTitle>
          <DialogDescription>
            This item was modified on the server while you had unsaved changes. Choose which version to keep.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Local Version */}
          <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
            <h3 className="font-bold text-sm mb-2">Your Local Version</h3>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-mono text-xs max-h-48 overflow-auto">
                {JSON.stringify(conflict.local_version, null, 2)}
              </p>
            </div>
            <Button 
              onClick={() => handleResolve('local')}
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
              disabled={resolution !== null}
            >
              Keep My Changes
            </Button>
          </div>

          {/* Server Version */}
          <div className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
            <h3 className="font-bold text-sm mb-2">Server Version</h3>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-mono text-xs max-h-48 overflow-auto">
                {JSON.stringify(conflict.server_version, null, 2)}
              </p>
            </div>
            <Button 
              onClick={() => handleResolve('server')}
              className="w-full mt-3 bg-orange-600 hover:bg-orange-700"
              disabled={resolution !== null}
            >
              Use Server Version
            </Button>
          </div>
        </div>

        <div className="text-xs text-slate-500 mt-2">
          <strong>Detected:</strong> {new Date(conflict.detected_at).toLocaleString()}
        </div>
      </DialogContent>
    </Dialog>
  );
}