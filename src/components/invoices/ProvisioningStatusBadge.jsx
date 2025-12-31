import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';

export default function ProvisioningStatusBadge({ 
  provisioningStatus, 
  driveFolderUrl, 
  fieldProjectId,
  language 
}) {
  // Defensive guards
  const status = provisioningStatus || 'not_started';
  const hasDrive = Boolean(driveFolderUrl);
  const hasField = Boolean(fieldProjectId);

  // Determine effective status
  const getEffectiveStatus = () => {
    if (status === 'completed' && hasDrive && hasField) return 'completed';
    if (status === 'error') return 'error';
    if (status === 'in_progress' || status === 'pending') return 'in_progress';
    if (!hasDrive || !hasField) return 'partial';
    return 'not_started';
  };

  const effectiveStatus = getEffectiveStatus();

  // Status configuration
  const statusConfig = {
    not_started: {
      icon: null,
      label: language === 'es' ? 'Sin provisionar' : 'Not provisioned',
      className: 'bg-slate-100 text-slate-600 border-slate-200'
    },
    pending: {
      icon: Loader2,
      label: language === 'es' ? 'Pendiente' : 'Pending',
      className: 'bg-blue-50 text-blue-600 border-blue-200',
      spin: true
    },
    in_progress: {
      icon: Loader2,
      label: language === 'es' ? 'En progreso' : 'In progress',
      className: 'bg-blue-50 text-blue-600 border-blue-200',
      spin: true
    },
    partial: {
      icon: AlertTriangle,
      label: language === 'es' ? 'Parcial' : 'Partial',
      className: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    completed: {
      icon: CheckCircle,
      label: language === 'es' ? 'Completo' : 'Completed',
      className: 'bg-green-50 text-green-700 border-green-200'
    },
    error: {
      icon: XCircle,
      label: language === 'es' ? 'Error' : 'Error',
      className: 'bg-red-50 text-red-600 border-red-200'
    }
  };

  const config = statusConfig[effectiveStatus];
  const Icon = config.icon;

  // Don't show badge if not started
  if (effectiveStatus === 'not_started') {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} px-2.5 py-0.5 rounded-full text-[10px] font-bold h-[22px] flex items-center gap-1 border mb-2`}
    >
      {Icon && <Icon className={`w-3 h-3 ${config.spin ? 'animate-spin' : ''}`} />}
      {config.label}
    </Badge>
  );
}