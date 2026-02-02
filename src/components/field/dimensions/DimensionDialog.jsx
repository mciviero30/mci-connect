import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Mic, Video, Save, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import MeasurementTypeSelector from './MeasurementTypeSelector';
import UnitSystemToggle from './UnitSystemToggle';
import DimensionValueInput from './DimensionValueInput';
import BenchMarkInput from './BenchMarkInput';
import MeasurementDiagram from './MeasurementDiagram';
import { validateDimension, validateBenchMarkConfirmation } from './DimensionValidation';
import { useFieldContext } from '../FieldContextProvider';

export default function DimensionDialog({ 
  open, 
  onOpenChange, 
  dimension, 
  jobId,
  jobName,
  onSave 
}) {
  // FASE 3C-4: Get measurement_session_id from context for scoped persistence
  const fieldContext = useFieldContext();
  const measurementSessionId = fieldContext.measurement_session_id;

  const [formData, setFormData] = useState(dimension || {
    dimension_type: 'horizontal',
    measurement_type: 'FF-FF',
    unit_system: 'imperial',
    value_feet: 0,
    value_inches: 0,
    value_fraction: '0',
    area: '',
    notes: '',
    photos: [],
    audio_notes: [],
  });

  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [validation, setValidation] = useState({ isValid: true, errors: [], warnings: [] });
  const [bmConfirmed, setBmConfirmed] = useState(false);

  // FASE 3C-4: Log session ID for debugging (dev only)
  useEffect(() => {
    if (import.meta.env?.DEV && open) {
      console.log('[DimensionDialog] Using measurement_session_id:', measurementSessionId);
    }
  }, [open, measurementSessionId]);

  // Real-time validation
  useEffect(() => {
    const result = validateDimension(formData);
    setValidation(result);
  }, [formData]);

  const handleMediaUpload = async (file, type) => {
    try {
      setUploadingMedia(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (type === 'photo') {
        setFormData({ ...formData, photos: [...(formData.photos || []), file_url] });
      } else if (type === 'audio') {
        setFormData({ ...formData, audio_notes: [...(formData.audio_notes || []), file_url] });
      } else if (type === 'video') {
        setFormData({ ...formData, video_clips: [...(formData.video_clips || []), file_url] });
      }
      
      toast.success(`${type} uploaded`);
    } catch (error) {
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSave = () => {
    // Run validation
    const validationResult = validateDimension(formData);
    
    if (!validationResult.isValid) {
      toast.error('Please fix validation errors', {
        description: validationResult.errors[0]?.message
      });
      return;
    }

    // Bench Mark confirmation check
    const bmCheck = validateBenchMarkConfirmation(formData);
    if (bmCheck.required && !bmConfirmed) {
      toast.error('Confirmation Required', {
        description: bmCheck.message
      });
      return;
    }

    // FASE 3C-4: Add measurement_session_id to dimension data for tracking
    const dimensionData = {
      ...formData,
      measurement_session_id: measurementSessionId, // FASE 3C-4: Session identity
      device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      language: navigator.language,
    };

    onSave(dimensionData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {dimension ? 'Edit Dimension' : 'New Dimension'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="measurement" className="mt-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="measurement">Measurement</TabsTrigger>
            <TabsTrigger value="media">Media & Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="measurement" className="space-y-4">
            {/* Unit System */}
            <UnitSystemToggle
              value={formData.unit_system}
              onChange={(unit) => setFormData({ ...formData, unit_system: unit })}
            />

            {/* Dimension Type */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">Dimension Type *</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormData({ ...formData, dimension_type: 'horizontal', measurement_type: 'FF-FF' })}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all min-h-[48px] touch-manipulation ${
                    formData.dimension_type === 'horizontal'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Horizontal
                </button>
                <button
                  onClick={() => setFormData({ ...formData, dimension_type: 'vertical', measurement_type: 'BM-C' })}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all min-h-[48px] touch-manipulation ${
                    formData.dimension_type === 'vertical'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Vertical
                </button>
              </div>
            </div>

            {/* Measurement Type Selector */}
            <MeasurementTypeSelector
              dimensionType={formData.dimension_type}
              value={formData.measurement_type}
              onChange={(type) => setFormData({ ...formData, measurement_type: type })}
            />

            {/* Visual Diagram */}
            {formData.measurement_type && (
              <MeasurementDiagram type={formData.measurement_type} />
            )}

            {/* Value Input */}
            {formData.dimension_type === 'horizontal' ? (
              <DimensionValueInput
                unitSystem={formData.unit_system}
                values={formData}
                onChange={(vals) => setFormData({ ...formData, ...vals })}
              />
            ) : (
              <BenchMarkInput
                unitSystem={formData.unit_system}
                values={formData}
                onChange={(vals) => setFormData({ ...formData, ...vals })}
              />
            )}

            {/* Validation Errors */}
            {validation.errors.filter(e => e.severity === 'error').length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-500 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="font-bold text-red-900 dark:text-red-100 text-sm">Validation Errors</span>
                </div>
                <ul className="space-y-1 ml-7">
                  {validation.errors.filter(e => e.severity === 'error').map((err, idx) => (
                    <li key={idx} className="text-sm text-red-700 dark:text-red-300">• {err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Warnings */}
            {validation.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-500 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <span className="font-bold text-yellow-900 dark:text-yellow-100 text-sm">Review Recommended</span>
                </div>
                <ul className="space-y-1 ml-7">
                  {validation.warnings.map((warn, idx) => (
                    <li key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">• {warn.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bench Mark Confirmation */}
            {formData.measurement_type === 'BM-ONLY' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-500 rounded-xl p-4">
                <label className="flex items-start gap-3 cursor-pointer touch-manipulation">
                  <input
                    type="checkbox"
                    checked={bmConfirmed}
                    onChange={(e) => setBmConfirmed(e.target.checked)}
                    className="w-6 h-6 mt-0.5 rounded border-2 border-amber-600 text-amber-600 focus:ring-2 focus:ring-amber-500 flex-shrink-0"
                  />
                  <div>
                    <div className="font-bold text-amber-900 dark:text-amber-100 text-sm mb-1">
                      Bench Mark Physically Marked
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      I confirm the Bench Mark laser line is clearly marked on site with physical reference points
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Area */}
            <div>
              <Label className="text-sm font-bold">Area/Location</Label>
              <Input
                value={formData.area || ''}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g., Floor 3 - North Wall"
                className="mt-1.5"
              />
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            {/* Photos */}
            <div>
              <Label className="text-sm font-bold mb-2 block">Reference Photos</Label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => Array.from(e.target.files).forEach(f => handleMediaUpload(f, 'photo'))}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload">
                <Button variant="outline" className="w-full min-h-[48px]" asChild>
                  <span>
                    <Camera className="w-4 h-4 mr-2" />
                    Add Photos
                  </span>
                </Button>
              </label>
              {formData.photos?.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {formData.photos.map((url, idx) => (
                    <img key={idx} src={url} alt="" className="w-full h-20 object-cover rounded-lg" />
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-bold">Notes</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={4}
                className="mt-1.5"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
         <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
           <Button 
             variant="outline" 
             onClick={() => onOpenChange(false)} 
             className="flex-1 min-h-[52px] font-semibold"
           >
             Cancel
           </Button>
           <Button 
             onClick={handleSave}
             disabled={uploadingMedia || !validation.isValid}
             className={`flex-1 min-h-[52px] font-semibold transition-all shadow-lg ${
               validation.isValid
                 ? 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white hover:shadow-orange-500/30 active:scale-95'
                 : 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
             }`}
           >
             {validation.isValid ? (
               <>
                 <CheckCircle2 className="w-4 h-4 mr-2" />
                 Save Measurement
               </>
             ) : (
               <>
                 <AlertTriangle className="w-4 h-4 mr-2" />
                 Fix Errors First
               </>
             )}
           </Button>
         </div>
      </DialogContent>
    </Dialog>
  );
}