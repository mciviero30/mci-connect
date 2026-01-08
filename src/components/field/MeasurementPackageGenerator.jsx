import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Download, 
  Share2, 
  FileText,
  Loader2,
  CheckCircle2,
  Copy,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { collectMeasurementPackage } from './services/MeasurementPackageService';

export default function MeasurementPackageGenerator({ jobId }) {
  const [generating, setGenerating] = useState(false);
  const [packageData, setPackageData] = useState(null);
  const [shareableLink, setShareableLink] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: dimensions = [] } = useQuery({
    queryKey: ['field-dimensions', jobId],
    queryFn: () => base44.entities.FieldDimension.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const areas = [...new Set(dimensions.map(d => d.area).filter(Boolean))];

  const handleGeneratePackage = async () => {
    setGenerating(true);
    try {
      const pkg = await collectMeasurementPackage(jobId, selectedArea);
      pkg.metadata.generated_by = user?.full_name;
      setPackageData(pkg);
      toast.success('Package generated successfully');
    } catch (error) {
      console.error('Package generation failed:', error);
      toast.error('Failed to generate package');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!packageData) return;

    try {
      toast.info('Generating PDF...');
      
      const response = await base44.functions.invoke('generateMeasurementPackagePDF', {
        packageData
      });

      // Convert base64 to blob
      const pdfBlob = base44ToBlob(response.data.pdf_base64, 'application/pdf');
      const url = URL.createObjectURL(pdfBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = response.data.filename;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (error) {
      console.error('PDF download failed:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleCreateShareableLink = async () => {
    if (!packageData) return;

    try {
      toast.info('Creating shareable link...');
      
      const response = await base44.functions.invoke('createShareableMeasurementPackage', {
        packageData
      });

      setShareableLink(response.data.shareable_url);
      toast.success('Shareable link created');
    } catch (error) {
      console.error('Link creation failed:', error);
      toast.error('Failed to create shareable link');
    }
  };

  const handleCopyLink = () => {
    if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
      toast.success('Link copied to clipboard');
    }
  };

  const handleExportDataset = () => {
    if (!packageData) return;

    const dataStr = JSON.stringify(packageData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${packageData.metadata.package_id}_dataset.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    toast.success('Dataset exported');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Package className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
            Client / Factory Measurement Package
          </div>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            Generate comprehensive measurement package with all field data, AI review, and human confirmations.
          </div>
        </AlertDescription>
      </Alert>

      {/* Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Package</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">
                Select Area (Optional)
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
              onClick={handleGeneratePackage}
              disabled={generating || dimensions.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  Generate Package
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Package Summary */}
      {packageData && (
        <>
          <Card className="border-green-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Package Generated</CardTitle>
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Ready
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-2xl font-bold">{packageData.summary.total_dimensions}</div>
                    <div className="text-xs text-slate-600">Measurements</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-2xl font-bold">{packageData.summary.total_benchmarks}</div>
                    <div className="text-xs text-slate-600">Benchmarks</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-2xl font-bold">{packageData.summary.total_photos}</div>
                    <div className="text-xs text-slate-600">Photos</div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-2xl font-bold">{packageData.summary.confirmation_rate}%</div>
                    <div className="text-xs text-slate-600">Confirmed</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">Package ID:</div>
                  <div className="font-mono text-sm">{packageData.metadata.package_id}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  onClick={handleDownloadPDF}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>

                <Button
                  onClick={handleCreateShareableLink}
                  className="w-full"
                  variant="outline"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Create Shareable Link
                </Button>

                <Button
                  onClick={handleExportDataset}
                  className="w-full"
                  variant="outline"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export Dataset (JSON)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Shareable Link */}
          {shareableLink && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg">Shareable Link Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={shareableLink}
                      readOnly
                      className="flex-1 font-mono text-sm"
                    />
                    <Button onClick={handleCopyLink} variant="outline">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      This link provides read-only access to the measurement package.
                      Share with clients or manufacturers for review.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function base64ToBlob(base64, type) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
}