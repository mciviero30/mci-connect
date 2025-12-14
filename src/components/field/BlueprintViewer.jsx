import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { 
  ArrowLeft, Plus, ZoomIn, ZoomOut, Maximize2, AlertTriangle, RefreshCw, Loader2, Move,
  MapPin, Link2, Pencil, Square, Printer, Type, Eraser, Circle, MousePointer, Undo2, Eye, EyeOff, Search, Crosshair, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TaskPin from './TaskPin';
import TaskDetailPanel from './TaskDetailPanel';
import CreateTaskDialog from './CreateTaskDialog';
import BlueprintMiniMap from './BlueprintMiniMap';
import BlueprintFilterBar from './BlueprintFilterBar';
import LiveCollaborators from './LiveCollaborators';
import AILearningEngine from './AILearningEngine';
import BlueprintAnnotations from './BlueprintAnnotations';
import BlueprintVersionHistory from './BlueprintVersionHistory';

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const LOAD_TIMEOUT_MS = 30000;

export default function BlueprintViewer({ plan, tasks, jobId, onBack }) {
  const [zoom, setZoom] = useState(0.2);
  const [position, setPosition] = useState({ x: 60, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTask, setSelectedTask] = useState(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pendingPinPosition, setPendingPinPosition] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [cursorPinPosition, setCursorPinPosition] = useState(null);
  
  // Loading states
  const [loadingState, setLoadingState] = useState('loading'); // 'loading' | 'success' | 'error'
  const [loadProgress, setLoadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Toolbar state
  const [activeTool, setActiveTool] = useState('select'); // select | pin | link | pencil | text | eraser | move_pin
  const [showPins, setShowPins] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [movingPin, setMovingPin] = useState(null);
  const [taskFilters, setTaskFilters] = useState({ status: [], priority: [], category: [] });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const timeoutRef = useRef(null);
  
  // Touch handling for mobile
  const [touchStart, setTouchStart] = useState(null);
  const [lastTouchDistance, setLastTouchDistance] = useState(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Validate file type
  const isValidFileType = (url) => {
    if (!url) return false;
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf'];
    return validExtensions.includes(extension);
  };

  const isPdfFile = (url) => {
    if (!url) return false;
    const extension = url.split('.').pop()?.toLowerCase().split('?')[0];
    return extension === 'pdf';
  };

  // PDF rendering state
  const [pdfCanvas, setPdfCanvas] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);
  const canvasRef = useRef(null);

  // Get specific error message
  const getErrorMessage = (error, type) => {
    if (type === 'timeout') {
      return 'Plan loading timed out. The file may be too large.';
    }
    if (type === 'network') {
      return 'Connection error. Please check your internet connection.';
    }
    if (type === 'invalid_type') {
      return 'Unsupported file type. Only images (JPG, PNG, GIF, WebP, SVG) and PDF are supported.';
    }
    if (type === 'corrupt') {
      return 'The file appears to be corrupt or damaged.';
    }
    if (type === 'size') {
      return 'The file exceeds the maximum allowed size.';
    }
    return 'Error loading plan. Please try again.';
  };

  // Load image with timeout and progress simulation
  const loadImage = () => {
    if (!plan?.file_url) {
      setLoadingState('error');
      setErrorMessage('Plan URL not found.');
      return;
    }

    // Validate file type
    if (!isValidFileType(plan.file_url)) {
      setLoadingState('error');
      setErrorMessage(getErrorMessage(null, 'invalid_type'));
      return;
    }

    // Handle PDF files - render with pdf.js
    if (isPdfFile(plan.file_url)) {
      loadPdfWithPdfJs();
      return;
    }

    setLoadingState('loading');
    setLoadProgress(0);
    setErrorMessage('');

    // Simulate progress
    const progressInterval = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      clearInterval(progressInterval);
      if (loadingState === 'loading') {
        handleLoadError('timeout');
      }
    }, LOAD_TIMEOUT_MS);

    // Create image element to preload
    const img = new Image();
    img.onload = () => {
      clearTimeout(timeoutRef.current);
      clearInterval(progressInterval);
      setLoadProgress(100);
      setLoadingState('success');
      setRetryCount(0);
    };
    img.onerror = () => {
      clearTimeout(timeoutRef.current);
      clearInterval(progressInterval);
      handleLoadError('network');
    };
    img.src = plan.file_url;
  };

  const handleLoadError = (type) => {
    if (retryCount < MAX_RETRIES) {
      setIsRetrying(true);
      setErrorMessage(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setIsRetrying(false);
        loadImage();
      }, RETRY_DELAY_MS);
    } else {
      setLoadingState('error');
      setErrorMessage(getErrorMessage(null, type));
    }
  };

  const handleManualRetry = () => {
    setRetryCount(0);
    loadImage();
  };

  // Load PDF using pdf.js CDN - ALL PAGES
  const loadPdfWithPdfJs = async () => {
    setLoadingState('loading');
    setLoadProgress(10);

    try {
      // Load pdf.js from CDN if not already loaded
      if (!window.pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load PDF.js'));
          document.head.appendChild(script);
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
      }

      if (!window.pdfjsLib) {
        throw new Error('PDF.js library not available');
      }

      setLoadProgress(30);

      // Load the PDF document
      const loadingTask = window.pdfjsLib.getDocument(plan.file_url);
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setPdfTotalPages(pdf.numPages);
      setLoadProgress(60);

      // Render ALL pages into one canvas
      await renderAllPdfPages(pdf);
      
      setLoadProgress(100);
      setLoadingState('success');
    } catch (error) {
      console.error('PDF load error:', error);
      setLoadingState('error');
      setErrorMessage('Error loading PDF: ' + error.message);
    }
  };

  // Render all PDF pages into single vertical canvas
  const renderAllPdfPages = async (pdf) => {
    try {
      const scale = 1.5;
      const canvases = [];
      
      // Render all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        canvases.push(canvas);
      }

      // Combine all pages into one vertical canvas
      const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);
      const maxWidth = Math.max(...canvases.map(c => c.width));

      const combinedCanvas = document.createElement('canvas');
      combinedCanvas.width = maxWidth;
      combinedCanvas.height = totalHeight;
      const ctx = combinedCanvas.getContext('2d');

      // Draw all pages vertically
      let currentY = 0;
      canvases.forEach(canvas => {
        ctx.drawImage(canvas, 0, currentY);
        currentY += canvas.height;
      });

      const imageDataUrl = combinedCanvas.toDataURL('image/png');
      setPdfCanvas(imageDataUrl);
      setZoom(0.15); // Start at 15% to fit page
    } catch (err) {
      console.error('PDF render error:', err);
      setLoadingState('error');
      setErrorMessage('Error rendering PDF pages.');
    }
  };



  useEffect(() => {
    loadImage();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [plan?.file_url]);

  // Track container size for mini map
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Track image size when loaded
  const handleImageLoad = (e) => {
    setImageSize({
      width: e.target.naturalWidth,
      height: e.target.naturalHeight
    });
  };

  // Query client for mutations
  const queryClient = useQueryClient();

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      setSelectedTask(null);
    },
  });

  // Filter tasks based on active filters - remove duplicates by id
  const filteredTasks = tasks
    .filter((task, index, self) => 
      index === self.findIndex((t) => t.id === task.id)
    )
    .filter(task => {
      if (taskFilters.status.length > 0 && !taskFilters.status.includes(task.status)) return false;
      if (taskFilters.priority.length > 0 && !taskFilters.priority.includes(task.priority)) return false;
      if (taskFilters.category.length > 0 && !taskFilters.category.includes(task.category)) return false;
      return true;
    });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key.toLowerCase()) {
        case 'z':
          if (!e.ctrlKey && !e.metaKey) handleZoomIn();
          break;
        case 'x':
          handleZoomOut();
          break;
        case 'p':
          setActiveTool('pin');
          setIsPlacingPin(true);
          break;
        case 'escape':
          setActiveTool('select');
          setIsPlacingPin(false);
          setSelectedTask(null);
          setMovingPin(null);
          break;
        case 'f':
          setShowFilters(prev => !prev);
          break;
        case 'm':
          setShowMiniMap(prev => !prev);
          break;
        case '0':
          handleReset();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigate from mini map
  const handleMiniMapNavigate = (newPosition) => {
    setPosition(newPosition);
  };

  // Zoom to specific task
  const handleZoomToTask = (task) => {
    if (!task.pin_x || !task.pin_y) return;
    
    const targetX = -(task.pin_x / 100) * imageSize.width * zoom + containerSize.width / 2;
    const targetY = -(task.pin_y / 100) * imageSize.height * zoom + containerSize.height / 2;
    
    setPosition({ x: targetX, y: targetY });
    setZoom(1.5);
    setSelectedTask(task);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.1));
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Double-tap/click reference
  const lastTapRef = useRef(0);

  // Prevent scroll on canvas container and handle zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelZoom = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isPlacingPin) return;
      
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate zoom delta (smooth)
      const delta = -e.deltaY * 0.002;
      const newZoom = Math.min(Math.max(zoom + delta, 0.1), 5);
      
      if (newZoom === zoom) return;
      
      // Adjust position to zoom towards cursor
      const zoomRatio = newZoom / zoom;
      const newX = mouseX - (mouseX - position.x) * zoomRatio;
      const newY = mouseY - (mouseY - position.y) * zoomRatio;
      
      setZoom(newZoom);
      setPosition({ x: newX, y: newY });
    };

    container.addEventListener('wheel', handleWheelZoom, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelZoom);
  }, [zoom, position, isPlacingPin]);

  const handleMouseDown = (e) => {
    // Don't start dragging if clicking on a pin or if in eraser/move_pin mode
    if (e.target.closest('button') || activeTool === 'eraser' || activeTool === 'move_pin') return;
    if (isPlacingPin) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    // Update cursor pin position if placing pin
    if (isPlacingPin && imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setCursorPinPosition({ x, y });
      } else {
        setCursorPinPosition(null);
      }
    }
    
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Pinch zoom start
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && !isPlacingPin) {
      // Pan start
      setIsDragging(true);
      setTouchStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastTouchDistance) {
      // Pinch zoom - centered on touch midpoint
      e.preventDefault();
      
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const scale = distance / lastTouchDistance;
      const newZoom = Math.min(Math.max(zoom * scale, 0.1), 5);
      
      // Get midpoint of touches
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const touchMidX = ((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left;
        const touchMidY = ((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top;
        
        // Zoom towards touch midpoint
        const zoomRatio = newZoom / zoom;
        const newX = touchMidX - (touchMidX - position.x) * zoomRatio;
        const newY = touchMidY - (touchMidY - position.y) * zoomRatio;
        
        setPosition({ x: newX, y: newY });
      }
      
      setZoom(newZoom);
      setLastTouchDistance(distance);
    } else if (e.touches.length === 1 && isDragging && touchStart) {
      // Pan
      setPosition({
        x: e.touches[0].clientX - touchStart.x,
        y: e.touches[0].clientY - touchStart.y
      });
    }
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);
    setTouchStart(null);
    setLastTouchDistance(null);
    
    // Handle tap for placing pin
    if (isPlacingPin && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const rect = imageRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((touch.clientX - rect.left) / rect.width) * 100;
        const y = ((touch.clientY - rect.top) / rect.height) * 100;
        setPendingPinPosition({ x, y });
        setShowCreateTask(true);
        setIsPlacingPin(false);
      }
    }
  };

  const handleMapAction = (e) => {
    console.log('🖱️ Map action, activeTool:', activeTool, 'movingPin:', !!movingPin);
    
    // 1. 🎯 PRIORIDAD MÁXIMA: Movimiento de Pin
    if (activeTool === 'move_pin' && movingPin) {
      console.log('🎯 Placing pin at new location - PRIORITY');
      handleMovePinToLocation(e);
      return; // Detiene toda otra lógica
    }
    
    // 2. Verificar si se hizo clic en un pin existente
    const clickedElement = e.target;
    const isPin = clickedElement.closest('.task-pin-wrapper');
    
    if (isPin) {
      console.log('📍 Clicked on pin - let pin handler take care of it');
      return;
    }
    
    // 3. Manejar Doble Clic (Zoom)
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      console.log('🔍 Double click detected - zooming');
      if (zoom < 2) {
        setZoom(prev => Math.min(prev * 2, 4));
      } else {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      }
      lastTapRef.current = 0; // Reset para evitar triple click
      return;
    }
    lastTapRef.current = now;
    
    // 4. Lógica de Creación de Pin
    if (activeTool === 'pin' || isPlacingPin) {
      console.log('📍 Creating new pin');
      const rect = imageRef.current.getBoundingClientRect();
      
      const clickX = e.clientX;
      const clickY = e.clientY;
      
      const x = ((clickX - rect.left) / rect.width) * 100;
      const y = ((clickY - rect.top) / rect.height) * 100;
      
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setPendingPinPosition({ x, y });
        setShowCreateTask(true);
        setIsPlacingPin(false);
        setActiveTool('select');
        setCursorPinPosition(null);
      }
    }
  };

  // Handle pin click based on active tool
  const handlePinClick = (task) => {
    console.log('🎯 Pin clicked:', task.id, task.title, 'Active tool:', activeTool);
    
    if (activeTool === 'eraser') {
      // Delete task with eraser
      if (window.confirm(`Delete task "${task.title}"?`)) {
        deleteTaskMutation.mutate(task.id);
      }
    } else if (activeTool === 'move_pin') {
      // Start moving the pin
      console.log('📍 Setting movingPin:', task);
      setMovingPin(task);
      toast.info(`Click on the blueprint to move "${task.title}"`);
    } else {
      // Open task detail panel
      setSelectedTask(task);
    }
  };

  // Update task pin position mutation
  const updateTaskPositionMutation = useMutation({
    mutationFn: ({ taskId, x, y }) => base44.entities.Task.update(taskId, { pin_x: x, pin_y: y }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      toast.success('Pin moved successfully');
    },
  });

  // Handle moving pin to new location
  const handleMovePinToLocation = (e) => {
    if (!movingPin) {
      console.log('❌ No movingPin set');
      return;
    }
    
    console.log('🎯 Moving pin to new location');
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    console.log('📍 New position:', { x, y });

    // Ensure coordinates are within bounds
    if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
      updateTaskPositionMutation.mutate({
        taskId: movingPin.id,
        x,
        y
      });
      toast.success(`Pin moved successfully!`);
    } else {
      toast.error('Invalid position - click inside the blueprint');
    }

    // Reset states
    setMovingPin(null);
    setActiveTool('select');
  };

  // Toolbar items
  const toolbarItems = [
    { id: 'fullscreen', icon: Maximize2, label: 'Fullscreen', action: handleReset },
    { id: 'divider1', type: 'divider' },
    { id: 'zoomIn', icon: ZoomIn, label: 'Zoom In', action: handleZoomIn },
    { id: 'zoomOut', icon: ZoomOut, label: 'Zoom Out', action: handleZoomOut },
    { id: 'divider2', type: 'divider' },
    { id: 'pin', icon: MapPin, label: 'Add Pin', tool: true },
    { id: 'move_pin', icon: Move, label: 'Move Pin', tool: true },
    { id: 'link', icon: Link2, label: 'Add Link', tool: true },
    { id: 'pencil', icon: Pencil, label: 'Draw', tool: true },
    { id: 'text', icon: Type, label: 'Add Text', tool: true },
    { id: 'eraser', icon: Eraser, label: 'Eraser', tool: true },
    { id: 'divider3', type: 'divider' },
    { id: 'print', icon: Printer, label: 'Print', action: () => window.print() },
    { id: 'divider4', type: 'divider' },
    { id: 'select', icon: MousePointer, label: 'Select', tool: true },
    { id: 'undo', icon: Undo2, label: 'Undo', action: () => {} },
    { id: 'divider5', type: 'divider' },
    { id: 'minimap', icon: Square, label: 'Mini Map (M)', action: () => setShowMiniMap(prev => !prev) },
    { id: 'filter', icon: Search, label: 'Filters (F)', action: () => setShowFilters(prev => !prev) },
  ];

  const handleTaskCreated = () => {
    setPendingPinPosition(null);
    setShowCreateTask(false);
    setCursorPinPosition(null);
  };

  return (
    <TooltipProvider>
    <div className="w-full h-full flex flex-col relative">
      {/* Left Toolbar - Like Fieldwire - Always visible */}
      <div className="absolute left-2 top-16 z-50 flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg w-11 py-2">
        {toolbarItems.map((item, idx) => {
          if (item.type === 'divider') {
            return <div key={item.id} className="my-2 mx-2 border-t border-slate-200 dark:border-slate-700" />;
          }
          
          const isActive = item.tool && activeTool === item.id;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    if (item.tool) {
                      setActiveTool(item.id);
                      if (item.id === 'pin') {
                        setIsPlacingPin(true);
                      } else {
                        setIsPlacingPin(false);
                      }
                    } else if (item.action) {
                      item.action();
                    }
                  }}
                  className={`mx-1 p-2 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-[#FFB800] text-white' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {/* Divider before visibility */}
        <div className="my-2 mx-2 border-t border-slate-200 dark:border-slate-700" />
        
        {/* Toggle Pins Visibility */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowPins(!showPins)}
              className={`mx-1 p-2 rounded-lg transition-all ${
                showPins 
                  ? 'text-[#FFB800]' 
                  : 'text-slate-400'
              }`}
            >
              {showPins ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{showPins ? 'Hide Pins' : 'Show Pins'}</p>
          </TooltipContent>
        </Tooltip>
        </div>

        {/* AI Learning Engine - Below toolbar */}
        <div className="absolute left-2 top-[420px] z-40 w-72">
          <AILearningEngine jobId={jobId} planId={plan?.id} />
        </div>

      {/* Live Collaborators */}
      <LiveCollaborators planId={plan?.id} jobId={jobId} />

      {/* Filters Bar */}
      {showFilters && (
        <BlueprintFilterBar 
          tasks={tasks}
          activeFilters={taskFilters}
          onFilterChange={setTaskFilters}
          onClearFilters={() => setTaskFilters({ status: [], priority: [], category: [] })}
        />
      )}

      {/* Main Viewer */}
      <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900 h-full">
        {/* Top Header - Simplified */}
        <div className="flex items-center justify-between p-2 md:p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline ml-2">Back</span>
            </Button>
            <span className="text-slate-900 dark:text-white font-medium text-sm md:text-base truncate max-w-[150px] md:max-w-none">{plan.name}</span>
            <BlueprintVersionHistory plan={plan} jobId={jobId} />
          </div>
          
          {/* Right side tools */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAnnotations(!showAnnotations)}
              className={showAnnotations ? 'text-[#FFB800]' : ''}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Annotate
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 dark:text-slate-400">
              <Search className="w-4 h-4" />
            </Button>
            <button
              onClick={() => setShowPins(!showPins)}
              className={`p-2 rounded-lg ${showPins ? 'text-[#FFB800]' : 'text-slate-400'}`}
            >
              {showPins ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Toolbar - Bottom - Hidden since we have left toolbar */}
        <div className="hidden fixed bottom-20 left-2 right-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-2 flex justify-around z-40">
          <button
            onClick={() => { setActiveTool('select'); setIsPlacingPin(false); }}
            className={`p-2 rounded-lg ${activeTool === 'select' ? 'bg-[#FFB800] text-white' : 'text-slate-600'}`}
          >
            <MousePointer className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setActiveTool('pin'); setIsPlacingPin(true); }}
            className={`p-2 rounded-lg ${activeTool === 'pin' ? 'bg-[#FFB800] text-white' : 'text-slate-600'}`}
          >
            <MapPin className="w-5 h-5" />
          </button>
          <button onClick={handleZoomOut} className="p-2 rounded-lg text-slate-600">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="flex items-center text-sm text-slate-500 px-2">{Math.round(zoom * 100)}%</span>
          <button onClick={handleZoomIn} className="p-2 rounded-lg text-slate-600">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={handleReset} className="p-2 rounded-lg text-slate-600">
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas - Touch enabled */}
        <div 
          ref={containerRef}
          className={`flex-1 overflow-hidden touch-none h-full ${activeTool === 'pin' || isPlacingPin ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          tabIndex={0}
          style={{ outline: 'none' }}
        >
          {/* Loading State */}
          {loadingState === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
              <p className="text-white mb-4">
                {isRetrying ? errorMessage : 'Loading plan...'}
              </p>
              {loadProgress > 0 && (
                <div className="w-64">
                  <Progress value={loadProgress} className="h-2" />
                  <p className="text-center text-sm text-slate-400 mt-2">
                    {Math.round(loadProgress)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {loadingState === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center h-full">
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Error loading plan</h3>
                <p className="text-slate-400 mb-6">{errorMessage}</p>
                <Button 
                  onClick={handleManualRetry}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Success State - Show Image/PDF */}
          {loadingState === 'success' && (
            <div 
              className="relative w-full h-full flex items-start justify-start pl-16 pt-4"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'top left',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <div className="relative" style={{ minWidth: '100px', minHeight: '100px' }}>
                {isPdfFile(plan.file_url) ? (
                  pdfCanvas ? (
                    <>
                      <img 
                        ref={imageRef}
                        src={pdfCanvas}
                        alt={plan.name}
                        style={{ maxWidth: 'none', maxHeight: 'none' }}
                        onClick={handleMapAction}
                        onLoad={handleImageLoad}
                        draggable={false}
                      />
                      {/* PDF Info Badge */}
                      {pdfTotalPages > 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2 z-30">
                          <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            All {pdfTotalPages} pages loaded
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    </div>
                  )
                ) : (
                  <img 
                    ref={imageRef}
                    src={plan.file_url}
                    alt={plan.name}
                    className="max-w-none"
                    onClick={handleMapAction}
                    onLoad={handleImageLoad}
                    draggable={false}
                    onError={() => {
                      setLoadingState('error');
                      setErrorMessage(getErrorMessage(null, 'corrupt'));
                    }}
                  />
                )}
                {/* Task Pins - works for both images and PDF canvas */}
                {showPins && filteredTasks.map((task) => (
                  <TaskPin 
                    key={task.id}
                    task={task}
                    onClick={handlePinClick}
                    isSelected={selectedTask?.id === task.id || movingPin?.id === task.id}
                    isErasing={activeTool === 'eraser'}
                    isMoving={activeTool === 'move_pin'}
                  />
                ))}
                {/* Cursor Pin - follows mouse */}
                {cursorPinPosition && isPlacingPin && (
                  <div 
                    className="absolute w-8 h-8 -ml-4 -mt-8 pointer-events-none"
                    style={{ left: `${cursorPinPosition.x}%`, top: `${cursorPinPosition.y}%` }}
                  >
                    <MapPin className="w-8 h-8 text-amber-500 drop-shadow-lg" fill="currentColor" />
                  </div>
                )}
                {/* Pending Pin */}
                {pendingPinPosition && (
                  <div 
                    className="absolute w-6 h-6 -ml-3 -mt-6 animate-bounce"
                    style={{ left: `${pendingPinPosition.x}%`, top: `${pendingPinPosition.y}%` }}
                  >
                    <div className="w-full h-full bg-amber-500 rounded-full border-2 border-white shadow-lg" />
                  </div>
                )}
              </div>

              {/* Annotations Layer - Lower z-index than pins */}
              {showAnnotations && (
                <div className="absolute inset-0" style={{ zIndex: 10 }}>
                  <BlueprintAnnotations
                    planId={plan.id}
                    jobId={jobId}
                    zoom={zoom}
                    position={position}
                    imageSize={imageSize}
                    blueprintActiveTool={activeTool}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {(isPlacingPin || activeTool === 'pin') && (
          <div className="absolute bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 bg-[#FFB800] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            Tap on the plan to place pin (ESC to cancel)
          </div>
        )}
        
        {activeTool === 'eraser' && (
          <div className="absolute bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
            <Eraser className="w-4 h-4" />
            Click on a pin to delete it (ESC to cancel)
          </div>
        )}

        {activeTool === 'move_pin' && !movingPin && (
          <div className="absolute bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
            <Move className="w-4 h-4" />
            Click on a pin to start moving it (ESC to cancel)
          </div>
        )}

        {activeTool === 'move_pin' && movingPin && (
          <div className="absolute bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
            <Move className="w-4 h-4" />
            Click on the blueprint to place pin at new location
          </div>
        )}

        {/* Mini Map */}
        {showMiniMap && loadingState === 'success' && (
          <BlueprintMiniMap 
            imageUrl={pdfCanvas || plan.file_url}
            viewportPosition={position}
            zoom={zoom}
            containerSize={containerSize}
            imageSize={imageSize}
            onNavigate={handleMiniMapNavigate}
          />
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="absolute bottom-4 left-20 text-[10px] text-slate-400 dark:text-slate-500 hidden md:block">
          Z/X: Zoom • P: Pin • F: Filters • M: Mini Map • ESC: Cancel • Double-click: Quick Zoom
        </div>
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel 
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          jobId={jobId}
          allTasks={tasks}
          onZoomTo={handleZoomToTask}
        />
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog 
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        jobId={jobId}
        blueprintId={plan.id}
        pinPosition={pendingPinPosition}
        onCreated={handleTaskCreated}
      />
    </div>
    </TooltipProvider>
  );
}