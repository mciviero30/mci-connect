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

const categoryLabels = {
  inspection: 'Inspección',
  safety: 'Seguridad',
  quality: 'Calidad',
  installation: 'Instalación',
  general: 'General',
};

const categoryColors = {
  inspection: 'bg-blue-500/20 text-blue-400',
  safety: 'bg-red-500/20 text-red-400',
  quality: 'bg-green-500/20 text-green-400',
  installation: 'bg-purple-500/20 text-purple-400',
  general: 'bg-slate-500/20 text-slate-400',
};

export default function FieldChecklistsView({ jobId }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showExecute, setShowExecute] = useState(null);
  const [checklistItems, setChecklistItems] = useState([{ id: '1', text: '', required: false }]);
  const [executionResponses, setExecutionResponses] = useState([]);
  const [newChecklist, setNewChecklist] = useState({
    name: '',
    description: '',
    category: 'inspection',
    requires_signature: false,
    requires_photo: false,
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['checklist-templates', jobId],
    queryFn: () => base44.entities.ChecklistTemplate.filter({ job_id: jobId }),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['inspection-submissions', jobId],
    queryFn: () => base44.entities.InspectionSubmission.filter({ job_id: jobId }, '-created_date'),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ChecklistTemplate.create({ ...data, job_id: jobId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', jobId] });
      setShowCreate(false);
      setNewChecklist({ name: '', description: '', category: 'inspection', requires_signature: false, requires_photo: false });
      setChecklistItems([{ id: '1', text: '', required: false }]);
    },
  });

  const submitInspectionMutation = useMutation({
    mutationFn: (data) => base44.entities.InspectionSubmission.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspection-submissions', jobId] });
      setShowExecute(null);
      setExecutionResponses([]);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.ChecklistTemplate.delete(id),
    onSuccess: () => {
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
      ...newChecklist,
      items: validItems,
    });
  };

  const startExecution = (template) => {
    setShowExecute(template);
    setExecutionResponses(template.items.map(item => ({
      item_id: item.id,
      item_text: item.text,
      completed: false,
      notes: '',
    })));
  };

  const updateResponse = (itemId, field, value) => {
    setExecutionResponses(executionResponses.map(resp =>
      resp.item_id === itemId ? { ...resp, [field]: value } : resp
    ));
  };

  const submitExecution = () => {
    const allCompleted = executionResponses.every(r => r.completed);
    const hasIncomplete = executionResponses.some(r => !r.completed);

    submitInspectionMutation.mutate({
      job_id: jobId,
      checklist_template_id: showExecute.id,
      name: showExecute.name,
      responses: executionResponses,
      submitted_by_email: user?.email,
      submitted_by_name: user?.full_name,
      status: allCompleted ? 'passed' : hasIncomplete ? 'needs_attention' : 'passed',
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#FFB800]">Checklists & Inspections</h1>
        <Button onClick={() => setShowCreate(true)} className="bg-[#FFB800] hover:bg-[#E5A600] text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{templates.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Templates</p>
        </div>
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {submissions.filter(s => s.status === 'passed').length}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Passed</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {submissions.filter(s => s.status === 'needs_attention').length}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Need Attention</p>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 text-center shadow-sm">
          <ClipboardCheck className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No templates</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Create reusable checklists</p>
          <Button onClick={() => setShowCreate(true)} className="bg-[#FFB800] hover:bg-[#E5A600] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {templates.map(template => (
            <div 
              key={template.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <Badge className={categoryColors[template.category]}>
                  {categoryLabels[template.category]}
                </Badge>
                <div className="flex gap-1">
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
              <h3 className="font-semibold text-white mb-1">{template.name}</h3>
              {template.description && (
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{template.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {template.items?.length || 0} items
                </span>
                <Button
                  size="sm"
                  onClick={() => startExecution(template)}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Ejecutar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Submissions */}
      {submissions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Inspecciones Recientes</h3>
          <div className="space-y-2">
            {submissions.slice(0, 5).map(sub => (
              <div 
                key={sub.id}
                className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  {sub.status === 'passed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : sub.status === 'failed' ? (
                    <XCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  )}
                  <div>
                    <p className="font-medium text-white">{sub.name}</p>
                    <p className="text-sm text-slate-400">
                      {sub.submitted_by_name} • {format(new Date(sub.created_date), "d MMM yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
                <Badge className={
                  sub.status === 'passed' ? 'bg-green-500/20 text-green-400' :
                  sub.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }>
                  {sub.status === 'passed' ? 'Aprobado' :
                   sub.status === 'failed' ? 'Fallido' : 'Revisar'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Plantilla de Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Nombre</Label>
              <Input
                value={newChecklist.name}
                onChange={(e) => setNewChecklist({ ...newChecklist, name: e.target.value })}
                placeholder="Ej: Inspección de Seguridad Diaria"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Categoría</Label>
              <Select value={newChecklist.category} onValueChange={(v) => setNewChecklist({ ...newChecklist, category: v })}>
                <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key} className="text-white">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Descripción</Label>
              <Textarea
                value={newChecklist.description}
                onChange={(e) => setNewChecklist({ ...newChecklist, description: e.target.value })}
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>

            {/* Checklist Items */}
            <div>
              <Label className="text-slate-300 mb-2 block">Items del Checklist</Label>
              <div className="space-y-2">
                {checklistItems.map((item, idx) => (
                  <div key={item.id} className="flex gap-2">
                    <Input
                      value={item.text}
                      onChange={(e) => updateItem(item.id, 'text', e.target.value)}
                      placeholder={`Item ${idx + 1}`}
                      className="flex-1 bg-slate-800 border-slate-700 text-white"
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
                  className="border-slate-700 text-slate-300"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir Item
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Requiere firma</Label>
              <Switch
                checked={newChecklist.requires_signature}
                onCheckedChange={(checked) => setNewChecklist({ ...newChecklist, requires_signature: checked })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-700">
                Cancelar
              </Button>
              <Button onClick={handleCreate} className="bg-[#FFB800] hover:bg-[#E5A600] text-white">
                Crear Plantilla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execute Checklist Dialog */}
      <Dialog open={!!showExecute} onOpenChange={() => setShowExecute(null)}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          {showExecute && (
            <>
              <DialogHeader>
                <DialogTitle>{showExecute.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {executionResponses.map((resp, idx) => (
                  <div key={resp.item_id} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={resp.completed}
                      onChange={(e) => updateResponse(resp.item_id, 'completed', e.target.checked)}
                      className="mt-1 rounded border-slate-600"
                    />
                    <div className="flex-1">
                      <p className={`text-sm ${resp.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                        {resp.item_text}
                      </p>
                      <Input
                        placeholder="Notas..."
                        value={resp.notes}
                        onChange={(e) => updateResponse(resp.item_id, 'notes', e.target.value)}
                        className="mt-2 bg-slate-900 border-slate-700 text-white text-sm"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowExecute(null)} className="border-slate-700">
                    Cancelar
                  </Button>
                  <Button onClick={submitExecution} className="bg-green-500 hover:bg-green-600">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Completar Inspección
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}