import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateTaskDialog({ open, onOpenChange, jobId, blueprintId, pinPosition, onCreated }) {
  const queryClient = useQueryClient();
  const [task, setTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    status: 'pending',
    due_date: '',
    assigned_to: '',
  });

  const queryClient = useQueryClient();

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      setTask({
        title: '',
        description: '',
        priority: 'medium',
        category: 'general',
        status: 'pending',
        due_date: '',
        assigned_to: '',
      });
      onCreated?.();
    },
  });

  const handleSubmit = () => {
    if (!task.title) return;
    
    createTaskMutation.mutate({
      ...task,
      job_id: jobId,
      blueprint_id: blueprintId,
      pin_x: pinPosition?.x,
      pin_y: pinPosition?.y,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[#D4C85C]">Nueva Tarea</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-slate-300">Título *</Label>
            <Input 
              value={task.title}
              onChange={(e) => setTask({...task, title: e.target.value})}
              placeholder="Ej: Instalar ventanas en sala"
              className="mt-1.5 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300">Descripción</Label>
            <Textarea 
              value={task.description}
              onChange={(e) => setTask({...task, description: e.target.value})}
              placeholder="Detalles de la tarea..."
              className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Categoría</Label>
              <Select value={task.category} onValueChange={(v) => setTask({...task, category: v})}>
                <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="general" className="text-white">General</SelectItem>
                  <SelectItem value="change_order" className="text-white">Orden de Cambio</SelectItem>
                  <SelectItem value="installation" className="text-white">Instalación</SelectItem>
                  <SelectItem value="rfi" className="text-white">RFI</SelectItem>
                  <SelectItem value="inspection" className="text-white">Inspección</SelectItem>
                  <SelectItem value="issue" className="text-white">Problema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Prioridad</Label>
              <Select value={task.priority} onValueChange={(v) => setTask({...task, priority: v})}>
                <SelectTrigger className="mt-1.5 bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="low" className="text-white">Baja</SelectItem>
                  <SelectItem value="medium" className="text-white">Media</SelectItem>
                  <SelectItem value="high" className="text-white">Alta</SelectItem>
                  <SelectItem value="urgent" className="text-white">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Fecha de Vencimiento</Label>
            <Input 
              type="date"
              value={task.due_date}
              onChange={(e) => setTask({...task, due_date: e.target.value})}
              className="mt-1.5 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300">Asignar a (email)</Label>
            <Input 
              value={task.assigned_to}
              onChange={(e) => setTask({...task, assigned_to: e.target.value})}
              placeholder="usuario@ejemplo.com"
              className="mt-1.5 bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="border-slate-700 text-slate-300"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!task.title || createTaskMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {createTaskMutation.isPending ? 'Creando...' : 'Crear Tarea'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}