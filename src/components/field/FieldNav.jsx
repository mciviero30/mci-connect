import React, { useState } from 'react';
import { 
  MapPin, 
  Ruler, 
  Camera,
  Plus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GestureHandler, { useGestureHandler } from './GestureHandler';
import GestureHelpTooltip from './GestureHelpTooltip';

// FASE 5 PERF: Memoized navigation component
const FieldNav = React.memo(function FieldNav({ activeTab, onTabChange, language, onNewTask, onClosePanel }) {
  const [showGestureHelp, setShowGestureHelp] = useState(false);
  
  // FASE 5 PERF: Memoized tabs definition (stable reference)
  const tabs = React.useMemo(() => [
    { 
      id: 'plans', 
      label: language === 'es' ? 'Planos' : 'Plans', 
      icon: MapPin, 
      color: 'text-orange-400' 
    },
    { 
      id: 'measurements', 
      label: language === 'es' ? 'Medir' : 'Measure', 
      icon: Ruler, 
      color: 'text-purple-400' 
    },
    { 
      id: 'capture', 
      label: language === 'es' ? 'Capturar' : 'Capture', 
      icon: Camera, 
      color: 'text-blue-400' 
    },
  ], [language]);

  // FASE 4 (UX): Simplified gestures - no search gesture
  const gestureContainerRef = useGestureHandler({
    onRightEdgeSwipe: onClosePanel, // Close panel on right edge swipe
    onTwoFingerTap: () => setShowGestureHelp(true), // Show help on two-finger tap
    canGestureClose: !!onClosePanel,
  });

  return (
    <>
      <GestureHelpTooltip isVisible={showGestureHelp} onDismiss={() => setShowGestureHelp(false)} />
      <div ref={gestureContainerRef} className="flex-shrink-0 bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-shrink-0 min-h-[44px] px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all touch-manipulation ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600 to-yellow-500 text-white shadow-lg'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 mr-1.5 ${isActive ? 'text-white' : tab.color}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            );
          })}
        </div>

        </div>
      </div>
    </>
  );
});

export default FieldNav;