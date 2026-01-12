import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bell, Clock, AlertCircle, Save, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';

const notificationTypes = {
  deadline_approaching: {
    label: 'Proximidad de Fechas Límite',
    description: 'Alertas cuando faltan 3 días para una fecha límite',
    icon: Clock,
    color: 'text-blue-500'
  },
  expense_status_changed: {
    label: 'Cambios en Estado de Gastos',
    description: 'Notificaciones cuando un gasto es aprobado o rechazado',
    icon: AlertCircle,
    color: 'text-amber-500'
  },
  job_assigned: {
    label: 'Asignación de Trabajos',
    description: 'Alertas cuando te asignan un nuevo trabajo',
    icon: Bell,
    color: 'text-green-500'
  },
  reminder_daily: {
    label: 'Recordatorios Diarios',
    description: 'Resumen diario de tareas y eventos',
    icon: Clock,
    color: 'text-purple-500'
  },
  time_tracking_reminder: {
    label: 'Recordatorio de Horas',
    description: 'Alertas para registrar horas de trabajo',
    icon: Clock,
    color: 'text-indigo-500'
  }
};

export default function NotificationPreferences() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current preferences
  const { data: currentPreferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return user?.notification_preferences || {};
    },
    onSuccess: (data) => {
      setPreferences(data);
    }
  });

  // Save preferences
  const saveMutation = useMutation({
    mutationFn: async (newPrefs) => {
      await base44.auth.updateMe({ 
        notification_preferences: newPrefs 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    }
  });

  const handleToggle = (type) => {
    const updated = {
      ...preferences,
      [type]: !preferences[type]
    };
    setPreferences(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveMutation.mutateAsync(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Preferencias de Notificaciones Push
          </CardTitle>
          <CardDescription>
            Personaliza cuándo y qué notificaciones deseas recibir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(notificationTypes).map(([typeKey, typeData]) => {
              const Icon = typeData.icon;
              const isEnabled = preferences[typeKey] !== false; // Default: enabled
              
              return (
                <div 
                  key={typeKey}
                  className="flex items-start justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${typeData.color}`} />
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">
                        {typeData.label}
                      </h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {typeData.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(typeKey)}
                    className="ml-4 flex-shrink-0"
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Las notificaciones push requieren que hayas permitido el acceso a notificaciones en tu dispositivo.
              </p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || saveMutation.isPending}
            className="w-full mt-6 soft-blue-gradient text-white"
          >
            {isSaving || saveMutation.isPending ? (
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