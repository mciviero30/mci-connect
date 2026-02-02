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
  lockedMeasurements = new Set()
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

    // Draw active drawing
    if (drawingPoints.length > 0) {
      drawActiveLine(ctx, drawingPoints);
    }
  }, [image, dimensions, drawingPoints, zoom]);

  const drawDimension = (ctx, dim) => {
    const { x1, y1, x2, y2, label_x, label_y } = dim.canvas_data;
    
    ctx.save();
    
    // Style based on type
    if (dim.dimension_type === 'benchmark') {
      ctx.strokeStyle = '#FFB800';
      ctx.setLineDash([10, 5]);
      ctx.lineWidth = 3;
    } else if (dim.dimension_type === 'vertical') {
      ctx.strokeStyle = dim.benchmark_above ? '#00FF00' : '#FF0000';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
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

  const handleCanvasClick = (e) => {
    if (!activeDimension) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    let finalPoint = { x, y };
    let axis = null;

    // First point: just place it
    if (drawingPoints.length === 0) {
      setDrawingPoints([finalPoint]);
      setSnappedAxis(null);
      return;
    }

    // Second point: apply snap logic
    if (drawingPoints.length === 1) {
      const p1 = drawingPoints[0];

      // Try axis snap first
      const axisSnap = calculateSnapToAxis(p1, finalPoint);
      if (axisSnap.snapped) {
        finalPoint = axisSnap.point;
        axis = axisSnap.axis;
      } else {
        // Try point snap if no axis snap
        const pointSnap = calculateSnapToPoint(finalPoint, dimensions);
        if (pointSnap.snapped) {
          finalPoint = pointSnap.point;
        }
      }

      const newPoints = [p1, finalPoint];

      // Complete dimension placement
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
      <div className="w-full h-full overflow-auto" style={{ cursor: activeDimension ? 'crosshair' : 'default' }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{
            transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'top left',
          }}
          className="max-w-full h-auto"
        />
      </div>

      {/* Command Hints - Context-aware */}
       {!activeDimension && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 text-slate-300 px-8 py-4 rounded-2xl font-medium shadow-2xl backdrop-blur-sm border border-slate-700">
           Select a measurement type to begin
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
    </div>
  );
}