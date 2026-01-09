import React, { useEffect, useState } from 'react';
import { AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

/**
 * UNSAVED CHANGES WARNING
 * Previene pérdida de datos al salir sin guardar
 * 
 * NO bloquea, solo advierte con claridad
 */
export const UnsavedChangesWarning = ({ 
  hasUnsavedChanges, 
  onSave, 
  onDiscard,
  message = 'You have unsaved changes',
  saveLabel = 'Save changes',
  discardLabel = 'Leave anyway',
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [attemptedNavigation, setAttemptedNavigation] = useState(null);

  // Prevent browser/tab close with unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires this
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Intercept React Router navigation (if needed)
  const blockNavigation = (callback) => {
    if (hasUnsavedChanges) {
      setAttemptedNavigation(() => callback);
      setShowWarning(true);
      return true; // Blocked
    }
    return false; // Allow
  };

  const handleSave = async () => {
    await onSave?.();
    setShowWarning(false);
    attemptedNavigation?.();
  };

  const handleDiscard = () => {
    onDiscard?.();
    setShowWarning(false);
    attemptedNavigation?.();
  };

  return (
    <>
      {/* Inline warning banner (non-blocking) */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-600 p-3 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {message}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              Save before leaving to keep your work
            </p>
          </div>
        </div>
      )}

      {/* Modal confirmation (when attempting to leave) */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <DialogTitle className="text-center">
              {message}
            </DialogTitle>
            <DialogDescription className="text-center">
              Save your work before leaving, or discard changes
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleDiscard}
              variant="outline"
              className="flex-1"
            >
              {discardLabel}
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveLabel}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * HOOK - useUnsavedChanges
 * Detecta cambios sin guardar automáticamente
 */
export const useUnsavedChanges = (initialData, currentData, isDirty = false) => {
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isDirty) {
      setHasChanges(true);
      return;
    }

    // Compare data
    const changed = JSON.stringify(initialData) !== JSON.stringify(currentData);
    setHasChanges(changed);
  }, [initialData, currentData, isDirty]);

  return hasChanges;
};