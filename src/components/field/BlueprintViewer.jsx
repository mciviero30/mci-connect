import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, ZoomIn, ZoomOut, Maximize2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const timeoutRef = useRef(null);

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

    // Handle PDF files differently
    if (isPdfFile(plan.file_url)) {
      setLoadingState('success');
      setLoadProgress(100);
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

  useEffect(() => {
    loadImage();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [plan?.file_url]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
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

  const handleImageClick = (e) => {
    if (!isPlacingPin) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setPendingPinPosition({ x, y });
    setShowCreateTask(true);
    setIsPlacingPin(false);
  };

  const handleTaskCreated = () => {
    setPendingPinPosition(null);
    setShowCreateTask(false);
  };

  return (
    <div className="h-full flex">
      {/* Main Viewer */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <span className="text-white font-medium">{plan.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isPlacingPin ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPlacingPin(!isPlacingPin)}
              className={isPlacingPin 
                ? "bg-amber-500 hover:bg-amber-600 text-white" 
                : "border-slate-700 text-slate-300 hover:bg-slate-800"
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              {isPlacingPin ? 'Cancel' : 'Add Task'}
            </Button>
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8 text-slate-400 hover:text-white">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8 text-slate-400 hover:text-white">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleReset} className="h-8 w-8 text-slate-400 hover:text-white">
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={containerRef}
          className={`flex-1 overflow-hidden ${isPlacingPin ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
              <div className="relative" style={{ width: isPdfFile(plan.file_url) ? '100%' : 'auto', height: isPdfFile(plan.file_url) ? '100%' : 'auto' }}>
                {isPdfFile(plan.file_url) ? (
                  <div className="w-full h-full flex flex-col">
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(plan.file_url)}&embedded=true`}
                      title={plan.name}
                      className="w-full flex-1 border-0 bg-white"
                      style={{ minHeight: 'calc(100vh - 150px)' }}
                    />
                    <div className="p-3 bg-slate-800 border-t border-slate-700 flex justify-center">
                      <a 
                        href={plan.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Open PDF in new tab
                      </a>
                    </div>
                  </div>
                ) : (
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
                )}
                {/* Task Pins - only for images */}
                {!isPdfFile(plan.file_url) && tasks.map((task) => (
                  <TaskPin 
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTask(task)}
                    isSelected={selectedTask?.id === task.id}
                  />
                ))}
                {/* Pending Pin */}
                {pendingPinPosition && !isPdfFile(plan.file_url) && (
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

        {isPlacingPin && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg">
            Click on the plan to place the task
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
  );
}