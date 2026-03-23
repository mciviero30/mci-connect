import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Clock, Car } from 'lucide-react';

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

  return (
    <button
      onClick={() => navigate(createPageUrl('TimeTracking'))}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-white text-[9px] font-bold shadow-md transition-all active:scale-95 ${
        isOnBreak
          ? 'bg-amber-500'
          : isDriving
          ? 'bg-orange-500'
          : 'bg-green-600'
      }`}
      title={session.jobName}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
      </span>
      {isDriving ? <Car className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      <span className="font-mono tabular-nums">{formatTime(elapsed)}</span>
    </button>
  );
}