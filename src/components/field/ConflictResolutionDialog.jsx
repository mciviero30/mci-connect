import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function ConflictResolutionDialog({ conflicts, open, onOpenChange, onResolve }) {
  const [selectedResolution, setSelectedResolution] = useState({});

  if (!conflicts || conflicts.length === 0) return null;

  const handleResolve = () => {
    onResolve(selectedResolution);
    setSelectedResolution({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Sync Conflicts Detected
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>{conflicts.length} conflict(s)</strong> detected during sync. Multiple users edited the same data while offline.
              Choose which version to keep for each conflict.
            </p>
          </div>

          {conflicts.map((conflict, idx) => (
            <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {conflict.entity} #{conflict.entityId}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {conflict.field && `Field: ${conflict.field}`}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 p-4">
                {/* Version A */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedResolution[conflict.id] === 'versionA'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedResolution({
                    ...selectedResolution,
                    [conflict.id]: 'versionA'
                  })}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-blue-100 text-blue-800">Version A</Badge>
                    {selectedResolution[conflict.id] === 'versionA' && (
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {conflict.versionA.user_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Priority: {conflict.versionA.role_priority}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    {format(new Date(conflict.versionA.timestamp), 'MMM dd, h:mm a')}
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {JSON.stringify(conflict.versionA.data, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Version B */}
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    selectedResolution[conflict.id] === 'versionB'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-green-300'
                  }`}
                  onClick={() => setSelectedResolution({
                    ...selectedResolution,
                    [conflict.id]: 'versionB'
                  })}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-green-100 text-green-800">Version B</Badge>
                    {selectedResolution[conflict.id] === 'versionB' && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {conflict.versionB.user_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Priority: {conflict.versionB.role_priority}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    {format(new Date(conflict.versionB.timestamp), 'MMM dd, h:mm a')}
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded p-3 text-sm">
                    <pre className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {JSON.stringify(conflict.versionB.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={Object.keys(selectedResolution).length !== conflicts.length}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Resolve Conflicts
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}