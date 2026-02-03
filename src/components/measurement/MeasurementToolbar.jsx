import React from 'react';
import { Ruler, Minus, Circle, Square, Highlighter, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// FASE D1 — Measurement Toolbar
// GRUPO 1: Measurement (structured, persisted)
// GRUPO 2: Markup (visual, local only)

const MEASUREMENT_TYPES = [
  { type: 'FF-FF', label: 'FF-FF', icon: Ruler },
  { type: 'CL-CL', label: 'CL-CL', icon: Ruler },
  { type: 'FF-CL', label: 'FF-CL', icon: Ruler },
  { type: 'CL-FF', label: 'CL-FF', icon: Ruler },
  { type: 'SFF-SFF', label: 'SFF-SFF', icon: Ruler },
  { type: 'BM-FF-UP', label: 'BM-FF ↑', icon: Ruler },
  { type: 'BM-FF-DOWN', label: 'BM-FF ↓', icon: Ruler },
  { type: 'BM-C', label: 'BM-C', icon: Ruler },
];

const MARKUP_TOOLS = [
  { type: 'line', label: 'Line', icon: Minus },
  { type: 'circle', label: 'Circle', icon: Circle },
  { type: 'rectangle', label: 'Rectangle', icon: Square },
  { type: 'highlight', label: 'Highlight', icon: Highlighter },
  { type: 'text', label: 'Text', icon: Type },
];

const COLORS = [
  { value: '#EF4444', label: 'Red' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Yellow' },
  { value: '#FFFFFF', label: 'White' },
];

const THICKNESS = [
  { value: 1, label: 'Fine' },
  { value: 3, label: 'Medium' },
  { value: 6, label: 'Thick' },
];

export default function MeasurementToolbar({ 
  activeTool, 
  onSelectTool, 
  markupOptions, 
  onChangeMarkupOptions,
  onClearMarkups 
}) {
  const isMeasurementActive = activeTool && !activeTool.startsWith('markup_');
  const isMarkupActive = activeTool && activeTool.startsWith('markup_');
  
  return (
    <div className="bg-slate-800 border-b border-slate-700 p-4">
      <div className="flex flex-col gap-4">
        {/* GRUPO 1: Measurement (Structured) */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Measure</h3>
          <div className="flex flex-wrap gap-2">
            {MEASUREMENT_TYPES.map(({ type, label, icon: Icon }) => {
              const isActive = activeTool === type;
              return (
                <Button
                  key={type}
                  onClick={() => onSelectTool(isActive ? null : type)}
                  className={`min-h-[52px] px-4 rounded-xl font-bold transition-all ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-lg border-2 border-orange-400'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* GRUPO 2: Markup (Visual only) */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Markup</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {MARKUP_TOOLS.map(({ type, label, icon: Icon }) => {
              const toolId = `markup_${type}`;
              const isActive = activeTool === toolId;
              return (
                <Button
                  key={type}
                  onClick={() => onSelectTool(isActive ? null : toolId)}
                  className={`min-h-[52px] px-4 rounded-xl font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg border-2 border-blue-400'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </Button>
              );
            })}
          </div>

          {/* Markup Options (only show when markup tool active) */}
          {isMarkupActive && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Color:</span>
                <div className="flex gap-1">
                  {COLORS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => onChangeMarkupOptions({ ...markupOptions, color: value })}
                      className={`w-8 h-8 rounded-lg border-2 transition-all ${
                        markupOptions.color === value
                          ? 'border-orange-400 scale-110 shadow-lg'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                      style={{ backgroundColor: value }}
                      title={label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Thickness:</span>
                <Select 
                  value={String(markupOptions.thickness)} 
                  onValueChange={(val) => onChangeMarkupOptions({ ...markupOptions, thickness: Number(val) })}
                >
                  <SelectTrigger className="w-28 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {THICKNESS.map(({ value, label }) => (
                      <SelectItem key={value} value={String(value)} className="text-white hover:bg-slate-700">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={onClearMarkups}
                variant="outline"
                className="bg-slate-700 border-slate-600 text-white hover:bg-red-600 hover:border-red-500"
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}