import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sparkles, 
  Info, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { 
  generateAIQualityReport,
  getConfidenceBadge,
  getConsistencyBadge,
  getSeverityBadge
} from './services/MeasurementAIQualityControl';
import MeasurementConfirmationDialog from './MeasurementConfirmationDialog';
import MeasurementConfirmationBadge from './MeasurementConfirmationBadge';

export default function MeasurementAIQualityPanel({ jobId }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [confirmingDimension, setConfirmingDimension] = useState(null);
  const queryClient = useQueryClient();

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

  const areas = [...new Set(dimensions.map(d => d.area).filter(Boolean))];

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await generateAIQualityReport(dimensions, benchmarks, selectedArea);
      setReport(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* AI Notice */}
      <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <AlertDescription>
          <div className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
            AI Measurement Quality Control - Advisory Only
          </div>
          <div className="text-sm text-purple-700 dark:text-purple-300">
            AI evaluates captured data quality without creating or modifying measurements.
            This is advisory only and cannot approve or reject measurements.
          </div>
        </AlertDescription>
      </Alert>

      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Quality Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Analyze Area (Optional)
              </label>
              <select
                value={selectedArea || ''}
                onChange={(e) => setSelectedArea(e.target.value || null)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="">All Areas</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={analyzing || dimensions.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Measurement Quality
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              {dimensions.length} measurements • {benchmarks.length} benchmarks
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quality Report */}
      {report && report.status === 'success' && (
        <QualityReportDisplay 
          report={report} 
          dimensions={dimensions}
          onRequestConfirmation={(dim) => setConfirmingDimension(dim)}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmingDimension && (
        <MeasurementConfirmationDialog
          open={!!confirmingDimension}
          onOpenChange={(open) => !open && setConfirmingDimension(null)}
          dimension={confirmingDimension}
          aiReport={report?.report}
          onConfirmed={() => {
            setConfirmingDimension(null);
            queryClient.invalidateQueries({ queryKey: ['field-dimensions', jobId] });
          }}
        />
      )}

      {report && report.status === 'error' && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Analysis failed: {report.message}
          </AlertDescription>
        </Alert>
      )}

      {report && report.status === 'no_data' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {report.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function QualityReportDisplay({ report, dimensions, onRequestConfirmation }) {
  const { report: aiReport } = report;
  const confidenceBadge = getConfidenceBadge(aiReport.overall_confidence);
  const consistencyBadge = getConsistencyBadge(aiReport.consistency_status);

  // Get dimensions for the analyzed area
  const areaDimensions = dimensions.filter(d => 
    report.area === 'All Areas' || d.area === report.area
  );

  const pendingConfirmations = areaDimensions.filter(d => 
    !d.human_confirmation_status || d.human_confirmation_status === 'pending'
  );

  return (
    <div className="space-y-4">
      {/* Overall Assessment */}
      <Card className="border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quality Assessment</CardTitle>
            <Badge className={confidenceBadge.color}>
              {confidenceBadge.icon} {confidenceBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-600 mb-1">Area:</div>
              <div className="font-semibold">{report.area}</div>
            </div>
            
            <div>
              <div className="text-sm text-slate-600 mb-1">Consistency Status:</div>
              <Badge className={consistencyBadge.color}>
                {consistencyBadge.label}
              </Badge>
            </div>

            <div>
              <div className="text-sm text-slate-600 mb-1">Summary:</div>
              <p className="text-sm">{aiReport.summary}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{report.dimension_count}</div>
                <div className="text-xs text-slate-600">Measurements Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {aiReport.anomalies?.length || 0}
                </div>
                <div className="text-xs text-slate-600">Anomalies Detected</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Validation */}
      {aiReport.benchmark_validation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Benchmark Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {aiReport.benchmark_validation.status === 'valid' && (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                {aiReport.benchmark_validation.status === 'invalid' && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                {aiReport.benchmark_validation.status === 'needs_review' && (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <span className="font-semibold capitalize">
                  {aiReport.benchmark_validation.status}
                </span>
              </div>
              <p className="text-sm text-slate-700">
                {aiReport.benchmark_validation.notes}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomalies */}
      {aiReport.anomalies && aiReport.anomalies.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Detected Anomalies ({aiReport.anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiReport.anomalies.map((anomaly, idx) => {
                const severityBadge = getSeverityBadge(anomaly.severity);
                return (
                  <div key={idx} className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-sm">
                        {anomaly.measurement_type}
                      </span>
                      <Badge className={severityBadge.color}>
                        {severityBadge.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700">{anomaly.issue}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Evidence */}
      {aiReport.missing_evidence && aiReport.missing_evidence.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Missing Evidence ({aiReport.missing_evidence.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiReport.missing_evidence.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Human Confirmation Required */}
      {pendingConfirmations.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Human Confirmation Required ({pendingConfirmations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-blue-200 bg-blue-50 mb-4">
              <AlertDescription className="text-sm">
                After AI review, technician or supervisor confirmation is mandatory.
                Your confirmation overrides AI advisory and becomes part of the permanent record.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              {pendingConfirmations.slice(0, 5).map(dim => (
                <div key={dim.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border">
                  <div>
                    <div className="font-semibold text-sm">
                      {dim.measurement_type} - {formatDimension(dim)}
                    </div>
                    <div className="text-xs text-slate-600">
                      {dim.area}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onRequestConfirmation(dim)}
                    className="bg-blue-600 text-white"
                  >
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    Confirm
                  </Button>
                </div>
              ))}
              {pendingConfirmations.length > 5 && (
                <div className="text-xs text-slate-500 text-center pt-2">
                  + {pendingConfirmations.length - 5} more measurements pending confirmation
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmed Measurements */}
      {areaDimensions.some(d => d.human_confirmation_status && d.human_confirmation_status !== 'pending') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirmed Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {areaDimensions
                .filter(d => d.human_confirmation_status && d.human_confirmation_status !== 'pending')
                .map(dim => (
                  <div key={dim.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-sm">
                        {dim.measurement_type} - {formatDimension(dim)}
                      </div>
                      <MeasurementConfirmationBadge dimension={dim} />
                    </div>
                    <MeasurementConfirmationBadge dimension={dim} showDetails />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Alert className="border-slate-200 bg-slate-50">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs text-slate-600">
          AI analysis is advisory only. Human confirmation is mandatory and overrides AI output.
          MCI does not design or fabricate - this tool only evaluates captured data quality.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function formatDimension(dim) {
  if (dim.unit_system === 'imperial') {
    const ft = dim.value_feet || 0;
    const inches = dim.value_inches || 0;
    const frac = dim.value_fraction || '0';
    let result = `${ft}' ${inches}"`;
    if (frac !== '0') result = `${ft}' ${inches} ${frac}"`;
    return result;
  }
  return `${dim.value_mm || 0}mm`;
}