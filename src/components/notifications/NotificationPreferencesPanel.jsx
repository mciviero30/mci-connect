import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, Clock, AlertCircle, DollarSign, Users, Save, Loader2, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';

// Notification preferences by category
const PREFERENCES = {
  work: [
    { key: 'job_assignment_in_app', label: 'Asignación de Trabajos', icon: '📋' },
    { key: 'schedule_change_in_app', label: 'Cambios de Horario', icon: '🔄' },
    { key: 'deadline_alert_in_app', label: 'Proximidad de Fecha Límite', icon: '⏰' },
  ],
  payroll: [
    { key: 'timesheet_approval_in_app', label: 'Aprobación de Horas', icon: '✅' },
    { key: 'payroll_reminder_in_app', label: 'Recordatorio de Nómina', icon: '💰' },
    { key: 'overtime_alert_in_app', label: 'Alerta de Horas Extra', icon: '⚠️' },
  ],
  expenses: [
    { key: 'expense_status_in_app', label: 'Cambio en Estado de Gastos', icon: '💸' },
    { key: 'expense_rejected_in_app', label: 'Gasto Rechazado', icon: '❌' },
  ],
  admin: [
    { key: 'pending_approvals_in_app', label: 'Aprobaciones Pendientes', icon: '📋' },
    { key: 'deadline_alert_in_app', label: 'Fecha Límite de Proyectos', icon: '⏰' },
    { key: 'certification_expiring_in_app', label: 'Certificación Venciendo', icon: '🎓' },
    { key: 'inventory_low_in_app', label: 'Inventario Bajo', icon: '📦' },
  ],
  client: [
    { key: 'project_update_in_app', label: 'Actualización de Proyecto', icon: '📊' },
    { key: 'client_message_in_app', label: 'Nuevo Mensaje del Equipo', icon: '💬' },
  ]
};

export default function NotificationPreferencesPanel() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [localPrefs, setLocalPrefs] = useState({});
  const [activeTab, setActiveTab] = useState('work');

  // Fetch user preferences
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['notificationSettings', user?.email],
    queryFn: async () => {
      if (!user?.email) return {};
      const result = await base44.entities.NotificationSettings.filter({
        user_email: user.email
      }).catch(() => []);
      return result[0] || {};
    },
    enabled: !!user?.email,
    onSuccess: (data) => {
      setLocalPrefs(data);
    }
  });

  // Save preferences
  const saveMutation = useMutation({
    mutationFn: async (newPrefs) => {
      if (settings.id) {
        await base44.entities.NotificationSettings.update(settings.id, newPrefs);
      } else {
        await base44.entities.NotificationSettings.create({
          user_email: user.email,
          ...newPrefs
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
    }
  });

  const handleToggle = (key) => {
    setLocalPrefs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    await saveMutation.mutateAsync(localPrefs);
  };

  if (userLoading || settingsLoading) {
    return <Loader2 className="w-6 h-6 animate-spin" />;
  }

  // Determine active tabs based on user role
  let availableTabs = ['work', 'payroll', 'expenses'];
  if (user?.role === 'admin') {
    availableTabs = ['work', 'payroll', 'expenses', 'admin'];
  }
  if (user?.role !== 'admin') {
    availableTabs.push('client');
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t('notificationPreferences') || 'Preferencias de Notificaciones'}
          </CardTitle>
          <CardDescription>
            Personaliza cuándo y dónde recibes notificaciones
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)` }}>
              {availableTabs.includes('work') && <TabsTrigger value="work">Trabajo</TabsTrigger>}
              {availableTabs.includes('payroll') && <TabsTrigger value="payroll">Nómina</TabsTrigger>}
              {availableTabs.includes('expenses') && <TabsTrigger value="expenses">Gastos</TabsTrigger>}
              {availableTabs.includes('admin') && <TabsTrigger value="admin">Admin</TabsTrigger>}
              {availableTabs.includes('client') && <TabsTrigger value="client">Cliente</TabsTrigger>}
            </TabsList>

            {availableTabs.map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                {PREFERENCES[tab].map(pref => (
                  <div
                    key={pref.key}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-2xl">{pref.icon}</span>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">
                          {pref.label}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          App + Email + Push
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={localPrefs[pref.key] !== false}
                      onCheckedChange={() => handleToggle(pref.key)}
                      className="ml-4 flex-shrink-0"
                    />
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>

          {/* Quiet Hours Section */}
          <div className="mt-8 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Horas Silenciosas
                </h3>
              </div>
              <Switch
                checked={localPrefs.quiet_hours_enabled || false}
                onCheckedChange={(checked) => setLocalPrefs(prev => ({
                  ...prev,
                  quiet_hours_enabled: checked
                }))}
              />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Desactiva notificaciones push durante estas horas
            </p>
            {localPrefs.quiet_hours_enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Inicio</label>
                  <input
                    type="time"
                    value={localPrefs.quiet_hours_start || '22:00'}
                    onChange={(e) => setLocalPrefs(prev => ({
                      ...prev,
                      quiet_hours_start: e.target.value
                    }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fin</label>
                  <input
                    type="time"
                    value={localPrefs.quiet_hours_end || '07:00'}
                    onChange={(e) => setLocalPrefs(prev => ({
                      ...prev,
                      quiet_hours_end: e.target.value
                    }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full mt-6 soft-blue-gradient text-white"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Preferencias
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}