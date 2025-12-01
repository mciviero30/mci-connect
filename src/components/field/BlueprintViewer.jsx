import React, { useState, useRef } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TaskPin from './TaskPin.jsx';
import TaskDetailPanel from './TaskDetailPanel.jsx';
import CreateTaskDialog from './CreateTaskDialog.jsx';

export default function BlueprintViewer({ plan, tasks, jobId, onBack }) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedTask, setSelectedTask] = useState(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pendingPinPosition, setPendingPinPosition] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  
  const containerRef = useRef(null);
  const imageRef = useRef(null);

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
              Volver
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
              {isPlacingPin ? 'Cancelar' : 'Añadir Tarea'}
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
          <div 
            className="relative w-full h-full flex items-center justify-center"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <div className="relative">
              <img 
                ref={imageRef}
                src={plan.file_url}
                alt={plan.name}
                className="max-w-none"
                onClick={handleImageClick}
                draggable={false}
              />
              {/* Task Pins */}
              {tasks.map((task) => (
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
        </div>

        {isPlacingPin && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg">
            Haz clic en el plano para colocar la tarea
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