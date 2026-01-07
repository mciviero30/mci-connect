import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FRACTIONS = ['0', '1/16', '1/8', '3/16', '1/4', '5/16', '3/8', '7/16', '1/2', '9/16', '5/8', '11/16', '3/4', '13/16', '7/8', '15/16'];

export default function DimensionValueInput({ unitSystem, values, onChange }) {
  if (unitSystem === 'imperial') {
    return (
      <div className="space-y-3">
        <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Measurement Value *
        </Label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5">Feet</Label>
            <Input
              type="number"
              min="0"
              value={values.value_feet || ''}
              onChange={(e) => onChange({ ...values, value_feet: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="text-center text-lg font-bold h-14"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5">Inches</Label>
            <Input
              type="number"
              min="0"
              max="11"
              value={values.value_inches || ''}
              onChange={(e) => onChange({ ...values, value_inches: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="text-center text-lg font-bold h-14"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-600 dark:text-slate-400 mb-1.5">Fraction</Label>
            <Select
              value={values.value_fraction || '0'}
              onValueChange={(frac) => onChange({ ...values, value_fraction: frac })}
            >
              <SelectTrigger className="h-14 text-center font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FRACTIONS.map(frac => (
                  <SelectItem key={frac} value={frac}>{frac === '0' ? '—' : frac}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
        Measurement Value (mm) *
      </Label>
      <Input
        type="number"
        min="0"
        step="1"
        value={values.value_mm || ''}
        onChange={(e) => onChange({ ...values, value_mm: parseFloat(e.target.value) || 0 })}
        placeholder="0"
        className="text-center text-2xl font-bold h-16"
      />
    </div>
  );
}