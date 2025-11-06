import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

// Prompt #75: High contrast colors (removed pink/rose)
const toastColors = {
  success: 'bg-green-50 border-green-300 text-green-900',
  error: 'bg-red-50 border-red-300 text-red-900',
  warning: 'bg-amber-50 border-amber-300 text-amber-900',
  info: 'bg-blue-50 border-blue-300 text-blue-900'
};

const iconColors = {
  success: 'text-green-700',
  error: 'text-red-700',
  warning: 'text-amber-700',
  info: 'text-blue-700'
};

// Prompt #78: Individual toast with auto-dismiss
function Toast({ id, message, type, onRemove }) {
  const Icon = toastIcons[type];
  
  // Auto-dismiss after 5 seconds (Prompt #78)
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(id);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [id, onRemove]);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className={`${toastColors[type]} border-2 rounded-lg shadow-xl p-3 flex items-start gap-3 max-w-sm`}
    >
      <Icon className={`w-5 h-5 ${iconColors[type]} flex-shrink-0 mt-0.5`} />
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity p-0.5"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type };
    
    setToasts(prev => [...prev, toast]);
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback((options) => {
    const { title, description, variant } = options;
    const message = description || title || 'Notification';
    const type = variant === 'destructive' ? 'error' : 'success';
    return addToast(message, type);
  }, [addToast]);

  const toastMethods = {
    toast,
    success: (message) => addToast(message, 'success'),
    error: (message) => addToast(message, 'error'),
    warning: (message) => addToast(message, 'warning'),
    info: (message) => addToast(message, 'info'),
    remove: removeToast
  };

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}
      {/* Prompt #78: Non-intrusive position (bottom-right corner) */}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2 max-w-md pointer-events-none">
        <div className="pointer-events-auto">
          <AnimatePresence>
            {toasts.map(({ id, message, type }) => (
              <Toast
                key={id}
                id={id}
                message={message}
                type={type}
                onRemove={removeToast}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
}