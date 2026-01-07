import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Mic, Video, Save, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import MeasurementTypeSelector from './MeasurementTypeSelector';
import UnitSystemToggle from './UnitSystemToggle';
import DimensionValueInput from './DimensionValueInput';
import BenchMarkInput from './BenchMarkInput';

export default function DimensionDialog({ 
  open, 
  onOpenChange, 
  dimension, 
  jobId,
  jobName,
  onSave 
}) {
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
    // Validation
    if (!formData.measurement_type) {
      toast.error('Please select a measurement type');
      return;
    }

    if (formData.unit_system === 'imperial' && !formData.value_feet && !formData.value_inches) {
      toast.error('Please enter measurement values');
      return;
    }

    if (formData.unit_system === 'metric' && !formData.value_mm) {
      toast.error('Please enter measurement value');
      return;
    }

    onSave(formData);
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
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 min-h-[48px]">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={uploadingMedia}
            className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white min-h-[48px]"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Dimension
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}