import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Info } from 'lucide-react';

export default function DimensionLegend({ unitSystem }) {
  return (
    <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 border-2 border-amber-300 dark:border-amber-700">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-xs">
            <div className="font-bold text-amber-900 dark:text-amber-100 text-sm mb-2">
              Measurement Reference Guide
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <span className="font-bold text-amber-800 dark:text-amber-300">FF</span> = Finish Face
              </div>
              <div>
                <span className="font-bold text-amber-800 dark:text-amber-300">CL</span> = Center Line
              </div>
              <div>
                <span className="font-bold text-amber-800 dark:text-amber-300">BM</span> = Bench Mark (laser reference)
              </div>
              <div>
                <span className="font-bold text-amber-800 dark:text-amber-300">Unit</span> = {unitSystem === 'imperial' ? 'Imperial (ft/in)' : 'Metric (mm)'}
              </div>
            </div>

            <div className="pt-2 border-t border-amber-300 dark:border-amber-700 mt-3">
              <div className="font-bold text-amber-900 dark:text-amber-100 mb-1">Color Code:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full" />
                  <span className="text-amber-800 dark:text-amber-300">Above Bench Mark</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full" />
                  <span className="text-amber-800 dark:text-amber-300">Below Bench Mark</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded-full border-2 border-dashed border-yellow-700" />
                  <span className="text-amber-800 dark:text-amber-300">Bench Mark Line</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}