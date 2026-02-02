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
        <Alert className="border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <AlertDescription className="text-sm text-slate-700 dark:text-slate-300">
              No measurements available to check completeness.
            </AlertDescription>
          </div>
        </Alert>
      </div>
    );
  }

  const result = checkMeasurementCompleteness(dimsToCheck, benchmarksToCheck, photosToCheck);
  const overallBadge = getCompletenessStatusBadge(result.overall_status);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Dispute Protection Notice */}
      <Alert className="border-2 border-blue-300 dark:border-blue-700 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 shadow-enterprise-md">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-blue-500 shadow-lg flex-shrink-0">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <AlertDescription className="flex-1">
            <div className="font-bold text-base text-blue-900 dark:text-blue-100 mb-2">
              Documentation Completeness — Dispute Protection
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
              This system verifies all measurements are properly documented with evidence.
              Complete documentation protects MCI from disputes and liability claims.
            </div>
          </AlertDescription>
        </div>
      </Alert>

      {/* Overall Status */}
      <Card className="shadow-enterprise-lg border-2 border-slate-200 dark:border-slate-700">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] shadow-md">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              Overall Completeness
            </CardTitle>
            <Badge className={`${overallBadge.color} text-sm px-3 py-1.5`}>
              {overallBadge.icon} {overallBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="text-3xl font-bold bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] bg-clip-text text-transparent mb-2">
                {Object.keys(result.areas).length}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Areas</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 border border-purple-200 dark:border-purple-700">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent mb-2">
                {dimsToCheck.length}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">Measurements</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 border border-orange-200 dark:border-orange-700">
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent mb-2">
                {benchmarksToCheck.length}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400">Benchmarks</div>
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
    <Card className={`shadow-enterprise-md transition-all hover:shadow-enterprise-lg ${
      data.status === 'incomplete' ? 'border-2 border-red-300 dark:border-red-700' : 
      data.status === 'complete' ? 'border-2 border-green-300 dark:border-green-700' : 
      'border-2 border-slate-200 dark:border-slate-700'
    }`}>
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shadow-md ${
              data.status === 'complete' ? 'bg-gradient-to-br from-green-500 to-green-600' :
              data.status === 'incomplete' ? 'bg-gradient-to-br from-red-500 to-red-600' :
              'bg-gradient-to-br from-amber-500 to-amber-600'
            }`}>
              {data.status === 'complete' ? <CheckCircle2 className="w-5 h-5 text-white" /> :
               data.status === 'incomplete' ? <XCircle className="w-5 h-5 text-white" /> :
               <AlertTriangle className="w-5 h-5 text-white" />}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{area}</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {data.dimension_count} measurement{data.dimension_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Badge className={`${badge.color} text-sm px-3 py-1.5 shadow-sm`}>
            {badge.icon} {badge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {data.checks.map((check) => {
            const statusBadge = getCheckStatusBadge(check.status);
            return (
              <div 
                key={check.id}
                className={`p-4 rounded-xl border-2 shadow-sm transition-all hover:shadow-md ${
                  check.status === 'complete' ? 'border-green-300 bg-gradient-to-br from-green-50 to-green-100/30 dark:from-green-950/20 dark:to-green-950/10 dark:border-green-700' :
                  check.status === 'incomplete' ? 'border-red-300 bg-gradient-to-br from-red-50 to-red-100/30 dark:from-red-950/20 dark:to-red-950/10 dark:border-red-700' :
                  'border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/30 dark:from-amber-950/20 dark:to-amber-950/10 dark:border-amber-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${
                    check.status === 'complete' ? 'bg-green-500/20' :
                    check.status === 'incomplete' ? 'bg-red-500/20' :
                    'bg-amber-500/20'
                  }`}>
                    <span className={`text-xl ${statusBadge.color}`}>
                      {statusBadge.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {check.label}
                      </span>
                      {!check.required && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 border-slate-300 dark:border-slate-600">
                          Optional
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {check.details}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-5 border-t-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Checklist Progress
            </span>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  {data.summary.completed}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  {data.summary.incomplete}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {data.summary.missing}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}