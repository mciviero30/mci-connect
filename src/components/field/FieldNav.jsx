import React, { useState } from 'react';
import { 
  MapPin, 
  Ruler, 
  ClipboardCheck, 
  Search, 
  MessageSquare, 
  Bell, 
  Plus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GestureHandler, { useGestureHandler } from './GestureHandler';
import GestureHelpTooltip from './GestureHelpTooltip';

export default function FieldNav({ activeTab, onTabChange, language, onNewTask, onClosePanel }) {
  const [showGestureHelp, setShowGestureHelp] = useState(false);
  const tabs = [
    { id: 'jobs', label: language === 'es' ? 'Trabajos' : 'Jobs', icon: MapPin, color: 'text-orange-400' },
    { id: 'measurements', label: language === 'es' ? 'Mediciones' : 'Measurements', icon: Ruler, color: 'text-purple-400' },
    { id: 'checklists', label: language === 'es' ? 'Listas' : 'Checklists', icon: ClipboardCheck, color: 'text-green-400' },
    { id: 'search', label: language === 'es' ? 'Buscar' : 'Search', icon: Search, color: 'text-blue-400' },
    { id: 'chat', label: language === 'es' ? 'Chat' : 'Chat', icon: MessageSquare, color: 'text-cyan-400' },
    { id: 'notifications', label: language === 'es' ? 'Notif.' : 'Notif.', icon: Bell, color: 'text-yellow-400' },
  ];

  const gestureContainerRef = useGestureHandler({
    onLeftEdgeSwipe: () => onTabChange('search'), // Open search on left edge swipe
    onRightEdgeSwipe: onClosePanel, // Close panel on right edge swipe
    onTwoFingerTap: () => setShowGestureHelp(true), // Show help on two-finger tap
    canGestureClose: !!onClosePanel, // Only enable close if callback exists
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Quick New Task Button */}
        <Button
          onClick={onNewTask}
          className="flex-shrink-0 min-h-[44px] px-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold shadow-lg touch-manipulation"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">{language === 'es' ? 'Nueva' : 'New'}</span>
        </Button>
      </div>
    </div>
    </>
  );
}