import React, { useState } from 'react';

const statusColors = {
  pending: { bg: 'bg-amber-500', point: 'border-t-amber-500' },
  in_progress: { bg: 'bg-blue-500', point: 'border-t-blue-500' },
  completed: { bg: 'bg-green-500', point: 'border-t-green-500' },
  blocked: { bg: 'bg-red-500', point: 'border-t-red-500' },
};

export default function TaskPin({ task, onClick, isSelected, isErasing }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (!task || task.pin_x === undefined || task.pin_y === undefined) return null;

  const status = statusColors[task.status] || statusColors.pending;
  const wallNumber = task.title?.match(/\d+/)?.[0] || '?';

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Pin clicked!', task.id, task.title);
    if (onClick) {
      onClick(task);
    }
  };

  return (
    <div
      className={`absolute z-40 cursor-pointer transition-all hover:scale-110 ${
        isSelected ? 'scale-125' : ''
      }`}
      style={{ 
        left: `${task.pin_x}%`, 
        top: `${task.pin_y}%`,
        transform: 'translate(-50%, -100%)'
      }}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Pin Badge */}
      <div className={`min-w-[28px] h-6 px-1.5 rounded-md ${isErasing ? 'bg-red-500 animate-pulse' : status.bg} border-2 border-white shadow-lg flex items-center justify-center`}>
        <span className="text-[11px] font-bold text-white">{wallNumber}</span>
      </div>
      
      {/* Pin Point */}
      <div 
        className={`absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] ${status.point}`}
      />
      
      {/* Tooltip */}
      {(showTooltip || isSelected) && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-slate-900 rounded-lg shadow-xl whitespace-nowrap border border-slate-600">
          <p className="text-xs font-medium text-white">{task.title}</p>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-slate-900" />
        </div>
      )}
    </div>
  );
}