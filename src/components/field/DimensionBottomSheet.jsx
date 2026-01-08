import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FieldBottomSheet from './FieldBottomSheet';
import { toast } from 'sonner';
import { SaveGuarantee } from './services/SaveGuarantee';
import SaveConfirmation from './SaveConfirmation';
import { Loader2 } from 'lucide-react';

export default function DimensionBottomSheet({ 
  open, 
  onOpenChange, 
  dimension, 
  jobId, 
  jobName,
  unitSystem = 'imperial',
  onSave 
}) {
  const [formData, setFormData] = useState({
    area: '',
    notes: '',
    measurement_type: 'FF-FF',
    dimension_type: 'horizontal',
    value_feet: 0,
    value_inches: 0,
    value_fraction: '0',
    value_mm: 0,
    benchmark_label: '',
    device_type: 'laser',
  });
  
  // Save state tracking
  const [saveProgress, setSaveProgress] = useState(null); // null | 'validating' | 'persisting' | 'uploading' | 'confirming' | 'complete'
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationType, setConfirmationType] = useState('success');

  React.useEffect(() => {
    if (open && dimension) {
      setFormData({
        area: dimension.area || '',
        notes: dimension.notes || '',
        measurement_type: dimension.measurement_type || 'FF-FF',
        dimension_type: dimension.dimension_type || 'horizontal',
        value_feet: dimension.value_feet || 0,
        value_inches: dimension.value_inches || 0,
        value_fraction: dimension.value_fraction || '0',
        value_mm: dimension.value_mm || 0,
        benchmark_label: dimension.benchmark_label || '',
        device_type: dimension.device_type || 'laser',
      });
    }
  }, [open, dimension]);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createDimensionMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldDimension.create(data),
  });

  const handleSave = async () => {
    if (!formData.area) {
      toast.error('Please enter location/area');
      return;
    }

    const dimensionData = {
      job_id: jobId,
      job_name: jobName,
      unit_system: unitSystem,
      measured_by: user?.email,
      measured_by_name: user?.full_name,
      ...formData,
    };

    // BLOCKING SAVE: UI waits for confirmation
    const result = await SaveGuarantee.guaranteeSave({
      entityType: 'FieldDimension',
      entityData: dimensionData,
      jobId,
      apiCall: () => createDimensionMutation.mutateAsync(dimensionData),
      draftKey: `dimension_${jobId}`,
      onProgress: setSaveProgress,
    });
    
    if (result.success) {
      // Invalidate AFTER save confirmed
      queryClient.invalidateQueries({ queryKey: ['field-dimensions', jobId] });
      
      // Show success confirmation
      setConfirmationType(result.savedOffline ? 'offline' : 'success');
      setShowConfirmation(true);
      
      // Close modal after brief confirmation
      setTimeout(() => {
        onOpenChange(false);
        onSave?.();
      }, 1500);
      
    } else {
      // Save failed
      setSaveProgress(null);
      toast.error(result.error || 'Failed to save dimension');
    }
  };

  return (
    <>
      {/* Save Confirmation Feedback */}
      <SaveConfirmation 
        show={showConfirmation}
        type={confirmationType}
        onComplete={() => setShowConfirmation(false)}
      />
      
      <FieldBottomSheet 
        open={open} 
        onOpenChange={onOpenChange}
        title="Add Dimension"
        maxHeight="85vh"
      >
        <div className="space-y-5">
        {/* Measurement Type */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
            Type
          </Label>
          <Select 
            value={formData.measurement_type} 
            onValueChange={(v) => setFormData({ ...formData, measurement_type: v })}
          >
            <SelectTrigger className="min-h-[52px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FF-FF" className="min-h-[48px]">Floor to Floor</SelectItem>
              <SelectItem value="FF-CL" className="min-h-[48px]">Floor to Ceiling</SelectItem>
              <SelectItem value="BM-C" className="min-h-[48px]">Benchmark to Ceiling</SelectItem>
              <SelectItem value="BM-F" className="min-h-[48px]">Benchmark to Floor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Value Input */}
        {unitSystem === 'imperial' ? (
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Value</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Input
                  type="number"
                  value={formData.value_feet}
                  onChange={(e) => setFormData({ ...formData, value_feet: parseInt(e.target.value) || 0 })}
                  placeholder="Feet"
                  className="min-h-[52px]"
                />
                <p className="text-xs text-slate-500 mt-1">Feet</p>
              </div>
              <div>
                <Input
                  type="number"
                  value={formData.value_inches}
                  onChange={(e) => setFormData({ ...formData, value_inches: parseInt(e.target.value) || 0 })}
                  placeholder="Inches"
                  className="min-h-[52px]"
                />
                <p className="text-xs text-slate-500 mt-1">Inches</p>
              </div>
              <div>
                <Select 
                  value={formData.value_fraction} 
                  onValueChange={(v) => setFormData({ ...formData, value_fraction: v })}
                >
                  <SelectTrigger className="min-h-[52px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0</SelectItem>
                    <SelectItem value="1/16">1/16</SelectItem>
                    <SelectItem value="1/8">1/8</SelectItem>
                    <SelectItem value="3/16">3/16</SelectItem>
                    <SelectItem value="1/4">1/4</SelectItem>
                    <SelectItem value="5/16">5/16</SelectItem>
                    <SelectItem value="3/8">3/8</SelectItem>
                    <SelectItem value="7/16">7/16</SelectItem>
                    <SelectItem value="1/2">1/2</SelectItem>
                    <SelectItem value="9/16">9/16</SelectItem>
                    <SelectItem value="5/8">5/8</SelectItem>
                    <SelectItem value="11/16">11/16</SelectItem>
                    <SelectItem value="3/4">3/4</SelectItem>
                    <SelectItem value="13/16">13/16</SelectItem>
                    <SelectItem value="7/8">7/8</SelectItem>
                    <SelectItem value="15/16">15/16</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">Fraction</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Value (mm)</Label>
            <Input
              type="number"
              value={formData.value_mm}
              onChange={(e) => setFormData({ ...formData, value_mm: parseInt(e.target.value) || 0 })}
              placeholder="Millimeters"
              className="mt-1.5 min-h-[52px]"
            />
          </div>
        )}

        {/* Location/Area */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Location/Area *
          </Label>
          <Input
            value={formData.area}
            onChange={(e) => setFormData({ ...formData, area: e.target.value })}
            placeholder="e.g., Main hallway, Room 101"
            className="mt-1.5 min-h-[52px]"
          />
        </div>

        {/* Device Type */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Device
          </Label>
          <Select 
            value={formData.device_type} 
            onValueChange={(v) => setFormData({ ...formData, device_type: v })}
          >
            <SelectTrigger className="mt-1.5 min-h-[52px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="laser" className="min-h-[48px]">📏 Laser</SelectItem>
              <SelectItem value="tape" className="min-h-[48px]">📐 Tape</SelectItem>
              <SelectItem value="digital" className="min-h-[48px]">📱 Digital</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Notes
          </Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Special conditions, obstacles, etc."
            className="mt-1.5 min-h-[80px]"
          />
        </div>

        {/* Save Button - BLOCKS until confirmed */}
        {/* CRITICAL: No close until save completes or fails */}
        <Button 
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(15);
            handleSave();
          }}
          disabled={saveProgress !== null}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white min-h-[64px] touch-manipulation active:scale-95 font-bold shadow-lg active:shadow-xl disabled:opacity-70"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {saveProgress === 'validating' && (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Validating...
            </>
          )}
          {saveProgress === 'persisting' && (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Saving locally...
            </>
          )}
          {saveProgress === 'uploading' && (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Uploading...
            </>
          )}
          {saveProgress === 'queuing' && (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Queuing offline...
            </>
          )}
          {saveProgress === 'confirming' && (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Confirming...
            </>
          )}
          {!saveProgress && 'Save Dimension'}
        </Button>
      </div>
    </FieldBottomSheet>
    </>
  );
}