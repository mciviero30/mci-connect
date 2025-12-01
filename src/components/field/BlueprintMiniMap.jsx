import React from 'react';

export default function BlueprintMiniMap({ 
  imageUrl, 
  viewportPosition, 
  zoom, 
  containerSize, 
  imageSize,
  onNavigate 
}) {
  const miniMapSize = { width: 150, height: 100 };
  
  // Calculate viewport indicator size and position
  const scale = Math.min(
    miniMapSize.width / (imageSize?.width || 1000),
    miniMapSize.height / (imageSize?.height || 800)
  );
  
  const viewportWidth = (containerSize?.width || 300) / zoom * scale;
  const viewportHeight = (containerSize?.height || 200) / zoom * scale;
  
  const viewportX = (-viewportPosition.x / zoom) * scale;
  const viewportY = (-viewportPosition.y / zoom) * scale;

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Convert click position to image coordinates
    const imageX = (x / scale) * zoom - (containerSize?.width || 300) / 2;
    const imageY = (y / scale) * zoom - (containerSize?.height || 200) / 2;
    
    onNavigate?.({ x: -imageX, y: -imageY });
  };

  return (
    <div 
      className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer z-30"
      style={{ width: miniMapSize.width, height: miniMapSize.height }}
      onClick={handleClick}
    >
      {/* Mini map image */}
      <img 
        src={imageUrl}
        alt="Mini map"
        className="w-full h-full object-contain opacity-60"
      />
      
      {/* Viewport indicator */}
      <div 
        className="absolute border-2 border-[#FFB800] bg-[#FFB800]/20 rounded pointer-events-none"
        style={{
          left: Math.max(0, Math.min(viewportX, miniMapSize.width - viewportWidth)),
          top: Math.max(0, Math.min(viewportY, miniMapSize.height - viewportHeight)),
          width: Math.min(viewportWidth, miniMapSize.width),
          height: Math.min(viewportHeight, miniMapSize.height),
        }}
      />
    </div>
  );
}