import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Upload, X, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BlueprintViewer from './BlueprintViewer.jsx';

export default function FieldPlansView({ jobId, plans = [], tasks = [] }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', file: null });
  
  const queryClient = useQueryClient();

  const createPlanMutation = useMutation({
    mutationFn: (data) => base44.entities.Plan.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-plans', jobId] });
      setShowUpload(false);
      setNewPlan({ name: '', file: null });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewPlan({ ...newPlan, file: file_url, name: newPlan.name || file.name.split('.')[0] });
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploading(false);
  };

  const handleCreatePlan = () => {
    if (!newPlan.file || !newPlan.name) return;
    createPlanMutation.mutate({
      job_id: jobId,
      name: newPlan.name,
      file_url: newPlan.file,
      order: plans.length,
    });
  };

  const planTasks = selectedPlan 
    ? tasks.filter(t => t.blueprint_id === selectedPlan.id)
    : [];

  if (selectedPlan) {
    return (
      <BlueprintViewer 
        plan={selectedPlan}
        tasks={planTasks}
        jobId={jobId}
        onBack={() => setSelectedPlan(null)}
      />
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#D4C85C]">Planos</h1>
        <Button 
          onClick={() => setShowUpload(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Subir Plano
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-12 text-center">
          <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No hay planos</h3>
          <p className="text-slate-400 mb-4">Sube tu primer plano para comenzar</p>
          <Button 
            onClick={() => setShowUpload(true)}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Upload className="w-4 h-4 mr-2" />
            Subir Plano
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const taskCount = tasks.filter(t => t.blueprint_id === plan.id).length;
            return (
              <div 
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition-all group"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={plan.file_url}
                    alt={plan.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {taskCount > 0 && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                      {taskCount} tareas
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                    {plan.name}
                  </h3>
                  {plan.folder && (
                    <p className="text-sm text-slate-400">{plan.folder}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Subir Nuevo Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Nombre del Plano</Label>
              <Input 
                value={newPlan.name}
                onChange={(e) => setNewPlan({...newPlan, name: e.target.value})}
                placeholder="Ej: Planta Baja"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Archivo</Label>
              <div className="mt-1.5">
                {newPlan.file ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-800">
                    <img src={newPlan.file} alt="Preview" className="w-full h-full object-contain" />
                    <button 
                      onClick={() => setNewPlan({...newPlan, file: null})}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-amber-500/50 transition-colors">
                    <Upload className="w-8 h-8 text-slate-500 mb-2" />
                    <span className="text-sm text-slate-400">
                      {uploading ? 'Subiendo...' : 'Click para subir imagen'}
                    </span>
                    <input 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowUpload(false)} className="border-slate-700 text-slate-300">
                Cancelar
              </Button>
              <Button 
                onClick={handleCreatePlan}
                disabled={!newPlan.file || !newPlan.name || createPlanMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {createPlanMutation.isPending ? 'Guardando...' : 'Guardar Plano'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}