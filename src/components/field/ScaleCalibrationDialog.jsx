import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Crosshair } from 'lucide-react';

export default function ScaleCalibrationDialog({
  open,
  onOpenChange,
  onCalibrationComplete,
  calibrationPoints,
  imageSize,
  isCalibrating
}) {
  const [realWorldLength, setRealWorldLength] = useState('');
  const [unit, setUnit] = useState('m');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    setError('');
    
    // Validate inputs
    if (!realWorldLength || isNaN(realWorldLength) || parseFloat(realWorldLength) <= 0) {
      setError('Please enter a valid distance');
      return;
    }

    if (calibrationPoints.length !== 2) {
      setError('Please select exactly 2 points on the plan');
      return;
    }

    const p1 = calibrationPoints[0];
    const p2 = calibrationPoints[1];

    // Calculate pixel distance
    const pixelDistance = Math.sqrt(
      Math.pow(p2.px - p1.px, 2) + Math.pow(p2.py - p1.py, 2)
    );

    if (pixelDistance < 10) {
      setError('Points are too close together');
      return;
    }

    const length = parseFloat(realWorldLength);
    const ratio = pixelDistance / length; // pixels per unit

    onCalibrationComplete({
      scale_reference_length_px: pixelDistance,
      scale_real_length: length,
      scale_unit: unit,
      scale_ratio: ratio
    });

    // Reset
    setRealWorldLength('');
    setUnit('m');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-orange-500/30 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Calibrate Plan Scale
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isCalibrating ? (
            <>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-300">
                  Click two points on the plan to measure a known distance
                </p>
              </div>

              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Crosshair className="w-4 h-4 mr-2" />
                Start Calibration
              </Button>
            </>
          ) : (
            <>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Click 2 points</p>
                  <p className="text-xs text-amber-200">
                    {calibrationPoints.length}/2 points selected
                  </p>
                </div>
              </div>

              {calibrationPoints.length === 2 && (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-300">
                      Real-world distance between points
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="10"
                        value={realWorldLength}
                        onChange={(e) => {
                          setRealWorldLength(e.target.value);
                          setError('');
                        }}
                        className="bg-slate-800 border-orange-500/30 text-white flex-1"
                        step="0.1"
                        min="0"
                      />
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="bg-slate-800 border border-orange-500/30 text-white rounded px-2 py-1 text-sm"
                      >
                        <option value="m">meters</option>
                        <option value="ft">feet</option>
                        <option value="cm">cm</option>
                        <option value="in">inches</option>
                      </select>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => onOpenChange(false)}
                      variant="outline"
                      className="flex-1 border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirm}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Save Scale
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}