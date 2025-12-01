import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Wand2, Loader2, CheckCircle2, AlertCircle, Map, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function PlanAnalyzer({ open, onOpenChange, plan, jobId, onTasksCreated }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [detectedWalls, setDetectedWalls] = useState([]);
  const [error, setError] = useState(null);
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

  const analyzePlan = async () => {
    if (!plan?.file_url) return;
    
    setAnalyzing(true);
    setProgress(10);
    setError(null);
    setDetectedWalls([]);

    try {
      // Use AI to analyze the plan
      const analysisPrompt = `Analyze this Falkbuilt installation plan PDF/image and extract all wall information WITH THEIR POSITIONS.

For each wall found, identify:
1. Wall number (e.g., 001, 002, 003)
2. Wall type: one of these exact values:
   - "glass_wall" (glass only, no door)
   - "glass_wall_swing_door" (glass with pivot or butt-hinge door)
   - "glass_wall_sliding_door" (glass with sliding door)
   - "solid_wall" (solid/hybrid wall like FB-HB, FB-SS)
   - "stack_wall" (glass over solid like FB-STK-SS)
3. Room name if visible (e.g., "Conference 101", "Private 117")
4. Door number if present (e.g., "101A", "117A")
5. IMPORTANT - Position: Estimate the X and Y coordinates (as percentages 0-100) of where the wall number tag appears in the image:
   - position_x: horizontal position (0=left edge, 100=right edge)
   - position_y: vertical position (0=top edge, 100=bottom edge)

Look for:
- Wall tags with numbers like "001", "002" with arrows - note their POSITION in the drawing
- Door swings (arc patterns indicate pivot/hinge doors)
- Sliding door indicators (parallel lines)
- Room labels
- Falkbuilt wall type codes (FB-KAI, FB-HB, FB-SS, FB-STK-SS, etc.)

Return the data as JSON array with position coordinates for each wall.`;

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
                  notes: { type: "string" },
                  position_x: { type: "number", description: "X coordinate as percentage 0-100" },
                  position_y: { type: "number", description: "Y coordinate as percentage 0-100" }
                },
                required: ["wall_number", "wall_type", "position_x", "position_y"]
              }
            },
            project_info: {
              type: "object",
              properties: {
                project_name: { type: "string" },
                project_number: { type: "string" },
                sheet_name: { type: "string" }
              }
            }
          },
          required: ["walls"]
        }
      });

      setProgress(70);

      if (result?.walls && result.walls.length > 0) {
        // Match walls with templates
        const wallsWithTemplates = result.walls.map(wall => {
          let template = null;
          
          if (wall.wall_type === 'glass_wall') {
            template = templates.find(t => t.wall_type === 'glass_wall' && !t.name.toLowerCase().includes('door'));
          } else if (wall.wall_type === 'glass_wall_swing_door') {
            template = templates.find(t => t.name.toLowerCase().includes('swing') || t.name.toLowerCase().includes('pivot') || t.name.toLowerCase().includes('hinge'));
          } else if (wall.wall_type === 'glass_wall_sliding_door') {
            template = templates.find(t => t.name.toLowerCase().includes('sliding'));
          } else if (wall.wall_type === 'solid_wall') {
            template = templates.find(t => t.wall_type === 'solid_wall');
          } else if (wall.wall_type === 'stack_wall') {
            template = templates.find(t => t.wall_type === 'stack_wall');
          }

          return { ...wall, template };
        });

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

  const createTasks = async () => {
    setAnalyzing(true);
    setProgress(0);

    try {
      const total = detectedWalls.length;
      let created = 0;

      const wallsWithTemplates = detectedWalls.filter(w => w.template);
      
      for (let i = 0; i < wallsWithTemplates.length; i++) {
        const wall = wallsWithTemplates[i];

        const checklist = (wall.template.checklist_items || [])
          .sort((a, b) => a.order - b.order)
          .map(item => ({ text: item.text, completed: false }));

        const taskTitle = `Wall ${wall.wall_number}${wall.room_name ? ` - ${wall.room_name}` : ''}`;
        
        // Use AI-detected position or fallback to grid
        const pin_x = wall.position_x ?? (10 + (i % 5) * 18);
        const pin_y = wall.position_y ?? (10 + Math.floor(i / 5) * 18);
        
        await createTaskMutation.mutateAsync({
          job_id: jobId,
          title: taskTitle,
          description: `${wall.template.name}${wall.door_number ? ` (Door: ${wall.door_number})` : ''}${wall.notes ? `\n${wall.notes}` : ''}`,
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
    const labels = {
      glass_wall: 'Glass (No Door)',
      glass_wall_swing_door: 'Glass + Swing Door',
      glass_wall_sliding_door: 'Glass + Sliding Door',
      solid_wall: 'Solid Wall',
      stack_wall: 'Stack Wall'
    };
    return labels[type] || type;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-400" />
            Analyze Plan & Create Tasks
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Plan Info */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
            <Map className="w-8 h-8 text-amber-400" />
            <div>
              <p className="font-medium text-white">{plan?.name}</p>
              <p className="text-xs text-slate-400">Click "Analyze" to detect walls and create tasks automatically</p>
            </div>
          </div>

          {/* Progress */}
          {analyzing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                <span className="text-sm text-slate-300">
                  {detectedWalls.length > 0 ? 'Creating tasks...' : 'Analyzing plan...'}
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
          {detectedWalls.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                Detected {detectedWalls.length} Walls
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {detectedWalls.map((wall, idx) => (
                  <div key={idx} className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-white">Wall {wall.wall_number}</span>
                        {wall.room_name && (
                          <span className="text-slate-400 ml-2">- {wall.room_name}</span>
                        )}
                      </div>
                      <Badge className={getWallTypeColor(wall.wall_type)}>
                        {getWallTypeLabel(wall.wall_type)}
                      </Badge>
                    </div>
                    {wall.door_number && (
                      <p className="text-xs text-slate-500 mt-1">Door: {wall.door_number}</p>
                    )}
                    {wall.template ? (
                      <p className="text-xs text-green-400 mt-1">
                        ✓ Template: {wall.template.name} ({wall.template.checklist_items?.length || 0} items)
                      </p>
                    ) : (
                      <p className="text-xs text-amber-400 mt-1">
                        ⚠ No matching template found
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            {detectedWalls.length === 0 ? (
              <Button 
                onClick={analyzePlan} 
                disabled={analyzing}
                className="bg-amber-500 hover:bg-amber-600"
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
      </DialogContent>
    </Dialog>
  );
}