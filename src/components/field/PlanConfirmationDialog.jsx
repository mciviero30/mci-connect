import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Edit2, FileText } from 'lucide-react';

export default function PlanConfirmationDialog({ plan, open, onOpenChange }) {
  const [planName, setPlanName] = useState(plan?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: (newName) =>
      base44.entities.Plan.update(plan.id, {
        name: newName,
        needs_confirmation: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-job-final-plans'] });
      onOpenChange(false);
    },
  });

  const handleConfirm = () => {
    if (planName.trim()) {
      confirmMutation.mutate(planName.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Confirmar nombre del plano
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Plan Preview */}
          <div className="relative w-full aspect-video bg-slate-900 border border-slate-700 rounded-lg overflow-hidden flex items-center justify-center">
            {plan?.file_url ? (
              plan.file_url.toLowerCase().endsWith('.pdf') || plan.file_url.includes('.pdf') ? (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="w-12 h-12 text-slate-600" />
                  <p className="text-xs text-slate-500">PDF Documento</p>
                </div>
              ) : (
                <img
                  src={plan.file_url}
                  alt="Plan preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-600" />
                <p className="text-xs text-slate-500">No preview available</p>
              </div>
            )}
          </div>

          {/* OCR Confidence Badge */}
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 mb-2">OCR detectó:</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-slate-300">
                {plan?.name || 'No detectado'}
              </span>
              {plan?.name && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  Necesita confirmación
                </Badge>
              )}
            </div>
          </div>

          {/* Edit Mode */}
          {isEditing ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Nombre del plano:
              </label>
              <Input
                autoFocus
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Ej: IN-001, Floor Plan, Foundation..."
                className="bg-slate-900 border-slate-600 text-white"
              />
              <p className="text-xs text-slate-400">
                Edita si el OCR no detectó correctamente
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-slate-900/30 p-3 rounded-lg border border-slate-700">
              <div>
                <p className="text-xs text-slate-400 mb-1">Nombre final:</p>
                <p className="text-sm font-mono text-white">{planName}</p>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-orange-500/20 rounded transition-colors"
              >
                <Edit2 className="w-4 h-4 text-orange-400" />
              </button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!planName.trim() || confirmMutation.isPending}
            className="bg-green-500/80 hover:bg-green-600 text-white flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}