import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft, Plus, ZoomIn, ZoomOut, Maximize2, AlertTriangle, RefreshCw, Loader2, Move,
  MapPin, Link2, Pencil, Square, Printer, Type, Eraser, Circle, MousePointer, Undo2, Eye, EyeOff, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import TaskPin from './TaskPin.jsx';
import TaskDetailPanel from './TaskDetailPanel.jsx';
import CreateTaskDialog from './CreateTaskDialog.jsx';

// Constants for retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const LOAD_TIMEOUT_MS = 30000;

export default function BlueprintViewer({ plan, tasks, jobId, onBack }) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTask, setSelectedTask] = useState(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pendingPinPosition, setPendingPinPosition] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  
  // Loading states
  const [loadingState, setLoadingState] = useState('loading'); // 'loading' | 'success' | 'error'
  const [loadProgress, setLoadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Toolbar state
  const [activeTool, setActiveTool] = useState('select'); // select | pin | link | pencil | text | eraser
  const [showPins, setShowPins] = useState(true);
  
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

  // Load PDF using pdf.js CDN
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
          script.onerror = reject;
          document.head.appendChild(script);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      setLoadProgress(30);

      // Load the PDF document
      const loadingTask = window.pdfjsLib.getDocument(plan.file_url);
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setPdfTotalPages(pdf.numPages);
      setLoadProgress(60);

      // Render first page
      await renderPdfPage(pdf, 1);
      
      setLoadProgress(100);
      setLoadingState('success');
    } catch (error) {
      console.error('PDF load error:', error);
      setLoadingState('error');
      setErrorMessage('Error loading PDF. Please try again.');
    }
  };

  const renderPdfPage = async (pdf, pageNum) => {
    const page = await pdf.getPage(pageNum);
    const scale = 1.5; // Balanced scale for quality vs performance
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    // Convert to image data URL
    const imageDataUrl = canvas.toDataURL('image/png');
    setPdfCanvas(imageDataUrl);
    setPdfPage(pageNum);
    
    // Auto-fit zoom to container
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth - 100;
      const containerHeight = containerRef.current.clientHeight - 100;
      const fitZoom = Math.min(
        containerWidth / viewport.width,
        containerHeight / viewport.height,
        1
      );
      setZoom(Math.max(0.2, fitZoom));
    }
  };

  const handlePdfPageChange = async (newPage) => {
    if (!pdfDoc || newPage < 1 || newPage > pdfTotalPages) return;
    setLoadingState('loading');
    await renderPdfPage(pdfDoc, newPage);
    setLoadingState('success');
  };

  useEffect(() => {
    loadImage();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [plan?.file_url]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.15, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.15, 0.1));
  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (isPlacingPin) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
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
      // Pinch zoom
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = distance / lastTouchDistance;
      setZoom(prev => Math.min(Math.max(prev * scale, 0.1), 4));
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
    if (activeTool !== 'pin' && !isPlacingPin) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPendingPinPosition({ x, y });
    setShowCreateTask(true);
    setIsPlacingPin(false);
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
    { id: 'link', icon: Link2, label: 'Add Link', tool: true },
    { id: 'pencil', icon: Pencil, label: 'Draw', tool: true },
    { id: 'text', icon: Type, label: 'Add Text', tool: true },
    { id: 'eraser', icon: Eraser, label: 'Eraser', tool: true },
    { id: 'divider3', type: 'divider' },
    { id: 'print', icon: Printer, label: 'Print', action: () => window.print() },
    { id: 'divider4', type: 'divider' },
    { id: 'select', icon: MousePointer, label: 'Select', tool: true },
    { id: 'undo', icon: Undo2, label: 'Undo', action: () => {} },
  ];

  const handleTaskCreated = () => {
    setPendingPinPosition(null);
    setShowCreateTask(false);
  };

  return (
    <TooltipProvider>
    <div className="h-full flex relative">
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

      {/* Main Viewer */}
      <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900">
        {/* Top Header - Simplified */}
        <div className="flex items-center justify-between p-2 md:p-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline ml-2">Back</span>
            </Button>
            <span className="text-slate-900 dark:text-white font-medium text-sm md:text-base truncate max-w-[150px] md:max-w-none">{plan.name}</span>
          </div>
          
          {/* Right side tools */}
          <div className="flex items-center gap-2">
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
          className={`flex-1 overflow-hidden touch-none ${activeTool === 'pin' || isPlacingPin ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
              className="relative w-full h-full flex items-center justify-center"
              style={{
                transform: isPdfFile(plan.file_url) ? 'none' : `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <div className="relative">
                {isPdfFile(plan.file_url) && pdfCanvas ? (
                  <>
                    <img 
                      ref={imageRef}
                      src={pdfCanvas}
                      alt={plan.name}
                      className="max-w-none"
                      onClick={handleImageClick}
                      draggable={false}
                    />
                    {/* PDF Page Controls */}
                    {pdfTotalPages > 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center gap-3 z-30">
                        <button
                          onClick={() => handlePdfPageChange(pdfPage - 1)}
                          disabled={pdfPage <= 1}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          Page {pdfPage} / {pdfTotalPages}
                        </span>
                        <button
                          onClick={() => handlePdfPageChange(pdfPage + 1)}
                          disabled={pdfPage >= pdfTotalPages}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rotate-180"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                ) : !isPdfFile(plan.file_url) ? (
                  <img 
                    ref={imageRef}
                    src={plan.file_url}
                    alt={plan.name}
                    className="max-w-none"
                    onClick={handleImageClick}
                    draggable={false}
                    onError={() => {
                      setLoadingState('error');
                      setErrorMessage(getErrorMessage(null, 'corrupt'));
                    }}
                  />
                ) : null}
                {/* Task Pins - works for both images and PDF canvas */}
                {showPins && tasks.map((task) => (
                  <TaskPin 
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTask(task)}
                    isSelected={selectedTask?.id === task.id}
                  />
                ))}
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
            </div>
          )}
        </div>

        {(isPlacingPin || activeTool === 'pin') && (
          <div className="absolute bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 bg-[#FFB800] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
            Tap on the plan to place pin
          </div>
        )}
      </div>

      {/* Task Detail Panel */}
      {selectedTask && (
        <TaskDetailPanel 
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          jobId={jobId}
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