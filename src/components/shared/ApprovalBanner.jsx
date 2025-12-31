import React from 'react';
import { AlertTriangle, Clock, XCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function ApprovalBanner({ approval_status, approved_by, rejected_by, approval_notes }) {
  const { language } = useLanguage();
  
  // Legacy: no approval_status = approved (don't show banner)
  if (!approval_status || approval_status === 'approved') return null;

  const configs = {
    pending_approval: {
      icon: Clock,
      bgClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      iconClass: 'text-amber-600 dark:text-amber-400',
      textClass: 'text-amber-900 dark:text-amber-100',
      title: language === 'es' ? 'Pendiente de Aprobación' : 'Pending Approval',
      message: language === 'es' 
        ? 'Este documento necesita aprobación de un administrador antes de poder enviarse.' 
        : 'This document needs admin approval before it can be sent.'
    },
    rejected: {
      icon: XCircle,
      bgClass: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      iconClass: 'text-red-600 dark:text-red-400',
      textClass: 'text-red-900 dark:text-red-100',
      title: language === 'es' ? 'Rechazado' : 'Rejected',
      message: language === 'es' 
        ? `Rechazado por ${rejected_by || 'admin'}` 
        : `Rejected by ${rejected_by || 'admin'}`
    }
  };

  const config = configs[approval_status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`rounded-lg border-2 p-4 mb-6 ${config.bgClass}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconClass}`} />
        <div className="flex-1">
          <h4 className={`font-bold text-sm ${config.textClass}`}>{config.title}</h4>
          <p className={`text-sm mt-1 ${config.textClass} opacity-90`}>{config.message}</p>
          {approval_notes && (
            <p className={`text-xs mt-2 ${config.textClass} opacity-75 italic`}>
              "{approval_notes}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}