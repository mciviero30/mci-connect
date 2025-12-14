import React, { useState, useRef } from 'react';
import { 
  Pencil, Type, Eraser, Circle, Square, ArrowRight, 
  Undo2, Redo2, Trash2, Eye, EyeOff, Palette, Ruler,
  Download, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#FFB800' },
  { name: 'Green', value: '#10B981' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#000000' },
];

export default function AdvancedBlueprintTools({ 
  activeTool, 
  onToolChange, 
  annotations = [], 
  onAddAnnotation,
  onClearAnnotations,
  onSaveAnnotations 
}) {
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState('#FFB800');
  const [fontSize, setFontSize] = useState(16);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const tools = [
    { id: 'select', icon: Eye, label: 'Select' },
    { id: 'pencil', icon: Pencil, label: 'Draw' },
    { id: 'text', icon: Type, label: 'Add Text' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'square', icon: Square, label: 'Rectangle' },
    { id: 'measure', icon: Ruler, label: 'Measure' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ];

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  return (
    <TooltipProvider>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
        {/* Main Toolbar */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-2">
          {/* Tool Buttons */}
          <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-2">
            {tools.map((tool) => {
              const isActive = activeTool === tool.id;
              return (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onToolChange(tool.id)}
                      className={`p-2 rounded-lg transition-all ${
                        isActive 
                          ? 'bg-[#FFB800] text-white shadow-md' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <tool.icon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{tool.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Color Picker */}
          {['pencil', 'text', 'arrow', 'circle', 'square'].includes(activeTool) && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border-2 border-slate-300 dark:border-slate-600"
                    style={{ backgroundColor: brushColor }}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-3 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setBrushColor(color.value)}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${
                        brushColor === color.value 
                          ? 'border-[#FFB800] scale-110' 
                          : 'border-slate-200 dark:border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Brush Size */}
          {activeTool === 'pencil' && (
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-2 w-32">
              <Slider
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
                min={1}
                max={20}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 w-6">{brushSize}px</span>
            </div>
          )}

          {/* Font Size */}
          {activeTool === 'text' && (
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-2 w-32">
              <Slider
                value={[fontSize]}
                onValueChange={(value) => setFontSize(value[0])}
                min={8}
                max={72}
                step={2}
                className="flex-1"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 w-8">{fontSize}px</span>
            </div>
          )}

          {/* History Controls */}
          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Undo2 className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Redo2 className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Redo (Ctrl+Y)</p></TooltipContent>
            </Tooltip>
          </div>

          {/* Visibility Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowAnnotations(!showAnnotations)}
                className={`p-2 rounded-lg ${
                  showAnnotations 
                    ? 'text-[#FFB800]' 
                    : 'text-slate-400'
                }`}
              >
                {showAnnotations ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent><p>Toggle Annotations</p></TooltipContent>
          </Tooltip>

          {/* Clear All */}
          {annotations.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClearAnnotations}
                  className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Clear All Annotations</p></TooltipContent>
            </Tooltip>
          )}

          {/* Save */}
          {annotations.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onSaveAnnotations}
                  className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
                >
                  <Save className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Save Annotations</p></TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Annotation Count Badge */}
        {annotations.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-3 py-1">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}