import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function EditPlanDialog({ open, onOpenChange, plan, jobId }) {
  const [section, setSection] = useState(plan?.section || '');
  const [folder, setFolder] = useState(plan?.folder || '');
  const queryClient = useQueryClient();

  const updatePlanMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Plan.update(plan.id, {
        section: section || null,
        folder: folder || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-job-final-plans', jobId] });
      toast.success('Plan actualizado');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Error al actualizar plan');
      console.error(error);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-orange-500/30 text-white backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-orange-400">
            Editar Plan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label className="text-slate-300">Sección (Piso)</Label>
            <Input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="ej: Piso 1, Piso 2, Basement..."
              className="mt-1.5 bg-black/40 border-orange-500/30 text-white focus:border-orange-400"
            />
          </div>
          <div>
            <Label className="text-slate-300">Carpeta (Área)</Label>
            <Input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="ej: Electrical, Plumbing, HVAC..."
              className="mt-1.5 bg-black/40 border-orange-500/30 text-white focus:border-orange-400"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-orange-500/30 text-slate-300 hover:bg-orange-500/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => updatePlanMutation.mutate()}
              disabled={updatePlanMutation.isPending}
              className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black font-bold"
            >
              {updatePlanMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}