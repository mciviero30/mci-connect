import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, 
  ClipboardCheck, 
  Trash2,
  Copy,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useWorkUnits } from './hooks/useWorkUnits';

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

// Predefined checklist templates
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

export default function FieldChecklistsView({ jobId }) {
  const [showCreate, setShowCreate] = useState(false);
  const [checklistItems, setChecklistItems] = useState([{ id: '1', text: '', required: false }]);
  const [newChecklist, setNewChecklist] = useState({
    name: '',
    description: '',
    category: 'glass_wall',
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Use unified WorkUnit hook for checklists
  const { 
    workUnits: checklists, 
    createChecklist: createWorkUnitChecklist,
    updateMutation,
    deleteMutation: deleteWorkUnit,
    toggleChecklistItem
  } = useWorkUnits(jobId, { type: 'checklist' });

  // Legacy fallback queries
  const { data: legacyTemplates = [] } = useQuery({
    queryKey: ['checklist-templates', jobId],
    queryFn: () => base44.entities.ChecklistTemplate.filter({ job_id: jobId }),
  });

  // Merge legacy templates with WorkUnit checklists
  const templates = checklists.length > 0 ? checklists.filter(c => c.is_template) : legacyTemplates;

  // Create default templates if none exist
  const createDefaultTemplates = async () => {
    for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
      const exists = templates.some(t => t.category === key || t.title === template.name);
      if (!exists) {
        await base44.entities.WorkUnit.create({
          job_id: jobId,
          type: 'checklist',
          is_template: true,
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
      }
    }
    queryClient.invalidateQueries({ queryKey: ['work-units', jobId] });
  };

  const createTemplateMutation = useMutation({
    mutationFn: (data) => {
      // Use WorkUnit for new templates
      return base44.entities.WorkUnit.create({ 
        ...data, 
        job_id: jobId,
        type: 'checklist',
        is_template: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-units', jobId] });
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', jobId] });
      setShowCreate(false);
      setNewChecklist({ name: '', description: '', category: 'glass_wall' });
      setChecklistItems([{ id: '1', text: '', required: false }]);
    },
  });



  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkUnit.delete(id).catch(() => 
      base44.entities.ChecklistTemplate.delete(id)
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-units', jobId] });
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', jobId] });
    },
  });

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

  const handleCreate = () => {
    const validItems = checklistItems.filter(item => item.text.trim());
    if (!newChecklist.name || validItems.length === 0) return;

    createTemplateMutation.mutate({
      title: newChecklist.name,
      description: newChecklist.description,
      category: newChecklist.category,
      checklist_items: validItems.map(item => ({
        id: item.id,
        text: item.text,
        checked: false,
        required: item.required
      })),
    });
  };



  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Task Checklist Templates</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create reusable checklists for tasks on blueprints
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-[#FFB800] hover:bg-[#E5A600] text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 text-center shadow-sm">
          <ClipboardCheck className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No checklist templates</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            Create templates like "Glass Wall" or "Solid Wall" to use when creating tasks on blueprints
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={createDefaultTemplates} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Copy className="w-4 h-4 mr-2" />
              Add Default Templates
            </Button>
            <Button onClick={() => setShowCreate(true)} className="bg-[#FFB800] hover:bg-[#E5A600] text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Custom Template
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div 
              key={template.id}
              className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:border-[#FFB800]/50 dark:hover:border-[#FFB800]/30 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <Badge className={categoryColors[template.category]}>
                  {categoryLabels[template.category] || template.category}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                  className="h-7 w-7 text-slate-400 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{template.title || template.name}</h3>
              {template.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{template.description}</p>
              )}
              
              {/* Checklist Preview */}
              <div className="mb-4 space-y-1">
                {(template.checklist_items || template.items || []).slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <span className="text-slate-400">•</span>
                    <span className="line-clamp-1">{item.text}</span>
                  </div>
                ))}
                {(template.checklist_items || template.items || []).length > 3 && (
                  <p className="text-xs text-slate-400 pl-4">
                    +{(template.checklist_items || template.items || []).length - 3} more
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700/50">
                <span className="text-xs text-slate-500 dark:text-slate-500">
                  {(template.checklist_items || template.items)?.length || 0} items
                </span>
                <span className="text-xs text-[#FFB800]">
                  Use in Tasks
                </span>
              </div>
            </div>
          ))}
        </div>
      )}



      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Checklist Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Name</Label>
              <Input
                value={newChecklist.name}
                onChange={(e) => setNewChecklist({ ...newChecklist, name: e.target.value })}
                placeholder="e.g., Daily Safety Inspection"
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Category</Label>
              <Select value={newChecklist.category} onValueChange={(v) => setNewChecklist({ ...newChecklist, category: v })}>
                <SelectTrigger className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-slate-900 dark:text-white">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Description</Label>
              <Textarea
                value={newChecklist.description}
                onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            {/* Checklist Items */}
            <div>
              <Label className="text-slate-700 dark:text-slate-300 mb-2 block">Checklist Items</Label>
              <div className="space-y-2">
                {checklistItems.map((item, idx) => (
                  <div key={item.id} className="flex gap-2">
                    <Input
                      value={item.text}
                      onChange={(e) => updateItem(item.id, 'text', e.target.value)}
                      placeholder={`Item ${idx + 1}`}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
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
                  className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white">
                Cancel
              </Button>
              <Button onClick={handleCreate} className="bg-[#FFB800] hover:bg-[#E5A600] text-white">
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  );
}