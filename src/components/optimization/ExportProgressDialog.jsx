import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Loader2 } from 'lucide-react';

/**
 * Progress dialog for bulk export operations
 * Shows real-time progress and status updates
 */
export default function ExportProgressDialog({ 
  open, 
  onOpenChange, 
  progress, 
  total, 
  message, 
  isComplete 
}) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                Export Complete
              </>
            ) : (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                Exporting Data...
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Progress value={percentage} className="h-2" />
          
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {percentage}%
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {message || `Processing ${progress} of ${total}...`}
            </p>
          </div>

          {isComplete && (
            <p className="text-xs text-center text-green-600 dark:text-green-400">
              ✓ File downloaded to your device
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}