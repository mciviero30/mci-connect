import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Factory, 
  Lock, 
  FileCheck, 
  Ruler,
  AlertTriangle,
  ShieldCheck,
  Download
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { getFactoryViewData } from '@/components/factory/FactoryViewService';
import { validateFactoryData } from '@/components/factory/FactoryDataIntegrity';
import { getDataStatusBadge } from '@/components/factory/FactoryStatusMarkers';
import { generateProductionPDF } from '@/components/field/pdf/FieldPDFPipeline';

export default function FactoryView() {
  const [searchParams] = useSearchParams();
  const dimensionSetId = searchParams.get('set');
  const [activeTab, setActiveTab] = useState('dimensions');

  // Fetch dimension set with read-only service
  const { data: dimensionSet, isLoading: setLoading } = useQuery({
    queryKey: ['factory-dimension-set', dimensionSetId],
    queryFn: async () => {
      const sets = await base44.entities.DimensionSet.filter({ id: dimensionSetId });
      return sets[0];
    },
    enabled: !!dimensionSetId
  });

  // Fetch factory view data
  const { data: factoryData, isLoading: dataLoading } = useQuery({
    queryKey: ['factory-view-data', dimensionSetId],
    queryFn: () => getFactoryViewData(dimensionSetId),
    enabled: !!dimensionSetId
  });

  // Validate data integrity
  const { data: validation } = useQuery({
    queryKey: ['factory-validation', dimensionSetId],
    queryFn: () => validateFactoryData(dimensionSetId),
    enabled: !!dimensionSetId
  });

  if (!dimensionSetId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
        <Alert className="max-w-2xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No dimension set specified. Please provide a set ID.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (setLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Factory className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-600 dark:text-slate-400">Loading factory view...</p>
        </div>
      </div>
    );
  }

  const statusBadge = getDataStatusBadge(dimensionSet);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Field')}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Field
                </Button>
              </Link>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-lg flex items-center justify-center">
                  <Factory className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Factory View
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Production-ready data • Desktop optimized
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className={statusBadge.className}>
                {statusBadge.icon}
                {statusBadge.label}
              </Badge>
              
              {dimensionSet?.is_locked && (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              )}
            </div>
          </div>

          {/* Job Info */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Job:</span>
              <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">
                {factoryData?.job?.name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Area:</span>
              <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">
                {dimensionSet?.area}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Captured:</span>
              <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">
                {dimensionSet?.capture_date ? new Date(dimensionSet.capture_date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Version:</span>
              <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">
                Rev {dimensionSet?.version_number || 1}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Alert */}
      {validation && validation.integrity_score < 100 && (
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                Data Integrity: {validation.integrity_score}%
              </div>
              {validation.errors.length > 0 && (
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  {validation.errors.slice(0, 3).map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dimensions" className="gap-2">
              <Ruler className="w-4 h-4" />
              Dimensions ({factoryData?.dimensions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Benchmarks ({factoryData?.benchmarks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="validation" className="gap-2">
              <FileCheck className="w-4 h-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dimensions">
            <DimensionsTable dimensions={factoryData?.dimensions || []} />
          </TabsContent>

          <TabsContent value="benchmarks">
            <BenchmarksTable benchmarks={factoryData?.benchmarks || []} />
          </TabsContent>

          <TabsContent value="validation">
            <ValidationPanel validation={validation} dimensionSet={dimensionSet} />
          </TabsContent>

          <TabsContent value="export">
            <ExportPanel 
              dimensionSet={dimensionSet} 
              factoryData={factoryData} 
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Read-only indicator */}
      <div className="fixed bottom-4 right-4">
        <Badge className="bg-slate-800 text-white shadow-lg">
          <Lock className="w-3 h-3 mr-1" />
          Read-Only Mode
        </Badge>
      </div>
    </div>
  );
}

function DimensionsTable({ dimensions }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Production Dimensions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">#</th>
                <th className="px-4 py-3 text-left font-semibold">Area</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Imperial</th>
                <th className="px-4 py-3 text-left font-semibold">Metric</th>
                <th className="px-4 py-3 text-left font-semibold">Tolerance</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {dimensions.map((dim, idx) => (
                <tr key={dim.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-mono text-slate-600">{idx + 1}</td>
                  <td className="px-4 py-3">{dim.area}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {dim.measurement_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-bold font-mono">
                    {dim.display_value_imperial || formatImperial(dim)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {dim.display_value_metric || `${dim.value_mm}mm`}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {dim.tolerance ? `±${dim.tolerance.plus}/${dim.tolerance.minus} ${dim.tolerance.unit}` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getStatusColor(dim.status)}>
                      {dim.status || 'draft'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function BenchmarksTable({ benchmarks }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reference Benchmarks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Label</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Elevation</th>
                <th className="px-4 py-3 text-left font-semibold">Area</th>
                <th className="px-4 py-3 text-left font-semibold">Established</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {benchmarks.map((bm) => (
                <tr key={bm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-bold">{bm.label}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{bm.benchmark_type}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold">
                    {bm.elevation} {bm.elevation_unit}
                  </td>
                  <td className="px-4 py-3">{bm.area}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {bm.established_date ? new Date(bm.established_date).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationPanel({ validation, dimensionSet }) {
  if (!validation) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Integrity Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Overall Score</span>
                <span className="text-2xl font-bold">{validation.integrity_score}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full ${validation.integrity_score >= 90 ? 'bg-green-500' : validation.integrity_score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${validation.integrity_score}%` }}
                />
              </div>
            </div>

            {validation.errors.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                  Errors ({validation.errors.length})
                </h4>
                <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                  {validation.errors.map((error, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  Warnings ({validation.warnings.length})
                </h4>
                <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                  {validation.warnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportPanel({ dimensionSet, factoryData }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const user = await base44.auth.me();
      
      const result = await generateProductionPDF(
        dimensionSet.job_id,
        dimensionSet.id,
        user,
        { include_photos: false }
      );

      // Download
      const url = window.URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dimensionSet.name}_Rev${result.revision_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Options</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={handleExport} 
            disabled={exporting}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            {exporting ? 'Generating PDF...' : 'Export Production PDF'}
          </Button>
          
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Exports a production-ready PDF with all dimensions, benchmarks, and validation data.
            PDF will be revision-controlled and immutable.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatImperial(dim) {
  const feet = dim.value_feet || 0;
  const inches = dim.value_inches || 0;
  const fraction = dim.value_fraction || '0';
  
  let display = '';
  if (feet > 0) display += `${feet}'`;
  if (inches > 0 || fraction !== '0') {
    if (feet > 0) display += ' ';
    display += `${inches}`;
    if (fraction !== '0') display += ` ${fraction}`;
    display += '"';
  } else if (feet === 0) {
    display = '0"';
  }
  
  return display.trim();
}

function getStatusColor(status) {
  const colors = {
    draft: 'bg-slate-100 text-slate-800',
    confirmed: 'bg-blue-100 text-blue-800',
    verified: 'bg-green-100 text-green-800',
    production_ready: 'bg-emerald-100 text-emerald-800'
  };
  return colors[status] || colors.draft;
}