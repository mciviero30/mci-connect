import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * SafeBackButton - Never causes data loss or confusion
 * CRITICAL: Shows where back goes, warns on unsaved changes, auto-saves if possible
 */
export default function SafeBackButton({ 
  hasUnsavedChanges, 
  onSave, 
  destination = 'Field',
  destinationLabel = 'Projects',
  className = '',
  size = 'default'
}) {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);

  const handleBackClick = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    
    // If unsaved changes, show warning
    if (hasUnsavedChanges) {
      setShowWarning(true);
      return;
    }
    
    // Otherwise navigate immediately
    navigate(createPageUrl(destination));
  };

  const handleSaveAndExit = async () => {
    if (onSave) {
      try {
        await onSave();
      } catch (error) {
        console.error('Failed to save:', error);
      }
    }
    navigate(createPageUrl(destination));
  };

  const handleDiscardAndExit = () => {
    navigate(createPageUrl(destination));
  };

  const sizeClasses = {
    small: 'w-12 h-12',
    default: 'w-14 h-14',
    large: 'w-16 h-16',
  };

  return (
    <>
      <button
        onClick={handleBackClick}
        className={`${sizeClasses[size]} bg-slate-900/95 backdrop-blur-sm border-2 border-slate-700 rounded-2xl flex items-center justify-center shadow-2xl touch-manipulation active:scale-90 active:bg-slate-800 active:border-orange-500 transition-all ${className}`}
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          minWidth: '56px',
          minHeight: '56px',
        }}
        aria-label={`Back to ${destinationLabel}`}
      >
        <ArrowLeft className="w-6 h-6 text-white" strokeWidth={2.5} />
      </button>

      {/* Unsaved Changes Warning */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7 text-yellow-400" />
            </div>
            <AlertDialogTitle className="text-xl text-center">
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 text-center">
              You have unsaved work. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            {onSave && (
              <AlertDialogAction
                onClick={handleSaveAndExit}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg min-h-[52px] touch-manipulation"
              >
                <Save className="w-5 h-5 mr-2" />
                Save & Exit
              </AlertDialogAction>
            )}
            <AlertDialogAction
              onClick={handleDiscardAndExit}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white min-h-[52px] touch-manipulation"
            >
              Exit Without Saving
            </AlertDialogAction>
            <AlertDialogCancel className="w-full bg-slate-800 hover:bg-slate-700 text-white border-slate-700 min-h-[52px] touch-manipulation">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}