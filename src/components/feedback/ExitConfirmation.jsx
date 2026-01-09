import React from 'react';
import { CheckCircle2, AlertCircle, WifiOff, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * EXIT CONFIRMATION
 * Confirmación inteligente al salir - SOLO si hay riesgo
 * 
 * Reglas:
 * - Si todo seguro → NO preguntar
 * - Si trabajo pendiente → informar sin asustar
 * - Lenguaje humano, NO técnico
 */
export const ExitConfirmation = ({ 
  open,
  onOpenChange,
  pendingWork = [],
  unsavedChanges = false,
  offlineItems = 0,
  onConfirmExit,
  onStay,
}) => {
  // Si no hay nada pendiente, no mostrar
  if (!unsavedChanges && offlineItems === 0 && pendingWork.length === 0) {
    return null;
  }

  // Determinar estado
  const isSafe = !unsavedChanges && offlineItems === 0;
  const hasOffline = offlineItems > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${
            isSafe 
              ? 'bg-green-100 dark:bg-green-900/20' 
              : hasOffline
              ? 'bg-orange-100 dark:bg-orange-900/20'
              : 'bg-amber-100 dark:bg-amber-900/20'
          }`}>
            {isSafe ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : hasOffline ? (
              <WifiOff className="w-6 h-6 text-orange-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600" />
            )}
          </div>
          
          <DialogTitle className="text-center text-xl">
            {isSafe && 'All work saved'}
            {hasOffline && `${offlineItems} items saved offline`}
            {!isSafe && !hasOffline && 'You have unsaved changes'}
          </DialogTitle>
          
          <DialogDescription className="text-center text-sm">
            {isSafe && 'Safe to exit'}
            {hasOffline && 'These will sync automatically when you are back online'}
            {!isSafe && !hasOffline && 'Your work will be lost if you leave now'}
          </DialogDescription>
        </DialogHeader>

        {/* Pending work summary */}
        {pendingWork.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 mt-4">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {hasOffline ? 'Saved offline:' : 'Pending:'}
            </p>
            <ul className="space-y-1">
              {pendingWork.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{item}</span>
                </li>
              ))}
              {pendingWork.length > 3 && (
                <li className="text-xs text-slate-500 dark:text-slate-500">
                  +{pendingWork.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {!isSafe ? (
            <>
              <Button
                onClick={onConfirmExit}
                variant="outline"
                className="flex-1"
              >
                Leave anyway
              </Button>
              <Button
                onClick={onStay}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Stay and save
              </Button>
            </>
          ) : (
            <Button
              onClick={onConfirmExit}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Exit Field Mode
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * HOOK - useExitConfirmation
 * Detecta trabajo pendiente antes de salir
 */
export const useExitConfirmation = (jobId) => {
  const [pendingWork, setPendingWork] = React.useState([]);
  const [unsavedChanges, setUnsavedChanges] = React.useState(false);
  const [offlineItems, setOfflineItems] = React.useState(0);

  const checkPendingWork = React.useCallback(async () => {
    try {
      // Check for offline items
      const offline = await fieldStorage.getPendingOperations(jobId);
      setOfflineItems(offline.length);

      // Check for unsaved drafts
      const drafts = [];
      const taskDraft = await fieldStorage.getDraft('tasks', jobId);
      if (taskDraft) drafts.push('Unsaved task');
      
      const dimensionDraft = await fieldStorage.getDraft('dimensions', jobId);
      if (dimensionDraft) drafts.push('Unsaved measurement');
      
      setPendingWork(drafts);
      setUnsavedChanges(drafts.length > 0);
    } catch (error) {
      console.error('Failed to check pending work:', error);
    }
  }, [jobId]);

  return {
    pendingWork,
    unsavedChanges,
    offlineItems,
    checkPendingWork,
    hasPendingWork: unsavedChanges || offlineItems > 0,
  };
};