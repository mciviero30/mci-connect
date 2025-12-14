import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

const statusColors = {
  pending: { bg: 'bg-amber-500', border: 'border-amber-300', point: 'border-t-amber-500', text: 'text-white' },
  in_progress: { bg: 'bg-blue-500', border: 'border-blue-300', point: 'border-t-blue-500', text: 'text-white' },
  completed: { bg: 'bg-green-500', border: 'border-green-300', point: 'border-t-green-500', text: 'text-white' },
  blocked: { bg: 'bg-red-500', border: 'border-red-300', point: 'border-t-red-500', text: 'text-white' },
};

export default function TaskPin({ task, onClick, isSelected, onDragPin, isDragging }) {
  if (task.pin_x === undefined || task.pin_y === undefined) return null;

  const status = statusColors[task.status] || statusColors.pending;
  
  // Extract wall number from title (e.g., "Wall 019" -> "019")
  const wallNumber = task.title?.match(/\d+/)?.[0] || '';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      onMouseDown={(e) => {
        if (onDragPin) {
          e.stopPropagation();
          onDragPin(task, e);
        }
      }}
      className={`absolute transform -translate-x-1/2 -translate-y-full transition-all hover:scale-110 z-10 cursor-pointer ${
        isSelected ? 'scale-125 z-20' : ''
      } ${isDragging ? 'cursor-move' : ''}`}
      style={{ left: `${task.pin_x}%`, top: `${task.pin_y}%` }}
    >
      <div className="relative">
        {/* Compact pin with just wall number */}
        <div className={`min-w-[28px] h-6 px-1.5 rounded-md ${status.bg} border-2 border-white shadow-lg flex items-center justify-center`}>
          <span className="text-[11px] font-bold text-white">{wallNumber || '?'}</span>
        </div>
        {/* Pin point */}
        <div 
          className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 
            border-l-[5px] border-l-transparent 
            border-r-[5px] border-r-transparent 
            border-t-[6px] ${status.point}`}
        />
      </div>
    </button>
  );
}