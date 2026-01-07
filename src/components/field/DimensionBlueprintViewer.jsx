import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft, ZoomIn, ZoomOut, Maximize2, Search, Loader2, Camera,
  Ruler, ArrowUpDown, Minus, Plus as PlusIcon, Brain, Eraser, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export default function DimensionBlueprintViewer({ dimension, jobId, onBack }) {
  const queryClient = useQueryClient();
  const [zoom, setZoom] = useState(0.5);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loadingState, setLoadingState] = useState('loading');
  const [pdfCanvas, setPdfCanvas] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  
  // Annotation states
  const [annotations, setAnnotations] = useState([]);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showMeasurementDialog, setShowMeasurementDialog] = useState(false);
  const [pendingMeasurement, setPendingMeasurement] = useState(null);
  const [measurementInput, setMeasurementInput] = useState({ feet: '', inches: '', fraction: '' });
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

  // Fetch annotations
  const { data: fetchedAnnotations = [] } = useQuery({
    queryKey: ['dimension-annotations', dimension.id],
    queryFn: () => base44.entities.PlanAnnotation.filter({ plan_id: dimension.id }),
    enabled: !!dimension?.id,
  });

  useEffect(() => {
    setAnnotations(fetchedAnnotations);
  }, [fetchedAnnotations]);

  const createAnnotationMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanAnnotation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dimension-annotations', dimension.id] });
      toast({
        title: 'Annotation saved',
        variant: 'success'
      });
    },
  });

  const deleteAnnotationMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanAnnotation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dimension-annotations', dimension.id] });
      toast({
        title: 'Annotation deleted',
        variant: 'success'
      });
    },
  });

  // Load PDF
  const loadPdfWithPdfJs = async () => {
    setLoadingState('loading');
    try {
      if (!window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        await new Promise(resolve => setTimeout(resolve, 100));
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      }

      const loadingTask = window.pdfjsLib.getDocument(dimension.file_url);
      const pdf = await loadingTask.promise;
      
      // Render all pages
      const scale = 1.5;
      const canvases = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        canvases.push(canvas);
      }

      const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);
      const maxWidth = Math.max(...canvases.map(c => c.width));
      const combinedCanvas = document.createElement('canvas');
      combinedCanvas.width = maxWidth;
      combinedCanvas.height = totalHeight;
      const ctx = combinedCanvas.getContext('2d');
      
      let currentY = 0;
      canvases.forEach(canvas => {
        ctx.drawImage(canvas, 0, currentY);
        currentY += canvas.height;
      });

      setPdfCanvas(combinedCanvas.toDataURL('image/png'));
      setLoadingState('success');
    } catch (error) {
      console.error('PDF load error:', error);
      setLoadingState('error');
    }
  };

  useEffect(() => {
    if (dimension?.file_url) {
      const isPdf = dimension.file_url.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        loadPdfWithPdfJs();
      } else {
        setLoadingState('success');
      }
    }
  }, [dimension?.file_url]);

  const handleImageLoad = (e) => {
    setImageSize({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight
    });
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.1));
  const handleReset = () => {
    setZoom(0.5);
    setPosition({ x: 50, y: 50 });
  };

  const handleMouseDown = (e) => {
    if (activeTool === 'select' && !e.target.closest('button')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && activeTool === 'select') {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    
    // Drawing mode
    if (isDrawing && ['wall_width', 'wall_height'].includes(activeTool)) {
      const rect = imageRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setDrawingPoints([...drawingPoints, { x, y }]);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    
    if (isDrawing && drawingPoints.length >= 2) {
      setIsDrawing(false);
      setPendingMeasurement({
        type: activeTool,
        points: drawingPoints
      });
      setShowMeasurementDialog(true);
    }
  };

  const handleCanvasClick = (e) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Start drawing for measurement tools
    if (['wall_width', 'wall_height'].includes(activeTool)) {
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingPoints([{ x, y }]);
      } else {
        // Second click - complete measurement
        setDrawingPoints([...drawingPoints, { x, y }]);
        setPendingMeasurement({
          type: activeTool,
          points: [...drawingPoints, { x, y }]
        });
        setShowMeasurementDialog(true);
        setIsDrawing(false);
      }
    }
  };

  const saveMeasurement = async () => {
    if (!pendingMeasurement || !measurementInput.feet) {
      toast({
        title: 'Please enter measurement values',
        variant: 'destructive'
      });
      return;
    }

    const { feet, inches = 0, fraction = '' } = measurementInput;
    const displayText = inches 
      ? `${feet}' ${inches}${fraction ? ' ' + fraction : ''}"` 
      : `${feet}'`;

    await createAnnotationMutation.mutateAsync({
      plan_id: dimension.id,
      job_id: jobId,
      type: pendingMeasurement.type,
      measurement_type: pendingMeasurement.type === 'wall_width' 
        ? 'FF-FF'  // Default, can be changed
        : 'height_above',
      imperial_measurement: {
        feet: parseInt(feet),
        inches: parseFloat(inches),
        fraction,
        display: displayText
      },
      data: {
        points: pendingMeasurement.points,
        text: displayText
      },
      color: pendingMeasurement.type === 'wall_width' ? '#EF4444' : '#3B82F6',
      author_email: (await base44.auth.me()).email,
      author_name: (await base44.auth.me()).full_name
    });

    setShowMeasurementDialog(false);
    setPendingMeasurement(null);
    setMeasurementInput({ feet: '', inches: '', fraction: '' });
    setDrawingPoints([]);
    setActiveTool('select');
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast({
        title: 'Uploading photo...',
        variant: 'info'
      });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Add photo annotation at center
      await createAnnotationMutation.mutateAsync({
        plan_id: dimension.id,
        job_id: jobId,
        type: 'photo',
        photo_url: file_url,
        data: {
          x: 50,
          y: 50,
          width: 15,
          height: 15
        },
        author_email: (await base44.auth.me()).email,
        author_name: (await base44.auth.me()).full_name
      });
      
      toast({
        title: 'Photo added',
        variant: 'success'
      });
    } catch (error) {
      toast({
        title: 'Failed to upload photo',
        variant: 'destructive'
      });
      console.error(error);
    }
  };

  const handleDeleteAnnotation = (annotationId) => {
    if (window.confirm('Delete this annotation?')) {
      deleteAnnotationMutation.mutate(annotationId);
    }
  };

  const isPdf = dimension?.file_url?.toLowerCase().endsWith('.pdf');
  const displayImage = isPdf ? pdfCanvas : dimension?.file_url;

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-900">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <span className="text-slate-900 dark:text-white font-semibold">{dimension.name}</span>
          </div>

          {/* Main Tools */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  <ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>

            <span className="text-sm text-slate-600 dark:text-slate-400 px-2 min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  <ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleReset}
                  className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors"
                >
                  <Maximize2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Reset View</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className={`p-2 rounded-lg transition-colors ${
                    showSearch ? 'bg-[#FFB800] text-white' : 'hover:bg-white dark:hover:bg-slate-700'
                  }`}
                >
                  <Search className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Search (AI)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Annotation Toolbar */}
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTool('wall_width')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  activeTool === 'wall_width'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Minus className="w-4 h-4" />
                <span className="text-xs font-medium">FF-FF / FF-CL / CL-CL</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Wall Width Measurement</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTool('wall_height')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  activeTool === 'wall_height'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <ArrowUpDown className="w-4 h-4" />
                <span className="text-xs font-medium">Height</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Wall Height (from Bench Line)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer transition-all">
                <Camera className="w-4 h-4" />
                <span className="text-xs font-medium">Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </TooltipTrigger>
            <TooltipContent>Add Photo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setActiveTool('eraser')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  activeTool === 'eraser'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                <Eraser className="w-4 h-4" />
                <span className="text-xs font-medium">Erase</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Delete Annotations</TooltipContent>
          </Tooltip>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <Input
                placeholder="AI Search: describe what you're looking for..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-800"
              />
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Search
              </Button>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div 
          ref={containerRef}
          className={`flex-1 overflow-hidden relative ${
            ['wall_width', 'wall_height'].includes(activeTool) ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {loadingState === 'loading' && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFB800]" />
            </div>
          )}

          {loadingState === 'success' && displayImage && (
            <div 
              className="relative w-full h-full flex items-center justify-center"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <div className="relative" onClick={handleCanvasClick}>
                <img 
                  ref={imageRef}
                  src={displayImage}
                  alt={dimension.name}
                  className="max-w-none select-none"
                  onLoad={handleImageLoad}
                  draggable={false}
                />

                {/* Render Annotations */}
                <svg 
                  className="absolute inset-0 pointer-events-none"
                  style={{ width: '100%', height: '100%' }}
                >
                  {annotations.map((ann) => {
                    if (ann.type === 'wall_width' && ann.data?.points?.length >= 2) {
                      const [p1, p2] = ann.data.points;
                      return (
                        <g key={ann.id}>
                          <line
                            x1={`${p1.x}%`}
                            y1={`${p1.y}%`}
                            x2={`${p2.x}%`}
                            y2={`${p2.y}%`}
                            stroke={ann.color || '#EF4444'}
                            strokeWidth={ann.stroke_width || 2}
                          />
                          <text
                            x={`${(p1.x + p2.x) / 2}%`}
                            y={`${(p1.y + p2.y) / 2 - 1}%`}
                            fill={ann.color || '#EF4444'}
                            fontSize="12"
                            fontWeight="bold"
                            textAnchor="middle"
                            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                            onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(ann.id)}
                          >
                            {ann.data.text}
                          </text>
                          {ann.measurement_type && (
                            <text
                              x={`${(p1.x + p2.x) / 2}%`}
                              y={`${(p1.y + p2.y) / 2 + 2}%`}
                              fill="#666"
                              fontSize="10"
                              textAnchor="middle"
                            >
                              {ann.measurement_type}
                            </text>
                          )}
                        </g>
                      );
                    }

                    if (ann.type === 'wall_height' && ann.data?.points?.length >= 2) {
                      const [p1, p2] = ann.data.points;
                      return (
                        <g key={ann.id}>
                          <line
                            x1={`${p1.x}%`}
                            y1={`${p1.y}%`}
                            x2={`${p2.x}%`}
                            y2={`${p2.y}%`}
                            stroke={ann.color || '#3B82F6'}
                            strokeWidth={ann.stroke_width || 2}
                            strokeDasharray="4 2"
                          />
                          <text
                            x={`${p1.x + 2}%`}
                            y={`${p1.y}%`}
                            fill={ann.color || '#3B82F6'}
                            fontSize="12"
                            fontWeight="bold"
                            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                            onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(ann.id)}
                          >
                            {ann.data.text}
                          </text>
                        </g>
                      );
                    }

                    return null;
                  })}

                  {/* Active drawing line */}
                  {isDrawing && drawingPoints.length > 0 && (
                    <line
                      x1={`${drawingPoints[0].x}%`}
                      y1={`${drawingPoints[0].y}%`}
                      x2={`${drawingPoints[drawingPoints.length - 1].x}%`}
                      y2={`${drawingPoints[drawingPoints.length - 1].y}%`}
                      stroke={activeTool === 'wall_width' ? '#EF4444' : '#3B82F6'}
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      opacity={0.7}
                    />
                  )}
                </svg>

                {/* Photo Annotations */}
                {annotations.filter(a => a.type === 'photo').map((ann) => (
                  <div
                    key={ann.id}
                    className="absolute group"
                    style={{
                      left: `${ann.data.x}%`,
                      top: `${ann.data.y}%`,
                      width: `${ann.data.width}%`,
                      height: `${ann.data.height}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(ann.id)}
                  >
                    <img
                      src={ann.photo_url}
                      alt="Field photo"
                      className="w-full h-full object-cover rounded-lg border-2 border-white shadow-lg"
                    />
                    {activeTool === 'eraser' && (
                      <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eraser className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Indicator */}
        {activeTool !== 'select' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#FFB800] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50">
            {activeTool === 'wall_width' && '📏 Click two points for wall width'}
            {activeTool === 'wall_height' && '📐 Click two points for wall height'}
            {activeTool === 'eraser' && '🗑️ Click on annotation to delete'}
          </div>
        )}

        {/* Measurement Input Dialog */}
        <Dialog open={showMeasurementDialog} onOpenChange={setShowMeasurementDialog}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle>
                {pendingMeasurement?.type === 'wall_width' ? 'Wall Width Measurement' : 'Wall Height Measurement'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {pendingMeasurement?.type === 'wall_width' && (
                <div>
                  <Label>Measurement Type</Label>
                  <select
                    className="w-full mt-1.5 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    onChange={(e) => setPendingMeasurement({
                      ...pendingMeasurement,
                      measurementType: e.target.value
                    })}
                  >
                    <option value="FF-FF">FF-FF (Finished Floor to Finished Floor)</option>
                    <option value="FF-CL">FF-CL (Finished Floor to Center Line)</option>
                    <option value="CL-CL">CL-CL (Center Line to Center Line)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Feet</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={measurementInput.feet}
                    onChange={(e) => setMeasurementInput({ ...measurementInput, feet: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Inches</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={measurementInput.inches}
                    onChange={(e) => setMeasurementInput({ ...measurementInput, inches: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Fraction</Label>
                  <select
                    value={measurementInput.fraction}
                    onChange={(e) => setMeasurementInput({ ...measurementInput, fraction: e.target.value })}
                    className="w-full mt-1.5 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">-</option>
                    <option value="1/16">1/16</option>
                    <option value="1/8">1/8</option>
                    <option value="3/16">3/16</option>
                    <option value="1/4">1/4</option>
                    <option value="5/16">5/16</option>
                    <option value="3/8">3/8</option>
                    <option value="7/16">7/16</option>
                    <option value="1/2">1/2</option>
                    <option value="9/16">9/16</option>
                    <option value="5/8">5/8</option>
                    <option value="11/16">11/16</option>
                    <option value="3/4">3/4</option>
                    <option value="13/16">13/16</option>
                    <option value="7/8">7/8</option>
                    <option value="15/16">15/16</option>
                  </select>
                </div>
              </div>

              <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                <strong>Preview:</strong>{' '}
                {measurementInput.feet && (
                  <>
                    {measurementInput.feet}'
                    {measurementInput.inches && ` ${measurementInput.inches}${measurementInput.fraction ? ' ' + measurementInput.fraction : ''}"`}
                  </>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMeasurementDialog(false);
                    setPendingMeasurement(null);
                    setMeasurementInput({ feet: '', inches: '', fraction: '' });
                    setDrawingPoints([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveMeasurement}
                  className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
                >
                  Save Measurement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}