import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle2, AlertCircle, Clock, Archive } from 'lucide-react';

export default function RuleAuditTrail({ versions }) {
  // Sort by created_date descending
  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.created_date || 0) - new Date(a.created_date || 0)
  );

  return (
    <Card className="mt-6">
      <CardHeader className="border-b bg-slate-50 dark:bg-slate-900/50">
        <CardTitle className="text-lg">Audit Trail</CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Complete history of rule changes with creator information</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {sortedVersions.map((version, idx) => {
            const isActive = version.is_active !== false;
            const createdDate = version.created_date ? new Date(version.created_date) : null;

            return (
              <div 
                key={version.id} 
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900/50 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {isActive ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Archive className="w-5 h-5 text-slate-400" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Version {version.version || 1}
                      </p>
                      {createdDate && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Created {format(createdDate, 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                    {isActive ? 'Active' : 'Archived'}
                  </Badge>
                </div>

                {/* Creator & Metadata */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded p-3 mb-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Created by:</span>
                    <span className="font-medium text-slate-900 dark:text-white">{version.created_by || 'System'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Effective Period:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {format(new Date(version.effective_date), 'MMM d, yyyy')} 
                      {version.end_date ? ` → ${format(new Date(version.end_date), 'MMM d, yyyy')}` : ' → Present'}
                    </span>
                  </div>
                </div>

                {/* Change Summary */}
                <div className="space-y-1 text-sm">
                  {version.previous_rule_id && (
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="font-medium">Updated from:</span> Version {version.version - 1 || 1}
                    </p>
                  )}
                  <p className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Model:</span> {version.commission_model.replace('_', ' ')}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Roles:</span> {version.applicable_roles?.join(', ') || 'All roles'}
                  </p>
                </div>

                {/* Deactivation Info */}
                {!isActive && version.deactivated_by && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-start gap-2 text-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-900 dark:text-red-200">Deactivated by {version.deactivated_by}</p>
                        {version.deactivated_at && (
                          <p className="text-red-800 dark:text-red-300 text-[10px]">
                            {format(new Date(version.deactivated_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                        {version.deactivation_reason && (
                          <p className="text-red-800 dark:text-red-300 mt-1">{version.deactivation_reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {sortedVersions.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No audit history available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}