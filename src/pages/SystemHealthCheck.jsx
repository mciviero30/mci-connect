import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';

const TESTS = [
  { id: 'auth', name: 'Autenticación', description: 'Verificar usuario actual' },
  { id: 'notifications', name: 'Sistema de Notificaciones', description: 'Validar acceso a Notification entity' },
  { id: 'jobs', name: 'Entity: Jobs', description: 'Cargar trabajos activos' },
  { id: 'timeentries', name: 'Entity: Time Entries', description: 'Cargar entradas de tiempo' },
  { id: 'expenses', name: 'Entity: Expenses', description: 'Cargar gastos pendientes' },
  { id: 'assignments', name: 'Entity: Job Assignments', description: 'Cargar asignaciones' },
  { id: 'posts', name: 'Entity: Posts', description: 'Cargar anuncios urgentes' },
  { id: 'settings', name: 'Entity: Notification Settings', description: 'Cargar preferencias' },
  { id: 'chat', name: 'Entity: Chat Messages', description: 'Cargar mensajes' },
  { id: 'projectmember', name: 'Entity: Project Members', description: 'Cargar membresías de cliente' },
];

export default function SystemHealthCheck() {
  const [results, setResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const runTests = async () => {
    setIsRunning(true);
    const newResults = {};

    for (const test of TESTS) {
      try {
        switch (test.id) {
          case 'auth':
            newResults[test.id] = { status: 'success', message: `Usuario: ${user?.full_name || 'N/A'}` };
            break;

          case 'notifications':
            await base44.entities.Notification.list('', 1);
            newResults[test.id] = { status: 'success', message: 'Entity accesible' };
            break;

          case 'jobs':
            const jobs = await base44.entities.Job.filter({ status: 'active' }, '', 5);
            newResults[test.id] = { status: 'success', message: `${jobs.length} trabajos activos` };
            break;

          case 'timeentries':
            const entries = await base44.entities.TimeEntry.filter({}, '', 5);
            newResults[test.id] = { status: 'success', message: `${entries.length} entradas` };
            break;

          case 'expenses':
            const expenses = await base44.entities.Expense.filter({ status: 'pending' }, '', 5);
            newResults[test.id] = { status: 'success', message: `${expenses.length} gastos pendientes` };
            break;

          case 'assignments':
            const assigns = await base44.entities.JobAssignment.filter({}, '', 5);
            newResults[test.id] = { status: 'success', message: `${assigns.length} asignaciones` };
            break;

          case 'posts':
            const posts = await base44.entities.Post.filter({ priority: 'urgent' }, '', 5);
            newResults[test.id] = { status: 'success', message: `${posts.length} anuncios` };
            break;

          case 'settings':
            const notifSettings = await base44.entities.NotificationSettings.filter({}, '', 5);
            newResults[test.id] = { status: 'success', message: `${notifSettings.length} configuraciones` };
            break;

          case 'chat':
            const messages = await base44.entities.ChatMessage.filter({}, '', 5);
            newResults[test.id] = { status: 'success', message: `${messages.length} mensajes` };
            break;

          case 'projectmember':
            const members = await base44.entities.ProjectMember.filter({}, '', 5);
            newResults[test.id] = { status: 'success', message: `${members.length} membresías` };
            break;

          default:
            newResults[test.id] = { status: 'pending', message: 'No implementado' };
        }
      } catch (error) {
        newResults[test.id] = { status: 'error', message: error.message?.substring(0, 60) || 'Error desconocido' };
      }
    }

    setResults(newResults);
    setIsRunning(false);
  };

  const successCount = Object.values(results).filter(r => r.status === 'success').length;
  const errorCount = Object.values(results).filter(r => r.status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 pb-12">
      <PageHeader
        title="System Health Check"
        description="Verifica que todos los componentes de MCI Connect funcionan correctamente"
        icon={RefreshCw}
      />

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {/* Summary Card */}
        <Card className="mb-6 soft-blue-gradient">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-white">
              <div>
                <div className="text-3xl font-bold">{successCount}/{TESTS.length}</div>
                <p className="text-sm opacity-90">Tests Exitosos</p>
              </div>
              <div>
                <div className="text-3xl font-bold">{errorCount}</div>
                <p className="text-sm opacity-90">Errores</p>
              </div>
              <div>
                <div className="text-3xl font-bold">{Object.keys(results).length}</div>
                <p className="text-sm opacity-90">Completados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Run Button */}
        <Button
          onClick={runTests}
          disabled={isRunning}
          className="w-full mb-6 soft-green-gradient text-white h-12 text-base"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Ejecutando tests...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5 mr-2" />
              Ejecutar Test Completo
            </>
          )}
        </Button>

        {/* Test Results */}
        <div className="space-y-3">
          {TESTS.map(test => {
            const result = results[test.id];
            const status = result?.status || 'pending';

            return (
              <Card key={test.id} className={status === 'error' ? 'border-red-300 dark:border-red-900' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 dark:text-white">{test.name}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{test.description}</p>
                      {result && (
                        <p className={`text-xs mt-2 ${status === 'success' ? 'text-green-600 dark:text-green-400' : status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600'}`}>
                          {result.message}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {status === 'success' && <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />}
                      {status === 'error' && <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />}
                      {status === 'pending' && <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Status Message */}
        {Object.keys(results).length > 0 && (
          <div className={`mt-6 p-4 rounded-lg ${errorCount === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-900' : 'bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-900'}`}>
            <p className={`text-sm font-semibold ${errorCount === 0 ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>
              {errorCount === 0 ? '✅ Sistema 100% Operativo' : `⚠️ ${errorCount} error(es) detectado(s)`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}