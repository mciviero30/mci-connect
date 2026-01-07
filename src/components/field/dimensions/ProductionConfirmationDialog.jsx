import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, FileText, Ruler, Camera } from 'lucide-react';

export default function ProductionConfirmationDialog({ 
  open, 
  onOpenChange, 
  dimensions, 
  unitSystem,
  onConfirm 
}) {
  const [checklist, setChecklist] = useState({
    measurementTypes: false,
    unitSystem: false,
    benchMark: false,
    photos: false,
  });

  const allChecked = Object.values(checklist).every(v => v);

  const hasBenchMark = dimensions.some(d => 
    d.measurement_type?.includes('BM') || d.dimension_type === 'benchmark'
  );

  const hasPhotos = dimensions.some(d => d.photos?.length > 0);

  const handleConfirm = () => {
    if (!allChecked) return;
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Production Ready Confirmation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/30 dark:to-yellow-950/30 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-orange-900 dark:text-orange-100 mb-2">
                  Critical: Verify Before Sending to Production
                </div>
                <div className="text-sm text-orange-700 dark:text-orange-300">
                  Once confirmed, these dimensions will be used for fabrication. Errors can cause costly mistakes.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-slate-900 dark:text-white mb-2">Production Checklist</div>

            {/* Measurement Types */}
            <label className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-green-400 transition-all min-h-[60px] touch-manipulation">
              <input
                type="checkbox"
                checked={checklist.measurementTypes}
                onChange={(e) => setChecklist({ ...checklist, measurementTypes: e.target.checked })}
                className="w-6 h-6 mt-0.5 rounded border-2 border-slate-400 text-green-600 focus:ring-2 focus:ring-green-500 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Ruler className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    Measurement Types Confirmed
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  All FF-FF, CL-CL, BM measurements are correctly labeled and verified
                </div>
              </div>
            </label>

            {/* Unit System */}
            <label className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-green-400 transition-all min-h-[60px] touch-manipulation">
              <input
                type="checkbox"
                checked={checklist.unitSystem}
                onChange={(e) => setChecklist({ ...checklist, unitSystem: e.target.checked })}
                className="w-6 h-6 mt-0.5 rounded border-2 border-slate-400 text-green-600 focus:ring-2 focus:ring-green-500 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    Unit System Correct
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-full font-bold">
                    {unitSystem === 'imperial' ? 'Imperial (ft/in)' : 'Metric (mm)'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Production will use this unit system for all measurements
                </div>
              </div>
            </label>

            {/* Bench Mark */}
            {hasBenchMark && (
              <label className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-green-400 transition-all min-h-[60px] touch-manipulation">
                <input
                  type="checkbox"
                  checked={checklist.benchMark}
                  onChange={(e) => setChecklist({ ...checklist, benchMark: e.target.checked })}
                  className="w-6 h-6 mt-0.5 rounded border-2 border-slate-400 text-green-600 focus:ring-2 focus:ring-green-500 flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      Bench Mark Verified
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 rounded-full font-bold">
                      BM
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Laser reference line is clearly marked and documented on site
                  </div>
                </div>
              </label>
            )}

            {/* Photos */}
            <label className="flex items-start gap-3 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-green-400 transition-all min-h-[60px] touch-manipulation">
              <input
                type="checkbox"
                checked={checklist.photos}
                onChange={(e) => setChecklist({ ...checklist, photos: e.target.checked })}
                className="w-6 h-6 mt-0.5 rounded border-2 border-slate-400 text-green-600 focus:ring-2 focus:ring-green-500 flex-shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Camera className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    Reference Photos {hasPhotos ? 'Attached' : '(Optional)'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {hasPhotos 
                    ? 'Photos are attached for fabrication reference'
                    : 'No photos attached - confirm this is acceptable for production'
                  }
                </div>
              </div>
            </label>
          </div>

          {/* Summary */}
          <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
            <div className="text-sm text-slate-700 dark:text-slate-300 mb-2">
              <strong>Summary:</strong> {dimensions.length} dimension{dimensions.length !== 1 ? 's' : ''} ready for production
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              PDF will be generated with full audit trail (user, timestamp, device, measurements)
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1 min-h-[48px]"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!allChecked}
            className={`flex-1 min-h-[48px] ${
              allChecked
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Confirm & Generate PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}