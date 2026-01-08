import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

export default function MeasurementConfirmationBadge({ dimension, showDetails = false }) {
  if (!dimension.human_confirmation_status || dimension.human_confirmation_status === 'pending') {
    return (
      <Badge className="bg-slate-100 text-slate-800 border-slate-200">
        <Clock className="w-3 h-3 mr-1" />
        Pending Confirmation
      </Badge>
    );
  }

  const configs = {
    verified_conditions_existing: {
      icon: CheckCircle2,
      label: 'Verified',
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    irregular_conditions_noted: {
      icon: AlertTriangle,
      label: 'Irregular Conditions',
      color: 'bg-amber-100 text-amber-800 border-amber-200'
    },
    remeasure_required: {
      icon: XCircle,
      label: 'Re-measure Required',
      color: 'bg-red-100 text-red-800 border-red-200'
    }
  };

  const config = configs[dimension.human_confirmation_status] || configs.verified_conditions_existing;
  const Icon = config.icon;

  if (!showDetails) {
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  }

  return (
    <div className="space-y-2">
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
      <div className="text-xs text-slate-600 dark:text-slate-400">
        <div>Confirmed by: {dimension.human_confirmation_name}</div>
        <div>Role: {dimension.human_confirmation_role}</div>
        <div>Date: {new Date(dimension.human_confirmation_date).toLocaleString()}</div>
        {dimension.human_confirmation_comment && (
          <div className="mt-1 italic">"{dimension.human_confirmation_comment}"</div>
        )}
      </div>
    </div>
  );
}