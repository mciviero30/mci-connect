import React from 'react';
import PageHeader from '@/components/shared/PageHeader';
import NotificationPreferencesPanel from '@/components/notifications/NotificationPreferencesPanel';
import { Bell } from 'lucide-react';

export default function NotificationPreferences() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <PageHeader
        title="Preferencias de Notificaciones"
        description="Personaliza cómo y cuándo deseas recibir notificaciones"
        icon={Bell}
      />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <NotificationPreferencesPanel />

        {/* Info Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-3xl mb-2">📱</div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">App</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Notificaciones in-app que ves en la campana de tu panel
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-3xl mb-2">📧</div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Email</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Recibe resúmenes por correo electrónico
            </p>
          </div>

          <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-3xl mb-2">🔔</div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Push</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Alertas instantáneas en tu dispositivo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}