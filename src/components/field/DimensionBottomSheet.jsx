import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FieldBottomSheet from './FieldBottomSheet';
import DimensionValueInput from './dimensions/DimensionValueInput';
import MeasurementTypeSelector from './dimensions/MeasurementTypeSelector';
import BenchmarkInput from './dimensions/BenchMarkInput';

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
    area: dimension?.area || '',
    notes: dimension?.notes || '',
    measurement_type: dimension?.measurement_type || 'FF-FF',
    dimension_type: dimension?.dimension_type || 'horizontal',
    value_feet: dimension?.value_feet || 0,
    value_inches: dimension?.value_inches || 0,
    value_fraction: dimension?.value_fraction || '0',
    value_mm: dimension?.value_mm || 0,
    benchmark_label: dimension?.benchmark_label || '',
    device_type: dimension?.device_type || 'laser',
  });

  const handleSave = () => {
    if (!formData.area) {
      alert('Please enter location/area');
      return;
    }

    const saveData = {
      ...dimension,
      ...formData,
      job_id: jobId,
      job_name: jobName,
      unit_system: unitSystem,
    };

    onSave(saveData);
    onOpenChange(false);
  };

  return (
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
            Measurement Type
          </Label>
          <MeasurementTypeSelector
            type={formData.dimension_type}
            selectedType={formData.measurement_type}
            onTypeChange={(type) => setFormData({ ...formData, measurement_type: type })}
          />
        </div>

        {/* Benchmark (for vertical only) */}
        {formData.dimension_type === 'vertical' && (
          <BenchmarkInput
            value={formData.benchmark_label}
            onChange={(value) => setFormData({ ...formData, benchmark_label: value })}
            jobId={jobId}
          />
        )}

        {/* Dimension Value */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
            Measurement Value
          </Label>
          <DimensionValueInput
            unitSystem={unitSystem}
            feet={formData.value_feet}
            inches={formData.value_inches}
            fraction={formData.value_fraction}
            mm={formData.value_mm}
            onFeetChange={(v) => setFormData({ ...formData, value_feet: v })}
            onInchesChange={(v) => setFormData({ ...formData, value_inches: v })}
            onFractionChange={(v) => setFormData({ ...formData, value_fraction: v })}
            onMmChange={(v) => setFormData({ ...formData, value_mm: v })}
          />
        </div>

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
            Measuring Device
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
              <SelectItem value="tape" className="min-h-[48px]">📐 Tape Measure</SelectItem>
              <SelectItem value="digital" className="min-h-[48px]">📱 Digital</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Notes (Optional)
          </Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Special conditions, obstacles, etc."
            className="mt-1.5 min-h-[80px]"
          />
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white min-h-[56px] touch-manipulation active:scale-95 font-bold shadow-lg"
        >
          Save Dimension
        </Button>
      </div>
    </FieldBottomSheet>
  );
}