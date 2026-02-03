import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DimensionCanvas({ 
  imageUrl, 
  dimensions = [], 
  activeDimension,
  onDimensionPlace,
  onDimensionUpdate,
  onDimensionDelete,
  unitSystem = 'imperial',
  lockedMeasurements = new Set(),
  // FASE D1: Markup props (optional, backward compatible)
  markups = [],
  activeTool = null,
  markupOptions = { color: '#EF4444', thickness: 2 },
  onAddMarkup = () => {},
  onRemoveMarkup = () => {},
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState(null);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [snappedAxis, setSnappedAxis] = useState(null);
  
  // FASE D1: Markup drawing state
  const [markupDrawPoints, setMarkupDrawPoints] = useState([]);
  
  // FASE D2: Markup editing state
  const [selectedMarkup, setSelectedMarkup] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const lastTapTime = useRef(0);

  // Load image
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImage(img);
      resetView();
    };
  }, [imageUrl]);

  // Draw canvas
  useEffect(() => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    
    // Draw existing dimensions
    dimensions.forEach(dim => {
      if (!dim.canvas_data) return;
      drawDimension(ctx, dim);
    });

    // FASE D1: Draw markups
    markups.forEach(markup => {
      drawMarkup(ctx, markup, selectedMarkup?.id === markup.id);
    });

    // Draw active drawing
    if (drawingPoints.length > 0) {
      drawActiveLine(ctx, drawingPoints);
    }

    // FASE D1: Draw active markup (preview while drawing)
    if (markupDrawPoints.length > 0 && activeTool?.startsWith('markup_')) {
      drawActiveMarkup(ctx, markupDrawPoints, activeTool, markupOptions);
    }
  }, [image, dimensions, drawingPoints, zoom, markups, markupDrawPoints, activeTool, markupOptions]);

  const drawDimension = (ctx, dim) => {
    const { x1, y1, x2, y2, label_x, label_y } = dim.canvas_data;
    const isLocked = lockedMeasurements.has(dim.id);

    ctx.save();

    // Style based on type
    if (dim.dimension_type === 'benchmark') {
      ctx.strokeStyle = isLocked ? '#888888' : '#FFB800';
      ctx.setLineDash([10, 5]);
      ctx.lineWidth = 3;
    } else if (dim.dimension_type === 'vertical') {
      ctx.strokeStyle = isLocked ? '#888888' : (dim.benchmark_above ? '#00FF00' : '#FF0000');
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = isLocked ? '#888888' : '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
    }

    // Apply reduced opacity if locked
    if (isLocked) {
      ctx.globalAlpha = 0.6;
    }
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Draw arrows for horizontal
    if (dim.dimension_type === 'horizontal') {
      drawArrow(ctx, x1, y1, x2, y2);
      drawArrow(ctx, x2, y2, x1, y1);
    }
    
    // Draw label
    const label = formatDimensionLabel(dim);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(label_x - 50, label_y - 15, 100, 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, label_x, label_y + 5);
    
    ctx.restore();
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const arrowLength = 15;
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(
      fromX - arrowLength * Math.cos(angle - Math.PI / 6),
      fromY - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(
      fromX - arrowLength * Math.cos(angle + Math.PI / 6),
      fromY - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  const drawActiveLine = (ctx, points) => {
    if (points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = '#FFB800';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Solid highlighted line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();

    // Draw pulsing points
    drawPulsingPoint(ctx, points[0].x, points[0].y);
    drawPulsingPoint(ctx, points[1].x, points[1].y);

    ctx.restore();
  };

  const drawPulsingPoint = (ctx, x, y) => {
    ctx.save();
    const pulseRadius = 8;
    ctx.fillStyle = '#FFB800';
    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, pulseRadius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const drawSnapIndicator = (ctx, point, axis) => {
    if (!axis) return;

    ctx.save();
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);

    const indicatorSize = 12;

    if (axis === 'horizontal') {
      // Draw horizontal snap line
      ctx.beginPath();
      ctx.moveTo(point.x - indicatorSize, point.y);
      ctx.lineTo(point.x + indicatorSize, point.y);
      ctx.stroke();
    } else if (axis === 'vertical') {
      // Draw vertical snap line
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - indicatorSize);
      ctx.lineTo(point.x, point.y + indicatorSize);
      ctx.stroke();
    }

    ctx.restore();
  };

  const formatDimensionLabel = (dim) => {
    if (dim.unit_system === 'imperial') {
      const ft = dim.value_feet || 0;
      const inches = dim.value_inches || 0;
      const frac = dim.value_fraction || '0';
      
      let label = `${ft}' ${inches}"`;
      if (frac !== '0') {
        label = `${ft}' ${inches} ${frac}"`;
      }
      label += ` (${dim.measurement_type})`;
      return label;
    } else {
      const mm = dim.value_mm || 0;
      return `${mm}mm (${dim.measurement_type})`;
    }
  };

  const calculateSnapToAxis = (p1, p2) => {
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);
    const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);

    // Snap threshold: ±5 degrees from horizontal or vertical
    const SNAP_THRESHOLD = 5;
    const isNearHorizontal = angle < SNAP_THRESHOLD || angle > (90 - SNAP_THRESHOLD);
    const isNearVertical = Math.abs(angle - 90) < SNAP_THRESHOLD;

    if (isNearHorizontal) {
      return { snapped: true, axis: 'horizontal', point: { x: p2.x, y: p1.y } };
    }
    if (isNearVertical) {
      return { snapped: true, axis: 'vertical', point: { x: p1.x, y: p2.y } };
    }
    return { snapped: false, axis: null, point: p2 };
  };

  const calculateSnapToPoint = (testPoint, allPoints) => {
    const SNAP_DISTANCE = 10; // pixels

    for (const dim of dimensions) {
      if (!dim.canvas_data) continue;
      const points = [
        { x: dim.canvas_data.x1, y: dim.canvas_data.y1 },
        { x: dim.canvas_data.x2, y: dim.canvas_data.y2 }
      ];

      for (const p of points) {
        const distance = Math.hypot(testPoint.x - p.x, testPoint.y - p.y);
        if (distance < SNAP_DISTANCE) {
          return { snapped: true, point: p };
        }
      }
    }

    return { snapped: false, point: testPoint };
  };

  // FASE D2: Unified pointer handler (mouse + touch)
  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  const isPointInMarkup = (point, markup) => {
    if (!markup.points || markup.points.length < 2) return false;
    const [p1, p2] = markup.points;
    const threshold = 20;

    if (markup.type === 'line' || markup.type === 'highlight') {
      const dist = pointToLineDistance(point, p1, p2);
      return dist < threshold;
    } else if (markup.type === 'circle') {
      const radius = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      const dist = Math.sqrt((point.x - p1.x) ** 2 + (point.y - p1.y) ** 2);
      return Math.abs(dist - radius) < threshold;
    } else if (markup.type === 'rectangle') {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      return point.x >= minX - threshold && point.x <= maxX + threshold &&
             point.y >= minY - threshold && point.y <= maxY + threshold;
    }
    return false;
  };

  const pointToLineDistance = (point, lineStart, lineEnd) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const param = lenSq !== 0 ? dot / lenSq : -1;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    
    // FASE D2.3: Double tap detection for text editing
    const now = Date.now();
    const timeSinceLast = now - lastTapTime.current;
    lastTapTime.current = now;

    // Double tap on markup → edit text
    if (timeSinceLast < 300 && selectedMarkup?.type === 'text') {
      const textContent = prompt('Edit text:', selectedMarkup.text || '');
      if (textContent !== null) {
        const updatedMarkup = { ...selectedMarkup, text: textContent };
        onAddMarkup(updatedMarkup); // Replace
        setSelectedMarkup(null);
      }
      return;
    }

    // Check if clicking on existing markup (selection)
    const clickedMarkup = markups.find(m => isPointInMarkup(point, m));
    if (clickedMarkup && !activeTool) {
      setSelectedMarkup(clickedMarkup);
      setDragStart(point);
      setIsDragging(true);
      return;
    }

    // FASE D1: Handle markup drawing
    if (activeTool?.startsWith('markup_')) {
      if (activeTool === 'markup_text') {
        const textContent = prompt('Enter text:');
        if (textContent) {
          const newMarkup = {
            id: `markup_${Date.now()}`,
            type: 'text',
            points: [point, point],
            color: markupOptions.color,
            thickness: markupOptions.thickness,
            text: textContent,
          };
          onAddMarkup(newMarkup);
        }
        return;
      }

      if (markupDrawPoints.length === 0) {
        setMarkupDrawPoints([point]);
      } else if (markupDrawPoints.length === 1) {
        const newMarkup = {
          id: `markup_${Date.now()}`,
          type: activeTool.replace('markup_', ''),
          points: [markupDrawPoints[0], point],
          color: markupOptions.color,
          thickness: markupOptions.thickness,
        };
        
        onAddMarkup(newMarkup);
        setMarkupDrawPoints([]);
      }
      return;
    }

    // Dimension drawing
    if (!activeDimension) return;

    let finalPoint = point;
    let axis = null;

    if (drawingPoints.length === 0) {
      setDrawingPoints([finalPoint]);
      setSnappedAxis(null);
      return;
    }

    if (drawingPoints.length === 1) {
      const p1 = drawingPoints[0];

      const axisSnap = calculateSnapToAxis(p1, finalPoint);
      if (axisSnap.snapped) {
        finalPoint = axisSnap.point;
        axis = axisSnap.axis;
      } else {
        const pointSnap = calculateSnapToPoint(finalPoint, dimensions);
        if (pointSnap.snapped) {
          finalPoint = pointSnap.point;
        }
      }

      const newPoints = [p1, finalPoint];

      const label_x = (newPoints[0].x + newPoints[1].x) / 2;
      const label_y = (newPoints[0].y + newPoints[1].y) / 2 - 20;

      onDimensionPlace({
        canvas_data: {
          x1: newPoints[0].x,
          y1: newPoints[0].y,
          x2: newPoints[1].x,
          y2: newPoints[1].y,
          label_x,
          label_y,
          snap_axis: axis,
        }
      });

      setDrawingPoints([]);
      setSnappedAxis(null);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !selectedMarkup || !dragStart) return;

    e.preventDefault();
    const point = getCanvasPoint(e);
    const deltaX = point.x - dragStart.x;
    const deltaY = point.y - dragStart.y;

    // Update markup position
    const movedMarkup = {
      ...selectedMarkup,
      points: selectedMarkup.points.map(p => ({
        x: p.x + deltaX,
        y: p.y + deltaY
      }))
    };

    // Remove old, add updated
    onRemoveMarkup(selectedMarkup.id);
    onAddMarkup(movedMarkup);
    setSelectedMarkup(movedMarkup);
    setDragStart(point);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    setDragStart(null);
  };

  const resetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          onClick={handleZoomIn}
          size="icon"
          className="bg-slate-800 hover:bg-slate-700 min-w-[44px] min-h-[44px] rounded-xl shadow-lg"
        >
          <ZoomIn className="w-5 h-5 text-white" />
        </Button>
        <Button
          onClick={handleZoomOut}
          size="icon"
          className="bg-slate-800 hover:bg-slate-700 min-w-[44px] min-h-[44px] rounded-xl shadow-lg"
        >
          <ZoomOut className="w-5 h-5 text-white" />
        </Button>
        <Button
          onClick={resetView}
          size="icon"
          className="bg-slate-800 hover:bg-slate-700 min-w-[44px] min-h-[44px] rounded-xl shadow-lg"
        >
          <RotateCcw className="w-5 h-5 text-white" />
        </Button>
      </div>

      {/* Canvas */}
      <div className="w-full h-full overflow-auto" style={{ 
        cursor: activeDimension || activeTool ? 'crosshair' : (selectedMarkup ? 'move' : 'default'),
        touchAction: 'none'
      }}>
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'top left',
            touchAction: 'none',
          }}
          className="max-w-full h-auto"
        />
      </div>

      {/* Command Hints - Context-aware */}
       {!activeDimension && !activeTool && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-slate-300 px-8 py-4 rounded-2xl font-medium shadow-2xl backdrop-blur-sm border border-slate-700">
           Select a tool to begin
         </div>
       )}

       {activeDimension && drawingPoints.length === 0 && (
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#FFB800] text-black px-6 py-3 rounded-full font-bold shadow-2xl animate-pulse">
           👆 Tap first point
         </div>
       )}

       {activeDimension && drawingPoints.length === 1 && (
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#FFB800] text-black px-6 py-3 rounded-full font-bold shadow-2xl animate-pulse">
           👆 Tap second point
         </div>
       )}

       {activeTool?.startsWith('markup_') && markupDrawPoints.length === 0 && (
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl animate-pulse">
           👆 Tap to start drawing
         </div>
       )}

       {activeTool?.startsWith('markup_') && markupDrawPoints.length === 1 && (
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold shadow-2xl animate-pulse">
           👆 Tap to finish
         </div>
       )}

       {/* FASE D2.3: Selected markup actions */}
       {selectedMarkup && !activeTool && (
         <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
           <span className="text-sm font-semibold">Selected</span>
           <button
             onClick={() => {
               onRemoveMarkup(selectedMarkup.id);
               setSelectedMarkup(null);
             }}
             className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
           >
             <Trash2 className="w-4 h-4" />
           </button>
         </div>
       )}
    </div>
  );
}

// FASE D1 + D2: Draw markup on canvas with selection
function drawMarkup(ctx, markup, isSelected = false) {
  if (!markup.points || markup.points.length < 2) return;

  ctx.save();
  ctx.strokeStyle = markup.color;
  ctx.fillStyle = markup.color;
  ctx.lineWidth = markup.thickness;
  ctx.globalAlpha = markup.type === 'highlight' ? 0.3 : 1;

  const [p1, p2] = markup.points;

  // Draw markup shape
  ctx.beginPath();
  
  if (markup.type === 'line' || markup.type === 'highlight') {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  } else if (markup.type === 'circle') {
    const radius = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (markup.type === 'rectangle') {
    ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    ctx.stroke();
  } else if (markup.type === 'text') {
    ctx.globalAlpha = 1;
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = markup.color;
    ctx.fillText(markup.text || '', p1.x, p1.y);
  }

  // FASE D2.3: Selection bounding box
  if (isSelected) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const minX = Math.min(p1.x, p2.x) - 10;
    const minY = Math.min(p1.y, p2.y) - 10;
    const maxX = Math.max(p1.x, p2.x) + 10;
    const maxY = Math.max(p1.y, p2.y) + 10;

    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    // Corner handles
    ctx.fillStyle = '#3B82F6';
    [
      [minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]
    ].forEach(([hx, hy]) => {
      ctx.fillRect(hx - 4, hy - 4, 8, 8);
    });
  }

  ctx.restore();
}

// FASE D1: Draw active markup preview
function drawActiveMarkup(ctx, points, activeTool, options) {
  if (points.length < 1) return;

  ctx.save();
  ctx.strokeStyle = options.color;
  ctx.fillStyle = options.color;
  ctx.lineWidth = options.thickness;
  ctx.setLineDash([5, 5]);
  ctx.globalAlpha = activeTool === 'markup_highlight' ? 0.3 : 0.7;

  const p1 = points[0];

  if (points.length === 2) {
    const p2 = points[1];

    ctx.beginPath();
    
    if (activeTool === 'markup_line' || activeTool === 'markup_highlight') {
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    } else if (activeTool === 'markup_circle') {
      const radius = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (activeTool === 'markup_rectangle') {
      ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      ctx.stroke();
    }
  } else {
    // First click - show indicator
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}