import React, { useState, useEffect } from 'react';
import { CheckCircle2, WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * SILENT CONFIRMATION SYSTEM
 * Confirma sin molestar - cerca de la acción, desaparece solo
 * 
 * NO usa modals, NO usa alerts
 * Solo feedback visual breve y claro
 */

export const SilentConfirmation = ({ 
  show, 
  type = 'saved', // saved | offline | syncing
  message,
  duration = 1500,
  onComplete,
  position = 'inline', // inline | floating
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  const configs = {
    saved: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-700',
      text: message || 'Saved',
    },
    offline: {
      icon: WifiOff,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-700',
      text: message || 'Saved offline',
    },
    syncing: {
      icon: Wifi,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-700',
      text: message || 'Syncing...',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: position === 'floating' ? -10 : 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'floating' ? -10 : 5 }}
          transition={{ duration: 0.2 }}
          className={`
            ${position === 'floating' ? 'fixed top-20 right-4 z-50' : ''}
            ${config.bg} ${config.border} border rounded-lg px-3 py-2 
            flex items-center gap-2 shadow-lg
          `}
        >
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.text}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * BUTTON WITH CONFIRMATION
 * Botón que muestra confirmación inline después de click
 */
export const ConfirmingButton = ({ 
  onClick, 
  children, 
  confirmText = 'Done!',
  confirmDuration = 1500,
  disabled,
  className = '',
  ...props 
}) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleClick = async (e) => {
    if (disabled || confirmed) return;

    await onClick?.(e);
    
    // Show confirmation
    setConfirmed(true);
    
    // Reset after duration
    setTimeout(() => {
      setConfirmed(false);
    }, confirmDuration);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || confirmed}
      className={`${className} ${confirmed ? 'pointer-events-none' : ''}`}
      {...props}
    >
      <AnimatePresence mode="wait">
        {confirmed ? (
          <motion.div
            key="confirmed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {confirmText}
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
};

/**
 * AUTO-CLEAR FORM HOOK
 * Limpia form automáticamente después de guardar exitoso
 */
export const useAutoClearForm = (initialState) => {
  const [formData, setFormData] = useState(initialState);
  const [lastSaveSuccess, setLastSaveSuccess] = useState(false);

  useEffect(() => {
    if (lastSaveSuccess) {
      // Clear form after brief delay (permite ver confirmación)
      const timer = setTimeout(() => {
        setFormData(initialState);
        setLastSaveSuccess(false);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [lastSaveSuccess, initialState]);

  const clearForm = () => {
    setFormData(initialState);
  };

  const markSaveSuccess = () => {
    setLastSaveSuccess(true);
  };

  return {
    formData,
    setFormData,
    clearForm,
    markSaveSuccess,
  };
};

/**
 * EXIT SAFETY CHECK
 * Verifica que todo esté seguro antes de salir
 */
export const ExitSafetyCheck = ({ 
  pendingItems = 0,
  unsavedChanges = false,
  onExit,
  children,
}) => {
  const [showWarning, setShowWarning] = useState(false);

  const handleExit = () => {
    // Safe to exit
    if (!unsavedChanges && pendingItems === 0) {
      onExit();
      return;
    }

    // Show info, not warning
    setShowWarning(true);
  };

  if (showWarning) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 p-4 rounded-r-xl">
        <div className="flex items-start gap-3">
          <WifiOff className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              {unsavedChanges 
                ? 'You have unsaved changes' 
                : `${pendingItems} items will sync automatically`}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              {unsavedChanges 
                ? 'Save before leaving to keep your work' 
                : 'Safe to exit — everything is saved offline'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowWarning(false)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Stay
              </button>
              {!unsavedChanges && (
                <button
                  onClick={onExit}
                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-xs font-semibold"
                >
                  Exit Anyway
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children({ onExit: handleExit });
};