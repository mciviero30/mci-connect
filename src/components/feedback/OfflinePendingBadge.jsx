import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * OFFLINE PENDING BADGE
 * Indicador persistente de items pendientes de sync
 * 
 * Aparece cuando hay acciones offline encoladas
 * NO desaparece hasta que se sincronicen
 */
export default function OfflinePendingBadge({ count = 0, isOnline = true }) {
  // No mostrar si todo está sincronizado
  if (count === 0) return null;

  return (
    <Badge 
      className={`${
        isOnline 
          ? 'bg-blue-600 text-white animate-pulse' 
          : 'bg-orange-600 text-white'
      } shadow-lg flex items-center gap-1.5 px-2.5 py-1 font-bold text-[10px]`}
    >
      {isOnline ? (
        <Wifi className="w-3 h-3 animate-pulse" />
      ) : (
        <WifiOff className="w-3 h-3" />
      )}
      {count} {isOnline ? 'syncing' : 'pending'}
    </Badge>
  );
}