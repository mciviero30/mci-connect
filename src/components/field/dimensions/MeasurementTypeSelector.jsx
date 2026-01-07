import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function MeasurementTypeSelector({ dimensionType, value, onChange }) {
  const horizontalTypes = [
    { value: 'FF-FF', label: 'FF–FF', description: 'Finish face to finish face' },
    { value: 'FF-CL', label: 'FF–CL', description: 'Finish face to center line' },
    { value: 'CL-FF', label: 'CL–FF', description: 'Center line to finish face' },
    { value: 'CL-CL', label: 'CL–CL', description: 'Center line to center line' },
  ];

  const verticalTypes = [
    { value: 'BM-C', label: 'BM–C', description: 'Bench Mark to Ceiling' },
    { value: 'BM-F', label: 'BM–F', description: 'Bench Mark to Floor' },
    { value: 'F-C', label: 'F–C', description: 'Floor to Ceiling' },
    { value: 'BM-ONLY', label: 'BM Only', description: 'Bench Mark reference only' },
  ];

  const types = dimensionType === 'horizontal' ? horizontalTypes : verticalTypes;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
        Measurement Type *
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {types.map((type) => (
          <button
            key={type.value}
            onClick={() => onChange(type.value)}
            className={`min-h-[60px] px-4 py-3 rounded-xl border-2 transition-all touch-manipulation active:scale-[0.98] ${
              value === type.value
                ? 'bg-gradient-to-br from-orange-500 to-yellow-500 border-orange-500 text-white shadow-lg'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-orange-400'
            }`}
          >
            <div className="font-bold text-base mb-0.5">{type.label}</div>
            <div className={`text-xs ${value === type.value ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
              {type.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}