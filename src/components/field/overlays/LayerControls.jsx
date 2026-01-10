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
      color: 'text-orange-400',
      bgActive: 'bg-gradient-to-br from-orange-600/30 to-yellow-500/30',
      border: 'border-orange-500'
    },
    { 
      id: 'horizontal', 
      icon: Ruler, 
      label: 'Horizontal', 
      color: 'text-blue-400',
      bgActive: 'bg-gradient-to-br from-blue-600/30 to-cyan-500/30',
      border: 'border-blue-500'
    },
    { 
      id: 'vertical', 
      icon: FileText, 
      label: 'Vertical', 
      color: 'text-purple-400',
      bgActive: 'bg-gradient-to-br from-purple-600/30 to-pink-500/30',
      border: 'border-purple-500'
    },
    { 
      id: 'benchmarks', 
      icon: Crosshair, 
      label: 'Benchmarks', 
      color: 'text-red-400',
      bgActive: 'bg-gradient-to-br from-red-600/30 to-orange-600/30',
      border: 'border-red-500'
    },
    { 
      id: 'photos', 
      icon: Camera, 
      label: 'Photos', 
      color: 'text-green-400',
      bgActive: 'bg-gradient-to-br from-green-600/30 to-emerald-500/30',
      border: 'border-green-500'
    },
    { 
      id: 'incidents', 
      icon: AlertTriangle, 
      label: 'Incidents', 
      color: 'text-amber-400',
      bgActive: 'bg-gradient-to-br from-amber-600/30 to-orange-500/30',
      border: 'border-amber-500'
    }
  ];

  return (
    <div className="absolute top-20 md:top-24 right-2 md:right-4 z-40 bg-gradient-to-b from-slate-900 to-black backdrop-blur-sm border-2 border-slate-700 rounded-2xl shadow-2xl p-2 flex flex-col gap-1.5">
      <div className="px-2 pb-2 border-b-2 border-slate-700">
        <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Layers</span>
      </div>
      
      {layerConfig.map((layer) => {
        const isVisible = layers[layer.id] ?? true;
        const Icon = layer.icon;
        
        return (
          <Tooltip key={layer.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onLayerToggle(layer.id)}
                className={`min-w-[52px] min-h-[52px] rounded-xl transition-all touch-manipulation active:scale-95 flex items-center justify-center relative ${
                  isVisible 
                    ? `${layer.bgActive} ${layer.border} border-2 shadow-xl` 
                    : 'bg-slate-800/80 text-slate-600 border-2 border-slate-700 hover:bg-slate-700'
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