import React from 'react';
import { CheckCircle2, Clock, Wifi, WifiOff, AlertCircle, Info, Lock, Inbox } from 'lucide-react';

/**
 * HUMAN STATES SYSTEM
 * Estados del sistema en lenguaje claro, NO técnico
 * 
 * Cada estado tiene:
 * - Mensaje humano
 * - Acción sugerida (si aplica)
 * - Visual claro (color + ícono)
 */

export const HumanStates = {
  // EMPTY STATES
  empty: {
    icon: Inbox,
    color: 'text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    message: 'Nothing here yet',
    action: 'Get started by adding your first item',
  },
  
  noTasks: {
    icon: Inbox,
    color: 'text-slate-400',
    message: 'No tasks yet',
    action: 'Tap + to create your first task',
  },
  
  noPhotos: {
    icon: Inbox,
    color: 'text-slate-400',
    message: 'No photos yet',
    action: 'Capture your first photo',
  },
  
  noDimensions: {
    icon: Inbox,
    color: 'text-slate-400',
    message: 'No measurements yet',
    action: 'Add your first dimension',
  },
  
  noProjects: {
    icon: Inbox,
    color: 'text-slate-400',
    message: 'No projects today',
    action: 'Create your first project',
  },
  
  // LOADING STATES
  loading: {
    icon: Clock,
    color: 'text-blue-500',
    message: 'Loading...',
  },
  
  // SAVE STATES
  saved: {
    icon: CheckCircle2,
    color: 'text-green-600',
    message: 'All changes saved',
  },
  
  savedOffline: {
    icon: WifiOff,
    color: 'text-orange-600',
    message: 'Saved offline — will sync automatically',
  },
  
  syncing: {
    icon: Wifi,
    color: 'text-blue-600',
    message: 'Syncing your changes...',
  },
  
  unsaved: {
    icon: AlertCircle,
    color: 'text-amber-600',
    message: 'You have unsaved changes',
    action: 'Save before leaving',
  },
  
  // ERROR STATES
  saveFailed: {
    icon: AlertCircle,
    color: 'text-red-600',
    message: "Couldn't save right now — we'll retry",
  },
  
  uploadFailed: {
    icon: AlertCircle,
    color: 'text-red-600',
    message: "Couldn't upload — try again",
  },
  
  connectionLost: {
    icon: WifiOff,
    color: 'text-orange-600',
    message: 'No internet — working offline',
    action: 'Your work is still being saved',
  },
  
  // PERMISSION STATES
  noAccess: {
    icon: Lock,
    color: 'text-red-600',
    message: "You don't have access to this",
    action: 'Contact your admin if you need access',
  },
  
  // INFO STATES
  needsReview: {
    icon: Info,
    color: 'text-blue-600',
    message: 'Needs your review',
  },
  
  missingInfo: {
    icon: AlertCircle,
    color: 'text-amber-600',
    message: 'Some info is missing',
    action: 'Fill in the required fields',
  },
};

/**
 * STATE MESSAGE - Componente reutilizable para mostrar estados
 */
export const StateMessage = ({ 
  state, 
  customMessage, 
  customAction,
  size = 'md',
  className = '' 
}) => {
  const stateConfig = HumanStates[state];
  if (!stateConfig) return null;

  const Icon = stateConfig.icon;
  const message = customMessage || stateConfig.message;
  const action = customAction || stateConfig.action;

  const sizeClasses = {
    sm: 'text-xs gap-2 p-3',
    md: 'text-sm gap-3 p-6',
    lg: 'text-base gap-4 p-8',
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizeClasses[size]} ${className}`}>
      <div className={`w-12 h-12 rounded-xl ${stateConfig.bg || 'bg-slate-100 dark:bg-slate-800'} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${stateConfig.color}`} />
      </div>
      <div>
        <p className={`font-semibold ${stateConfig.color}`}>
          {message}
        </p>
        {action && (
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {action}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * INLINE STATE BADGE - Mini indicador de estado
 */
export const StateBadge = ({ state, customMessage }) => {
  const stateConfig = HumanStates[state];
  if (!stateConfig) return null;

  const Icon = stateConfig.icon;
  const message = customMessage || stateConfig.message;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stateConfig.color} bg-current/10 border border-current/20`}>
      <Icon className="w-3 h-3" />
      {message}
    </span>
  );
};

/**
 * HELPERS - Funciones para generar mensajes humanos
 */
export const humanize = {
  count: (count, singular, plural) => {
    if (count === 0) return `No ${plural} yet`;
    if (count === 1) return `1 ${singular}`;
    return `${count} ${plural}`;
  },
  
  timeAgo: (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return new Date(date).toLocaleDateString();
  },
  
  error: (technicalError) => {
    // Convert technical errors to human messages
    const errorMap = {
      'network': "Couldn't connect right now",
      'timeout': 'Taking too long — try again',
      'unauthorized': "You don't have access",
      'not found': "Couldn't find that",
      'validation': 'Some info is missing',
      'duplicate': 'This already exists',
    };
    
    const errorLower = (technicalError || '').toLowerCase();
    
    for (const [key, message] of Object.entries(errorMap)) {
      if (errorLower.includes(key)) return message;
    }
    
    // Default friendly error
    return "Something went wrong — we'll try again";
  },
};