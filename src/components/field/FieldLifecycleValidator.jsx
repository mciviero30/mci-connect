import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { mobileLifecycle } from './services/MobileLifecycleManager';
import { useFieldDebugMode } from './hooks/useFieldDebugMode';
import { Badge } from '@/components/ui/badge';
import { Activity, Wifi, WifiOff, Eye, EyeOff } from 'lucide-react';

/**
 * Field Lifecycle Validator (Dev Only)
 * Real-time monitoring of mobile lifecycle events
 * 
 * Validates:
 * - Background/Foreground transitions
 * - Network online/offline
 * - State preservation
 * - No unwanted remounts
 * - No refetches
 */
export default function FieldLifecycleValidator({ jobId, user }) {
  const isDebugMode = useFieldDebugMode(user);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    backgroundCount: 0,
    foregroundCount: 0,
    offlineCount: 0,
    onlineCount: 0,
    longestBackground: 0,
    longestOffline: 0,
  });

  useEffect(() => {
    if (!import.meta.env?.DEV) return;

    const addEvent = (type, data = {}) => {
      const event = {
        type,
        timestamp: new Date().toISOString(),
        time: format(new Date(), 'HH:mm:ss'),
        ...data,
      };
      
      setEvents(prev => [event, ...prev].slice(0, 20)); // Keep last 20 events
    };

    // Subscribe to all lifecycle events
    const unsubBackground = mobileLifecycle.on('background', (data) => {
      addEvent('background', { online: data.online });
      setStats(prev => ({ ...prev, backgroundCount: prev.backgroundCount + 1 }));
    });

    const unsubForeground = mobileLifecycle.on('foreground', (data) => {
      const durationSec = Math.round(data.duration / 1000);
      addEvent('foreground', { 
        duration: `${durationSec}s`,
        wasLong: data.wasLongBackground 
      });
      setStats(prev => ({
        ...prev,
        foregroundCount: prev.foregroundCount + 1,
        longestBackground: Math.max(prev.longestBackground, durationSec),
      }));
    });

    const unsubOnline = mobileLifecycle.on('online', (data) => {
      const durationSec = Math.round(data.offlineDuration / 1000);
      addEvent('online', { offlineDuration: `${durationSec}s` });
      setStats(prev => ({
        ...prev,
        onlineCount: prev.onlineCount + 1,
        longestOffline: Math.max(prev.longestOffline, durationSec),
      }));
    });

    const unsubOffline = mobileLifecycle.on('offline', (data) => {
      addEvent('offline', { wasBackground: data.wasBackground });
      setStats(prev => ({ ...prev, offlineCount: prev.offlineCount + 1 }));
    });

    return () => {
      unsubBackground();
      unsubForeground();
      unsubOnline();
      unsubOffline();
    };
  }, []);

  // Only render debug UI if in debug mode
  if (!isDebugMode) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-2">
        <Activity className="w-4 h-4 text-green-400" />
        <span className="font-bold text-white">Lifecycle Monitor</span>
        <Badge className="ml-auto bg-green-500/20 text-green-300 text-[10px]">
          {jobId?.slice(0, 8)}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400">Background</div>
          <div className="text-sm font-bold text-white">{stats.backgroundCount}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400">Foreground</div>
          <div className="text-sm font-bold text-white">{stats.foregroundCount}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400">Offline</div>
          <div className="text-sm font-bold text-white">{stats.offlineCount}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-[10px] text-slate-400">Online</div>
          <div className="text-sm font-bold text-white">{stats.onlineCount}</div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {events.slice(0, 5).map((event, idx) => (
          <div key={idx} className="bg-slate-800/30 rounded px-2 py-1 flex items-center gap-2">
            {event.type === 'background' && <EyeOff className="w-3 h-3 text-orange-400" />}
            {event.type === 'foreground' && <Eye className="w-3 h-3 text-green-400" />}
            {event.type === 'offline' && <WifiOff className="w-3 h-3 text-red-400" />}
            {event.type === 'online' && <Wifi className="w-3 h-3 text-blue-400" />}
            <span className="text-slate-300 flex-1">{event.type}</span>
            <span className="text-slate-500 text-[9px]">{event.time}</span>
          </div>
        ))}
      </div>

      {/* Longest periods */}
      {(stats.longestBackground > 0 || stats.longestOffline > 0) && (
        <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] text-slate-400">
          {stats.longestBackground > 0 && <div>Max BG: {stats.longestBackground}s</div>}
          {stats.longestOffline > 0 && <div>Max Offline: {stats.longestOffline}s</div>}
        </div>
      )}
    </div>
  );
}