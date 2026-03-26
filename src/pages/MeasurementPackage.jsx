import React, { useEffect, useState } from 'react';
import { formatDate } from '@/lib/utils';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SiteNotesPackageDisplay from '@/components/field/SiteNotesPackageDisplay';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Download, 
  Info,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from 'lucide-react';

export default function MeasurementPackagePage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [packageData, setPackageData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPackage();
  }, [token]);

  const loadPackage = async () => {
    try {
      const packages = await base44.entities.MeasurementPackage.filter({
        access_token: token,
        is_active: true
      });

      if (packages.length === 0) {
        setError('Package not found or no longer available');
        return;
      }

      const pkg = packages[0];
      
      // Update access count
      await base44.entities.MeasurementPackage.update(pkg.id, {
        accessed_count: (pkg.accessed_count || 0) + 1,
        last_accessed_date: new Date().toISOString()
      });

      setPackageData(pkg.package_data);
    } catch (err) {
      console.error('Failed to load package:', err);
      setError('Failed to load measurement package');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDataset = () => {
    if (!packageData) return;

    const dataStr = JSON.stringify(packageData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${packageData.metadata.package_id}_dataset.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
        <Alert className="max-w-md border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <CardTitle className="text-2xl">MCI Measurement Package</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  Read-only measurement documentation
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-600">Package ID</div>
                <div className="font-mono text-sm">{packageData.metadata.package_id}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Generated</div>
                <div className="text-sm">{new Date(packageData.metadata.generated_date).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Job</div>
                <div className="font-semibold">{packageData.job_info.name}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Area</div>
                <div className="font-semibold">{packageData.metadata.area}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription>
            <div className="font-semibold mb-1">DISCLAIMER</div>
            <div className="text-sm">{packageData.metadata.disclaimer}</div>
          </AlertDescription>
        </Alert>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Package Contents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{packageData.summary.total_dimensions}</div>
                <div className="text-xs text-slate-600">Measurements</div>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{packageData.summary.total_benchmarks}</div>
                <div className="text-xs text-slate-600">Benchmarks</div>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{packageData.summary.total_photos}</div>
                <div className="text-xs text-slate-600">Photos</div>
              </div>
              <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <div className="text-3xl font-bold text-amber-600">{packageData.summary.confirmation_rate}%</div>
                <div className="text-xs text-slate-600">Confirmed</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-950/20 rounded-lg">
                <div className="text-3xl font-bold text-slate-600">{packageData.site_notes?.length || 0}</div>
                <div className="text-xs text-slate-600">Site Notes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Site Notes Section */}
        {packageData.site_notes && packageData.site_notes.length > 0 && (
          <SiteNotesPackageDisplay 
            siteNotes={packageData.site_notes} 
            readOnly={true}
          />
        )}

        {/* Human Confirmations */}
        <Card>
          <CardHeader>
            <CardTitle>Human Confirmations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {packageData.human_confirmations.by_status.verified}
                </div>
                <div className="text-xs text-slate-600">Verified</div>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">
                  {packageData.human_confirmations.by_status.irregular}
                </div>
                <div className="text-xs text-slate-600">Irregular</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {packageData.human_confirmations.by_status.remeasure}
                </div>
                <div className="text-xs text-slate-600">Re-measure</div>
              </div>
            </div>

            {packageData.human_confirmations.confirmations.slice(0, 3).map((conf, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{conf.measurement_type}</span>
                  <ConfirmationBadge status={conf.status} />
                </div>
                <div className="text-xs text-slate-600">
                  {conf.confirmed_by} ({conf.confirmed_role}) • {formatDate(conf.confirmed_date)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Export Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleDownloadDataset}
              className="w-full"
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Complete Dataset (JSON)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConfirmationBadge({ status }) {
  const configs = {
    verified_conditions_existing: {
      icon: CheckCircle2,
      label: 'Verified',
      color: 'bg-green-100 text-green-800'
    },
    irregular_conditions_noted: {
      icon: AlertTriangle,
      label: 'Irregular',
      color: 'bg-amber-100 text-amber-800'
    },
    remeasure_required: {
      icon: XCircle,
      label: 'Re-measure',
      color: 'bg-red-100 text-red-800'
    }
  };

  const config = configs[status] || configs.verified_conditions_existing;
  const Icon = config.icon;

  return (
    <Badge className={config.color}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}