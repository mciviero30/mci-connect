import React from 'react';
import { HORIZONTAL_TYPES, VERTICAL_TYPES, BENCHMARK_TYPES } from '@/components/field/utils/dimensionLogic';

/**
 * Automatic legend for measurement colors and types
 * Used in PDF export and on-screen display
 */
export default function MeasurementLegend({ 
  showHorizontal = true, 
  showVertical = true, 
  showBenchmarks = true,
  compact = false 
}) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl ${compact ? 'p-3' : 'p-4'} shadow-lg border border-slate-200 dark:border-slate-700`}>
      <h3 className={`font-bold text-slate-900 dark:text-white mb-3 ${compact ? 'text-xs' : 'text-sm'}`}>
        Measurement Legend
      </h3>

      <div className="space-y-3">
        {/* Horizontal Measurements */}
        {showHorizontal && (
          <div>
            <p className={`text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ${compact ? 'text-[9px]' : 'text-[10px]'} font-bold`}>
              Horizontal
            </p>
            <div className="space-y-1.5">
              {Object.entries(HORIZONTAL_TYPES).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2">
                  <div 
                    className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} rounded-full border-2`}
                    style={{ 
                      backgroundColor: config.color,
                      borderColor: config.color 
                    }}
                  />
                  <span className={`text-slate-700 dark:text-slate-300 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    {config.label} - {config.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vertical Measurements */}
        {showVertical && (
          <div>
            <p className={`text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ${compact ? 'text-[9px]' : 'text-[10px]'} font-bold`}>
              Vertical
            </p>
            <div className="space-y-1.5">
              {Object.entries(VERTICAL_TYPES).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2">
                  <div 
                    className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} rounded-full border-2`}
                    style={{ 
                      backgroundColor: config.color,
                      borderColor: config.color 
                    }}
                  />
                  <span className={`text-slate-700 dark:text-slate-300 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    {config.label} - {config.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Benchmarks */}
        {showBenchmarks && (
          <div>
            <p className={`text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ${compact ? 'text-[9px]' : 'text-[10px]'} font-bold`}>
              Benchmarks
            </p>
            <div className="space-y-1.5">
              {Object.entries(BENCHMARK_TYPES).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2">
                  <div 
                    className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} rounded-full border-2`}
                    style={{ 
                      backgroundColor: config.color,
                      borderColor: config.color 
                    }}
                  />
                  <span className={`text-slate-700 dark:text-slate-300 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                    {config.icon} {config.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={`mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 ${compact ? 'text-[9px]' : 'text-[10px]'} text-slate-400`}>
        Tap to view • Long press to edit
      </div>
    </div>
  );
}