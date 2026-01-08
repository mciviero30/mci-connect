import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Brain,
  Info
} from 'lucide-react';
import { analyzeMeasurements, getIntelligenceStatusBadge } from './services/MeasurementIntelligence';

export default function MeasurementIntelligencePanel({ dimensions, benchmarks }) {
  if (!dimensions || dimensions.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No measurements available for analysis.
        </AlertDescription>
      </Alert>
    );
  }

  const analysis = analyzeMeasurements(dimensions, benchmarks);
  const overallBadge = getIntelligenceStatusBadge(analysis.overall_status);

  return (
    <div className="space-y-6">
      {/* Advisory Notice */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Brain className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
            Measurement Intelligence - Advisory Only
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            This system analyzes measurements for internal consistency.
            It does not modify data or suggest corrections.
            All flagged issues require human verification.
          </div>
        </AlertDescription>
      </Alert>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overall Analysis</CardTitle>
            <Badge className={overallBadge.color}>
              {overallBadge.icon} {overallBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{Object.keys(analysis.areas).length}</div>
              <div className="text-sm text-slate-600">Areas</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{dimensions.length}</div>
              <div className="text-sm text-slate-600">Dimensions</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {Object.values(analysis.areas).reduce((sum, a) => sum + a.issues.total, 0)}
              </div>
              <div className="text-sm text-slate-600">Total Issues</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Area Analysis */}
      {Object.entries(analysis.areas).map(([area, areaData]) => (
        <AreaAnalysisCard key={area} area={area} analysis={areaData} />
      ))}
    </div>
  );
}

function AreaAnalysisCard({ area, analysis }) {
  const badge = getIntelligenceStatusBadge(analysis.status);
  
  return (
    <Card className={analysis.status === 'inconsistent' ? 'border-red-200' : analysis.status === 'needs_review' ? 'border-amber-200' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{area}</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {analysis.dimension_count} dimensions
            </span>
            <Badge className={badge.color}>
              {badge.icon} {badge.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {analysis.issues.total === 0 ? (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              All measurements appear internally consistent.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Critical Issues */}
            {analysis.issues.critical.length > 0 && (
              <div>
                <div className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Critical Issues ({analysis.issues.critical.length})
                </div>
                <div className="space-y-2">
                  {analysis.issues.critical.map((issue, idx) => (
                    <div key={idx} className="p-3 bg-red-50 dark:bg-red-950/20 rounded border border-red-200">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {issue.dimension_type}
                        </Badge>
                        <div className="text-sm text-red-700 dark:text-red-300">
                          {issue.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {analysis.issues.warnings.length > 0 && (
              <div>
                <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings ({analysis.issues.warnings.length})
                </div>
                <div className="space-y-2">
                  {analysis.issues.warnings.map((issue, idx) => (
                    <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {issue.dimension_type}
                        </Badge>
                        <div className="text-sm text-amber-700 dark:text-amber-300">
                          {issue.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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

function parseFraction(fraction) {
  if (!fraction || fraction === '0') return 0;
  const parts = fraction.split('/');
  if (parts.length !== 2) return 0;
  return parseFloat(parts[0]) / parseFloat(parts[1]);
}