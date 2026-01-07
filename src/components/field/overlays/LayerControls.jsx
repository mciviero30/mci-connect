import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  EyeOff, 
  MapPin, 
  Ruler, 
  Camera, 
  Crosshair, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Layer visibility controls for blueprint overlays
 */
export default function LayerControls({ layers, onLayerToggle }) {
  const layerConfig = [
    { 
      id: 'tasks', 
      icon: MapPin, 
      label: 'Tasks', 
      color: 'text-amber-500',
      bgActive: 'bg-amber-500/20',
      border: 'border-amber-500'
    },
    { 
      id: 'horizontal', 
      icon: Ruler, 
      label: 'Horizontal', 
      color: 'text-blue-500',
      bgActive: 'bg-blue-500/20',
      border: 'border-blue-500'
    },
    { 
      id: 'vertical', 
      icon: FileText, 
      label: 'Vertical', 
      color: 'text-purple-500',
      bgActive: 'bg-purple-500/20',
      border: 'border-purple-500'
    },
    { 
      id: 'benchmarks', 
      icon: Crosshair, 
      label: 'Benchmarks', 
      color: 'text-red-500',
      bgActive: 'bg-red-500/20',
      border: 'border-red-500'
    },
    { 
      id: 'photos', 
      icon: Camera, 
      label: 'Photos', 
      color: 'text-green-500',
      bgActive: 'bg-green-500/20',
      border: 'border-green-500'
    },
    { 
      id: 'incidents', 
      icon: AlertTriangle, 
      label: 'Incidents', 
      color: 'text-orange-500',
      bgActive: 'bg-orange-500/20',
      border: 'border-orange-500'
    }
  ];

  return (
    <div className="absolute top-16 right-4 z-40 bg-slate-800/95 backdrop-blur-sm border-2 border-slate-600 rounded-2xl shadow-2xl p-2 flex flex-col gap-1">
      <div className="px-2 pb-2 border-b border-slate-600">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Layers</span>
      </div>
      
      {layerConfig.map((layer) => {
        const isVisible = layers[layer.id] ?? true;
        const Icon = layer.icon;
        
        return (
          <Tooltip key={layer.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onLayerToggle(layer.id)}
                className={`min-w-[48px] min-h-[48px] rounded-xl transition-all touch-manipulation active:scale-95 flex items-center justify-center relative ${
                  isVisible 
                    ? `${layer.bgActive} ${layer.border} border-2 shadow-lg` 
                    : 'bg-slate-700/50 text-slate-500 border-2 border-slate-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isVisible ? layer.color : 'text-slate-500'}`} />
                {!isVisible && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <EyeOff className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-slate-800 border-slate-600 text-white">
              <p>{isVisible ? 'Hide' : 'Show'} {layer.label}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}