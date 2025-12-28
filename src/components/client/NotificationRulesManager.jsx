import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, Plus, Edit, Trash2, Mail, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

const eventLabels = {
  project_started: 'Proyecto Iniciado',
  project_completed: 'Proyecto Completado',
  photo_uploaded: 'Foto Subida',
  milestone_achieved: 'Hito Alcanzado',
  status_changed: 'Estado Cambiado',
  comment_added: 'Comentario Añadido',
  task_completed: 'Tarea Completada'
};

const defaultTemplates = {
  photo_uploaded: {
    subject: 'Nuevas fotos en {project_name}',
    body: 'Hola,\n\nSe han subido nuevas fotos del progreso en {project_name}. Puedes verlas en tu portal de cliente.\n\nSaludos,\nMCI Team',
    portal: 'Nuevas fotos disponibles en {project_name}'
  },
  project_started: {
    subject: 'Tu proyecto {project_name} ha comenzado',
    body: 'Hola,\n\nNos complace informarte que tu proyecto {project_name} ha comenzado oficialmente. Puedes seguir el progreso en tiempo real desde tu portal.\n\nSaludos,\nMCI Team',
    portal: 'El proyecto {project_name} ha iniciado'
  },
  project_completed: {
    subject: 'Proyecto {project_name} completado',
    body: 'Hola,\n\n¡Felicidades! Tu proyecto {project_name} ha sido completado. Revisa los resultados finales en tu portal.\n\nSaludos,\nMCI Team',
    portal: 'Proyecto {project_name} completado exitosamente'
  }
};

export default function NotificationRulesManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: rules = [] } = useQuery({
    queryKey: ['client-notification-rules'],
    queryFn: () => base44.entities.ClientNotificationRule.list('-created_date'),
  });

  const createRuleMutation = useMutation({
    mutationFn: (data) => base44.entities.ClientNotificationRule.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['client-notification-rules']);
      toast.success('Regla creada');
      setDialogOpen(false);
      setEditingRule(null);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientNotificationRule.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['client-notification-rules']);
      toast.success('Regla actualizada');
      setDialogOpen(false);
      setEditingRule(null);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id) => base44.entities.ClientNotificationRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['client-notification-rules']);
      toast.success('Regla eliminada');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.ClientNotificationRule.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['client-notification-rules']);
    },
  });

  const [formData, setFormData] = useState({
    name: '',
    trigger_event: '',
    notification_type: 'both',
    email_subject: '',
    email_body: '',
    portal_message: '',
    active: true,
    apply_to_all_projects: true
  });

  const handleEventChange = (event) => {
    const template = defaultTemplates[event] || {};
    setFormData({
      ...formData,
      trigger_event: event,
      email_subject: template.subject || '',
      email_body: template.body || '',
      portal_message: template.portal || ''
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.trigger_event) {
      toast.error('Completa los campos requeridos');
      return;
    }

    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createRuleMutation.mutate(formData);
    }
  };

  const openEditDialog = (rule) => {
    setEditingRule(rule);
    setFormData(rule);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      trigger_event: '',
      notification_type: 'both',
      email_subject: '',
      email_body: '',
      portal_message: '',
      active: true,
      apply_to_all_projects: true
    });
    setEditingRule(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Reglas de Notificación Automática</h3>
          <p className="text-sm text-slate-500">Configura notificaciones automáticas para eventos del proyecto</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Regla
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Editar Regla' : 'Nueva Regla de Notificación'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre de la Regla *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej: Notificar cuando suben fotos"
                />
              </div>

              <div>
                <Label>Evento que Dispara *</Label>
                <Select value={formData.trigger_event} onValueChange={handleEventChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(eventLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Tipo de Notificación</Label>
                <Select value={formData.notification_type} onValueChange={(val) => setFormData({...formData, notification_type: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Solo Email</SelectItem>
                    <SelectItem value="portal">Solo Portal</SelectItem>
                    <SelectItem value="both">Email + Portal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.notification_type === 'email' || formData.notification_type === 'both') && (
                <>
                  <div>
                    <Label>Asunto del Email</Label>
                    <Input
                      value={formData.email_subject}
                      onChange={(e) => setFormData({...formData, email_subject: e.target.value})}
                      placeholder="Usa {project_name} como variable"
                    />
                  </div>
                  <div>
                    <Label>Cuerpo del Email</Label>
                    <Textarea
                      value={formData.email_body}
                      onChange={(e) => setFormData({...formData, email_body: e.target.value})}
                      placeholder="Usa {project_name} como variable"
                      className="min-h-[120px]"
                    />
                  </div>
                </>
              )}

              {(formData.notification_type === 'portal' || formData.notification_type === 'both') && (
                <div>
                  <Label>Mensaje en el Portal</Label>
                  <Textarea
                    value={formData.portal_message}
                    onChange={(e) => setFormData({...formData, portal_message: e.target.value})}
                    placeholder="Usa {project_name} como variable"
                    className="min-h-[80px]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label>Regla Activa</Label>
                  <p className="text-sm text-slate-500">Activar o pausar esta regla</p>
                </div>
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editingRule ? 'Actualizar Regla' : 'Crear Regla'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-slate-900">{rule.name}</h4>
                    <Badge className={rule.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                      {rule.active ? 'Activa' : 'Pausada'}
                    </Badge>
                    <Badge variant="outline">{eventLabels[rule.trigger_event]}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    {(rule.notification_type === 'email' || rule.notification_type === 'both') && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span>Email</span>
                      </div>
                    )}
                    {(rule.notification_type === 'portal' || rule.notification_type === 'both') && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>Portal</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.active}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: rule.id, active: checked })}
                  />
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(rule)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('¿Eliminar esta regla?')) {
                        deleteRuleMutation.mutate(rule.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">No hay reglas configuradas</p>
              <p className="text-sm text-slate-400 mb-4">
                Crea reglas para notificar automáticamente a tus clientes
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}