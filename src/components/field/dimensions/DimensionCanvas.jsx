import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';

// ============================================
// FASE D2 — Measurement & Markup Canvas
// iPad-First: Pointer Events (mouse + touch)
// Markup Editing: Select, Drag, Edit
// ============================================

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
  const lastTapTime = useRef(0);

  // FASE D2.4: Measurement editing state
  const [selectedDimension, setSelectedDimension] = useState(null);
  const [editingHandle, setEditingHandle] = useState(null); // 'start' | 'end' | null

  // FASE D2.5: Markup resize state
  const [resizingMarkup, setResizingMarkup] = useState(null); // 'corner' | null
  const [resizeCorner, setResizeCorner] = useState(null); // 0-3 (corner index)

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
    
    // FASE D5.2: Reset collision detection
    labelBounds.current = [];
    
    // Draw existing dimensions
    dimensions.forEach(dim => {
      if (!dim.canvas_data) return;
      const isSelected = selectedDimension?.id === dim.id;
      drawDimension(ctx, dim, isSelected);
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
    
    // FASE D5.4: Re-render every 100ms to animate warnings
    const hasUnlocked = dimensions.some(d => !lockedMeasurements.has(d.id));
    if (hasUnlocked) {
      const timer = setTimeout(() => {
        if (canvasRef.current) {
          canvasRef.current.getContext('2d'); // Force re-render
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [image, dimensions, drawingPoints, zoom, markups, markupDrawPoints, activeTool, markupOptions, selectedMarkup, lockedMeasurements, selectedDimension]);

  const drawDimension = (ctx, dim, isSelected = false) => {
    const { x1, y1, x2, y2, label_x, label_y } = dim.canvas_data;
    const isLocked = lockedMeasurements.has(dim.id);

    ctx.save();

    // FASE D5.4: Visual warning for unlocked measurements (flashing orange glow)
    if (!isLocked && !isSelected) {
      const pulse = Math.abs(Math.sin(Date.now() / 500)) * 0.4 + 0.6;
      ctx.strokeStyle = '#FF8C00';
      ctx.lineWidth = 8;
      ctx.setLineDash([]);
      ctx.globalAlpha = pulse * 0.3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // FASE D2.4: Highlight if selected
    if (isSelected) {
      ctx.strokeStyle = '#FFB800';
      ctx.lineWidth = 6;
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

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
    
    // FASE D5.1 + D5.2 + D5.4: Legible labels with anti-collision + warning
    drawMeasurementLabel(ctx, dim, label_x, label_y, labelBounds.current, isLocked);

    // FASE D2.4: Draw handles when selected (D5.3: increased size for touch)
    if (isSelected && !isLocked) {
      const handleRadius = 14; // D5.3: 28px diameter for touch
      ctx.fillStyle = '#FFB800';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;

      // Start handle
      ctx.beginPath();
      ctx.arc(x1, y1, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // End handle
      ctx.beginPath();
      ctx.arc(x2, y2, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    
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

  // FASE D5.1: Format value only (no type)
  const formatDimensionValue = (dim) => {
    if (dim.unit_system === 'imperial') {
      const ft = dim.value_feet || 0;
      const inches = dim.value_inches || 0;
      const frac = dim.value_fraction || '0';
      
      if (frac !== '0') {
        return `${ft}' ${inches} ${frac}"`;
      }
      return `${ft}' ${inches}"`;
    } else {
      const mm = dim.value_mm || 0;
      return `${mm}mm`;
    }
  };

  // FASE D5.2: Detect label collision
  const labelBounds = useRef([]);
  const detectLabelCollision = (x, y, width, height) => {
    const currentBox = { x: x - width/2, y: y - height/2, width, height };
    
    for (const box of labelBounds.current) {
      if (!(currentBox.x + currentBox.width < box.x || 
            currentBox.x > box.x + box.width ||
            currentBox.y + currentBox.height < box.y || 
            currentBox.y > box.y + box.height)) {
        return true; // Collision detected
      }
    }
    
    labelBounds.current.push(currentBox);
    return false;
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

  // FASE D2.2: Unified pointer handler (mouse + touch)
  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    return { x, y };
  };

  // FASE D5.3: Increased touch threshold (28px diameter = 14px radius)
  const isPointNearHandle = (point, dim) => {
    if (!dim.canvas_data) return null;
    const { x1, y1, x2, y2 } = dim.canvas_data;
    const HANDLE_THRESHOLD = 28; // D5.3: larger for touch

    const distToStart = Math.hypot(point.x - x1, point.y - y1);
    const distToEnd = Math.hypot(point.x - x2, point.y - y2);

    if (distToStart < HANDLE_THRESHOLD) return 'start';
    if (distToEnd < HANDLE_THRESHOLD) return 'end';
    return null;
  };

  // FASE D2.4: Check if point is on dimension line (for selection)
  const isPointOnDimension = (point, dim) => {
    if (!dim.canvas_data) return false;
    const { x1, y1, x2, y2 } = dim.canvas_data;
    const dist = pointToLineDistance(point, { x: x1, y: y1 }, { x: x2, y: y2 });
    return dist < 30;
  };

  const isPointInMarkup = (point, markup) => {
    if (!markup.points || markup.points.length < 2) return false;
    const [p1, p2] = markup.points;
    const threshold = 20;

    if (markup.type === 'line' || markup.type === 'highlight' || markup.type === 'arrow' || markup.type === 'double_arrow') {
      const dist = pointToLineDistance(point, p1, p2);
      return dist < threshold;
    } else if (markup.type === 'circle') {
      const radius = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      const dist = Math.sqrt((point.x - p1.x) ** 2 + (point.y - p1.y) ** 2);
      return Math.abs(dist - radius) < threshold;
    } else if (markup.type === 'rectangle' || markup.type === 'text') {
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

  // FASE D5.3: Unified pointer down (tap detection + long press)
  const pointerDownTime = useRef(0);
  const pointerMoved = useRef(false);

  const handlePointerDown = (e) => {
    e.preventDefault();
    const point = getCanvasPoint(e);
    
    // D5.3: Track timing and movement
    pointerDownTime.current = Date.now();
    pointerMoved.current = false;
    
    // FASE D2.3: Double tap detection for text editing
    const now = Date.now();
    const timeSinceLast = now - lastTapTime.current;
    lastTapTime.current = now;

    // Double tap on text markup → edit
    if (timeSinceLast < 300 && selectedMarkup?.type === 'text') {
      const textContent = prompt('Edit text:', selectedMarkup.text || '');
      if (textContent !== null) {
        const updatedMarkup = { ...selectedMarkup, text: textContent };
        onRemoveMarkup(selectedMarkup.id);
        onAddMarkup(updatedMarkup);
        setSelectedMarkup(updatedMarkup);
      }
      return;
    }

    // FASE D2.5: Check if clicking on markup resize handle
    if (selectedMarkup && !activeTool) {
      const corner = getCornerNearPoint(point, selectedMarkup);
      if (corner !== null) {
        setResizingMarkup(selectedMarkup);
        setResizeCorner(corner);
        setDragStart(point);
        return;
      }
    }

    // FASE D2.4: Check if clicking on dimension handle
    if (!activeTool && selectedDimension) {
      const handle = isPointNearHandle(point, selectedDimension);
      if (handle) {
        setEditingHandle(handle);
        setDragStart(point);
        return;
      }
    }

    // FASE D2.4: Check if clicking on dimension (selection)
    if (!activeTool && !activeDimension) {
      const clickedDimension = dimensions.find(dim => 
        isPointOnDimension(point, dim) && !lockedMeasurements.has(dim.id)
      );
      if (clickedDimension) {
        setSelectedDimension(clickedDimension);
        setSelectedMarkup(null);
        return;
      }
    }

    // Check if clicking on existing markup (selection)
    const clickedMarkup = markups.find(m => isPointInMarkup(point, m));
    if (clickedMarkup && !activeTool) {
      setSelectedMarkup(clickedMarkup);
      setSelectedDimension(null);
      setDragStart(point);
      setIsDragging(true);
      return;
    }

    // Deselect if clicking empty area
    if (!activeTool && !activeDimension) {
      setSelectedMarkup(null);
      setSelectedDimension(null);
    }

    // FASE D1: Handle markup drawing
    if (activeTool?.startsWith('markup_')) {
      if (activeTool === 'markup_text') {
        const textContent = prompt('Enter text:');
        if (textContent) {
          const newMarkup = {
            id: `markup_${Date.now()}`,
            type: 'text',
            points: [point, { x: point.x + 100, y: point.y + 30 }],
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

  // FASE D2.5: Get corner near point for resize
  const getCornerNearPoint = (point, markup) => {
    if (!markup.points || markup.points.length < 2) return null;
    if (markup.type === 'circle' || markup.type === 'text') return null; // No resize for these
    
    const [p1, p2] = markup.points;
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    
    const corners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY }
    ];
    
    const CORNER_THRESHOLD = 20;
    for (let i = 0; i < corners.length; i++) {
      const dist = Math.hypot(point.x - corners[i].x, point.y - corners[i].y);
      if (dist < CORNER_THRESHOLD) return i;
    }
    
    return null;
  };

  // FASE D2.4: Recalculate dimension value from geometry
  const recalculateDimensionValue = (x1, y1, x2, y2, unitSystem) => {
    const pixelDistance = Math.hypot(x2 - x1, y2 - y1);
    
    // CRITICAL: Need scale factor (assume 1 pixel = 1/16 inch for now)
    // In production, this should come from blueprint calibration
    const PIXELS_PER_INCH = 16;
    
    if (unitSystem === 'imperial') {
      const totalInches = pixelDistance / PIXELS_PER_INCH;
      const feet = Math.floor(totalInches / 12);
      const remainingInches = totalInches % 12;
      const inches = Math.floor(remainingInches);
      const fractionInches = remainingInches - inches;
      
      // Convert decimal to fraction
      let fraction = '0';
      if (fractionInches > 0) {
        if (fractionInches < 0.0625) fraction = '0';
        else if (fractionInches < 0.125) fraction = '1/16';
        else if (fractionInches < 0.1875) fraction = '1/8';
        else if (fractionInches < 0.25) fraction = '3/16';
        else if (fractionInches < 0.3125) fraction = '1/4';
        else if (fractionInches < 0.375) fraction = '5/16';
        else if (fractionInches < 0.4375) fraction = '3/8';
        else if (fractionInches < 0.5) fraction = '7/16';
        else if (fractionInches < 0.5625) fraction = '1/2';
        else if (fractionInches < 0.625) fraction = '9/16';
        else if (fractionInches < 0.6875) fraction = '5/8';
        else if (fractionInches < 0.75) fraction = '11/16';
        else if (fractionInches < 0.8125) fraction = '3/4';
        else if (fractionInches < 0.875) fraction = '13/16';
        else if (fractionInches < 0.9375) fraction = '7/8';
        else fraction = '15/16';
      }
      
      return { value_feet: feet, value_inches: inches, value_fraction: fraction };
    } else {
      const mm = Math.round(pixelDistance / PIXELS_PER_INCH * 25.4);
      return { value_mm: mm };
    }
  };

  // FASE D5.3: Track pointer movement (for tap vs drag detection)
  const handlePointerMove = (e) => {
    const point = getCanvasPoint(e);
    
    // D5.3: Mark movement if > 6px
    if (dragStart) {
      const distance = Math.hypot(point.x - dragStart.x, point.y - dragStart.y);
      if (distance > 6) {
        pointerMoved.current = true;
      }
    }
    
    // FASE D2.5: Resize markup
    if (resizingMarkup && resizeCorner !== null && dragStart) {
      e.preventDefault();
      
      const [p1, p2] = resizingMarkup.points;
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      
      let newP1 = { ...p1 };
      let newP2 = { ...p2 };
      
      // Update based on which corner is being dragged
      if (resizeCorner === 0) { // Top-left
        newP1 = { x: Math.min(point.x, maxX - 20), y: Math.min(point.y, maxY - 20) };
        newP2 = { x: maxX, y: maxY };
      } else if (resizeCorner === 1) { // Top-right
        newP1 = { x: minX, y: Math.min(point.y, maxY - 20) };
        newP2 = { x: Math.max(point.x, minX + 20), y: maxY };
      } else if (resizeCorner === 2) { // Bottom-left
        newP1 = { x: Math.min(point.x, maxX - 20), y: minY };
        newP2 = { x: maxX, y: Math.max(point.y, minY + 20) };
      } else if (resizeCorner === 3) { // Bottom-right
        newP1 = { x: minX, y: minY };
        newP2 = { x: Math.max(point.x, minX + 20), y: Math.max(point.y, minY + 20) };
      }
      
      const resizedMarkup = {
        ...resizingMarkup,
        points: [newP1, newP2]
      };
      
      onRemoveMarkup(resizingMarkup.id);
      onAddMarkup(resizedMarkup);
      setResizingMarkup(resizedMarkup);
      setSelectedMarkup(resizedMarkup);
      return;
    }

    // FASE D2.4: Drag dimension handle
    if (editingHandle && selectedDimension && dragStart) {
      e.preventDefault();
      
      const { x1, y1, x2, y2 } = selectedDimension.canvas_data;
      let newX1 = x1, newY1 = y1, newX2 = x2, newY2 = y2;

      if (editingHandle === 'start') {
        const snap = calculateSnapToAxis({ x: x2, y: y2 }, point);
        newX1 = snap.point.x;
        newY1 = snap.point.y;
      } else {
        const snap = calculateSnapToAxis({ x: x1, y: y1 }, point);
        newX2 = snap.point.x;
        newY2 = snap.point.y;
      }

      // Recalculate value
      const newValues = recalculateDimensionValue(newX1, newY1, newX2, newY2, selectedDimension.unit_system);
      
      // Update dimension in place
      const updatedDimension = {
        ...selectedDimension,
        canvas_data: {
          x1: newX1, y1: newY1, x2: newX2, y2: newY2,
          label_x: (newX1 + newX2) / 2,
          label_y: (newY1 + newY2) / 2 - 20,
        },
        ...newValues,
      };

      setSelectedDimension(updatedDimension);
      
      // Update in parent (local overlay or saved dimension)
      if (onDimensionUpdate) {
        onDimensionUpdate(updatedDimension);
      }
      
      return;
    }

    if (!isDragging || !selectedMarkup || !dragStart) return;

    e.preventDefault();
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
    setDragStart({ x: point.x, y: point.y });
  };

  const handlePointerUp = (e) => {
    // D5.3: Detect tap vs drag
    const pressDuration = Date.now() - pointerDownTime.current;
    const wasTap = pressDuration < 200 && !pointerMoved.current;
    
    // FASE D2.5: Stop markup resize
    if (resizingMarkup) {
      setResizingMarkup(null);
      setResizeCorner(null);
      setDragStart(null);
      toast.success('Markup resized');
      return;
    }

    // FASE D2.4: Stop handle editing
    if (editingHandle) {
      setEditingHandle(null);
      setDragStart(null);
      toast.success('Measurement updated');
      return;
    }

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
        cursor: activeDimension || activeTool ? 'crosshair' : (resizingMarkup || editingHandle ? 'grabbing' : (selectedMarkup || selectedDimension ? 'move' : 'default')),
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
       {!activeDimension && !activeTool && !selectedMarkup && (
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

       {/* FASE D2.4: Selected dimension actions */}
       {selectedDimension && !activeTool && !lockedMeasurements.has(selectedDimension.id) && (
         <div className="absolute top-4 left-4 bg-[#FFB800] text-black px-4 py-2 rounded-xl shadow-lg flex items-center gap-3 font-bold">
           <span className="text-sm">Measurement selected • Drag handles to adjust</span>
           <button
             onClick={() => {
               // FASE D2.5: Duplicate measurement
               const OFFSET = 20;
               const duplicated = {
                 ...selectedDimension,
                 id: `overlay_${Date.now()}`,
                 canvas_data: {
                   ...selectedDimension.canvas_data,
                   x1: selectedDimension.canvas_data.x1 + OFFSET,
                   y1: selectedDimension.canvas_data.y1 + OFFSET,
                   x2: selectedDimension.canvas_data.x2 + OFFSET,
                   y2: selectedDimension.canvas_data.y2 + OFFSET,
                   label_x: selectedDimension.canvas_data.label_x + OFFSET,
                   label_y: selectedDimension.canvas_data.label_y + OFFSET,
                 },
                 created_date: new Date().toISOString(),
               };
               
               setDimensionOverlays(prev => [...prev, duplicated]);
               setSelectedDimension(duplicated);
               toast.success('Measurement duplicated');
             }}
             className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
             title="Duplicate"
           >
             <Copy className="w-4 h-4 text-white" />
           </button>
           <button
             onClick={() => {
               if (onDimensionDelete) {
                 onDimensionDelete(selectedDimension.id);
               }
               setSelectedDimension(null);
             }}
             className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
             title="Delete"
           >
             <Trash2 className="w-4 h-4 text-white" />
           </button>
         </div>
       )}

       {/* FASE D2.3 + D2.5: Selected markup actions */}
       {selectedMarkup && !activeTool && (
         <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-3">
           <span className="text-sm font-semibold">Markup selected • Drag to move</span>
           <button
             onClick={() => {
               // FASE D2.5: Duplicate markup
               const OFFSET = 20;
               const duplicated = {
                 ...selectedMarkup,
                 id: `markup_${Date.now()}`,
                 points: selectedMarkup.points.map(p => ({
                   x: p.x + OFFSET,
                   y: p.y + OFFSET
                 }))
               };
               
               onAddMarkup(duplicated);
               setSelectedMarkup(duplicated);
               toast.success('Markup duplicated');
             }}
             className="p-1.5 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
             title="Duplicate"
           >
             <Copy className="w-4 h-4" />
           </button>
           <button
             onClick={() => {
               onRemoveMarkup(selectedMarkup.id);
               setSelectedMarkup(null);
             }}
             className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
             title="Delete"
           >
             <Trash2 className="w-4 h-4" />
           </button>
         </div>
       )}
    </div>
  );
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

// FASE D1 + D2.3 + D2.5: Draw markup on canvas with selection
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
  } else if (markup.type === 'arrow' || markup.type === 'double_arrow') {
    // FASE D2.5: Arrow rendering
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    
    // Draw arrowhead at end
    drawArrowHead(ctx, p1.x, p1.y, p2.x, p2.y, markup.thickness * 3);
    
    // Draw second arrowhead if double arrow
    if (markup.type === 'double_arrow') {
      drawArrowHead(ctx, p2.x, p2.y, p1.x, p1.y, markup.thickness * 3);
    }
  } else if (markup.type === 'circle') {
    const radius = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
    ctx.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else if (markup.type === 'rectangle') {
    ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    ctx.stroke();
  } else if (markup.type === 'text') {
    ctx.globalAlpha = 1;
    ctx.font = `bold ${24 + (markup.thickness * 4)}px Arial`;
    ctx.fillStyle = markup.color;
    ctx.fillText(markup.text || '', p1.x, p1.y);
  }

  // FASE D2.3 + D2.5: Selection bounding box with resize handles
  if (isSelected) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const padding = 15;
    let minX, minY, maxX, maxY;

    if (markup.type === 'text') {
      // Text bounding box estimation
      ctx.font = `bold ${24 + (markup.thickness * 4)}px Arial`;
      const textWidth = ctx.measureText(markup.text || '').width;
      minX = p1.x - padding;
      minY = p1.y - 30 - padding;
      maxX = p1.x + textWidth + padding;
      maxY = p1.y + padding;
    } else {
      minX = Math.min(p1.x, p2.x) - padding;
      minY = Math.min(p1.y, p2.y) - padding;
      maxX = Math.max(p1.x, p2.x) + padding;
      maxY = Math.max(p1.y, p2.y) + padding;
    }

    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    // FASE D2.5: Resize handles (only for rectangle, line, arrow)
    if (markup.type === 'rectangle' || markup.type === 'line' || markup.type === 'arrow' || markup.type === 'double_arrow' || markup.type === 'highlight') {
      ctx.fillStyle = '#3B82F6';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      
      [
        [minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]
      ].forEach(([hx, hy]) => {
        ctx.beginPath();
        ctx.arc(hx, hy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    } else {
      // Just corner indicators for non-resizable
      ctx.fillStyle = '#3B82F6';
      [
        [minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY]
      ].forEach(([hx, hy]) => {
        ctx.fillRect(hx - 5, hy - 5, 10, 10);
      });
    }
  }

  ctx.restore();
}

// FASE D2.5: Draw arrow head helper
function drawArrowHead(ctx, fromX, fromY, toX, toY, size = 15) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle - Math.PI / 6),
    toY - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle + Math.PI / 6),
    toY - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
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
    } else if (activeTool === 'markup_arrow' || activeTool === 'markup_double_arrow') {
      // FASE D2.5: Arrow preview
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      
      drawArrowHead(ctx, p1.x, p1.y, p2.x, p2.y, options.thickness * 3);
      if (activeTool === 'markup_double_arrow') {
        drawArrowHead(ctx, p2.x, p2.y, p1.x, p1.y, options.thickness * 3);
      }
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