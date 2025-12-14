import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Pencil, Square, Circle, ArrowRight, Type, Ruler, Move, Trash2, Link2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const COLORS = ['#FFB800', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#000000', '#FFFFFF'];

export default function BlueprintAnnotations({ planId, jobId, zoom, position, imageSize }) {
  const [activeTool, setActiveTool] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [selectedColor, setSelectedColor] = useState('#FFB800');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showLayers, setShowLayers] = useState(true);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [measurementUnit, setMeasurementUnit] = useState('ft');
  
  const queryClient = useQueryClient();
  const svgRef = useRef(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: annotations = [] } = useQuery({
    queryKey: ['plan-annotations', planId],
    queryFn: () => base44.entities.PlanAnnotation.filter({ plan_id: planId }),
    enabled: !!planId,
    refetchInterval: 2000, // Real-time sync every 2 seconds
  });

  const createAnnotationMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanAnnotation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-annotations', planId] });
      toast.success('Annotation added');
    },
  });

  const deleteAnnotationMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanAnnotation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-annotations', planId] });
      toast.success('Annotation deleted');
    },
  });

  const updateAnnotationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanAnnotation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-annotations', planId] });
    },
  });

  const handleMouseDown = (e) => {
    if (!activeTool || activeTool === 'select') return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setDrawing(true);
    setCurrentAnnotation({
      type: activeTool,
      points: [{ x, y }],
      color: selectedColor,
      stroke_width: strokeWidth,
    });
  };

  const handleMouseMove = (e) => {
    if (!drawing || !currentAnnotation) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (currentAnnotation.type === 'freehand') {
      setCurrentAnnotation(prev => ({
        ...prev,
        points: [...prev.points, { x, y }],
      }));
    } else {
      setCurrentAnnotation(prev => ({
        ...prev,
        points: [prev.points[0], { x, y }],
      }));
    }
  };

  const handleMouseUp = () => {
    if (currentAnnotation && currentAnnotation.points.length > 0) {
      // Save annotation
      createAnnotationMutation.mutate({
        plan_id: planId,
        job_id: jobId,
        author_email: user?.email,
        author_name: user?.full_name,
        type: currentAnnotation.type,
        points: currentAnnotation.points,
        color: currentAnnotation.color,
        stroke_width: currentAnnotation.stroke_width,
        measurement_unit: measurementUnit,
      });
    }
    setDrawing(false);
    setCurrentAnnotation(null);
  };

  const renderAnnotation = (annotation) => {
    const { type, points, color, stroke_width, text, measurement_value } = annotation;

    if (!points || points.length === 0) return null;

    switch (type) {
      case 'line':
      case 'arrow':
        if (points.length < 2) return null;
        return (
          <g key={annotation.id}>
            <line
              x1={`${points[0].x}%`}
              y1={`${points[0].y}%`}
              x2={`${points[1].x}%`}
              y2={`${points[1].y}%`}
              stroke={color}
              strokeWidth={stroke_width}
              className="cursor-pointer hover:opacity-75"
              onClick={() => setSelectedAnnotation(annotation)}
            />
            {type === 'arrow' && (
              <polygon
                points={`${points[1].x},${points[1].y - 1} ${points[1].x - 1},${points[1].y + 1} ${points[1].x + 1},${points[1].y + 1}`}
                fill={color}
                transform={`translate(0, 0)`}
              />
            )}
          </g>
        );

      case 'rectangle':
        if (points.length < 2) return null;
        const width = Math.abs(points[1].x - points[0].x);
        const height = Math.abs(points[1].y - points[0].y);
        return (
          <rect
            key={annotation.id}
            x={`${Math.min(points[0].x, points[1].x)}%`}
            y={`${Math.min(points[0].y, points[1].y)}%`}
            width={`${width}%`}
            height={`${height}%`}
            stroke={color}
            strokeWidth={stroke_width}
            fill="transparent"
            className="cursor-pointer hover:opacity-75"
            onClick={() => setSelectedAnnotation(annotation)}
          />
        );

      case 'circle':
        if (points.length < 2) return null;
        const radius = Math.sqrt(
          Math.pow(points[1].x - points[0].x, 2) + Math.pow(points[1].y - points[0].y, 2)
        );
        return (
          <circle
            key={annotation.id}
            cx={`${points[0].x}%`}
            cy={`${points[0].y}%`}
            r={`${radius}%`}
            stroke={color}
            strokeWidth={stroke_width}
            fill="transparent"
            className="cursor-pointer hover:opacity-75"
            onClick={() => setSelectedAnnotation(annotation)}
          />
        );

      case 'freehand':
        const pathData = points.map((p, i) => 
          `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ');
        return (
          <path
            key={annotation.id}
            d={pathData}
            stroke={color}
            strokeWidth={stroke_width}
            fill="transparent"
            vectorEffect="non-scaling-stroke"
            className="cursor-pointer hover:opacity-75"
            onClick={() => setSelectedAnnotation(annotation)}
          />
        );

      case 'measurement':
        if (points.length < 2) return null;
        return (
          <g key={annotation.id}>
            <line
              x1={`${points[0].x}%`}
              y1={`${points[0].y}%`}
              x2={`${points[1].x}%`}
              y2={`${points[1].y}%`}
              stroke={color}
              strokeWidth={stroke_width}
              strokeDasharray="5,5"
              className="cursor-pointer hover:opacity-75"
              onClick={() => setSelectedAnnotation(annotation)}
            />
            <text
              x={`${(points[0].x + points[1].x) / 2}%`}
              y={`${(points[0].y + points[1].y) / 2}%`}
              fill={color}
              fontSize="12"
              fontWeight="bold"
              className="pointer-events-none"
            >
              {measurement_value || '?'} {annotation.measurement_unit || 'ft'}
            </text>
          </g>
        );

      case 'text':
        if (points.length < 1) return null;
        return (
          <text
            key={annotation.id}
            x={`${points[0].x}%`}
            y={`${points[0].y}%`}
            fill={color}
            fontSize="14"
            fontWeight="500"
            className="cursor-pointer hover:opacity-75"
            onClick={() => setSelectedAnnotation(annotation)}
          >
            {text || 'Text'}
          </text>
        );

      default:
        return null;
    }
  };

  const tools = [
    { id: 'select', icon: Move, label: 'Select' },
    { id: 'line', icon: ArrowRight, label: 'Line' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
    { id: 'freehand', icon: Pencil, label: 'Freehand' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'measurement', icon: Ruler, label: 'Measure' },
  ];

  return (
    <>
      {/* Annotation Toolbar */}
      <div className="absolute left-16 top-32 z-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2">
        <div className="space-y-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-full p-2 rounded-lg transition-all ${
                activeTool === tool.id
                  ? 'bg-[#FFB800] text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={tool.label}
            >
              <tool.icon className="w-5 h-5 mx-auto" />
            </button>
          ))}
          
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
            <div className="grid grid-cols-4 gap-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-6 h-6 rounded border-2 ${
                    selectedColor === color ? 'border-[#FFB800]' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              className="w-full mt-2"
            />
          </div>
        </div>
      </div>

      {/* SVG Canvas for Annotations */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: activeTool && activeTool !== 'select' ? 'auto' : 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Render existing annotations */}
        {annotations.map(renderAnnotation)}
        
        {/* Render current drawing */}
        {currentAnnotation && renderAnnotation({ ...currentAnnotation, id: 'temp' })}
      </svg>

      {/* Annotation Details Panel */}
      {selectedAnnotation && (
        <div className="absolute right-4 top-20 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Annotation Details</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedAnnotation(null)}
            >
              ×
            </Button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Created by</label>
              <p className="text-sm font-medium">{selectedAnnotation.author_name}</p>
            </div>
            
            {selectedAnnotation.type === 'text' && (
              <div>
                <label className="text-xs text-slate-500">Text</label>
                <Input
                  value={selectedAnnotation.text || ''}
                  onChange={(e) => {
                    updateAnnotationMutation.mutate({
                      id: selectedAnnotation.id,
                      data: { text: e.target.value }
                    });
                  }}
                />
              </div>
            )}
            
            {selectedAnnotation.type === 'measurement' && (
              <div>
                <label className="text-xs text-slate-500">Measurement</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={selectedAnnotation.measurement_value || ''}
                    onChange={(e) => {
                      updateAnnotationMutation.mutate({
                        id: selectedAnnotation.id,
                        data: { measurement_value: Number(e.target.value) }
                      });
                    }}
                  />
                  <select
                    value={selectedAnnotation.measurement_unit || 'ft'}
                    onChange={(e) => {
                      updateAnnotationMutation.mutate({
                        id: selectedAnnotation.id,
                        data: { measurement_unit: e.target.value }
                      });
                    }}
                    className="border rounded px-2"
                  >
                    <option value="ft">ft</option>
                    <option value="m">m</option>
                    <option value="in">in</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
              </div>
            )}
            
            <div>
              <label className="text-xs text-slate-500">Comment</label>
              <Textarea
                value={selectedAnnotation.linked_comment || ''}
                onChange={(e) => {
                  updateAnnotationMutation.mutate({
                    id: selectedAnnotation.id,
                    data: { linked_comment: e.target.value }
                  });
                }}
                placeholder="Add a comment..."
              />
            </div>
            
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                if (window.confirm('Delete this annotation?')) {
                  deleteAnnotationMutation.mutate(selectedAnnotation.id);
                  setSelectedAnnotation(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </>
  );
}