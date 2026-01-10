import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft, Plus, ZoomIn, ZoomOut, Maximize2, AlertTriangle, RefreshCw, Loader2, Move,
  MapPin, Link2, Pencil, Square, Printer, Type, Eraser, Circle, MousePointer, Undo2, Eye, EyeOff, Search, Crosshair, CheckCircle2, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import TaskPin from './TaskPin.jsx';
import TaskDetailPanel from './TaskDetailPanel.jsx';
import CreateTaskDialog from './CreateTaskDialog.jsx';
import BlueprintMiniMap from './BlueprintMiniMap.jsx';
import BlueprintFilterBar from './BlueprintFilterBar.jsx';
import LiveCollaborators from './LiveCollaborators.jsx';
import AILearningEngine from './AILearningEngine.jsx';
import ClientPunchDialog from '../client/ClientPunchDialog.jsx';
import PunchItemReview from './PunchItemReview.jsx';
import MeasurementOverlay from './overlays/MeasurementOverlay.jsx';
import LayerControls from './overlays/LayerControls.jsx';
import MeasurementDetailDialog from './overlays/MeasurementDetailDialog.jsx';
import MeasurementLegend from './overlays/MeasurementLegend.jsx';
import { FIELD_QUERY_KEYS } from '@/components/field/fieldQueryKeys';

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const LOAD_TIMEOUT_MS = 30000;

export default function BlueprintViewer({ plan, tasks, jobId, onBack, isClientView = false, clientEmail, clientName }) {
  const queryClient = useQueryClient();
  const [zoom, setZoom] = useState(0.3); // Optimized initial zoom
  const [position, setPosition] = useState({ x: 60, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pendingPinPosition, setPendingPinPosition] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showClientPunch, setShowClientPunch] = useState(false);
  const [reviewingPunch, setReviewingPunch] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [draggingPin, setDraggingPin] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [cursorPosition, setCursorPosition] = useState(null);
  const [showAILearning, setShowAILearning] = useState(false);
  const [hasNewAIPatterns, setHasNewAIPatterns] = useState(false);
  
  // Measurement overlay state
  const [layers, setLayers] = useState({
    tasks: true,
    horizontal: true,
    vertical: true,
    benchmarks: true,
    photos: false,
    incidents: false
  });
  const [selectedMeasurement, setSelectedMeasurement] = useState(null);
  const [selectedMeasurementType, setSelectedMeasurementType] = useState(null);
  
  // Loading states
  const [loadingState, setLoadingState] = useState('loading'); // 'loading' | 'success' | 'error'
  const [loadProgress, setLoadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Toolbar state
  const [activeTool, setActiveTool] = useState('select'); // select | pin | link | pencil | text | eraser
  const [showPins, setShowPins] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
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

  // Fetch measurements data
  const { data: horizontalMeasurements = [] } = useQuery({
    queryKey: FIELD_QUERY_KEYS.FIELD_DIMENSIONS(jobId),
    queryFn: () => base44.entities.FieldDimension.filter({ project_id: jobId }),
    enabled: !!jobId,
    staleTime: Infinity,
    gcTime: Infinity
  });

  const { data: verticalMeasurements = [] } = useQuery({
    queryKey: FIELD_QUERY_KEYS.VERTICAL_MEASUREMENTS(jobId),
    queryFn: () => base44.entities.VerticalMeasurement.filter({ project_id: jobId }),
    enabled: !!jobId,
    staleTime: Infinity,
    gcTime: Infinity
  });

  const { data: benchmarks = [] } = useQuery({
    queryKey: FIELD_QUERY_KEYS.BENCHMARKS(jobId),
    queryFn: () => base44.entities.Benchmark.filter({ project_id: jobId }),
    enabled: !!jobId,
    staleTime: Infinity,
    gcTime: Infinity
  });

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

    // Create image element to preload
    const img = new Image();
    
    // Set timeout
    timeoutRef.current = setTimeout(() => {
      if (loadingState === 'loading') {
        handleLoadError('timeout');
      }
    }, LOAD_TIMEOUT_MS);

    img.onload = () => {
      clearTimeout(timeoutRef.current);
      setLoadProgress(100);
      setLoadingState('success');
      setRetryCount(0);
    };
    img.onerror = () => {
      clearTimeout(timeoutRef.current);
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

  // Render all PDF pages into single vertical canvas - OPTIMIZED
  const renderAllPdfPages = async (pdf) => {
    try {
      const scale = 2.0; // Higher quality for blueprints
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

      // Use JPEG for better performance with large PDFs
      const imageDataUrl = combinedCanvas.toDataURL('image/jpeg', 0.92);
      setPdfCanvas(imageDataUrl);
      setZoom(0.25); // Optimized start zoom
    } catch (err) {
      console.error('PDF render error:', err);
      setLoadingState('error');
      setErrorMessage('Error rendering PDF pages.');
    }
  };



  useEffect(() => {
    if (plan?.file_url) {
      loadImage();
    }
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

  // Filter tasks based on active filters
  const filteredTasks = tasks.filter(task => {
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
          setPendingPinPosition(null);
          setCursorPosition(null);
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

  // Double-tap/click to zoom
  const lastTapRef = useRef(0);
  const handleDoubleTap = useCallback((e) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected - zoom in at tap location
      if (zoom < 2) {
        setZoom(prev => Math.min(prev * 2, 4));
      } else {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      }
    }
    lastTapRef.current = now;
  }, [zoom]);

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
    // Don't start canvas drag if clicking on a pin
    if (e.target.closest('button')) return;
    if (isPlacingPin || draggingPin) return;
    setIsDragging(true);
    setHasDragged(false);
    setDragDistance(0);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    // Update cursor position for pin preview
    if (isPlacingPin || activeTool === 'pin') {
      const rect = imageRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setCursorPosition({ x, y });
      }
    } else {
      setCursorPosition(null);
    }

    if (draggingPin) {
      // Moving a pin
      const rect = imageRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
        const y = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
        
        // Update pin position visually
        setDraggingPin({
          ...draggingPin,
          pin_x: Math.max(0, Math.min(100, x)),
          pin_y: Math.max(0, Math.min(100, y))
        });
      }
      return;
    }
    
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    const distance = Math.sqrt(Math.pow(newX - position.x, 2) + Math.pow(newY - position.y, 2));
    
    setDragDistance(distance);
    
    // Only consider it "dragged" if moved more than 5 pixels
    if (distance > 5) {
      setHasDragged(true);
    }
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = async () => {
    if (draggingPin) {
      // Save the new pin position
      try {
        await base44.entities.Task.update(draggingPin.id, {
          pin_x: draggingPin.pin_x,
          pin_y: draggingPin.pin_y
        });
        // Scoped optimistic update - Field isolation
        const { updateFieldQueryData } = await import('./config/fieldQueryConfig');
        updateFieldQueryData(queryClient, jobId, 'TASKS', (old) => 
          old ? old.map(t => t.id === draggingPin.id ? {...t, pin_x: draggingPin.pin_x, pin_y: draggingPin.pin_y} : t) : old
        );
        updateFieldQueryData(queryClient, jobId, 'WORK_UNITS', (old) => 
          old ? old.map(t => t.id === draggingPin.id ? {...t, pin_x: draggingPin.pin_x, pin_y: draggingPin.pin_y} : t) : old
        );
      } catch (error) {
        console.error('Error updating pin position:', error);
      }
      setDraggingPin(null);
      return;
    }
    
    setIsDragging(false);
    // Reset hasDragged after a short delay to allow click handlers to check it
    setTimeout(() => {
      setHasDragged(false);
      setDragDistance(0);
    }, 50);
  };

  const handlePinClick = useCallback((task, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Client punch items open review dialog
    if (task.created_by_client && task.task_type === 'punch_item') {
      setReviewingPunch(task);
    } else {
      setEditingTask(task);
      setShowCreateTask(true);
    }
  }, []);

  const handlePinDrag = (task, e) => {
    e.stopPropagation();
    const rect = imageRef.current?.getBoundingClientRect();
    if (rect) {
      const offsetX = e.clientX - rect.left - (task.pin_x / 100) * rect.width;
      const offsetY = e.clientY - rect.top - (task.pin_y / 100) * rect.height;
      setDragOffset({ x: offsetX, y: offsetY });
      setDraggingPin(task);
    }
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

  const handleImageClick = (e) => {
    // Don't handle if clicking on a pin button
    if (e.target.closest('button')) return;
    
    // Don't place pin if we just finished dragging the view
    if (hasDragged || dragDistance > 5) return;
    
    if (activeTool !== 'pin' && !isPlacingPin) return;
    
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPendingPinPosition({ x, y });
    
    // Client creates punch, internal creates task
    if (isClientView) {
      setShowClientPunch(true);
    } else {
      setShowCreateTask(true);
    }
    
    setIsPlacingPin(false);
    setActiveTool('select');
    setCursorPosition(null);
  };

  // Toolbar items
  const toolbarItems = [
    { id: 'fullscreen', icon: Maximize2, label: 'Fullscreen', action: handleReset },
    { id: 'divider1', type: 'divider' },
    { id: 'zoomIn', icon: ZoomIn, label: 'Zoom In', action: handleZoomIn },
    { id: 'zoomOut', icon: ZoomOut, label: 'Zoom Out', action: handleZoomOut },
    { id: 'divider2', type: 'divider' },
    { id: 'pin', icon: MapPin, label: isClientView ? 'Report Issue' : 'Add Pin', tool: true },
    { id: 'divider3', type: 'divider' },
    { id: 'select', icon: MousePointer, label: 'Select', tool: true },
    { id: 'divider4', type: 'divider' },
    { id: 'ai', icon: Brain, label: 'AI Learning', action: () => setShowAILearning(prev => !prev), badge: hasNewAIPatterns },
    { id: 'filter', icon: Search, label: 'Filters (F)', action: () => setShowFilters(prev => !prev) },
  ];

  const handleTaskCreated = async (newTaskId) => {
    setPendingPinPosition(null);
    setShowCreateTask(false);
    setEditingTask(null);
    setCursorPosition(null);

    if (newTaskId) {
      await queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      await queryClient.invalidateQueries({ queryKey: ['work-units', jobId] });
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await base44.entities.Task.delete(taskId);
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      queryClient.invalidateQueries({ queryKey: ['work-units', jobId] });
      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleLayerToggle = (layerId) => {
    setLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const handleMeasurementTap = (measurement, type) => {
    setSelectedMeasurement(measurement);
    setSelectedMeasurementType(type);
  };

  const handleMeasurementLongPress = (measurement, type) => {
    // Future: open edit dialog
    setSelectedMeasurement(measurement);
    setSelectedMeasurementType(type);
  };

  const handleDeleteMeasurement = async (measurement) => {
    try {
      if (selectedMeasurementType === 'horizontal') {
        await base44.entities.FieldDimension.delete(measurement.id);
        queryClient.invalidateQueries({ queryKey: FIELD_QUERY_KEYS.FIELD_DIMENSIONS(jobId) });
      } else if (selectedMeasurementType === 'vertical') {
        await base44.entities.VerticalMeasurement.delete(measurement.id);
        queryClient.invalidateQueries({ queryKey: FIELD_QUERY_KEYS.VERTICAL_MEASUREMENTS(jobId) });
      } else if (selectedMeasurementType === 'benchmark') {
        await base44.entities.Benchmark.delete(measurement.id);
        queryClient.invalidateQueries({ queryKey: FIELD_QUERY_KEYS.BENCHMARKS(jobId) });
      }
      setSelectedMeasurement(null);
      setSelectedMeasurementType(null);
    } catch (error) {
      console.error('Error deleting measurement:', error);
    }
  };

  return (
    <TooltipProvider>
    <div className="h-full flex relative">
      {/* Left Toolbar - Mobile Optimized - High Contrast */}
      <div className="absolute left-2 md:left-2 top-16 md:top-20 z-50 flex flex-col bg-gradient-to-b from-slate-900 to-black border-2 border-slate-700 rounded-2xl shadow-2xl py-2 gap-1">
        {toolbarItems.map((item, idx) => {
          if (item.type === 'divider') {
            return <div key={item.id} className="my-1 mx-2 border-t-2 border-slate-600" />;
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
                      if (item.id === 'ai') {
                        setHasNewAIPatterns(false);
                      }
                    }
                  }}
                  className={`mx-1 min-w-[48px] min-h-[48px] rounded-xl transition-all relative touch-manipulation active:scale-95 flex items-center justify-center ${
                    isActive 
                      ? 'bg-gradient-to-br from-orange-600 to-yellow-500 text-black shadow-xl shadow-orange-500/40 border-2 border-orange-400' 
                      : 'text-slate-300 active:bg-slate-700 bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  <item.icon className="w-6 h-6" />
                  {item.badge && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-slate-800" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-800 border-slate-600 text-white">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
        
        {/* Divider before visibility */}
        <div className="my-1 mx-2 border-t-2 border-slate-600" />
        
        {/* Toggle Pins Visibility */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowPins(!showPins)}
              className={`mx-1 min-w-[48px] min-h-[48px] rounded-xl transition-all touch-manipulation active:scale-95 flex items-center justify-center ${
                showPins 
                  ? 'bg-gradient-to-br from-orange-600 to-yellow-500 text-black shadow-xl shadow-orange-500/40 border-2 border-orange-400' 
                  : 'bg-slate-800 text-slate-400 active:bg-slate-700 hover:bg-slate-700'
              }`}
            >
              {showPins ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 border-slate-600 text-white">
            <p>{showPins ? 'Hide Pins' : 'Show Pins'}</p>
          </TooltipContent>
        </Tooltip>
        </div>

        {/* AI Learning Engine - Dropdown panel */}
        {showAILearning && (
          <div className="absolute left-14 top-16 z-40 w-80">
            <AILearningEngine 
              jobId={jobId} 
              planId={plan?.id}
              onNewPattern={() => setHasNewAIPatterns(true)}
            />
          </div>
        )}

      {/* Live Collaborators */}
      <LiveCollaborators planId={plan?.id} jobId={jobId} />

      {/* Layer Controls */}
      <LayerControls layers={layers} onLayerToggle={handleLayerToggle} />

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
      <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900">
        {/* Top Header - High Contrast */}
        <div className="flex items-center justify-between p-3 md:p-4 bg-gradient-to-r from-slate-900 to-slate-800 border-b-2 border-slate-700 shadow-xl">
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            <Button 
              onClick={onBack} 
              className="bg-slate-700 hover:bg-slate-600 text-white border-2 border-slate-600 shadow-lg min-h-[48px] min-w-[48px] rounded-xl flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="text-white font-bold text-lg truncate">{plan.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPins(!showPins)}
              className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                showPins 
                  ? 'bg-gradient-to-r from-orange-600 to-yellow-500 text-black shadow-lg' 
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {showPins ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* Mobile Toolbar - REMOVED - use left toolbar only */}
        <div className="hidden">
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

        {/* Canvas - Touch enabled - PADDING FOR BOTTOM RAIL */}
        <div 
          ref={containerRef}
          className={`flex-1 overflow-hidden touch-none pb-20 ${activeTool === 'pin' || isPlacingPin ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleDoubleTap}
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
                        onClick={handleImageClick}
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
                    onClick={handleImageClick}
                    onLoad={handleImageLoad}
                    draggable={false}
                    onError={() => {
                      setLoadingState('error');
                      setErrorMessage(getErrorMessage(null, 'corrupt'));
                    }}
                  />
                )}
                {/* Measurement Overlay */}
                <MeasurementOverlay
                  measurements={horizontalMeasurements}
                  verticalMeasurements={verticalMeasurements}
                  benchmarks={benchmarks}
                  imageSize={imageSize}
                  zoom={zoom}
                  visible={layers.horizontal || layers.vertical || layers.benchmarks}
                  onMeasurementTap={handleMeasurementTap}
                  onMeasurementLongPress={handleMeasurementLongPress}
                />
                
                {/* Task Pins - works for both images and PDF canvas */}
                {showPins && layers.tasks && filteredTasks.map((task) => {
                  const displayTask = draggingPin?.id === task.id ? draggingPin : task;
                  return (
                    <TaskPin 
                      key={task.id}
                      task={displayTask}
                      onClick={(e) => handlePinClick(task, e)}
                      onDragPin={handlePinDrag}
                      isDragging={draggingPin?.id === task.id}
                      isSelected={selectedTask?.id === task.id}
                    />
                  );
                })}
                {/* Cursor Pin Preview - shows where pin will be placed */}
                {(isPlacingPin || activeTool === 'pin') && cursorPosition && !pendingPinPosition && (
                  <div 
                    className="absolute pointer-events-none"
                    style={{ 
                      left: `${cursorPosition.x}%`, 
                      top: `${cursorPosition.y}%`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <div className="relative">
                      <div className="min-w-[28px] h-6 px-1.5 rounded-md bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center opacity-70">
                        <span className="text-sm">🚧</span>
                      </div>
                      {/* Pin point */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-amber-500" />
                    </div>
                  </div>
                )}
                {/* Pending Pin - after click, before task creation */}
                {pendingPinPosition && (
                  <div 
                    className="absolute animate-bounce pointer-events-none"
                    style={{ 
                      left: `${pendingPinPosition.x}%`, 
                      top: `${pendingPinPosition.y}%`,
                      transform: 'translate(-50%, -100%)'
                    }}
                  >
                    <div className="relative">
                      <div className="min-w-[28px] h-6 px-1.5 rounded-md bg-green-500 border-2 border-white shadow-lg flex items-center justify-center">
                        <span className="text-[11px] font-bold text-white">✓</span>
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-green-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {(isPlacingPin || activeTool === 'pin') && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-600 to-yellow-500 text-black px-6 py-3 rounded-2xl shadow-2xl text-base font-bold flex items-center gap-3 border-2 border-white/50 animate-pulse">
            <Crosshair className="w-6 h-6" />
            Tap to Place Pin
          </div>
        )}



        {/* Measurement Legend - Always visible when measurements exist */}
        {(horizontalMeasurements.length > 0 || verticalMeasurements.length > 0 || benchmarks.length > 0) && (
          <div className="absolute bottom-4 right-4 max-w-xs">
            <MeasurementLegend 
              showHorizontal={horizontalMeasurements.length > 0 && layers.horizontal}
              showVertical={verticalMeasurements.length > 0 && layers.vertical}
              showBenchmarks={benchmarks.length > 0 && layers.benchmarks}
              compact={true}
            />
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        {!isClientView && (
          <div className="absolute bottom-4 left-20 text-[10px] text-slate-400 dark:text-slate-500 hidden md:block">
            Z/X: Zoom • P: Pin • F: Filters • M: Mini Map • ESC: Cancel • Double-click: Quick Zoom
          </div>
        )}
      </div>



      {/* Create/Edit Task Dialog */}
      <CreateTaskDialog 
        open={showCreateTask}
        onOpenChange={(open) => {
          setShowCreateTask(open);
          if (!open) {
            setPendingPinPosition(null);
            setEditingTask(null);
            setCursorPosition(null);
          }
        }}
        jobId={jobId}
        blueprintId={plan.id}
        pinPosition={pendingPinPosition || (editingTask ? { x: editingTask.pin_x, y: editingTask.pin_y } : null)}
        onCreated={handleTaskCreated}
        planImageUrl={pdfCanvas || plan.file_url}
        pdfCanvas={pdfCanvas}
        existingTask={editingTask}
      />

      {/* Client Punch Dialog */}
      <ClientPunchDialog
        open={showClientPunch}
        onOpenChange={(open) => {
          setShowClientPunch(open);
          if (!open) {
            setPendingPinPosition(null);
            setCursorPosition(null);
          }
        }}
        jobId={jobId}
        planId={plan?.id}
        pinPosition={pendingPinPosition}
        clientEmail={clientEmail}
        clientName={clientName}
        onCreated={handleTaskCreated}
      />

      {/* Punch Item Review Dialog */}
      <PunchItemReview
        punchItem={reviewingPunch}
        open={!!reviewingPunch}
        onOpenChange={(open) => !open && setReviewingPunch(null)}
      />

      {/* Measurement Detail Dialog */}
      <MeasurementDetailDialog
        measurement={selectedMeasurement}
        type={selectedMeasurementType}
        open={!!selectedMeasurement}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMeasurement(null);
            setSelectedMeasurementType(null);
          }
        }}
        onDelete={handleDeleteMeasurement}
        canEdit={!isClientView}
      />
    </div>
    </TooltipProvider>
  );
}