import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, 
  ClipboardList, 
  FileCheck,
  MoreVertical,
  Trash2,
  Eye,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

export default function FieldFormsView({ jobId }) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [newForm, setNewForm] = useState({
    name: '',
    description: '',
    category: 'inspection',
    fields: [],
  });

  const queryClient = useQueryClient();

  const { data: formTemplates = [] } = useQuery({
    queryKey: ['field-form-templates', jobId],
    queryFn: () => base44.entities.FormTemplate.filter({ job_id: jobId }),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['field-form-submissions', jobId],
    queryFn: () => base44.entities.FormSubmission.filter({ job_id: jobId }, '-created_date'),
  });

  const createFormMutation = useMutation({
    mutationFn: (data) => base44.entities.FormTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-form-templates', jobId] });
      setShowCreate(false);
      setNewForm({ name: '', description: '', category: 'inspection', fields: [] });
    },
  });

  const deleteFormMutation = useMutation({
    mutationFn: (id) => base44.entities.FormTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-form-templates', jobId] });
    },
  });

  const handleCreateForm = () => {
    if (!newForm.name) return;
    createFormMutation.mutate({
      job_id: jobId,
      ...newForm,
    });
  };

  const categoryColors = {
    inspection: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    safety: 'bg-red-500/20 text-red-400 border-red-500/30',
    quality: 'bg-green-500/20 text-green-400 border-green-500/30',
    custom: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#FFB800]">Formularios</h1>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-[#FFB800] to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Formulario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formTemplates.length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Plantillas</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <FileCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{submissions.length}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Respuestas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Templates */}
      {formTemplates.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 text-center">
          <ClipboardList className="w-12 h-12 text-slate-300 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No hay formularios</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Crea formularios de inspección, seguridad o calidad</p>
          <Button 
            onClick={() => setShowCreate(true)}
            className="bg-[#FFB800] hover:bg-amber-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Formulario
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formTemplates.map((form) => (
            <div 
              key={form.id}
              className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-600 transition-all group shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-[#FFB800]/20 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-[#FFB800] dark:text-amber-400" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-900 dark:hover:text-white h-8 w-8"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <DropdownMenuItem className="text-slate-900 dark:text-white">
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Respuestas
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-slate-900 dark:text-white">
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => deleteFormMutation.mutate(form.id)}
                      className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{form.name}</h3>
              {form.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{form.description}</p>
              )}
              <div className="flex items-center justify-between">
                <Badge className={categoryColors[form.category] || categoryColors.custom}>
                  {form.category}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {form.fields?.length || 0} campos
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Submissions */}
      {submissions.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Respuestas Recientes</h3>
          <div className="space-y-2">
            {submissions.slice(0, 5).map((sub) => (
              <div 
                key={sub.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <FileCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{sub.form_name || 'Formulario'}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {sub.submitted_by_name} • {format(new Date(sub.created_date), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Form Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Crear Formulario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Nombre</Label>
              <Input 
                value={newForm.name}
                onChange={(e) => setNewForm({...newForm, name: e.target.value})}
                placeholder="Ej: Inspección de Seguridad"
                className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Descripción</Label>
              <Textarea 
                value={newForm.description}
                onChange={(e) => setNewForm({...newForm, description: e.target.value})}
                placeholder="Descripción del formulario..."
                className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Categoría</Label>
              <Select value={newForm.category} onValueChange={(v) => setNewForm({...newForm, category: v})}>
                <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="inspection" className="text-slate-900 dark:text-white">Inspección</SelectItem>
                  <SelectItem value="safety" className="text-slate-900 dark:text-white">Seguridad</SelectItem>
                  <SelectItem value="quality" className="text-slate-900 dark:text-white">Calidad</SelectItem>
                  <SelectItem value="custom" className="text-slate-900 dark:text-white">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateForm}
                disabled={!newForm.name || createFormMutation.isPending}
                className="bg-[#FFB800] hover:bg-amber-600 text-white"
              >
                {createFormMutation.isPending ? 'Creando...' : 'Crear Formulario'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}