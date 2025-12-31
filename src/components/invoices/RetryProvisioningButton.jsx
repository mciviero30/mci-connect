import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, Folder, Link2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function RetryProvisioningButton({ invoice, job, onSuccess }) {
  // Guard: Only show button if something is missing
  const needsProvisioning = invoice?.job_id && job && (
    !job.drive_folder_url || 
    !job.field_project_id || 
    job.provisioning_status === 'error' ||
    job.provisioning_status === 'partial'
  );

  if (!needsProvisioning) return null;
  const { language } = useLanguage();
  const toast = useToast();
  const [isRetrying, setIsRetrying] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    try {
      const { data } = await base44.functions.invoke('provisionJobFromInvoice', {
        invoice_id: invoice.id,
        mode: 'retry'
      });

      setResults(data);
      setShowResults(true);

      if (data?.ok) {
        toast.success(language === 'es' 
          ? '✅ Provisioning completado' 
          : '✅ Provisioning completed');
        onSuccess?.();
      } else if (data?.provisioning_status === 'partial') {
        toast.info(language === 'es' 
          ? '⚠️ Parcial. Puedes reintentar.' 
          : '⚠️ Partial. You can retry.');
      } else {
        toast.error(language === 'es' 
          ? '❌ Falló. Revisa errores.' 
          : '❌ Failed. Check errors.');
      }
    } catch (error) {
      console.error('Retry provisioning error:', error);
      toast.error(language === 'es' 
        ? 'Factura guardada. Falta Drive/Field. Puedes reintentar.' 
        : 'Invoice saved. Drive/Field pending. You can retry.');
      setResults({ ok: false, error: error.message });
      setShowResults(true);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRetry}
        disabled={isRetrying}
        className="bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-400"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
        {isRetrying 
          ? (language === 'es' ? 'Provisionando...' : 'Provisioning...') 
          : (language === 'es' ? 'Provisionar Job' : 'Provision Job')}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              {results?.ok ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {language === 'es' ? 'Resultado del Provisioning' : 'Provisioning Results'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Job Status */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {language === 'es' ? 'Trabajo (Job)' : 'Job'}
              </span>
              <Badge className={
                results?.steps?.job === 'created' ? 'bg-green-100 text-green-700' :
                results?.steps?.job === 'existing' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-700'
              }>
                {results?.steps?.job === 'created' ? (language === 'es' ? 'Creado' : 'Created') :
                 results?.steps?.job === 'existing' ? (language === 'es' ? 'Existente' : 'Existing') :
                 (language === 'es' ? 'Error' : 'Error')}
              </Badge>
            </div>

            {/* Drive Folder Status */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Google Drive
                </span>
              </div>
              <Badge className={
                results?.steps?.drive === 'created' ? 'bg-green-100 text-green-700' :
                results?.steps?.drive === 'existing' ? 'bg-blue-100 text-blue-700' :
                results?.steps?.drive === 'error' ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-700'
              }>
                {results?.steps?.drive === 'created' ? (language === 'es' ? 'Creado' : 'Created') :
                 results?.steps?.drive === 'existing' ? (language === 'es' ? 'Existente' : 'Existing') :
                 results?.steps?.drive === 'error' ? 'Error' :
                 (language === 'es' ? 'Desconocido' : 'Unknown')}
              </Badge>
            </div>

            {/* Quick Links */}
            {(results?.drive_folder_url || results?.job_id) && (
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                {results.drive_folder_url && (
                  <a 
                    href={results.drive_folder_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Folder className="w-4 h-4" />
                    {language === 'es' ? 'Abrir carpeta Drive' : 'Open Drive folder'}
                  </a>
                )}
                {results.job_id && (
                  <a 
                    href={`${window.location.origin}${createPageUrl('JobDetails')}?id=${results.job_id}`}
                    target="_blank"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Link2 className="w-4 h-4" />
                    {language === 'es' ? 'Abrir Job' : 'Open Job'}
                  </a>
                )}
              </div>
            )}

            {/* Field Sync Status */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                MCI Field
              </span>
              <Badge className={
                results?.steps?.field === 'created' ? 'bg-green-100 text-green-700' :
                results?.steps?.field === 'existing' ? 'bg-blue-100 text-blue-700' :
                results?.steps?.field === 'error' ? 'bg-red-100 text-red-700' :
                'bg-slate-100 text-slate-700'
              }>
                {results?.steps?.field === 'created' ? (language === 'es' ? 'Sincronizado' : 'Synced') :
                 results?.steps?.field === 'existing' ? (language === 'es' ? 'Existente' : 'Existing') :
                 results?.steps?.field === 'error' ? 'Error' :
                 (language === 'es' ? 'Desconocido' : 'Unknown')}
              </Badge>
            </div>

            {/* Errors */}
            {results?.errors && results.errors.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs font-semibold text-red-900 dark:text-red-200 mb-2">
                  {language === 'es' ? 'Errores' : 'Errors'}:
                </p>
                {results.errors.map((err, idx) => (
                  <p key={idx} className="text-xs text-red-700 dark:text-red-300">• {err}</p>
                ))}
              </div>
            )}

            <Button
              onClick={() => setShowResults(false)}
              className="w-full"
              variant="outline"
            >
              {language === 'es' ? 'Cerrar' : 'Close'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}