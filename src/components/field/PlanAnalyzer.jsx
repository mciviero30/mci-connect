import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wand2, Loader2, CheckCircle2, AlertCircle, Map, Plus, Pencil, Trash2, X, GripVertical, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WALL_TYPES = [
  { value: 'glass_wall', label: 'Glass Wall (No Door)' },
  { value: 'glass_wall_swing_door', label: 'Glass + Swing Door' },
  { value: 'glass_wall_sliding_door', label: 'Glass + Sliding Door' },
  { value: 'solid_wall', label: 'Solid Wall' },
  { value: 'stack_wall', label: 'Stack Wall' },
];

export default function PlanAnalyzer({ open, onOpenChange, plan, jobId, onTasksCreated }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedWalls, setDetectedWalls] = useState([]);
  const [error, setError] = useState(null);
  const [editingWall, setEditingWall] = useState(null);
  const [showPositionHelper, setShowPositionHelper] = useState(false);
  const [positioningWallIdx, setPositioningWallIdx] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['wall-templates'],
    queryFn: () => base44.entities.WallTypeTemplate.filter({ active: true }),
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] }),
  });

  const matchTemplate = (wallType) => {
    if (wallType === 'glass_wall') {
      return templates.find(t => t.wall_type === 'glass_wall' && !t.name.toLowerCase().includes('door'));
    } else if (wallType === 'glass_wall_swing_door') {
      return templates.find(t => t.name.toLowerCase().includes('swing') || t.name.toLowerCase().includes('pivot') || t.name.toLowerCase().includes('hinge') || (t.wall_type === 'glass_wall_with_door'));
    } else if (wallType === 'glass_wall_sliding_door') {
      return templates.find(t => t.name.toLowerCase().includes('sliding'));
    } else if (wallType === 'solid_wall') {
      return templates.find(t => t.wall_type === 'solid_wall');
    } else if (wallType === 'stack_wall') {
      return templates.find(t => t.wall_type === 'stack_wall');
    }
    return null;
  };

  const analyzePlan = async () => {
    if (!plan?.file_url) return;
    
    setAnalyzing(true);
    setProgress(10);
    setError(null);
    setDetectedWalls([]);

    try {
      const analysisPrompt = `You are an expert at analyzing Falkbuilt architectural installation plans. Carefully analyze this blueprint image and extract ALL wall information with PRECISE positions.

CRITICAL INSTRUCTIONS FOR POSITION DETECTION:
- Divide the image into a 100x100 grid mentally
- For each wall tag number you find, estimate its EXACT position:
  - position_x: 0 = far left edge, 50 = center, 100 = far right edge
  - position_y: 0 = top edge, 50 = middle, 100 = bottom edge
- Be VERY precise - look at where the wall number tag (001, 002, etc.) appears and give exact coordinates

WALL IDENTIFICATION GUIDE:
1. GLASS WALL (glass_wall): 
   - Look for clear/transparent sections without any door indicators
   - Often labeled FB-KAI, FB-DG
   - No arc swing patterns nearby

2. GLASS WALL + SWING DOOR (glass_wall_swing_door):
   - Glass wall with an ARC pattern indicating door swing
   - Arc shows the door rotation path (pivot or butt-hinge)
   - May have door numbers like "101A", "102A"

3. GLASS WALL + SLIDING DOOR (glass_wall_sliding_door):
   - Glass wall with parallel lines showing sliding track
   - Arrow indicating slide direction
   - Often labeled as "sliding" in notes

4. SOLID WALL (solid_wall):
   - Hatched or filled sections indicating solid material
   - FB-HB (hybrid), FB-SS (solid) codes
   - No transparency indicated

5. STACK WALL (stack_wall):
   - Glass panel OVER solid base
   - FB-STK codes
   - Two-tone representation

WHAT TO EXTRACT FOR EACH WALL:
- wall_number: The tag number (e.g., "001", "002", "019")
- wall_type: One of the 5 types above
- room_name: Adjacent room name if visible
- door_number: Door ID if present (e.g., "101A")
- door_type: "pivot", "butt_hinge", "sliding", or null
- material_code: Falkbuilt code if visible (FB-KAI, FB-HB, etc.)
- position_x: X coordinate 0-100 where the wall tag appears
- position_y: Y coordinate 0-100 where the wall tag appears
- confidence: Your confidence level "high", "medium", or "low"

Extract EVERY wall you can find. Be thorough and precise with positions.`;

      setProgress(30);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        file_urls: [plan.file_url],
        response_json_schema: {
          type: "object",
          properties: {
            walls: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  wall_number: { type: "string" },
                  wall_type: { 
                    type: "string",
                    enum: ["glass_wall", "glass_wall_swing_door", "glass_wall_sliding_door", "solid_wall", "stack_wall"]
                  },
                  room_name: { type: "string" },
                  door_number: { type: "string" },
                  door_type: { type: "string", enum: ["pivot", "butt_hinge", "sliding", null] },
                  material_code: { type: "string" },
                  position_x: { type: "number" },
                  position_y: { type: "number" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  notes: { type: "string" }
                },
                required: ["wall_number", "wall_type", "position_x", "position_y"]
              }
            },
            project_info: {
              type: "object",
              properties: {
                project_name: { type: "string" },
                project_number: { type: "string" },
                sheet_name: { type: "string" },
                total_walls_found: { type: "number" }
              }
            }
          },
          required: ["walls"]
        }
      });

      setProgress(70);

      if (result?.walls && result.walls.length > 0) {
        const wallsWithTemplates = result.walls.map(wall => ({
          ...wall,
          template: matchTemplate(wall.wall_type),
          isEdited: false
        }));
        setDetectedWalls(wallsWithTemplates);
      } else {
        setError('No walls detected in this plan. Make sure it\'s a Falkbuilt installation drawing.');
      }

      setProgress(100);
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze plan. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateWall = (idx, updates) => {
    setDetectedWalls(prev => prev.map((wall, i) => {
      if (i !== idx) return wall;
      const updated = { ...wall, ...updates, isEdited: true };
      if (updates.wall_type) {
        updated.template = matchTemplate(updates.wall_type);
      }
      return updated;
    }));
  };

  const deleteWall = (idx) => {
    setDetectedWalls(prev => prev.filter((_, i) => i !== idx));
  };

  const addManualWall = () => {
    const newWall = {
      wall_number: String(detectedWalls.length + 1).padStart(3, '0'),
      wall_type: 'glass_wall',
      room_name: '',
      door_number: '',
      position_x: 50,
      position_y: 50,
      confidence: 'manual',
      template: matchTemplate('glass_wall'),
      isEdited: true
    };
    setDetectedWalls(prev => [...prev, newWall]);
  };

  const handleImageClick = (e) => {
    if (positioningWallIdx === null) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    
    updateWall(positioningWallIdx, { position_x: x, position_y: y });
    setPositioningWallIdx(null);
    setShowPositionHelper(false);
  };

  const createTasks = async () => {
    setAnalyzing(true);
    setProgress(0);

    try {
      const wallsWithTemplates = detectedWalls.filter(w => w.template);
      let created = 0;
      
      for (let i = 0; i < wallsWithTemplates.length; i++) {
        const wall = wallsWithTemplates[i];

        const checklist = (wall.template.checklist_items || [])
          .sort((a, b) => a.order - b.order)
          .map(item => ({ text: item.text, completed: false }));

        const taskTitle = `Wall ${wall.wall_number}${wall.room_name ? ` - ${wall.room_name}` : ''}`;
        
        const pin_x = wall.position_x ?? (10 + (i % 5) * 18);
        const pin_y = wall.position_y ?? (10 + Math.floor(i / 5) * 18);
        
        let description = wall.template.name;
        if (wall.door_number) description += ` (Door: ${wall.door_number})`;
        if (wall.door_type) description += ` [${wall.door_type}]`;
        if (wall.material_code) description += `\nMaterial: ${wall.material_code}`;
        if (wall.notes) description += `\n${wall.notes}`;
        
        await createTaskMutation.mutateAsync({
          job_id: jobId,
          title: taskTitle,
          description,
          status: 'pending',
          priority: 'medium',
          category: wall.template.default_category || 'Installation',
          tags: wall.template.default_tags || [],
          checklist: checklist,
          blueprint_id: plan.id,
          assigned_to: user?.email,
          pin_x: pin_x,
          pin_y: pin_y,
        });

        created++;
        setProgress(Math.round((created / wallsWithTemplates.length) * 100));
      }

      onTasksCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      console.error('Error creating tasks:', err);
      setError('Failed to create some tasks. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getWallTypeLabel = (type) => {
    const found = WALL_TYPES.find(t => t.value === type);
    return found?.label || type;
  };

  const getWallTypeColor = (type) => {
    const colors = {
      glass_wall: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      glass_wall_swing_door: 'bg-green-500/20 text-green-400 border-green-500/30',
      glass_wall_sliding_door: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      solid_wall: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      stack_wall: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    };
    return colors[type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'high') return 'text-green-400';
    if (confidence === 'medium') return 'text-yellow-400';
    if (confidence === 'low') return 'text-red-400';
    if (confidence === 'manual') return 'text-blue-400';
    return 'text-slate-400';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[#FFB800]" />
            Analyze Plan & Create Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Plan Preview with Position Helper */}
          {showPositionHelper && plan?.file_url && (
            <div className="relative border border-amber-500 rounded-lg overflow-hidden">
              <p className="absolute top-2 left-2 z-10 bg-amber-500 text-white text-xs px-2 py-1 rounded">
                Click on the plan to set position for Wall {detectedWalls[positioningWallIdx]?.wall_number}
              </p>
              <img 
                src={plan.file_url} 
                alt={plan.name}
                className="w-full max-h-[300px] object-contain cursor-crosshair"
                onClick={handleImageClick}
              />
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute top-2 right-2 border-slate-600"
                onClick={() => {
                  setShowPositionHelper(false);
                  setPositioningWallIdx(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Plan Info */}
          {!showPositionHelper && (
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
              <Map className="w-8 h-8 text-[#FFB800]" />
              <div className="flex-1">
                <p className="font-medium text-white">{plan?.name}</p>
                <p className="text-xs text-slate-400">Click "Analyze" to detect walls automatically, then review and edit</p>
              </div>
            </div>
          )}

          {/* Progress */}
          {analyzing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[#FFB800] animate-spin" />
                <span className="text-sm text-slate-300">
                  {detectedWalls.length > 0 ? 'Creating tasks...' : 'Analyzing plan with AI...'}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Detected Walls */}
          {detectedWalls.length > 0 && !showPositionHelper && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  {detectedWalls.length} Walls Detected
                </h4>
                <Button size="sm" variant="outline" onClick={addManualWall} className="border-slate-600 text-slate-300">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Wall
                </Button>
              </div>
              
              <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
                {detectedWalls.map((wall, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${editingWall === idx ? 'bg-slate-700/50 border-[#FFB800]/50' : 'bg-slate-800/50 border-slate-700/50'}`}>
                    {editingWall === idx ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-slate-400">Wall Number</Label>
                            <Input 
                              value={wall.wall_number}
                              onChange={(e) => updateWall(idx, { wall_number: e.target.value })}
                              className="mt-1 h-8 bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Wall Type</Label>
                            <Select value={wall.wall_type} onValueChange={(v) => updateWall(idx, { wall_type: v })}>
                              <SelectTrigger className="mt-1 h-8 bg-slate-800 border-slate-600 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600">
                                {WALL_TYPES.map(type => (
                                  <SelectItem key={type.value} value={type.value} className="text-white">
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-slate-400">Room Name</Label>
                            <Input 
                              value={wall.room_name || ''}
                              onChange={(e) => updateWall(idx, { room_name: e.target.value })}
                              placeholder="e.g., Conference 101"
                              className="mt-1 h-8 bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Door Number</Label>
                            <Input 
                              value={wall.door_number || ''}
                              onChange={(e) => updateWall(idx, { door_number: e.target.value })}
                              placeholder="e.g., 101A"
                              className="mt-1 h-8 bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-xs text-slate-400">Position X (%)</Label>
                            <Input 
                              type="number"
                              min={0}
                              max={100}
                              value={wall.position_x}
                              onChange={(e) => updateWall(idx, { position_x: Number(e.target.value) })}
                              className="mt-1 h-8 bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-400">Position Y (%)</Label>
                            <Input 
                              type="number"
                              min={0}
                              max={100}
                              value={wall.position_y}
                              onChange={(e) => updateWall(idx, { position_y: Number(e.target.value) })}
                              className="mt-1 h-8 bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full border-[#FFB800]/50 text-[#FFB800] hover:bg-[#FFB800]/10"
                              onClick={() => {
                                setPositioningWallIdx(idx);
                                setShowPositionHelper(true);
                              }}
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              Pick
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingWall(null)} className="text-slate-400">
                            Done
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">Wall {wall.wall_number}</span>
                            {wall.room_name && (
                              <span className="text-slate-400">- {wall.room_name}</span>
                            )}
                            {wall.isEdited && (
                              <span className="text-xs text-blue-400">(edited)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge className={getWallTypeColor(wall.wall_type)}>
                              {getWallTypeLabel(wall.wall_type)}
                            </Badge>
                            {wall.door_number && (
                              <span className="text-xs text-slate-500">Door: {wall.door_number}</span>
                            )}
                            <span className="text-xs text-slate-500">
                              Pos: ({wall.position_x}, {wall.position_y})
                            </span>
                            {wall.confidence && (
                              <span className={`text-xs ${getConfidenceColor(wall.confidence)}`}>
                                {wall.confidence}
                              </span>
                            )}
                          </div>
                          {wall.template ? (
                            <p className="text-xs text-green-400 mt-1">
                              ✓ {wall.template.name} ({wall.template.checklist_items?.length || 0} items)
                            </p>
                          ) : (
                            <p className="text-xs text-amber-400 mt-1">
                              ⚠ No matching template
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-slate-400 hover:text-white"
                            onClick={() => setEditingWall(idx)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-slate-400 hover:text-red-400"
                            onClick={() => deleteWall(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-4 border-t border-slate-700">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            <div className="flex gap-2">
              {detectedWalls.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={analyzePlan} 
                  disabled={analyzing}
                  className="border-slate-600 text-slate-300"
                >
                  Re-analyze
                </Button>
              )}
              {detectedWalls.length === 0 ? (
                <Button 
                  onClick={analyzePlan} 
                  disabled={analyzing}
                  className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
                >
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Analyze Plan
                </Button>
              ) : (
                <Button 
                  onClick={createTasks} 
                  disabled={analyzing || detectedWalls.filter(w => w.template).length === 0}
                  className="bg-green-500 hover:bg-green-600"
                >
                  {analyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create {detectedWalls.filter(w => w.template).length} Tasks
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}