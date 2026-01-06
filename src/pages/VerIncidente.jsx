import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/i18n/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { Shield, CheckCircle, Calendar, User, MapPin, AlertTriangle, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function VerIncidentePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const incidentId = urlParams.get('id');

  const [correctiveAction, setCorrectiveAction] = useState({ action: '', responsible: '', due_date: '' });
  const [rootCause, setRootCause] = useState('');

  const { data: incident, isLoading } = useQuery({
    queryKey: ['safetyIncident', incidentId],
    queryFn: async () => {
      const incidents = await base44.entities.SafetyIncident.filter({ id: incidentId });
      return incidents[0];
    },
    enabled: !!incidentId,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      return base44.entities.SafetyIncident.update(incidentId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['safetyIncident'] });
      queryClient.invalidateQueries({ queryKey: ['safetyIncidents'] });
      toast.success('Incidente actualizado');
    },
  });

  const handleAddCorrectiveAction = () => {
    if (!correctiveAction.action) {
      toast.error('Ingresa una acción correctiva');
      return;
    }

    const actions = incident.corrective_actions || [];
    updateMutation.mutate({
      corrective_actions: [
        ...actions,
        { ...correctiveAction, status: 'pending' },
      ],
    });
    setCorrectiveAction({ action: '', responsible: '', due_date: '' });
  };

  const handleCloseIncident = () => {
    if (!rootCause) {
      toast.error('Ingresa la causa raíz antes de cerrar');
      return;
    }

    updateMutation.mutate({
      status: 'closed',
      root_cause: rootCause,
      closed_by: user.email,
      closed_date: new Date().toISOString(),
    });
  };

  const severityConfig = {
    low: { label: 'Baja', color: 'bg-blue-100 text-blue-800' },
    medium: { label: 'Media', color: 'bg-yellow-100 text-yellow-800' },
    high: { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
    critical: { label: 'Crítica', color: 'bg-red-100 text-red-800' },
  };

  const statusConfig = {
    open: { label: 'Abierto', color: 'bg-red-100 text-red-800' },
    investigating: { label: 'Investigando', color: 'bg-yellow-100 text-yellow-800' },
    action_required: { label: 'Acción Requerida', color: 'bg-orange-100 text-orange-800' },
    resolved: { label: 'Resuelto', color: 'bg-green-100 text-green-800' },
    closed: { label: 'Cerrado', color: 'bg-gray-100 text-gray-800' },
  };

  const typeLabels = {
    injury: 'Lesión',
    near_miss: 'Casi Accidente',
    property_damage: 'Daño a Propiedad',
    equipment_failure: 'Falla de Equipo',
    safety_violation: 'Violación de Seguridad',
    environmental: 'Ambiental',
    other: 'Otro',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Cargando...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Incidente no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <PageHeader
        title={incident.incident_number}
        description={typeLabels[incident.incident_type]}
        icon={Shield}
        showBack={true}
      />

      {/* Header Info */}
      <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{typeLabels[incident.incident_type]}</h2>
            <div className="flex gap-2">
              <Badge className={severityConfig[incident.severity]?.color}>{severityConfig[incident.severity]?.label}</Badge>
              <Badge className={statusConfig[incident.status]?.color}>{statusConfig[incident.status]?.label}</Badge>
              {incident.osha_reportable && <Badge className="bg-purple-100 text-purple-800">OSHA</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">Job:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{incident.job_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">Fecha:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {new Date(incident.incident_date).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">Reportado por:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{incident.reported_by_name}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <p className="font-semibold text-slate-900 dark:text-white mb-2">Descripción:</p>
            <p className="text-slate-700 dark:text-slate-300">{incident.description}</p>
          </div>

          {incident.immediate_action_taken && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="font-semibold text-green-900 dark:text-green-400 mb-2">Acción Inmediata:</p>
              <p className="text-slate-700 dark:text-slate-300">{incident.immediate_action_taken}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      {incident.photos && incident.photos.length > 0 && (
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Evidencia Fotográfica</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {incident.photos.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Evidence ${index + 1}`}
                  className="w-full h-40 object-cover rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => window.open(url, '_blank')}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Witnesses */}
      {incident.witnesses && incident.witnesses.length > 0 && (
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Testigos</h3>
            {incident.witnesses.map((witness, index) => (
              <div key={index} className="mb-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="font-semibold text-slate-900 dark:text-white">{witness.name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">{witness.email}</p>
                {witness.statement && (
                  <p className="mt-2 text-slate-700 dark:text-slate-300 text-sm">{witness.statement}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Root Cause & Corrective Actions - Admin Only */}
      {user?.role === 'admin' && incident.status !== 'closed' && (
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardContent className="p-6 space-y-6">
            <div>
              <Label>Causa Raíz</Label>
              <Textarea
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Análisis de la causa raíz del incidente..."
                rows={4}
              />
            </div>

            <div>
              <h4 className="font-bold mb-4 text-slate-900 dark:text-white">Agregar Acción Correctiva</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Acción</Label>
                  <Input
                    value={correctiveAction.action}
                    onChange={(e) => setCorrectiveAction({ ...correctiveAction, action: e.target.value })}
                    placeholder="ej: Capacitación adicional"
                  />
                </div>
                <div>
                  <Label>Responsable</Label>
                  <Input
                    value={correctiveAction.responsible}
                    onChange={(e) => setCorrectiveAction({ ...correctiveAction, responsible: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fecha Límite</Label>
                  <Input
                    type="date"
                    value={correctiveAction.due_date}
                    onChange={(e) => setCorrectiveAction({ ...correctiveAction, due_date: e.target.value })}
                  />
                </div>
              </div>
              <Button type="button" onClick={handleAddCorrectiveAction} size="sm" className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8]">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Acción
              </Button>
            </div>

            {/* Existing Corrective Actions */}
            {incident.corrective_actions && incident.corrective_actions.length > 0 && (
              <div>
                <h4 className="font-bold mb-2 text-slate-900 dark:text-white">Acciones Correctivas</h4>
                <div className="space-y-2">
                  {incident.corrective_actions.map((action, index) => (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{action.action}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Responsable: {action.responsible} • Fecha límite: {action.due_date}
                          </p>
                        </div>
                        <Badge className={action.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {action.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleCloseIncident}
              disabled={updateMutation.isPending || !rootCause}
              className="w-full bg-gradient-to-r from-green-500 to-green-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Cerrando...' : 'Cerrar Incidente'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Closed Incident Summary */}
      {incident.status === 'closed' && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="font-bold text-lg text-green-900 dark:text-green-400">Incidente Cerrado</h3>
            </div>
            {incident.root_cause && (
              <div className="mb-4">
                <p className="font-semibold text-slate-900 dark:text-white mb-2">Causa Raíz:</p>
                <p className="text-slate-700 dark:text-slate-300">{incident.root_cause}</p>
              </div>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Cerrado por {incident.closed_by} el {new Date(incident.closed_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}