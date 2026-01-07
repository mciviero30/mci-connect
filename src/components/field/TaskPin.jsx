import React, { useState } from 'react';
import { CheckCircle2, Clock, Circle } from 'lucide-react';

// Unified solid icon system matching PDF reports
const statusIcons = {
  completed: { 
    icon: CheckCircle2, 
    bgColor: 'rgb(34, 197, 94)', 
    iconColor: 'white',
    className: 'bg-green-500'
  },
  in_progress: { 
    icon: Clock, 
    bgColor: 'rgb(251, 191, 36)', 
    iconColor: 'white',
    className: 'bg-amber-400'
  },
  pending: { 
    icon: Clock, 
    bgColor: 'rgb(239, 68, 68)', 
    iconColor: 'white',
    className: 'bg-red-500'
  },
};

export default function TaskPin({ task, onClick, isSelected, onDragPin, isDragging }) {
  if (task.pin_x === undefined || task.pin_y === undefined) return null;
  
  // Extract wall number from title (e.g., "Wall 019" -> "019")
  const wallNumber = task.title?.match(/\d+/)?.[0] || '';

  const [dragStartPos, setDragStartPos] = React.useState(null);
  const [hasMoved, setHasMoved] = React.useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only trigger onClick if we didn't drag
    if (!hasMoved && onClick) {
      onClick(e);
    }
    setHasMoved(false);
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setHasMoved(false);
    if (onDragPin) {
      onDragPin(task, e);
    }
  };

  const handleMouseMove = (e) => {
    if (dragStartPos) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - dragStartPos.x, 2) + 
        Math.pow(e.clientY - dragStartPos.y, 2)
      );
      if (distance > 5) {
        setHasMoved(true);
      }
    }
  };

  const handleMouseUp = () => {
    setDragStartPos(null);
  };

  const statusConfig = statusIcons[task.status] || statusIcons.pending;
  const Icon = statusConfig.icon;

  return (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all active:scale-125 z-10 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
        isDragging ? 'cursor-move scale-125' : 'cursor-pointer'
      } ${isSelected ? 'scale-150 z-20 ring-4 ring-white' : ''}`}
      style={{ left: `${task.pin_x}%`, top: `${task.pin_y}%` }}
    >
      <div className={`w-11 h-11 rounded-full ${statusConfig.className} shadow-2xl flex items-center justify-center border-4 border-white`}>
        <Icon 
          className="w-6 h-6" 
          style={{ color: statusConfig.iconColor }}
          fill={statusConfig.filled ? statusConfig.iconColor : 'none'}
        />
      </div>
    </button>
  );
}