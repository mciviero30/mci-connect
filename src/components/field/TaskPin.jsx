import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

const statusColors = {
  pending: { bg: 'bg-amber-500', border: 'border-amber-300', point: 'border-t-amber-500' },
  in_progress: { bg: 'bg-blue-500', border: 'border-blue-300', point: 'border-t-blue-500' },
  completed: { bg: 'bg-green-500', border: 'border-green-300', point: 'border-t-green-500' },
  blocked: { bg: 'bg-red-500', border: 'border-red-300', point: 'border-t-red-500' },
};

export default function TaskPin({ task, onClick, isSelected, isErasing }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (task.pin_x === undefined || task.pin_y === undefined) return null;

  const status = statusColors[task.status] || statusColors.pending;
  
  // Extract wall number from title (e.g., "Wall 019" -> "019")
  const wallNumber = task.title?.match(/\d+/)?.[0] || '';

  return (
    <div
      className={`absolute transform -translate-x-1/2 -translate-y-full ${
        isSelected ? 'z-50' : 'z-30'
      }`}
      style={{ 
        left: `${task.pin_x}%`, 
        top: `${task.pin_y}%`
      }}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onClick) onClick(task);
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`transition-all hover:scale-110 ${
          isSelected ? 'scale-125' : ''
        } ${isErasing ? 'cursor-pointer hover:opacity-70' : ''}`}
      >
      <div className="relative">
        {/* Compact pin with just wall number */}
        <div className={`min-w-[28px] h-6 px-1.5 rounded-md ${isErasing ? 'bg-red-500' : status.bg} border-2 border-white shadow-lg flex items-center justify-center ${isErasing ? 'animate-pulse' : ''}`}>
          <span className="text-[11px] font-bold text-white">{wallNumber || '?'}</span>
        </div>
        {/* Pin point */}
        <div 
          className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 
            border-l-[5px] border-l-transparent 
            border-r-[5px] border-r-transparent 
            border-t-[6px] ${status.point}`}
        />
        {/* Tooltip on hover - minimal */}
        {(showTooltip || isSelected) && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-slate-800 rounded-lg shadow-xl whitespace-nowrap z-30 border border-slate-600">
            <p className="text-xs font-medium text-white">Wall {wallNumber}</p>
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-800" />
          </div>
        )}
      </div>
      </button>
    </div>
  );
}