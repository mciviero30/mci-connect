import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, 
  ClipboardCheck, 
  Trash2,
  Edit2,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const categoryLabels = {
  glass_wall: 'Glass Wall',
  solid_wall: 'Solid Wall',
  door: 'Door Installation',
  custom: 'Custom',
};

const categoryColors = {
  glass_wall: 'bg-blue-500/20 text-blue-400',
  solid_wall: 'bg-amber-500/20 text-amber-400',
  door: 'bg-green-500/20 text-green-400',
  custom: 'bg-slate-500/20 text-slate-400',
};

// Default templates
const DEFAULT_TEMPLATES = {
  glass_wall: {
    name: 'Glass Wall Installation',
    description: 'Standard checklist for glass wall installation',
    category: 'glass_wall',
    items: [
      { id: '1', text: 'Verify measurements and dimensions', required: true },
      { id: '2', text: 'Check glass panels for damage', required: true },
      { id: '3', text: 'Install base track', required: true },
      { id: '4', text: 'Install vertical posts', required: true },
      { id: '5', text: 'Install glass panels', required: true },
      { id: '6', text: 'Install door hardware', required: true },
      { id: '7', text: 'Check alignment and level', required: true },
      { id: '8', text: 'Apply sealant', required: true },
      { id: '9', text: 'Clean glass surfaces', required: true },
      { id: '10', text: 'Final inspection', required: true },
    ],
  },
  solid_wall: {
    name: 'Solid Wall Installation',
    description: 'Standard checklist for solid wall installation',
    category: 'solid_wall',
    items: [
      { id: '1', text: 'Verify measurements and layout', required: true },
      { id: '2', text: 'Check framing materials', required: true },
      { id: '3', text: 'Install top and bottom tracks', required: true },
      { id: '4', text: 'Install vertical studs', required: true },
      { id: '5', text: 'Install electrical boxes if needed', required: true },
      { id: '6', text: 'Install drywall sheets', required: true },
      { id: '7', text: 'Apply joint compound and tape', required: true },
      { id: '8', text: 'Sand and finish surface', required: true },
      { id: '9', text: 'Prime and paint', required: true },
      { id: '10', text: 'Final inspection', required: true },
    ],
  },
};

export default function GlobalChecklistsManager() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [checklistItems, setChecklistItems] = useState([{ id: '1', text: '', required: false }]);
  const [newChecklist, setNewChecklist] = useState({
    name: '',
    description: '',
    category: 'glass_wall',
  });

  const queryClient = useQueryClient();

  // Fetch global templates (no job_id)
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['global-checklist-templates'],
    queryFn: async () => {
      const workUnits = await base44.entities.WorkUnit.list('-created_date');
      // Filter ONLY global templates (is_global = true, type = checklist, is_template = true)
      return workUnits.filter(wu => 
        wu.type === 'checklist' && 
        wu.is_template === true && 
        wu.is_global === true &&
        !wu.job_id
      );
    },
  });

  // Auto-create defaults if none exist - RUN ONLY ONCE
  const [defaultsCreated, setDefaultsCreated] = React.useState(false);
  
  React.useEffect(() => {
    const createDefaults = async () => {
      // Only create defaults once when templates are empty
      if (templates.length === 0 && !isLoading && !defaultsCreated) {
        setDefaultsCreated(true); // Set flag BEFORE creating to prevent double-run
        
        for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
          try {
            await base44.entities.WorkUnit.create({
              type: 'checklist',
              is_template: true,
              is_global: true,
              title: template.name,
              description: template.description,
              category: template.category,
              checklist_items: template.items.map(item => ({
                id: item.id,
                text: item.text,
                checked: false,
                required: item.required
              })),
            });
          } catch (error) {
            console.error('Error creating default template:', error);
          }
        }
        queryClient.invalidateQueries({ queryKey: ['global-checklist-templates'] });
      }
    };

    createDefaults();
  }, [templates.length, isLoading, defaultsCreated]);

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkUnit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-checklist-templates'] });
      setShowCreate(false);
      resetForm();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkUnit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-checklist-templates'] });
      setEditingTemplate(null);
      resetForm();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkUnit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-checklist-templates'] });
    },
  });

  const deleteAllTemplatesMutation = useMutation({
    mutationFn: async () => {
      // Delete all global checklist templates
      for (const template of templates) {
        try {
          await base44.entities.WorkUnit.delete(template.id);
        } catch (error) {
          console.error('Error deleting template:', template.id, error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-checklist-templates'] });
      toast.success('All templates deleted');
    },
    onError: () => {
      toast.error('Failed to delete templates');
    },
  });

  const resetForm = () => {
    setNewChecklist({ name: '', description: '', category: 'glass_wall' });
    setChecklistItems([{ id: '1', text: '', required: false }]);
  };

  const addItem = () => {
    setChecklistItems([...checklistItems, { id: Date.now().toString(), text: '', required: false }]);
  };

  const updateItem = (id, field, value) => {
    setChecklistItems(checklistItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id) => {
    if (checklistItems.length > 1) {
      setChecklistItems(checklistItems.filter(item => item.id !== id));
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setNewChecklist({
      name: template.title,
      description: template.description || '',
      category: template.category || 'custom',
    });
    setChecklistItems(template.checklist_items || [{ id: '1', text: '', required: false }]);
    setShowCreate(true);
  };

  const handleSave = () => {
    const validItems = checklistItems.filter(item => item.text.trim());
    if (!newChecklist.name || validItems.length === 0) return;

    const data = {
      type: 'checklist',
      is_template: true,
      is_global: true,
      title: newChecklist.name,
      description: newChecklist.description,
      category: newChecklist.category,
      checklist_items: validItems.map(item => ({
        id: item.id,
        text: item.text,
        checked: false,
        required: item.required
      })),
    };

    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#FFB800] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Checklist Templates</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Global templates available in all projects
          </p>
        </div>
        <div className="flex gap-2">
          {templates.length > 0 && (
            <Button 
              onClick={() => {
                if (window.confirm(`¿Borrar TODOS los ${templates.length} templates? Esta acción no se puede deshacer.`)) {
                  deleteAllTemplatesMutation.mutate();
                }
              }}
              disabled={deleteAllTemplatesMutation.isPending}
              variant="outline"
              className="bg-red-900/20 border-2 border-red-500/50 text-red-400 hover:bg-red-900/40 hover:border-red-400"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteAllTemplatesMutation.isPending ? 'Borrando...' : 'Borrar Todos'}
            </Button>
          )}
          <Button onClick={() => setShowCreate(true)} className="bg-[#FFB800] hover:bg-[#E5A600] text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Loading templates...</h3>
          <p className="text-slate-500 dark:text-slate-400">Creating default checklists</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div 
              key={template.id}
              className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:border-[#FFB800]/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <Badge className={categoryColors[template.category]}>
                  {categoryLabels[template.category] || template.category}
                </Badge>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(template)}
                    className="h-7 w-7 text-slate-400 hover:text-[#FFB800]"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                    className="h-7 w-7 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{template.title}</h3>
              {template.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{template.description}</p>
              )}
              
              <div className="mb-4 space-y-1">
                {(template.checklist_items || []).slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Check className="w-3 h-3 text-[#FFB800] mt-0.5" />
                    <span className="line-clamp-1">{item.text}</span>
                  </div>
                ))}
                {(template.checklist_items || []).length > 3 && (
                  <p className="text-xs text-slate-400 pl-5">
                    +{(template.checklist_items || []).length - 3} more
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <span className="text-xs text-slate-500">
                  {(template.checklist_items)?.length || 0} items
                </span>
                <Badge variant="outline" className="text-[#FFB800] border-[#FFB800]/30">
                  Global
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => {
        setShowCreate(open);
        if (!open) {
          setEditingTemplate(null);
          resetForm();
        }
      }}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit' : 'New'} Checklist Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Name</Label>
              <Input
                value={newChecklist.name}
                onChange={(e) => setNewChecklist({ ...newChecklist, name: e.target.value })}
                placeholder="e.g., Glass Wall Installation"
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Category</Label>
              <Select value={newChecklist.category} onValueChange={(v) => setNewChecklist({ ...newChecklist, category: v })}>
                <SelectTrigger className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Description</Label>
              <Textarea
                value={newChecklist.description}
                onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300 mb-2 block">Checklist Items</Label>
              <div className="space-y-2">
                {checklistItems.map((item, idx) => (
                  <div key={item.id} className="flex gap-2">
                    <Input
                      value={item.text}
                      onChange={(e) => updateItem(item.id, 'text', e.target.value)}
                      placeholder={`Item ${idx + 1}`}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="border-slate-300 dark:border-slate-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => {
                setShowCreate(false);
                setEditingTemplate(null);
                resetForm();
              }} className="border-slate-300 dark:border-slate-700">
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-[#FFB800] hover:bg-[#E5A600] text-white">
                {editingTemplate ? 'Update' : 'Create'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}