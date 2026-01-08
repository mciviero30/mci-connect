import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const CONFIRMATION_OPTIONS = [
  {
    value: 'verified_conditions_existing',
    label: 'Verified – Conditions Existing',
    icon: CheckCircle2,
    color: 'border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20',
    description: 'Measurement confirmed as accurate for existing site conditions'
  },
  {
    value: 'irregular_conditions_noted',
    label: 'Irregular Conditions Noted',
    icon: AlertTriangle,
    color: 'border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20',
    description: 'Measurement valid but site conditions are unusual or non-standard'
  },
  {
    value: 'remeasure_required',
    label: 'Re-measure Required',
    icon: XCircle,
    color: 'border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20',
    description: 'Measurement needs to be retaken due to concerns or errors'
  }
];

export default function MeasurementConfirmationDialog({ 
  open, 
  onOpenChange, 
  dimension,
  aiReport,
  onConfirmed 
}) {
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [comment, setComment] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!selectedStatus) {
      toast.error('Please select a confirmation status');
      return;
    }

    setConfirming(true);
    try {
      const user = await base44.auth.me();
      
      await base44.entities.FieldDimension.update(dimension.id, {
        human_confirmation_status: selectedStatus,
        human_confirmation_by: user.email,
        human_confirmation_name: user.full_name,
        human_confirmation_role: user.position || user.role || 'technician',
        human_confirmation_date: new Date().toISOString(),
        human_confirmation_comment: comment || null
      });

      toast.success('Measurement confirmed');
      onOpenChange(false);
      
      if (onConfirmed) {
        onConfirmed();
      }
    } catch (error) {
      console.error('Confirmation failed:', error);
      toast.error('Failed to confirm measurement');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Human Confirmation Required
          </DialogTitle>
          <DialogDescription>
            Confirm measurement quality based on your professional assessment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Measurement Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="font-semibold mb-2">Measurement Details</div>
            <div className="text-sm space-y-1">
              <div>Area: <span className="font-semibold">{dimension.area}</span></div>
              <div>Type: <span className="font-semibold">{dimension.measurement_type}</span></div>
              <div>Value: <span className="font-semibold">{formatDimension(dimension)}</span></div>
            </div>
          </div>

          {/* AI Report Summary (if available) */}
          {aiReport && (
            <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
              <AlertDescription>
                <div className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                  AI Advisory (Reference Only)
                </div>
                <div className="text-sm text-purple-700 dark:text-purple-300">
                  Confidence: {aiReport.overall_confidence} • Status: {aiReport.consistency_status}
                </div>
                {aiReport.summary && (
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                    {aiReport.summary}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation Options */}
          <div>
            <div className="font-semibold mb-3">Select Confirmation Status:</div>
            <div className="space-y-3">
              {CONFIRMATION_OPTIONS.map(option => {
                const Icon = option.icon;
                const isSelected = selectedStatus === option.value;
                
                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedStatus(option.value)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-md' 
                        : option.color
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        option.value === 'verified_conditions_existing' ? 'text-green-600' :
                        option.value === 'irregular_conditions_noted' ? 'text-amber-600' :
                        'text-red-600'
                      }`} />
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{option.label}</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {option.description}
                        </div>
                      </div>
                      {isSelected && (
                        <Badge className="bg-blue-600 text-white">Selected</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Comment */}
          <div>
            <label className="font-semibold mb-2 block">
              Additional Comment (Optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add any relevant notes about site conditions, measurement concerns, or special circumstances..."
              rows={3}
              className="w-full"
            />
          </div>

          {/* Legal Notice */}
          <Alert>
            <AlertDescription className="text-xs text-slate-600">
              Your confirmation becomes part of the permanent measurement record and overrides 
              AI advisory output. This creates legal accountability for measurement accuracy.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedStatus || confirming}
              className="flex-1 bg-blue-600 text-white"
            >
              {confirming ? 'Confirming...' : 'Confirm Measurement'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDimension(dim) {
  if (dim.unit_system === 'imperial') {
    const ft = dim.value_feet || 0;
    const inches = dim.value_inches || 0;
    const frac = dim.value_fraction || '0';
    
    let result = `${ft}' ${inches}"`;
    if (frac !== '0') {
      result = `${ft}' ${inches} ${frac}"`;
    }
    return result;
  } else {
    return `${dim.value_mm || 0}mm`;
  }
}