import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Clock, Car, ChevronRight } from 'lucide-react';

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const SESSION_KEYS = ['liveTimeTracker_work', 'liveTimeTracker_driving'];

function getActiveSession() {
  for (const key of SESSION_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const session = JSON.parse(raw);
        if (session && session.startTime) return { session, key };
      }
    } catch (e) {}
  }
  return null;
}

export default function ActiveSessionBanner() {
  const navigate = useNavigate();
  const [activeData, setActiveData] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = () => {
      const found = getActiveSession();
      if (found) {
        setActiveData(found);
        const secs = Math.floor((Date.now() - found.session.startTime) / 1000);
        setElapsed(Math.max(0, secs));
      } else {
        setActiveData(null);
        setElapsed(0);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!activeData) return null;

  const { session } = activeData;
  const isDriving = session.workType === 'driving';
  const isOnBreak = session.onBreak;

  const handleTap = () => {
    navigate(createPageUrl('MisHoras'));
  };

  return (
    <div
      onClick={handleTap}
      className="fixed top-0 left-0 right-0 z-[9999] cursor-pointer select-none"
    >
      <div className={`flex items-center gap-2 px-3 py-2 text-white shadow-lg ${
        isOnBreak
          ? 'bg-amber-600'
          : isDriving
          ? 'bg-gradient-to-r from-amber-500 to-orange-600'
          : 'bg-gradient-to-r from-blue-700 to-blue-600'
      }`}>
        {/* Pulsing dot */}
        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            isOnBreak ? 'bg-amber-200' : 'bg-green-300'
          }`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            isOnBreak ? 'bg-amber-200' : 'bg-green-400'
          }`} />
        </span>

        {isDriving
          ? <Car className="w-3.5 h-3.5 flex-shrink-0" />
          : <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        }

        <span className="text-[11px] font-bold truncate flex-1">
          {isOnBreak ? '⏸ ' : ''}
          {session.jobName}
        </span>

        <span className="text-[12px] font-black font-mono flex-shrink-0">
          {formatTime(elapsed)}
        </span>

        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
      </div>
    </div>
  );
}