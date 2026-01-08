import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Shield,
  Info
} from 'lucide-react';
import { 
  checkMeasurementCompleteness, 
  getCompletenessStatusBadge,
  getCheckStatusBadge
} from './services/MeasurementCompleteness';

export default function MeasurementCompletenessPanel({ dimensions: dimensionsProp, benchmarks: benchmarksProp, photos: photosProp, jobId }) {
  const { data: dimensions = [] } = useQuery({
    queryKey: ['field-dimensions', jobId],
    queryFn: () => base44.entities.FieldDimension.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: benchmarks = [] } = useQuery({
    queryKey: ['field-benchmarks', jobId],
    queryFn: () => base44.entities.Benchmark.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['field-photos', jobId],
    queryFn: () => base44.entities.Photo.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const dimsToCheck = dimensionsProp || dimensions;
  const benchmarksToCheck = benchmarksProp || benchmarks;
  const photosToCheck = photosProp || photos;

  if (!dimsToCheck || dimsToCheck.length === 0) {
    return (
      <div className="p-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No measurements available to check completeness.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const result = checkMeasurementCompleteness(dimsToCheck, benchmarksToCheck, photosToCheck);
  const overallBadge = getCompletenessStatusBadge(result.overall_status);

  return (
    <div className="space-y-6 p-6">
      {/* Dispute Protection Notice */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
            Documentation Completeness - Dispute Protection
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            This system verifies all measurements are properly documented with evidence.
            Complete documentation protects MCI from disputes and liability claims.
          </div>
        </AlertDescription>
      </Alert>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overall Completeness</CardTitle>
            <Badge className={overallBadge.color}>
              {overallBadge.icon} {overallBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{Object.keys(result.areas).length}</div>
              <div className="text-sm text-slate-600">Areas</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{dimsToCheck.length}</div>
              <div className="text-sm text-slate-600">Measurements</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{benchmarksToCheck.length}</div>
              <div className="text-sm text-slate-600">Benchmarks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Area Completeness */}
      {Object.entries(result.areas).map(([area, areaData]) => (
        <AreaCompletenessCard key={area} area={area} data={areaData} />
      ))}
    </div>
  );
}

function AreaCompletenessCard({ area, data }) {
  const badge = getCompletenessStatusBadge(data.status);
  
  return (
    <Card className={
      data.status === 'incomplete' ? 'border-red-200' : 
      data.status === 'complete' ? 'border-green-200' : ''
    }>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{area}</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              {data.dimension_count} measurements
            </span>
            <Badge className={badge.color}>
              {badge.icon} {badge.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.checks.map((check) => {
            const statusBadge = getCheckStatusBadge(check.status);
            return (
              <div 
                key={check.id}
                className={`p-4 rounded-lg border-2 ${
                  check.status === 'complete' ? 'border-green-200 bg-green-50 dark:bg-green-950/20' :
                  check.status === 'incomplete' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                  'border-amber-200 bg-amber-50 dark:bg-amber-950/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`text-2xl ${statusBadge.color} flex-shrink-0 mt-0.5`}>
                    {statusBadge.icon}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {check.label}
                      </span>
                      {!check.required && (
                        <Badge variant="outline" className="text-xs">
                          Optional
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {check.details}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Checklist Progress:</span>
            <div className="flex items-center gap-4">
              <span className="text-green-600 font-semibold">
                ✔ {data.summary.completed}
              </span>
              <span className="text-red-600 font-semibold">
                ❌ {data.summary.incomplete}
              </span>
              <span className="text-amber-600 font-semibold">
                ⚠ {data.summary.missing}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}