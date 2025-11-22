import React from 'react';
import { AlertCircle, Clock, DollarSign, Award, TrendingUp } from 'lucide-react';

export const NotificationIcon = ({ type }) => {
  const icons = {
    system_alert: <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    overtime_alert: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    invoice_overdue: <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />,
    invoice_due_soon: <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    certification_expiring: <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
    performance_review_due: <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />,
  };

  return icons[type] || <AlertCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
};

export const PriorityBadge = ({ priority }) => {
  const colors = {
    urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
    high: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    low: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${colors[priority] || colors.low}`}>
      {priority?.toUpperCase() || 'INFO'}
    </span>
  );
};