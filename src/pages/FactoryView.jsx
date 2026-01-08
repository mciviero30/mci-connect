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
  FileText,
  Ruler,
  AlertTriangle,
  ShieldCheck,
  Download,
  Package,
  Clock,
  GitCompare
} from 'lucide-react';
import ProductionStatusControl from '@/components/factory/ProductionStatusControl';
import FactoryAnnotations from '@/components/factory/FactoryAnnotations';
import ValidationGateDisplay from '@/components/factory/ValidationGateDisplay';
import FactoryComparisonView from '@/components/factory/FactoryComparisonView';
import { createPageUrl } from '@/utils';
import { getFactoryViewData } from '@/components/factory/FactoryViewService';
import { validateDataIntegrity } from '@/components/factory/FactoryDataIntegrity';
import { getDimensionSetStatus, getStatusBadgeData } from '@/components/factory/FactoryStatusMarkers';
import { generateProductionPDF } from '@/components/field/pdf/FieldPDFPipeline';
import { getUserPermissions } from '@/components/factory/FactoryPermissionsService';
import { logFactoryAction } from '@/components/factory/FactoryAuditLogger';

export default function FactoryView() {
  const [searchParams] = useSearchParams();
  const dimensionSetId = searchParams.get('set');
  const [activeTab, setActiveTab] = useState('dimensions');
  const [userPermissions, setUserPermissions] = useState(null);
  
  // Check user permissions
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const user = await base44.auth.me();
        const permissions = await getUserPermissions(user);
        setUserPermissions(permissions);
      } catch (error) {
        console.error('Failed to check permissions:', error);
      }
    };
    checkPermissions();
  }, []);

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
  const { data: factoryData, isLoading: dataLoading, refetch: refetchFactoryData } = useQuery({
    queryKey: ['factory-view-data', dimensionSetId],
    queryFn: () => getFactoryViewData(dimensionSetId),
    enabled: !!dimensionSetId
  });

  // Validate data integrity
  const { data: validation } = useQuery({
    queryKey: ['factory-validation', dimensionSetId],
    queryFn: () => validateDataIntegrity(dimensionSetId, base44),
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

  const status = getDimensionSetStatus(dimensionSet);
  const statusBadge = getStatusBadgeData(status);
  
  // Convert to badge component props
  const badgeClassName = statusBadge.color === 'green' ? 'bg-green-100 text-green-800 border-green-200' :
                         statusBadge.color === 'blue' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                         statusBadge.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                         'bg-slate-100 text-slate-800 border-slate-200';

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
              <Badge className={badgeClassName}>
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

      {/* Production Filter Info */}
      {factoryData?.metadata && (
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Production Filter Active
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Showing {factoryData.metadata.filtered_counts.dimensions} of {factoryData.metadata.original_counts.dimensions} dimensions
                ({factoryData.metadata.original_counts.dimensions - factoryData.metadata.filtered_counts.dimensions} filtered out)
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

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

      {/* Production Readiness Alert */}
      {factoryData?.production_readiness && !factoryData.production_readiness.is_ready && (
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="font-semibold text-red-900 dark:text-red-100 mb-2">
                Not Production Ready
              </div>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {factoryData.production_readiness.issues.map((issue, idx) => (
                  <li key={idx}>• {issue}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Precision Violations Alert */}
      {factoryData?.precision_report && !factoryData.precision_report.can_export && (
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="font-semibold text-red-900 dark:text-red-100 mb-2">
                ⛔ EXPORT BLOCKED - Precision Violations Detected
              </div>
              <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
                <div className="font-bold">
                  {factoryData.precision_report.critical_count} critical precision violation(s) must be resolved
                </div>
                <ul className="space-y-1 ml-4">
                  {Object.entries(factoryData.precision_report.violations_by_rule).map(([rule, violations]) => (
                    violations[0].severity === 'critical' && (
                      <li key={rule}>• {violations.length}x {violations[0].message}</li>
                    )
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Production Summary */}
      {factoryData?.production_summary && (
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <div className="text-2xl font-bold">{factoryData.production_summary.total_groups}</div>
                  <div className="text-sm text-slate-600">Fabrication Groups</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{factoryData.production_summary.fabricable_groups}</div>
                  <div className="text-sm text-slate-600">Ready to Fabricate</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{factoryData.production_summary.total_dimensions}</div>
                  <div className="text-sm text-slate-600">Total Dimensions</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{Object.keys(factoryData.production_summary.by_area).length}</div>
                  <div className="text-sm text-slate-600">Areas</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-screen-2xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="groups" className="gap-2">
              <Package className="w-4 h-4" />
              Production Groups ({factoryData?.production_groups?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="dimensions" className="gap-2">
              <Ruler className="w-4 h-4" />
              All Dimensions ({factoryData?.dimensions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="benchmarks" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Benchmarks ({factoryData?.benchmarks?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="validation" className="gap-2">
              <FileCheck className="w-4 h-4" />
              Validation
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-2">
              <GitCompare className="w-4 h-4" />
              Comparison
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups">
            <ProductionGroups 
              groups={factoryData?.production_groups || []} 
              job={factoryData?.job}
              dimensionSet={dimensionSet}
            />
          </TabsContent>

          <TabsContent value="dimensions">
            <DimensionsTable dimensions={factoryData?.dimensions || []} />
          </TabsContent>

          <TabsContent value="benchmarks">
            <BenchmarksTable benchmarks={factoryData?.benchmarks || []} />
          </TabsContent>

          <TabsContent value="validation">
            <div className="space-y-6">
              <ValidationGateDisplay dimensionSet={dimensionSet} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ValidationPanel validation={validation} dimensionSet={dimensionSet} />
                <ProductionStatusControl 
                  dimensionSet={dimensionSet} 
                  onStatusChanged={() => {
                    refetchFactoryData();
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <FactoryComparisonView dimensionSet={dimensionSet} />
          </TabsContent>

          <TabsContent value="export">
            <ExportPanel 
              dimensionSet={dimensionSet} 
              factoryData={factoryData} 
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Access mode indicator */}
      <div className="fixed bottom-4 right-4">
        {userPermissions && (
          <Badge className={userPermissions.is_factory_user ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-white shadow-lg'}>
            <Lock className="w-3 h-3 mr-1" />
            {userPermissions.is_factory_user ? 'Factory Access' : 'Read-Only Mode'}
          </Badge>
        )}
      </div>
    </div>
  );
}

function ProductionGroups({ groups, job, dimensionSet }) {
  const { prepareGroupForExport } = require('@/components/factory/FactoryProductionGrouping');
  const { validateGroupPrecision, formatDimensionWithLabels } = require('@/components/factory/FactoryPrecisionRules');
  
  const handleExportGroup = async (group) => {
    // Check precision before export
    const precisionCheck = validateGroupPrecision(group);
    
    if (!precisionCheck.can_export) {
      alert(`Export blocked: ${precisionCheck.critical_count} critical precision violation(s) detected. All dimensions must pass precision rules.`);
      return;
    }
    
    const packet = prepareGroupForExport(group, job, dimensionSet);
    
    // TODO: Generate PDF for this specific group
    console.log('Export packet:', packet);
    alert(`Preparing ${packet.packet_name} for export`);
  };
  
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group.id} className={!group.is_fabricable ? 'border-amber-200 bg-amber-50/50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{group.name}</CardTitle>
                <div className="text-sm text-slate-600 mt-1">
                  {group.metadata.dimension_count} dimensions • {group.metadata.total_linear_feet} linear feet
                </div>
              </div>
              <div className="flex items-center gap-3">
                {group.is_fabricable ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Fabricable
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Review Required
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportGroup(group)}
                  disabled={!group.is_fabricable}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-4 text-sm text-slate-600">
              <span>Type: <strong>{group.unit_type}</strong></span>
              <span>•</span>
              <span>Captured: <strong>{new Date(group.metadata.field_capture_date).toLocaleDateString()}</strong></span>
              <span>•</span>
              <span>By: <strong>{group.metadata.captured_by.join(', ')}</strong></span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Imperial</th>
                    <th className="px-4 py-3 text-left font-semibold">Metric</th>
                    <th className="px-4 py-3 text-left font-semibold">Tolerance</th>
                    <th className="px-4 py-3 text-left font-semibold">Material</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {group.dimensions.map((dim, idx) => (
                    <tr key={dim.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono text-slate-600 font-bold">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {dim.measurement_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-bold font-mono text-lg">
                        {dim.display_value_imperial || formatImperial(dim)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {dim.display_value_metric || `${dim.value_mm}mm`}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {dim.tolerance ? `±${dim.tolerance.plus}/${dim.tolerance.minus}` : 'Standard'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {dim.material_type || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {groups.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No production groups found. Dimensions must be production-ready to appear in groups.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function DimensionsTable({ dimensions }) {
  // Group by area for better organization
  const dimensionsByArea = dimensions.reduce((acc, dim) => {
    if (!acc[dim.area]) {
      acc[dim.area] = [];
    }
    acc[dim.area].push(dim);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(dimensionsByArea).map(([area, areaDims]) => (
        <Card key={area}>
          <CardHeader>
            <CardTitle className="text-lg">
              {area}
              <Badge className="ml-3 bg-slate-100 text-slate-800">
                {areaDims.length} dimensions
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">#</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Imperial</th>
                    <th className="px-4 py-3 text-left font-semibold">Metric</th>
                    <th className="px-4 py-3 text-left font-semibold">Tolerance</th>
                    <th className="px-4 py-3 text-left font-semibold">Benchmark</th>
                    <th className="px-4 py-3 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {areaDims.map((dim, idx) => {
                    const { formatDimensionWithLabels } = require('@/components/factory/FactoryPrecisionRules');
                    const formatted = formatDimensionWithLabels(dim);
                    
                    return (
                      <tr key={dim.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono text-slate-600 font-bold">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {dim.measurement_type}
                          </Badge>
                          <div className="text-xs text-slate-500 mt-1">
                            {formatted.type_label}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold font-mono text-lg">
                          {formatted.imperial}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {formatted.metric}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {dim.tolerance ? `±${dim.tolerance.plus}/${dim.tolerance.minus} ${dim.tolerance.unit}` : 'Standard'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {formatted.benchmark_reference || dim.benchmark_label || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="space-y-2">
                            {dim.production_notes && (
                              <div className="text-slate-500">{dim.production_notes}</div>
                            )}
                            <FactoryAnnotations 
                              dimension={dim} 
                              onUpdated={() => refetchFactoryData()} 
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {dimensions.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No production-ready dimensions found. All dimensions must be verified or production_ready status.
          </AlertDescription>
        </Alert>
      )}
    </div>
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
                <th className="px-4 py-3 text-left font-semibold">●</th>
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
                  <td className="px-4 py-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: bm.color_code || '#94a3b8' }}
                    />
                  </td>
                  <td className="px-4 py-3 font-bold text-lg">{bm.label}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{bm.benchmark_type}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-lg">
                    {bm.elevation} {bm.elevation_unit}
                  </td>
                  <td className="px-4 py-3">{bm.area}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {bm.established_by_name || bm.established_by}
                    <br />
                    {bm.established_date ? new Date(bm.established_date).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {benchmarks.length === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              No production benchmarks found. Only established benchmarks with complete data are shown.
            </AlertDescription>
          </Alert>
        )}
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
          <CardTitle>Production Readiness Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Data Integrity Score</span>
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
                  Critical Issues ({validation.errors.length})
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
            
            {validation.errors.length === 0 && validation.warnings.length === 0 && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  All validation checks passed. Data is production-ready.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportPanel({ dimensionSet, factoryData }) {
  const [exporting, setExporting] = useState(false);
  
  // Check if export is blocked by precision violations
  const canExport = factoryData?.precision_report?.can_export !== false;

  const handleExport = async () => {
    if (!canExport) {
      alert('Export blocked: Critical precision violations detected. All dimensions must pass precision rules before export.');
      return;
    }
    
    const { generateFactoryPDF } = await import('@/components/factory/FactoryPDFGenerator');
    
    setExporting(true);
    try {
      const user = await base44.auth.me();
      const permissions = await getUserPermissions(user);
      
      if (!permissions.can_export) {
        alert('❌ Unauthorized: Export requires factory role');
        setExporting(false);
        return;
      }
      
      const result = await generateFactoryPDF(factoryData, {
        include_annotations: true,
        legal_document: true
      });

      // Audit log
      await logFactoryAction('production_pdf_exported', {
        dimension_set_id: dimensionSet.id,
        job_id: dimensionSet.job_id,
        details: {
          revision: dimensionSet.version_number,
          document_id: result.metadata.document_id
        }
      });

      // Download
      const url = window.URL.createObjectURL(result.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FACTORY-${dimensionSet.name}-REV${dimensionSet.version_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      alert('Factory production PDF generated successfully');
    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ ' + error.message);
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
          {!canExport && (
            <Alert className="border-red-200 bg-red-50">
              <Lock className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Export Blocked</strong>
                <br />
                {factoryData.precision_report.critical_count} critical precision violation(s) must be resolved before export.
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handleExport} 
            disabled={exporting || !canExport}
            className="w-full"
          >
            {canExport ? (
              <>
                <Download className="w-4 h-4 mr-2" />
                {exporting ? 'Generating PDF...' : 'Export Production PDF'}
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Export Blocked
              </>
            )}
          </Button>
          
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Exports a production-ready PDF with all dimensions, benchmarks, and validation data.
            PDF will be revision-controlled and immutable.
          </p>
          
          {factoryData?.precision_report && (
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Precision Report</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Valid Dimensions:</span>
                  <span className="font-bold text-green-600">
                    {factoryData.precision_report.valid_dimensions}/{factoryData.precision_report.total_dimensions}
                  </span>
                </div>
                {factoryData.precision_report.critical_count > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Critical Violations:</span>
                    <span className="font-bold">{factoryData.precision_report.critical_count}</span>
                  </div>
                )}
                {factoryData.precision_report.warning_count > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Warnings:</span>
                    <span className="font-bold">{factoryData.precision_report.warning_count}</span>
                  </div>
                )}
              </div>
            </div>
          )}
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