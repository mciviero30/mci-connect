import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MeasurementExportDialog({
  open,
  onOpenChange,
  jobId,
  jobName,
  dimensions,
  unitSystem,
  measurementSessionId,  // FASE 3C-5: Session context for PDF ownership
  markupsByPlan = {},
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!dimensions || dimensions.length === 0) {
      toast.error('No dimensions to export');
      return;
    }

    setIsExporting(true);
    try {
      toast.info('Generating PDF...');

      // FASE D4: Collect plans and job info for PDF
      const plans = await base44.entities.Plan.filter({ 
        job_id: jobId, 
        purpose: 'job_final'
      }, '-created_date');

      const jobs = await base44.entities.Job.filter({ id: jobId });
      const jobAddress = jobs?.[0]?.address || '';

      // FASE D4: Include plans, markups, and job address
      const response = await base44.functions.invoke('exportDimensionsPDF', {
        jobId,
        jobName,
        jobAddress,
        dimensions,
        unitSystem,
        measurementSessionId,
        plans,
        markupsByPlan,
      });

      if (!response || !response.data) {
        throw new Error('No PDF generated');
      }

      // Download PDF
      const link = document.createElement('a');
      link.href = response.data.pdf_url;
      link.download = `dimensions_${jobName}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Measurement package exported successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('[MeasurementExportDialog] Export error:', error);
      toast.error(error.message || 'Failed to export measurements');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-orange-500" />
            Export Measurement Package
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400">
            Create a read-only PDF of all measurements for sharing or archival.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Summary Card */}
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Job Name</span>
              <span className="text-sm text-slate-900 dark:text-white font-semibold">{jobName}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Dimensions</span>
              <span className="text-sm text-slate-900 dark:text-white font-semibold">{dimensions.length}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Unit System</span>
              <span className="text-sm text-slate-900 dark:text-white font-semibold capitalize">
                {unitSystem === 'imperial' ? "Imperial (ft/in)" : "Metric (mm)"}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Export Date</span>
              <span className="text-sm text-slate-900 dark:text-white font-semibold">
                {format(new Date(), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              This PDF will be read-only and suitable for client review or archival.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || dimensions.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}