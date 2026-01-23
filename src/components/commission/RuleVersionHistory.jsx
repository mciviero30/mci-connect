import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  History,
  GitBranch,
  Calendar,
  User,
  DollarSign,
  Percent,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

/**
 * Commission Rule Version History Component
 * 
 * Read-only audit trail and comparison view for commission rule versions.
 * CFO-friendly visibility into rate changes and effective periods.
 * 
 * @param {Array} versions - Array of rule versions (same rule_name)
 * @param {Function} onClose - Close handler
 */
export default function RuleVersionHistory({ versions = [], onClose }) {
  const [selectedVersions, setSelectedVersions] = useState([]);
  
  // Sort versions by version number descending (newest first)
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => (b.version || 0) - (a.version || 0));
  }, [versions]);

  // Get current active version
  const activeVersion = useMemo(() => {
    const today = new Date();
    return sortedVersions.find(v => {
      const effectiveDate = new Date(v.effective_date);
      const endDate = v.end_date ? new Date(v.end_date) : null;
      return effectiveDate <= today && (!endDate || endDate >= today);
    });
  }, [sortedVersions]);

  const toggleVersionSelection = (version) => {
    if (selectedVersions.find(v => v.id === version.id)) {
      setSelectedVersions(selectedVersions.filter(v => v.id !== version.id));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, version]);
    } else {
      // Replace oldest selection
      setSelectedVersions([selectedVersions[1], version]);
    }
  };

  const getStatusBadge = (version) => {
    const today = new Date();
    const effectiveDate = new Date(version.effective_date);
    const endDate = version.end_date ? new Date(version.end_date) : null;

    if (effectiveDate > today) {
      return {
        label: 'Future',
        class: 'bg-blue-100 text-blue-800 border-blue-300'
      };
    }

    if (endDate && endDate < today) {
      return {
        label: 'Expired',
        class: 'bg-slate-100 text-slate-600 border-slate-300'
      };
    }

    if (effectiveDate <= today && (!endDate || endDate >= today)) {
      return {
        label: 'Active',
        class: 'bg-green-100 text-green-800 border-green-300'
      };
    }

    return {
      label: 'Inactive',
      class: 'bg-slate-100 text-slate-500 border-slate-300'
    };
  };

  const getModelLabel = (model) => {
    const labels = {
      percentage_profit: 'Percentage of Profit',
      flat_amount: 'Flat Amount',
      tiered: 'Tiered',
      hybrid: 'Hybrid'
    };
    return labels[model] || model;
  };

  const formatModelParams = (version) => {
    switch (version.commission_model) {
      case 'percentage_profit':
        return `${version.rate}%`;
      case 'flat_amount':
        return `$${version.flat_amount}`;
      case 'hybrid':
        return `$${version.base_amount} + ${version.bonus_rate}%`;
      case 'tiered':
        return `${version.tiers?.length || 0} tiers`;
      default:
        return '-';
    }
  };

  const renderComparison = () => {
    if (selectedVersions.length !== 2) return null;

    const [older, newer] = selectedVersions[0].version < selectedVersions[1].version 
      ? [selectedVersions[0], selectedVersions[1]] 
      : [selectedVersions[1], selectedVersions[0]];

    const changes = [];

    // Model change
    if (older.commission_model !== newer.commission_model) {
      changes.push({
        field: 'Commission Model',
        old: getModelLabel(older.commission_model),
        new: getModelLabel(newer.commission_model),
        type: 'critical'
      });
    }

    // Rate change
    if (older.rate !== newer.rate) {
      changes.push({
        field: 'Rate',
        old: `${older.rate}%`,
        new: `${newer.rate}%`,
        type: 'rate'
      });
    }

    // Flat amount change
    if (older.flat_amount !== newer.flat_amount) {
      changes.push({
        field: 'Flat Amount',
        old: `$${older.flat_amount}`,
        new: `$${newer.flat_amount}`,
        type: 'rate'
      });
    }

    // Base amount change
    if (older.base_amount !== newer.base_amount) {
      changes.push({
        field: 'Base Amount',
        old: `$${older.base_amount}`,
        new: `$${newer.base_amount}`,
        type: 'rate'
      });
    }

    // Bonus rate change
    if (older.bonus_rate !== newer.bonus_rate) {
      changes.push({
        field: 'Bonus Rate',
        old: `${older.bonus_rate}%`,
        new: `${newer.bonus_rate}%`,
        type: 'rate'
      });
    }

    // Min commission change
    if (older.min_commission !== newer.min_commission) {
      changes.push({
        field: 'Min Commission',
        old: `$${older.min_commission}`,
        new: `$${newer.min_commission}`,
        type: 'parameter'
      });
    }

    // Max commission change
    if (older.max_commission_percent_of_profit !== newer.max_commission_percent_of_profit) {
      changes.push({
        field: 'Max Commission % of Profit',
        old: `${older.max_commission_percent_of_profit}%`,
        new: `${newer.max_commission_percent_of_profit}%`,
        type: 'parameter'
      });
    }

    // Trigger event change
    if (older.trigger_event !== newer.trigger_event) {
      changes.push({
        field: 'Trigger Event',
        old: older.trigger_event,
        new: newer.trigger_event,
        type: 'parameter'
      });
    }

    return (
      <Card className="border-2 border-blue-500 shadow-xl mt-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <GitBranch className="w-5 h-5" />
            Comparison: v{older.version} → v{newer.version}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {changes.length === 0 ? (
            <Alert className="border-slate-300 bg-slate-50">
              <AlertDescription>
                No parameter changes detected between these versions.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {changes.map((change, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    change.type === 'critical'
                      ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700'
                      : change.type === 'rate'
                      ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700'
                      : 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {change.type === 'critical' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                      {change.type === 'rate' && <TrendingUp className="w-4 h-4 text-amber-600" />}
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {change.field}
                      </span>
                    </div>
                    <Badge
                      className={
                        change.type === 'critical'
                          ? 'bg-red-600 text-white'
                          : change.type === 'rate'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 text-white'
                      }
                    >
                      {change.type === 'critical' ? 'Critical' : change.type === 'rate' ? 'Rate Change' : 'Parameter'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700">
                      <span className="text-slate-600 dark:text-slate-400">Old: </span>
                      <span className="font-semibold text-slate-900 dark:text-white">{change.old}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <div className="px-3 py-1 bg-white dark:bg-slate-800 rounded border border-green-400 dark:border-green-600">
                      <span className="text-slate-600 dark:text-slate-400">New: </span>
                      <span className="font-semibold text-green-700 dark:text-green-400">{change.new}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3">Additional Context</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Version {older.version}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {format(parseISO(older.effective_date), 'MMM d, yyyy')}
                  {older.end_date && ` - ${format(parseISO(older.end_date), 'MMM d, yyyy')}`}
                </p>
                {older.change_notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 italic">
                    "{older.change_notes}"
                  </p>
                )}
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded">
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Version {newer.version}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {format(parseISO(newer.effective_date), 'MMM d, yyyy')}
                  {newer.end_date && ` - ${format(parseISO(newer.end_date), 'MMM d, yyyy')}`}
                </p>
                {newer.change_notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 italic">
                    "{newer.change_notes}"
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!sortedVersions.length) {
    return (
      <Alert className="border-slate-300">
        <AlertDescription>No version history available.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <History className="w-5 h-5" />
                Version History: {sortedVersions[0]?.rule_name}
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {sortedVersions.length} version{sortedVersions.length !== 1 ? 's' : ''} • Read-only audit trail
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-900/20">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900 dark:text-blue-200">
              Select up to 2 versions to compare changes. Current active version is highlighted.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="text-slate-900 dark:text-white">Version Timeline</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {sortedVersions.map((version, idx) => {
              const status = getStatusBadge(version);
              const isActive = activeVersion?.id === version.id;
              const isSelected = selectedVersions.find(v => v.id === version.id);

              return (
                <div
                  key={version.id}
                  onClick={() => toggleVersionSelection(version)}
                  className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
                      : isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {/* Timeline connector */}
                  {idx < sortedVersions.length - 1 && (
                    <div className="absolute left-8 top-full h-4 w-0.5 bg-slate-300 dark:bg-slate-700" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Version Badge */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                          isActive
                            ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg'
                            : isSelected
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg'
                            : 'bg-gradient-to-br from-slate-400 to-slate-500'
                        }`}
                      >
                        v{version.version}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${status.class} border`}>
                            {status.label}
                          </Badge>
                          {isActive && (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Current
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge className="bg-blue-600 text-white">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Model & Rate */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {getModelLabel(version.commission_model)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-bold text-green-700 dark:text-green-400">
                            {formatModelParams(version)}
                          </span>
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(parseISO(version.effective_date), 'MMM d, yyyy')}
                          {version.end_date && ` → ${format(parseISO(version.end_date), 'MMM d, yyyy')}`}
                          {!version.end_date && ' → Indefinite'}
                        </span>
                      </div>

                      {/* Creator & Date */}
                      {version.created_by && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2">
                          <User className="w-3 h-3" />
                          <span>Created by {version.created_by}</span>
                          {version.created_date && (
                            <>
                              <Clock className="w-3 h-3 ml-2" />
                              <span>{format(parseISO(version.created_date), 'MMM d, yyyy HH:mm')}</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Change Notes */}
                      {version.change_notes && (
                        <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-700 dark:text-slate-300 italic">
                          "{version.change_notes}"
                        </div>
                      )}

                      {/* Additional Details */}
                      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <p className="text-slate-500 dark:text-slate-400">Min Commission</p>
                          <p className="font-semibold text-slate-900 dark:text-white">${version.min_commission}</p>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <p className="text-slate-500 dark:text-slate-400">Max % of Profit</p>
                          <p className="font-semibold text-slate-900 dark:text-white">{version.max_commission_percent_of_profit}%</p>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <p className="text-slate-500 dark:text-slate-400">Trigger</p>
                          <p className="font-semibold text-slate-900 dark:text-white text-[10px]">
                            {version.trigger_event?.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      {renderComparison()}
    </div>
  );
}