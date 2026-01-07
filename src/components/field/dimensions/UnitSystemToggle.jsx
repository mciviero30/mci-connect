import React from 'react';
import { Label } from '@/components/ui/label';

export default function UnitSystemToggle({ value, onChange }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
        Unit System *
      </Label>
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner">
        <button
          onClick={() => onChange('imperial')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all min-h-[48px] touch-manipulation ${
            value === 'imperial'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Imperial (ft/in)
        </button>
        <button
          onClick={() => onChange('metric')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all min-h-[48px] touch-manipulation ${
            value === 'metric'
              ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Metric (mm)
        </button>
      </div>
    </div>
  );
}