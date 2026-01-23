import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Calendar, User, AlertCircle } from 'lucide-react';

export default function RuleVersionTimeline({ versions }) {
  // Sort by effective_date descending (newest first)
  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.effective_date) - new Date(a.effective_date)
  );

  const today = new Date();

  const getStatusBadge = (version) => {
    const effectiveDate = new Date(version.effective_date);
    const endDate = version.end_date ? new Date(version.end_date) : null;

    if (endDate && endDate < today) return { label: 'Expired', color: 'bg-red-100 text-red-800' };
    if (effectiveDate > today) return { label: 'Future', color: 'bg-blue-100 text-blue-800' };
    return { label: 'Active', color: 'bg-green-100 text-green-800' };
  };

  const getDurationInfo = (version) => {
    const startDate = new Date(version.effective_date);
    const endDate = version.end_date ? new Date(version.end_date) : null;
    
    if (!endDate) {
      const daysActive = differenceInDays(today, startDate);
      return `Active for ${daysActive} days`;
    }
    
    const durationDays = differenceInDays(endDate, startDate);
    return `${durationDays} day${durationDays !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-3">
      {sortedVersions.map((version, idx) => {
        const status = getStatusBadge(version);
        const isLatest = idx === 0;

        return (
          <div key={version.id} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 ${
                isLatest 
                  ? 'bg-blue-600 border-blue-600' 
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
              }`} />
              {idx < sortedVersions.length - 1 && (
                <div className="w-0.5 h-16 bg-slate-200 dark:bg-slate-700 my-1" />
              )}
            </div>

            {/* Content Card */}
            <Card className="flex-1 p-4 border-l-4 border-l-blue-500 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Version {version.version || 1}
                    {isLatest && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Latest</span>}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {getDurationInfo(version)}
                  </p>
                </div>
                <Badge className={status.color}>{status.label}</Badge>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Effective</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {format(new Date(version.effective_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ends</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {version.end_date ? format(new Date(version.end_date), 'MMM d, yyyy') : 'Indefinite'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Creator Info */}
              {version.created_by && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <User className="w-3.5 h-3.5" />
                  <span>Created by {version.created_by}</span>
                  {version.created_date && (
                    <span className="text-xs text-slate-500">
                      ({format(new Date(version.created_date), 'MMM d, yyyy')})
                    </span>
                  )}
                </div>
              )}

              {/* Deactivation Info */}
              {!version.is_active && version.deactivated_by && (
                <div className="flex items-start gap-2 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded p-2 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-200">Deactivated</p>
                    <p className="text-amber-800 dark:text-amber-300">{version.deactivation_reason || 'No reason provided'}</p>
                    <p className="text-amber-700 dark:text-amber-400 text-[10px] mt-1">
                      by {version.deactivated_by} on {format(new Date(version.deactivated_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {/* Model Summary */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded text-sm">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">Model Parameters</p>
                <div className="space-y-1">
                  <p className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Model:</span> {version.commission_model.replace('_', ' ')}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Trigger:</span> {version.trigger_event.replace('_', ' ')}
                  </p>
                  {version.rate && (
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="font-medium">Rate:</span> {(version.rate * 100).toFixed(2)}%
                    </p>
                  )}
                  {version.flat_amount && (
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="font-medium">Flat Amount:</span> ${version.flat_amount.toFixed(2)}
                    </p>
                  )}
                  <p className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Min Threshold:</span> ${version.min_profit_threshold || 100}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Min Commission:</span> ${version.min_commission || 10}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Max Cap:</span> {version.max_commission_percent_of_profit || 30}% of profit
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}