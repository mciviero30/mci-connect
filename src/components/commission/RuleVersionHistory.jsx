import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  X,
  Layers,
  Eye,
  Zap
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import RuleVersionTimeline from './RuleVersionTimeline';
import RuleVersionComparison from './RuleVersionComparison';
import RuleAuditTrail from './RuleAuditTrail';

export default function RuleVersionHistory({ versions = [], onClose }) {
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [activeTab, setActiveTab] = useState('timeline');
  
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
      setSelectedVersions([selectedVersions[1], version]);
    }
  };

  const getStatusBadge = (version) => {
    const today = new Date();
    const effectiveDate = new Date(version.effective_date);
    const endDate = version.end_date ? new Date(version.end_date) : null;

    if (effectiveDate > today) {
      return { label: 'Future', class: 'bg-blue-100 text-blue-800 border-blue-300' };
    }

    if (endDate && endDate < today) {
      return { label: 'Expired', class: 'bg-slate-100 text-slate-600 border-slate-300' };
    }

    if (effectiveDate <= today && (!endDate || endDate >= today)) {
      return { label: 'Active', class: 'bg-green-100 text-green-800 border-green-300' };
    }

    return { label: 'Inactive', class: 'bg-slate-100 text-slate-500 border-slate-300' };
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

    if (older.commission_model !== newer.commission_model) {
      changes.push({
        field: 'Commission Model',
        old: getModelLabel(older.commission_model),
        new: getModelLabel(newer.commission_model),
        type: 'critical'
      });
    }

    if (older.rate !== newer.rate) {
      changes.push({
        field: 'Rate',
        old: `${older.rate}%`,
        new: `${newer.rate}%`,
        type: 'rate'
      });
    }

    if (older.flat_amount !== newer.flat_amount) {
      changes.push({
        field: 'Flat Amount',
        old: `$${older.flat_amount}`,
        new: `$${newer.flat_amount}`,
        type: 'rate'
      });
    }

    if (older.base_amount !== newer.base_amount) {
      changes.push({
        field: 'Base Amount',
        old: `$${older.base_amount}`,
        new: `$${newer.base_amount}`,
        type: 'rate'
      });
    }

    if (older.bonus_rate !== newer.bonus_rate) {
      changes.push({
        field: 'Bonus Rate',
        old: `${older.bonus_rate}%`,
        new: `${newer.bonus_rate}%`,
        type: 'rate'
      });
    }

    if (older.min_commission !== newer.min_commission) {
      changes.push({
        field: 'Min Commission',
        old: `$${older.min_commission}`,
        new: `$${newer.min_commission}`,
        type: 'parameter'
      });
    }

    if (older.max_commission_percent_of_profit !== newer.max_commission_percent_of_profit) {
      changes.push({
        field: 'Max Commission % of Profit',
        old: `${older.max_commission_percent_of_profit}%`,
        new: `${newer.max_commission_percent_of_profit}%`,
        type: 'parameter'
      });
    }

    if (older.trigger_event !== newer.trigger_event) {
      changes.push({
        field: 'Trigger Event',
        old: older.trigger_event,
        new: newer.trigger_event,
        type: 'parameter'
      });
    }

    return (
      <Card className="border-2 border-blue-500 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <GitBranch className="w-5 h-5" />
            Detailed Comparison: v{older.version} → v{newer.version}
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
                  <div className="flex items-center justify-between mb-2">
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
                  <div className="flex items-center gap-3 text-sm">
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
                <Layers className="w-5 h-5" />
                Version History: {sortedVersions[0]?.rule_name}
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {sortedVersions.length} version{sortedVersions.length !== 1 ? 's' : ''} • Complete audit trail with visuals and comparisons
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
              📊 Three views: Timeline (visual), Compare (parameter diff), Audit Trail (CFO-friendly)
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Tabbed Views */}
      <Card className="shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="compare" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Compare</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
          </TabsList>

          <CardContent className="p-6">
            <TabsContent value="timeline" className="space-y-4">
              <RuleVersionTimeline versions={sortedVersions} />
              {renderComparison()}
            </TabsContent>

            <TabsContent value="compare">
              {sortedVersions.length < 2 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p>At least 2 versions required for comparison</p>
                </div>
              ) : (
                <RuleVersionComparison versions={sortedVersions} />
              )}
            </TabsContent>

            <TabsContent value="audit">
              <RuleAuditTrail versions={sortedVersions} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Interactive Selection Helper (for manual comparison) */}
      {activeTab === 'timeline' && (
        <Card className="shadow-lg border-l-4 border-l-slate-400">
          <CardHeader>
            <CardTitle className="text-sm">Interactive Version Selector</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Click on versions below to manually compare (uses old interface)</p>
          </CardHeader>
          <CardContent className="p-4 text-xs text-slate-600 dark:text-slate-400">
            <p>Selected: {selectedVersions.length} / 2 versions</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}