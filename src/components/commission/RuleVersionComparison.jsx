import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';

export default function RuleVersionComparison({ versions }) {
  // Sort by version
  const sortedVersions = [...versions].sort((a, b) => (b.version || 0) - (a.version || 0));
  
  const [version1Id, setVersion1Id] = useState(sortedVersions[0]?.id);
  const [version2Id, setVersion2Id] = useState(sortedVersions[1]?.id || sortedVersions[0]?.id);

  const v1 = versions.find(v => v.id === version1Id);
  const v2 = versions.find(v => v.id === version2Id);

  if (!v1 || !v2) return null;

  const fields = [
    { key: 'commission_model', label: 'Commission Model', format: (v) => v.replace('_', ' ') },
    { key: 'trigger_event', label: 'Trigger Event', format: (v) => v.replace('_', ' ') },
    { key: 'rate', label: 'Rate', format: (v) => v ? `${(v * 100).toFixed(2)}%` : '-' },
    { key: 'flat_amount', label: 'Flat Amount', format: (v) => v ? `$${v.toFixed(2)}` : '-' },
    { key: 'base_amount', label: 'Base Amount', format: (v) => v ? `$${v.toFixed(2)}` : '-' },
    { key: 'bonus_rate', label: 'Bonus Rate', format: (v) => v ? `${(v * 100).toFixed(2)}%` : '-' },
    { key: 'min_profit_threshold', label: 'Min Profit Threshold', format: (v) => `$${v || 100}` },
    { key: 'min_commission', label: 'Min Commission', format: (v) => `$${v || 10}` },
    { key: 'max_commission_percent_of_profit', label: 'Max Commission Cap', format: (v) => `${v || 30}% of profit` },
    { key: 'applicable_roles', label: 'Applicable Roles', format: (v) => v?.join(', ') || 'All' },
  ];

  const hasChanges = (field) => {
    const val1 = v1[field.key];
    const val2 = v2[field.key];
    
    // Handle arrays
    if (Array.isArray(val1) && Array.isArray(val2)) {
      return val1.sort().join(',') !== val2.sort().join(',');
    }
    
    return val1 !== val2;
  };

  return (
    <Card className="mt-6 border-blue-200 dark:border-blue-900">
      <CardHeader className="border-b bg-slate-50 dark:bg-slate-900/50">
        <CardTitle className="text-lg">Version Comparison</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Version 1</label>
            <Select value={version1Id} onValueChange={setVersion1Id}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortedVersions.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version || 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Version 2</label>
            <Select value={version2Id} onValueChange={setVersion2Id}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortedVersions.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version || 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="p-3 text-left font-semibold">Parameter</th>
                <th className="p-3 text-left font-semibold">v{v1.version || 1}</th>
                <th className="p-3 text-left font-semibold">v{v2.version || 1}</th>
                <th className="p-3 text-center font-semibold">Changed</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => {
                const changed = hasChanges(field);
                const val1 = field.format(v1[field.key]);
                const val2 = field.format(v2[field.key]);
                
                return (
                  <tr key={field.key} className={`border-b border-slate-200 dark:border-slate-700 ${
                    changed ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                  }`}>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">{field.label}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{val1}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{val2}</td>
                    <td className="p-3 text-center">
                      {changed ? (
                        <Badge className="bg-yellow-100 text-yellow-800">Changed</Badge>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tiers Comparison */}
        {(v1.tiers?.length > 0 || v2.tiers?.length > 0) && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Tiered Commission Comparison
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">v{v1.version || 1} Tiers</p>
                {v1.tiers?.length > 0 ? (
                  <div className="space-y-2">
                    {v1.tiers.map((tier, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-xs">
                        <p className="text-slate-900 dark:text-white">
                          ${tier.min_profit} - {tier.max_profit ? `$${tier.max_profit}` : '∞'}: {(tier.rate * 100).toFixed(2)}%
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs">No tiers</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase">v{v2.version || 1} Tiers</p>
                {v2.tiers?.length > 0 ? (
                  <div className="space-y-2">
                    {v2.tiers.map((tier, idx) => (
                      <div key={idx} className="bg-slate-50 dark:bg-slate-800 p-2 rounded text-xs">
                        <p className="text-slate-900 dark:text-white">
                          ${tier.min_profit} - {tier.max_profit ? `$${tier.max_profit}` : '∞'}: {(tier.rate * 100).toFixed(2)}%
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs">No tiers</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}