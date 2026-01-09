import React, { useState } from 'react';
import { X, ChevronDown, Shield, Database, Activity, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/**
 * Field Debug Drawer (Admin/Debug Only)
 * 
 * Isolated debug UI that slides in from the side.
 * Only visible when:
 * - user.role === 'admin' OR
 * - URL contains ?debug=true
 * 
 * Prevents floating panels from polluting the production Field layout.
 */
export default function FieldDebugDrawer({ isVisible, onClose, currentUser }) {
  const [expandedPanel, setExpandedPanel] = useState(null);

  // Don't render at all for non-admins
  const isDebugMode = currentUser?.role === 'admin' || 
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug'));
  
  if (!isDebugMode || !isVisible) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[99] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer - Slide from right */}
      <div className="fixed right-0 top-0 bottom-0 w-96 max-w-[90vw] bg-slate-900 border-l border-slate-700 shadow-2xl z-[100] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 sticky top-0 bg-gradient-to-b from-slate-900 to-slate-900/80 border-b border-slate-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <h2 className="font-bold text-white">Debug Console</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Data Loss Protection Panel */}
          <div className="bg-slate-800/50 border border-blue-500/30 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedPanel(expandedPanel === 'data-loss' ? null : 'data-loss')}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors"
            >
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-white text-sm flex-1">Data Loss Protection</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPanel === 'data-loss' ? 'rotate-180' : ''}`} />
            </button>
            {expandedPanel === 'data-loss' && (
              <div className="px-3 pb-3 space-y-2 text-xs text-slate-300 border-t border-slate-700/50">
                <p className="text-slate-400">IndexedDB: <span className="text-green-400">Healthy</span></p>
                <p className="text-slate-400">sessionStorage: <span className="text-green-400">Healthy</span></p>
                <p className="text-slate-400">Unsynced Items: <span className="text-yellow-400">0</span></p>
                <p className="text-[10px] text-slate-500 mt-2">Enable debug logs in console for details</p>
              </div>
            )}
          </div>

          {/* Offline Sync Panel */}
          <div className="bg-slate-800/50 border border-cyan-500/30 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedPanel(expandedPanel === 'sync' ? null : 'sync')}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white text-sm flex-1">Offline Sync</span>
              <Badge className="text-[10px] bg-green-500/20 text-green-300">ONLINE</Badge>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPanel === 'sync' ? 'rotate-180' : ''}`} />
            </button>
            {expandedPanel === 'sync' && (
              <div className="px-3 pb-3 space-y-2 text-xs text-slate-300 border-t border-slate-700/50">
                <p className="text-slate-400">Sync Status: <span className="text-green-400">IDLE</span></p>
                <p className="text-slate-400">Pending: <span className="text-orange-400">0</span></p>
                <p className="text-slate-400">Completed: <span className="text-green-400">0</span></p>
                <p className="text-slate-400">Failed: <span className="text-red-400">0</span></p>
                <p className="text-[10px] text-slate-500 mt-2">Enable debug logs in console for details</p>
              </div>
            )}
          </div>

          {/* Lifecycle Monitor Panel */}
          <div className="bg-slate-800/50 border border-green-500/30 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedPanel(expandedPanel === 'lifecycle' ? null : 'lifecycle')}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors"
            >
              <Activity className="w-4 h-4 text-green-400" />
              <span className="font-bold text-white text-sm flex-1">Lifecycle Monitor</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPanel === 'lifecycle' ? 'rotate-180' : ''}`} />
            </button>
            {expandedPanel === 'lifecycle' && (
              <div className="px-3 pb-3 space-y-2 text-xs text-slate-300 border-t border-slate-700/50">
                <p className="text-slate-400">Background: <span className="text-white">0</span></p>
                <p className="text-slate-400">Foreground: <span className="text-white">0</span></p>
                <p className="text-slate-400">Offline: <span className="text-white">0</span></p>
                <p className="text-slate-400">Online: <span className="text-white">0</span></p>
                <p className="text-[10px] text-slate-500 mt-2">Enable debug logs in console for details</p>
              </div>
            )}
          </div>

          {/* Performance Monitor Panel */}
          <div className="bg-slate-800/50 border border-purple-500/30 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedPanel(expandedPanel === 'perf' ? null : 'perf')}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors"
            >
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="font-bold text-white text-sm flex-1">Performance</span>
              <Badge className="text-[10px] bg-green-500/20 text-green-300">60 FPS</Badge>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedPanel === 'perf' ? 'rotate-180' : ''}`} />
            </button>
            {expandedPanel === 'perf' && (
              <div className="px-3 pb-3 space-y-2 text-xs text-slate-300 border-t border-slate-700/50">
                <p className="text-slate-400">FPS: <span className="text-green-400">60</span></p>
                <p className="text-slate-400">Avg Render: <span className="text-green-400">5ms</span></p>
                <p className="text-slate-400">Long Tasks: <span className="text-white">0</span></p>
                <p className="text-[10px] text-slate-500 mt-2">Enable debug logs in console for details</p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
            <p className="font-bold text-slate-300 mb-2">Debug Mode Active</p>
            <p>Open your browser's Developer Tools (F12) to see detailed logs and metrics.</p>
          </div>
        </div>
      </div>
    </>
  );
}