import React, { useEffect, useCallback } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Save, X } from 'lucide-react';

/**
 * NAVIGATION BLOCKER
 * Previene pérdida de datos al navegar con cambios sin guardar
 * 
 * NO silencioso - siempre pregunta con contexto claro
 */
export const NavigationBlocker = ({ 
  when,
  onSave,
  onDiscard,
  message = 'You have unsaved changes',
  saveLabel = 'Save changes',
  discardLabel = 'Leave anyway',
}) => {
  const [showDialog, setShowDialog] = React.useState(false);
  const [blockedNavigation, setBlockedNavigation] = React.useState(null);

  // Block browser back/forward/close
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [when, message]);

  const handleSave = async () => {
    try {
      await onSave?.();
      setShowDialog(false);
      
      // Proceed with navigation after save
      if (blockedNavigation?.retry) {
        blockedNavigation.retry();
      }
    } catch (error) {
      // Keep dialog open on error
      console.error('Save failed:', error);
    }
  };

  const handleDiscard = () => {
    onDiscard?.();
    setShowDialog(false);
    
    // Proceed with navigation
    if (blockedNavigation?.proceed) {
      blockedNavigation.proceed();
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-xl">
            {message}
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            Save your work before leaving, or changes will be lost
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleDiscard}
            variant="outline"
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
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
  );
};

/**
 * HOOK - useNavigationBlock
 * Detecta y bloquea navegación con unsaved changes
 */
export const useNavigationBlock = (hasUnsavedChanges) => {
  const [showBlocker, setShowBlocker] = React.useState(false);

  useEffect(() => {
    setShowBlocker(hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  return showBlocker;
};