import React from 'react';
import { CheckCircle2, Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * FIELD STATE INDICATOR
 * Estado SIEMPRE visible en Field Mode
 * 
 * Posición: Top bar fijo
 * Nunca oculto, nunca ambiguo
 */
export default function FieldStateIndicator({ 
  state = 'ready', // ready | saving | saved | offline | syncing | error
  pendingCount = 0,
  message,
}) {
  const states = {
    ready: {
      icon: CheckCircle2,
      bg: 'bg-green-600',
      text: 'Ready',
    },
    saving: {
      icon: Loader2,
      bg: 'bg-blue-600',
      text: 'Saving...',
      animate: true,
    },
    saved: {
      icon: CheckCircle2,
      bg: 'bg-green-600',
      text: 'All changes saved',
    },
    offline: {
      icon: WifiOff,
      bg: 'bg-orange-600',
      text: pendingCount > 0 ? `${pendingCount} saved offline` : 'Working offline',
    },
    syncing: {
      icon: Wifi,
      bg: 'bg-blue-600',
      text: pendingCount > 0 ? `Syncing ${pendingCount} items...` : 'Syncing...',
      animate: true,
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-600',
      text: 'Connection issue',
    },
  };

  const config = states[state] || states.ready;
  const Icon = config.icon;

  return (
    <div className="fixed top-4 right-4 z-[60] pointer-events-none">
      <Badge 
        className={`${config.bg} text-white shadow-xl border-0 px-3 py-2 flex items-center gap-2 font-semibold text-xs pointer-events-auto`}
      >
        <Icon className={`w-3.5 h-3.5 ${config.animate ? 'animate-spin' : ''}`} />
        {message || config.text}
      </Badge>
    </div>
  );
}

/**
 * INLINE STATE TEXT - Para formularios y modales
 */
export const InlineStateText = ({ state, message, className = '' }) => {
  const states = {
    saved: { color: 'text-green-600', icon: CheckCircle2, text: 'Saved' },
    saving: { color: 'text-blue-600', icon: Loader2, text: 'Saving...', animate: true },
    unsaved: { color: 'text-amber-600', icon: AlertCircle, text: 'Not saved' },
    offline: { color: 'text-orange-600', icon: WifiOff, text: 'Saved offline' },
  };

  const config = states[state];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 ${config.color} text-xs font-medium ${className}`}>
      <Icon className={`w-3.5 h-3.5 ${config.animate ? 'animate-spin' : ''}`} />
      {message || config.text}
    </div>
  );
};