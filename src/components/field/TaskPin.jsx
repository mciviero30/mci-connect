import React, { useState } from 'react';
import { MapPin } from 'lucide-react';

const statusColors = {
  pending: { bg: 'bg-amber-500', border: 'border-amber-300', point: 'border-t-amber-500', text: 'text-white' },
  in_progress: { bg: 'bg-[#FFB800]', border: 'border-[#FFB800]', point: 'border-t-[#FFB800]', text: 'text-white' },
  completed: { bg: 'bg-green-500', border: 'border-green-300', point: 'border-t-green-500', text: 'text-white' },
};

export default function TaskPin({ task, onClick, isSelected, onDragPin, isDragging }) {
  if (task.pin_x === undefined || task.pin_y === undefined) return null;

  const status = statusColors[task.status] || statusColors.pending;
  
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

  return (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`absolute transform -translate-x-1/2 -translate-y-full transition-all hover:scale-110 z-10 ${
        isDragging ? 'cursor-move scale-110' : 'cursor-pointer'
      } ${isSelected ? 'scale-125 z-20' : ''}`}
      style={{ left: `${task.pin_x}%`, top: `${task.pin_y}%` }}
    >
      <div className="relative flex items-center justify-center">
        {/* Pin emoji */}
        <span className="text-2xl leading-none">📍</span>
      </div>
    </button>
  );
}