import React from 'react';
import { ChevronRight, Pencil, Eye, Mic, Camera, Ruler, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * FieldContextBar - Always shows where user is and what they're doing
 * CRITICAL: User must never be confused about context
 */
export default function FieldContextBar({ 
  jobName, 
  currentPanel, 
  currentArea, 
  currentMode, 
  hasUnsavedChanges 
}) {
  // Panel display names
  const panelNames = {
    overview: 'Overview',
    tasks: 'Tasks',
    photos: 'Photos',
    dimensions: 'Dimensions',
    plans: 'Plans',
    'site-notes': 'Site Notes',
    voice: 'Voice Notes',
    chat: 'Chat',
    members: 'Team',
    activity: 'Activity',
    analytics: 'Analytics',
    documents: 'Documents',
    checklists: 'Checklists',
    approvals: 'Approvals',
    forms: 'Forms',
    reports: 'Reports',
    'ai-assistant': 'AI Assistant',
    'before-after': 'Before/After',
    'daily-reports': 'Daily Reports',
    budget: 'Budget',
    intelligence: 'Intelligence',
    completeness: 'Completeness',
    'ai-quality': 'AI Quality',
    package: 'Package Export',
  };

  // Mode icons and colors
  const modeConfig = {
    viewing: { icon: Eye, color: 'text-slate-400', label: 'Viewing' },
    editing: { icon: Pencil, color: 'text-yellow-400', label: 'Editing' },
    recording: { icon: Mic, color: 'text-red-400', label: 'Recording' },
    capturing: { icon: Camera, color: 'text-blue-400', label: 'Capturing' },
    measuring: { icon: Ruler, color: 'text-purple-400', label: 'Measuring' },
    reporting: { icon: AlertTriangle, color: 'text-orange-400', label: 'Reporting' },
  };

  const currentModeConfig = currentMode ? modeConfig[currentMode] : null;
  const ModeIcon = currentModeConfig?.icon;

  return (
    <div className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 px-3 py-2 sticky top-0 z-40 shadow-lg">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-hide">
        <span className="text-slate-400 font-medium truncate max-w-[120px]">
          {jobName}
        </span>
        
        <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
        
        <span className="text-white font-bold">
          {panelNames[currentPanel] || 'Unknown'}
        </span>
        
        {currentArea && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            <span className="text-[#FFB800] font-semibold">
              {currentArea}
            </span>
          </>
        )}
      </div>

      {/* Mode & Status Indicators */}
      <div className="flex items-center gap-2 mt-1.5">
        {/* Current Mode */}
        {currentModeConfig && (
          <Badge className={`${currentModeConfig.color} bg-slate-700/50 border-slate-600 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1`}>
            {ModeIcon && <ModeIcon className="w-3 h-3" />}
            {currentModeConfig.label}
          </Badge>
        )}

        {/* Unsaved Changes Warning */}
        {hasUnsavedChanges && (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40 px-2 py-0.5 text-[10px] font-bold animate-pulse">
            Unsaved
          </Badge>
        )}
      </div>
    </div>
  );
}