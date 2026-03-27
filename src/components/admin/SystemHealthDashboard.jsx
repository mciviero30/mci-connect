import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  HardDrive, 
  Database, 
  Activity, 
  Users, 
  Briefcase, 
  FileText,
  CheckCircle,
  Loader2,
  Download,
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function SystemHealthDashboard({ language = 'en' }) {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch storage metrics
  const { data: storageMetrics, isLoading: loadingStorage } = useQuery({
    queryKey: ['storageMetrics'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getStorageMetrics', {});
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch entity counts
  const { data: entityCounts, isLoading: loadingCounts } = useQuery({
    queryKey: ['entityCounts'],
    queryFn: async () => {
      const [jobs, employees, invoices, expenses] = await Promise.all([
        base44.entities.Job.list('-created_date', 300),
        base44.entities.User.list('-created_date', 200),
        base44.entities.Invoice.list('-created_date', 300),
        base44.entities.Expense.list('-created_date', 500),
      ]);
      return {
        jobs: jobs.length,
        employees: employees.length,
        invoices: invoices.length,
        expenses: expenses.length,
      };
    },
    refetchInterval: 30000,
  });

  // Fetch recent activity
  const { data: recentActivity = [], isLoading: loadingActivity } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: () => base44.entities.ActivityFeed.list('-created_date', 20),
    refetchInterval: 30000,
  });

  const handleExportDatabase = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportDatabase', {});
      const data = response.data;

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mci-connect-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setShowExportDialog(false);
    } catch (error) {
      console.error('Export error:', error);
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      {/* System Health Status */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Activity className="w-5 h-5 text-green-500" />
            {language === 'es' ? 'Estado del Sistema' : 'System Health'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  {language === 'es' ? 'Base de Datos' : 'Database'}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {language === 'es' ? 'Conectado' : 'Connected'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  {language === 'es' ? 'API' : 'API'}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {language === 'es' ? 'Operacional' : 'Operational'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Metrics */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <HardDrive className="w-5 h-5 text-blue-500" />
            {language === 'es' ? 'Uso de Almacenamiento' : 'Storage Usage'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loadingStorage ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : storageMetrics ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold">
                    {language === 'es' ? 'Total Archivos' : 'Total Files'}
                  </p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {storageMetrics.totalFiles}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-purple-900 dark:text-purple-100 font-semibold">
                    {language === 'es' ? 'Tamaño (MB)' : 'Size (MB)'}
                  </p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                    {storageMetrics.estimatedSizeMB}
                  </p>
                </div>
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <p className="text-sm text-indigo-900 dark:text-indigo-100 font-semibold">
                    {language === 'es' ? 'Tamaño (GB)' : 'Size (GB)'}
                  </p>
                  <p className="text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                    {storageMetrics.estimatedSizeGB}
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-4 gap-3 mt-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {language === 'es' ? 'Recibos' : 'Receipts'}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {storageMetrics.breakdown.receipts}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {language === 'es' ? 'Trabajos' : 'Jobs'}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {storageMetrics.breakdown.jobFiles}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {language === 'es' ? 'Empleados' : 'Employees'}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {storageMetrics.breakdown.employeeDocuments}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-xs text-slate-600 dark:text-slate-400">AI</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {storageMetrics.breakdown.aiDocuments}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 dark:text-slate-400">
              {language === 'es' ? 'No hay datos disponibles' : 'No data available'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Entity Counts */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Database className="w-5 h-5 text-orange-500" />
            {language === 'es' ? 'Resumen de Datos' : 'Data Summary'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loadingCounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            </div>
          ) : entityCounts ? (
            <div className="grid md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <Briefcase className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-sm text-orange-900 dark:text-orange-100">
                    {language === 'es' ? 'Trabajos' : 'Jobs'}
                  </p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                    {entityCounts.jobs}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {language === 'es' ? 'Empleados' : 'Employees'}
                  </p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {entityCounts.employees}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div>
                  <p className="text-sm text-green-900 dark:text-green-100">
                    {language === 'es' ? 'Facturas' : 'Invoices'}
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {entityCounts.invoices}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                <div>
                  <p className="text-sm text-purple-900 dark:text-purple-100">
                    {language === 'es' ? 'Gastos' : 'Expenses'}
                  </p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                    {entityCounts.expenses}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Activity className="w-5 h-5 text-indigo-500" />
            {language === 'es' ? 'Actividad Reciente' : 'Recent Activity'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loadingActivity ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100">
                      {activity.description || activity.action}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(activity.created_date).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-600 dark:text-slate-400 text-center py-8">
              {language === 'es' ? 'No hay actividad reciente' : 'No recent activity'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Backup & Export */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Download className="w-5 h-5 text-amber-500" />
            {language === 'es' ? 'Respaldo y Exportación' : 'Backup & Export'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-900 dark:text-amber-100">
              {language === 'es'
                ? 'Esta función exporta datos sensibles de la empresa. Úsala con precaución.'
                : 'This function exports sensitive company data. Use with caution.'}
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => setShowExportDialog(true)}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-md"
          >
            <Download className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Exportar Base de Datos (JSON)' : 'Export Database (JSON)'}
          </Button>
        </CardContent>
      </Card>

      {/* Export Confirmation Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              {language === 'es' ? 'Confirmar Exportación' : 'Confirm Export'}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {language === 'es'
                ? 'Este archivo contiene información sensible de la empresa. ¿Estás seguro de que deseas exportar?'
                : 'This file contains sensitive company data. Are you sure you want to export?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
              className="border-slate-300 dark:border-slate-600"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              onClick={handleExportDatabase}
              disabled={exporting}
              className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-md"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {language === 'es' ? 'Exportando...' : 'Exporting...'}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Exportar' : 'Export'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}