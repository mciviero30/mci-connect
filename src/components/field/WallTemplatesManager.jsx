import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Edit2, Trash2, GripVertical, Save, X, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WALL_TYPE_OPTIONS = [
  { value: 'glass_wall', label: 'Glass Wall (No Door)' },
  { value: 'glass_wall_with_door', label: 'Glass Wall with Door' },
  { value: 'solid_wall', label: 'Solid Wall' },
  { value: 'stack_wall', label: 'Stack Wall' },
  { value: 'hybrid_wall', label: 'Hybrid Wall' },
];

export default function WallTemplatesManager({ open, onOpenChange }) {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newChecklist, setNewChecklist] = useState('');
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['wall-templates'],
    queryFn: () => base44.entities.WallTypeTemplate.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WallTypeTemplate.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wall-templates'] });
      setEditingTemplate(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WallTypeTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wall-templates'] });
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WallTypeTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wall-templates'] }),
  });

  const handleSave = () => {
    if (!editingTemplate) return;
    
    if (editingTemplate.id) {
      updateMutation.mutate({ id: editingTemplate.id, data: editingTemplate });
    } else {
      createMutation.mutate(editingTemplate);
    }
  };

  const addChecklistItem = () => {
    if (!newChecklist.trim()) return;
    const items = editingTemplate.checklist_items || [];
    setEditingTemplate({
      ...editingTemplate,
      checklist_items: [...items, { text: newChecklist.trim(), order: items.length + 1 }]
    });
    setNewChecklist('');
  };

  const removeChecklistItem = (index) => {
    const items = [...editingTemplate.checklist_items];
    items.splice(index, 1);
    setEditingTemplate({ ...editingTemplate, checklist_items: items });
  };

  const createNewTemplate = () => {
    setEditingTemplate({
      name: '',
      wall_type: 'glass_wall',
      falkbuilt_codes: [],
      checklist_items: [],
      default_tags: [],
      default_category: 'Installation',
      active: true
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-amber-400" />
            Wall Type Templates
          </DialogTitle>
        </DialogHeader>

        {editingTemplate ? (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Template Name</Label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                  placeholder="e.g., Glass Wall with Pivot Door"
                />
              </div>
              <div>
                <Label className="text-slate-300">Wall Type</Label>
                <Select
                  value={editingTemplate.wall_type}
                  onValueChange={(v) => setEditingTemplate({ ...editingTemplate, wall_type: v })}
                >
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {WALL_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-white">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Falkbuilt Codes (comma separated)</Label>
              <Input
                value={(editingTemplate.falkbuilt_codes || []).join(', ')}
                onChange={(e) => setEditingTemplate({ 
                  ...editingTemplate, 
                  falkbuilt_codes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="mt-1 bg-slate-800 border-slate-700 text-white"
                placeholder="FB-KAI, FB-DG, FB-LYDIA"
              />
            </div>

            <div>
              <Label className="text-slate-300">Default Tags (comma separated)</Label>
              <Input
                value={(editingTemplate.default_tags || []).join(', ')}
                onChange={(e) => setEditingTemplate({ 
                  ...editingTemplate, 
                  default_tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                className="mt-1 bg-slate-800 border-slate-700 text-white"
                placeholder="glass_fronts, swing_door"
              />
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">Checklist Items</Label>
              <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-800/50 rounded-lg p-3">
                {(editingTemplate.checklist_items || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-800 rounded p-2">
                    <GripVertical className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-300 flex-1">{item.text}</span>
                    <button
                      onClick={() => removeChecklistItem(idx)}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newChecklist}
                    onChange={(e) => setNewChecklist(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addChecklistItem()}
                    placeholder="Add checklist item..."
                    className="bg-slate-700 border-slate-600 text-white text-sm"
                  />
                  <Button onClick={addChecklistItem} size="sm" className="bg-amber-500 hover:bg-amber-600">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={editingTemplate.active}
                onCheckedChange={(v) => setEditingTemplate({ ...editingTemplate, active: v })}
              />
              <Label className="text-slate-300">Active</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <Button variant="outline" onClick={() => setEditingTemplate(null)} className="border-slate-700 text-slate-300">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">
                <Save className="w-4 h-4 mr-2" />
                Save Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="flex justify-end">
              <Button onClick={createNewTemplate} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>

            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 rounded-lg border ${
                    template.active 
                      ? 'bg-slate-800/50 border-slate-700' 
                      : 'bg-slate-900/50 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white">{template.name}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          {template.wall_type}
                        </Badge>
                        {(template.falkbuilt_codes || []).map(code => (
                          <Badge key={code} className="bg-slate-700 text-slate-300 text-xs">
                            {code}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {(template.checklist_items || []).length} checklist items
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTemplate(template)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (window.confirm('Delete this template?')) {
                            deleteMutation.mutate(template.id);
                          }
                        }}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}