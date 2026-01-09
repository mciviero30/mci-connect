import { toast } from 'sonner';
import { Check, AlertCircle, Wifi, WifiOff, Clock } from 'lucide-react';

/**
 * MICRO-TOAST SYSTEM
 * Confirmaciones no intrusivas, 1 línea, <2 segundos
 * 
 * NO bloquea UI, NO requiere interacción
 */

export const microToast = {
  // Success - acción completada
  success: (message, duration = 2000) => {
    toast.success(message, {
      duration,
      className: 'bg-green-600 text-white border-0',
      icon: <Check className="w-4 h-4" />,
    });
  },
  
  // Error - algo falló
  error: (message, duration = 3000) => {
    toast.error(message, {
      duration,
      className: 'bg-red-600 text-white border-0',
      icon: <AlertCircle className="w-4 h-4" />,
    });
  },
  
  // Offline - guardado localmente
  offline: (message = 'Saved offline', duration = 2000) => {
    toast.success(message, {
      duration,
      className: 'bg-orange-600 text-white border-0',
      icon: <WifiOff className="w-4 h-4" />,
    });
  },
  
  // Syncing - sincronizando
  syncing: (message = 'Syncing...', duration = 1500) => {
    toast.loading(message, {
      duration,
      className: 'bg-blue-600 text-white border-0',
      icon: <Wifi className="w-4 h-4 animate-pulse" />,
    });
  },
  
  // Queued - acción encolada
  queued: (message = 'Queued', duration = 2000) => {
    toast.success(message, {
      duration,
      className: 'bg-orange-600 text-white border-0',
      icon: <Clock className="w-4 h-4" />,
    });
  },
  
  // Info - información neutral
  info: (message, duration = 2000) => {
    toast.info(message, {
      duration,
      className: 'bg-slate-700 text-white border-0',
    });
  },
};

// Action-specific helpers
export const confirmAction = {
  saved: () => microToast.success('Saved', 1500),
  created: (item) => microToast.success(`${item} created`, 1500),
  deleted: (item) => microToast.success(`${item} deleted`, 1500),
  updated: () => microToast.success('Updated', 1500),
  approved: () => microToast.success('Approved', 1500),
  rejected: () => microToast.success('Rejected', 1500),
  uploaded: () => microToast.success('Uploaded', 1500),
  copied: () => microToast.success('Copied', 1200),
  queued: () => microToast.queued('Queued (offline)', 2000),
};