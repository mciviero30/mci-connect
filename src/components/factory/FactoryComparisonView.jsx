import React, { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  FileText,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { compareDimensionSets, getRevisionHistory } from './FactoryComparisonService';

export default function FactoryComparisonView({ dimensionSet }) {
  const [comparison, setComparison] = useState(null);
  const [revisionHistory, setRevisionHistory] = useState([]);
  const [selectedOriginal, setSelectedOriginal] = useState(null);
  const [selectedRevised, setSelectedRevised] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRevisionHistory();
  }, [dimensionSet.id]);

  useEffect(() => {
    if (selectedOriginal && selectedRevised) {
      performComparison();
    }
  }, [selectedOriginal, selectedRevised]);

  const loadRevisionHistory = async () => {
    try {
      const history = await getRevisionHistory(dimensionSet.id);
      setRevisionHistory(history);
      
      // Auto-select: first (field) vs current (production)
      if (history.length >= 2) {
        setSelectedOriginal(history[0].id); // First revision
        setSelectedRevised(history[history.length - 1].id); // Latest revision
      } else if (history.length === 1) {
        setSelectedOriginal(history[0].id);
        setSelectedRevised(history[0].id);
      }
    } catch (error) {
      console.error('Failed to load revision history:', error);
    } finally {
      setLoading(false);
    }
  };

  const performComparison = async () => {
    if (!selectedOriginal || !selectedRevised) return;
    
    setLoading(true);
    try {
      const result = await compareDimensionSets(selectedOriginal, selectedRevised);
      setComparison(result);
    } catch (error) {
      console.error('Comparison failed:', error);
      alert('Comparison failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Loading comparison...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Accountability Notice */}
      <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
        <Lock className="h-4 w-4 text-red-600" />
        <AlertDescription>
          <div className="font-bold text-red-900 dark:text-red-100 mb-2">
            🔒 READ-ONLY COMPARISON MODE - ACCOUNTABILITY AUDIT
          </div>
          <div className="text-sm text-red-700 dark:text-red-300">
            This comparison view is for dispute resolution and QC audit only.
            Original Field data is immutable and cannot be overwritten.
            All changes are tracked with full revision history.
          </div>
        </AlertDescription>
      </Alert>

      {/* Revision Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Revisions to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Original (Field Captured)
              </label>
              <Select value={selectedOriginal} onValueChange={setSelectedOriginal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select original revision" />
                </SelectTrigger>
                <SelectContent>
                  {revisionHistory.map(rev => (
                    <SelectItem key={rev.id} value={rev.id}>
                      Rev {rev.version_number} - {formatDate(rev.created_date)}
                      {rev.captured_by_name && ` by ${rev.captured_by_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Revised (Production Approved)
              </label>
              <Select value={selectedRevised} onValueChange={setSelectedRevised}>
                <SelectTrigger>
                  <SelectValue placeholder="Select revised revision" />
                </SelectTrigger>
                <SelectContent>
                  {revisionHistory.map(rev => (
                    <SelectItem key={rev.id} value={rev.id}>
                      Rev {rev.version_number} - {formatDate(rev.created_date)}
                      {rev.approved_by_name && ` by ${rev.approved_by_name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Summary */}
      {comparison && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Comparison Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-red-600">
                    {comparison.deltas.removed.length}
                  </div>
                  <div className="text-sm text-slate-600">Removed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600">
                    {comparison.deltas.added.length}
                  </div>
                  <div className="text-sm text-slate-600">Added</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">
                    {comparison.deltas.modified.length}
                  </div>
                  <div className="text-sm text-slate-600">Modified</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-600">
                    {comparison.deltas.unchanged.length}
                  </div>
                  <div className="text-sm text-slate-600">Unchanged</div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Original Captured:</span>
                  <span className="ml-2 font-semibold">
                    {formatDate(comparison.summary.original_date)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Production Approved:</span>
                  <span className="ml-2 font-semibold">
                    {formatDate(comparison.summary.revised_date)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Captured By:</span>
                  <span className="ml-2 font-semibold">
                    {comparison.summary.original_captured_by}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Approved By:</span>
                  <span className="ml-2 font-semibold">
                    {comparison.summary.revised_by || 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Modified Dimensions */}
          {comparison.deltas.modified.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Modified Dimensions ({comparison.deltas.modified.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {comparison.deltas.modified.map((delta, idx) => (
                    <ModifiedDimensionRow key={idx} delta={delta} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Added Dimensions */}
          {comparison.deltas.added.length > 0 && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Added Dimensions ({comparison.deltas.added.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.deltas.added.map((delta, idx) => (
                    <div key={idx} className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200">
                      <div className="font-mono text-sm">
                        <span className="font-bold">{delta.dimension.measurement_type}</span>
                        {' → '}
                        <span className="font-bold">{formatImperial(delta.dimension)}</span>
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300 mt-1">
                        {delta.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Removed Dimensions */}
          {comparison.deltas.removed.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  Removed Dimensions ({comparison.deltas.removed.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparison.deltas.removed.map((delta, idx) => (
                    <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200">
                      <div className="font-mono text-sm">
                        <span className="font-bold">{delta.dimension.measurement_type}</span>
                        {' → '}
                        <span className="font-bold line-through">{formatImperial(delta.dimension)}</span>
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                        {delta.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function ModifiedDimensionRow({ delta }) {
  const { original, revised, changes } = delta;
  
  return (
    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            {original.measurement_type}
          </Badge>
          <span className="text-sm text-slate-600">{original.area}</span>
        </div>
        <Badge className="bg-amber-100 text-amber-800">
          {changes.details.length} change(s)
        </Badge>
      </div>

      {changes.details.map((detail, idx) => (
        <div key={idx} className="mb-2 pb-2 border-b border-amber-200 last:border-0">
          <div className="flex items-center gap-3 text-sm">
            <Badge 
              className={
                detail.severity === 'critical' ? 'bg-red-100 text-red-800' :
                detail.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                detail.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }
            >
              {detail.field}
            </Badge>
            <div className="flex items-center gap-2 flex-1">
              <div className="font-mono px-2 py-1 bg-white rounded border">
                {detail.original}
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600" />
              <div className="font-mono px-2 py-1 bg-white rounded border font-bold">
                {detail.revised}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Factory Annotations */}
      {revised.factory_production_notes && (
        <div className="mt-3 pt-3 border-t border-amber-200">
          <div className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">
            Factory Production Notes:
          </div>
          <div className="text-sm text-amber-800 dark:text-amber-200">
            {revised.factory_production_notes}
          </div>
        </div>
      )}
    </div>
  );
}

function formatImperial(dim) {
  let result = '';
  if (dim.value_feet) result += `${dim.value_feet}'`;
  if (dim.value_inches) result += ` ${dim.value_inches}`;
  if (dim.value_fraction && dim.value_fraction !== '0') result += ` ${dim.value_fraction}`;
  result += '"';
  return result.trim();
}