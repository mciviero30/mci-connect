import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function BenchMarkInput({ unitSystem, values, onChange }) {
  const unit = unitSystem === 'imperial' ? 'inches' : 'mm';

  return (
    <div className="space-y-3">
      <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">
        Bench Mark Measurements
      </Label>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Above BM */}
        <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-500 rounded-xl p-3">
          <Label className="text-xs text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            Above BM ({unit})
          </Label>
          <Input
            type="number"
            min="0"
            step="0.0625"
            value={values.benchmark_above || ''}
            onChange={(e) => onChange({ ...values, benchmark_above: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="text-center text-xl font-bold h-14 border-green-300 dark:border-green-700"
          />
        </div>

        {/* Below BM */}
        <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-500 rounded-xl p-3">
          <Label className="text-xs text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
            <ArrowDown className="w-3 h-3" />
            Below BM ({unit})
          </Label>
          <Input
            type="number"
            min="0"
            step="0.0625"
            value={values.benchmark_below || ''}
            onChange={(e) => onChange({ ...values, benchmark_below: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className="text-center text-xl font-bold h-14 border-red-300 dark:border-red-700"
          />
        </div>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
        <strong>Bench Mark</strong> = Laser reference line. Measure distances above (green) and below (red) separately.
      </div>
    </div>
  );
}