import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, MapPin } from 'lucide-react';
import { 
  getMeasurementLabel, 
  getMeasurementDescription, 
  formatMeasurement,
  BENCHMARK_TYPES 
} from '@/components/field/utils/dimensionLogic';
import { format } from 'date-fns';

/**
 * Measurement detail modal (tap interaction)
 */
export default function MeasurementDetailDialog({ 
  measurement, 
  type, 
  open, 
  onOpenChange,
  onEdit,
  onDelete,
  canEdit = true
}) {
  if (!measurement) return null;

  const isBenchmark = type === 'benchmark';
  const isVertical = type === 'vertical';
  const isHorizontal = type === 'horizontal';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            {isBenchmark ? (
              <>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: measurement.color }}>
                  {BENCHMARK_TYPES[measurement.type]?.icon || '📍'}
                </div>
                Benchmark: {measurement.label}
              </>
            ) : (
              <>
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: measurement.color }}
                />
                {getMeasurementLabel(
                  isHorizontal ? measurement.measurement_type : measurement.type,
                  isHorizontal ? 'horizontal' : 'vertical'
                )}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Measurement Details */}
          {!isBenchmark && (
            <>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value</span>
                <p className="text-2xl font-bold mt-1" style={{ color: measurement.color }}>
                  {formatMeasurement(measurement.value, measurement.unit)}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                  {getMeasurementDescription(
                    isHorizontal ? measurement.measurement_type : measurement.type,
                    isHorizontal ? 'horizontal' : 'vertical'
                  )}
                </p>
              </div>
            </>
          )}

          {measurement.location && (
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                {measurement.location}
              </p>
            </div>
          )}

          {measurement.notes && (
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes</span>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                {measurement.notes}
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-400">
              Created {format(new Date(measurement.created_date), 'MMM d, yyyy h:mm a')}
            </span>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  if (onDelete) onDelete(measurement);
                }}
                className="flex-1 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}