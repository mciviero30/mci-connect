import React from 'react';
import { Label } from '@/components/ui/label';
import { HelpCircle } from 'lucide-react';
import { MEASUREMENT_TYPES } from '@/components/measurement/measurementTypes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function MeasurementTypeSelector({ 
  dimensionType = 'horizontal', 
  value, 
  onChange 
}) {
  // Filter measurement types by orientation
  const filteredTypes = MEASUREMENT_TYPES.filter(
    (type) => type.orientation === dimensionType
  );

  const selectedType = filteredTypes.find((t) => t.id === value);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-bold">Measurement Type *</Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <HelpCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                FF–FF: wall to wall | CL–FF: center to surface | CL–CL: center to center | BM: bench mark
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="min-h-[48px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl">
          <SelectValue placeholder="Select measurement type" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl">
          {filteredTypes.map((type) => (
            <SelectItem key={type.id} value={type.id} className="py-3">
              <div className="flex items-center gap-3">
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  {type.short}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm hidden sm:block">
                  {type.label}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedType && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
          <div className="font-bold text-blue-900 dark:text-blue-100 mb-1">
            {selectedType.short}
          </div>
          <div className="text-blue-700 dark:text-blue-300 text-xs">
            {selectedType.description}
          </div>
        </div>
      )}
    </div>
  );
}