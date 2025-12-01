import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, 
  Flag, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Calendar,
  Trash2,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, isPast, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function FieldMilestonesView({ jobId }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    name: '',
    description: '',
    target_date: '',
    notify_client: true,
  });

  const queryClient = useQueryClient();

  const { data: milestones = [] } = useQuery({
    queryKey: ['project-milestones', jobId],
    queryFn: () => base44.entities.ProjectMilestone.filter({ job_id: jobId }, 'order'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProjectMilestone.create({ 
      ...data, 
      job_id: jobId,
      order: milestones.length,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', jobId] });
      setShowCreate(false);
      setNewMilestone({ name: '', description: '', target_date: '', notify_client: true });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProjectMilestone.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', jobId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectMilestone.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', jobId] });
    },
  });

  const handleComplete = (milestone) => {
    updateMutation.mutate({
      id: milestone.id,
      data: {
        status: 'completed',
        completed_date: new Date().toISOString().split('T')[0],
        completion_percentage: 100,
      },
    });
  };

  const getStatusInfo = (milestone) => {
    if (milestone.status === 'completed') {
      return { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Completado' };
    }
    if (milestone.target_date && isPast(new Date(milestone.target_date))) {
      return { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Atrasado' };
    }
    if (milestone.status === 'in_progress') {
      return { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'En Progreso' };
    }
    return { icon: Flag, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Pendiente' };
  };

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const progressPercent = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#FFB800]">Project Milestones</h1>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Milestone
        </Button>
      </div>

      {/* Progress Overview */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-slate-900 dark:text-white font-medium">Overall Progress</span>
          <span className="text-[#FFB800]">{completedCount} of {milestones.length} completed</span>
        </div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#FFB800] to-orange-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      {milestones.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 text-center shadow-sm">
          <Flag className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No milestones</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Define the main milestones for the project</p>
          <Button onClick={() => setShowCreate(true)} className="bg-[#FFB800] hover:bg-[#E5A600] text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create First Milestone
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((milestone, idx) => {
            const status = getStatusInfo(milestone);
            const StatusIcon = status.icon;
            const daysUntil = milestone.target_date 
              ? differenceInDays(new Date(milestone.target_date), new Date())
              : null;

            return (
              <div 
                key={milestone.id}
                className={`relative pl-8 ${idx !== milestones.length - 1 ? 'pb-8' : ''}`}
              >
                {/* Timeline line */}
                {idx !== milestones.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-slate-700" />
                )}
                
                {/* Timeline dot */}
                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${status.bg} flex items-center justify-center`}>
                  <StatusIcon className={`w-3 h-3 ${status.color}`} />
                </div>

                {/* Content */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-white">{milestone.name}</h3>
                        <Badge className={`${status.bg} ${status.color} border-0`}>
                          {status.label}
                        </Badge>
                        {milestone.notify_client && (
                          <Bell className="w-3 h-3 text-slate-500" title="Notifica al cliente" />
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-sm text-slate-400 mb-2">{milestone.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        {milestone.target_date && (
                          <span className="text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(milestone.target_date), "d MMM yyyy", { locale: es })}
                          </span>
                        )}
                        {daysUntil !== null && milestone.status !== 'completed' && (
                          <span className={`${daysUntil < 0 ? 'text-red-400' : daysUntil < 7 ? 'text-amber-400' : 'text-slate-500'}`}>
                            {daysUntil < 0 
                              ? `${Math.abs(daysUntil)} días de retraso`
                              : daysUntil === 0 
                                ? 'Hoy'
                                : `${daysUntil} días restantes`
                            }
                          </span>
                        )}
                        {milestone.completed_date && (
                          <span className="text-green-400">
                            Completado: {format(new Date(milestone.completed_date), "d MMM yyyy", { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {milestone.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleComplete(milestone)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(milestone.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Nuevo Hito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-300">Nombre del Hito</Label>
              <Input
                value={newMilestone.name}
                onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                placeholder="Ej: Finalización de estructura"
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Descripción</Label>
              <Textarea
                value={newMilestone.description}
                onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                placeholder="Descripción del hito..."
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Fecha Objetivo</Label>
              <Input
                type="date"
                value={newMilestone.target_date}
                onChange={(e) => setNewMilestone({ ...newMilestone, target_date: e.target.value })}
                className="mt-1.5 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-slate-300">Notificar al cliente</Label>
              <Switch
                checked={newMilestone.notify_client}
                onCheckedChange={(checked) => setNewMilestone({ ...newMilestone, notify_client: checked })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-700">
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate(newMilestone)}
                disabled={!newMilestone.name || !newMilestone.target_date}
                className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
              >
                Crear Hito
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}