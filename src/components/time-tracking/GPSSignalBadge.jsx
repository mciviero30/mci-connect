import React from 'react';
import { Zap } from 'lucide-react';

export default function GPSSignalBadge({ nearestJob }) {
  if (!nearestJob) return null;

  const distance = nearestJob.distanceMeters || 0;
  let color = '#ef4444'; // Red: bad signal
  let bgColor = 'bg-red-100/80 dark:bg-red-900/20';

  if (distance < 50) {
    color = '#22c55e'; // Green: excellent
    bgColor = 'bg-green-100/80 dark:bg-green-900/20';
  } else if (distance < 100) {
    color = '#f97316'; // Orange: medium
    bgColor = 'bg-orange-100/80 dark:bg-orange-900/20';
  }

  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full ${bgColor} backdrop-blur-sm border border-white/30`}>
      <Zap className="w-4 h-4" style={{ color, fill: color }} />
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
        {distance}m
      </span>
    </div>
  );
}