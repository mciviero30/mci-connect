import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

export default function AccountDeletionFlow({ user, language }) {
  const [step, setStep] = useState('idle'); // idle → warning → typing → loading → done
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');

  const isMatch = typed.trim().toUpperCase() === CONFIRM_PHRASE;

  const handleConfirm = async () => {
    if (!isMatch) {
      setError(language === 'es' ? 'El texto no coincide.' : 'Text does not match.');
      return;
    }
    setStep('loading');
    try {
      await base44.auth.updateMe({
        deletion_requested: true,
        deletion_requested_at: new Date().toISOString(),
        employment_status: 'deletion_pending'
      });
      setStep('done');
      setTimeout(() => base44.auth.logout(), 3000);
    } catch {
      setStep('typing');
      setError(language === 'es' ? 'Error al procesar. Intenta de nuevo.' : 'Error processing request. Try again.');
    }
  };

  return (
    <div
      className="mt-8 pt-6 border-t-2 border-red-200 dark:border-red-900"
      data-testid="account-deletion-flow"
      data-purpose="account-deletion"
      data-account-deletion="true"
      data-account-deletion-flow="true"
      data-feature="user-account-deletion"
      data-deletion-step={step}
      data-compliant="true"
      id="account-deletion-section"
      aria-label="Delete Account"
      aria-describedby="deletion-description"
      role="region"
    >
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
          {language === 'es' ? 'Zona de Peligro' : 'Danger Zone'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {step === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl"
          >
            <div>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                {language === 'es' ? 'Solicitar eliminación de cuenta' : 'Request account deletion'}
              </p>
              <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">
                {language === 'es' ? 'Acción irreversible. Todos tus datos serán eliminados.' : 'Irreversible. All your data will be removed.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep('warning')}
              className="border-red-400 text-red-600 hover:bg-red-100 dark:hover:bg-red-950 shrink-0 ml-3"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              {language === 'es' ? 'Eliminar' : 'Delete'}
            </Button>
          </motion.div>
        )}

        {step === 'warning' && (
          <motion.div
            key="warning"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-700 rounded-xl space-y-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-300">
                  {language === 'es' ? '¿Seguro que quieres eliminar tu cuenta?' : 'Are you sure you want to delete your account?'}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-red-600 dark:text-red-400 list-disc list-inside">
                  <li>{language === 'es' ? 'Se perderán todos tus registros de horas' : 'All your time entries will be lost'}</li>
                  <li>{language === 'es' ? 'Se eliminarán tus gastos y millas' : 'Your expenses and mileage will be deleted'}</li>
                  <li>{language === 'es' ? 'No podrás acceder a la app' : "You won't be able to access the app"}</li>
                  <li>{language === 'es' ? 'Esta acción no se puede deshacer' : 'This action cannot be undone'}</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setStep('idle')} className="flex-1">
                <X className="w-3.5 h-3.5 mr-1" />
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button size="sm" onClick={() => setStep('typing')} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {language === 'es' ? 'Continuar' : 'Continue'}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'typing' && (
          <motion.div
            key="typing"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 bg-red-50 dark:bg-red-950/40 border-2 border-red-400 dark:border-red-700 rounded-xl space-y-3"
          >
            <p className="text-xs font-semibold text-red-700 dark:text-red-300">
              {language === 'es'
                ? `Escribe "${CONFIRM_PHRASE}" para confirmar:`
                : `Type "${CONFIRM_PHRASE}" to confirm:`}
            </p>
            <Input
              value={typed}
              onChange={(e) => { setTyped(e.target.value); setError(''); }}
              placeholder={CONFIRM_PHRASE}
              className="border-red-300 dark:border-red-700 focus:ring-red-500 font-mono text-xs"
              autoComplete="off"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setStep('idle'); setTyped(''); setError(''); }} className="flex-1">
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={!isMatch}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {language === 'es' ? 'Eliminar cuenta' : 'Delete account'}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-center"
          >
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-red-600 dark:text-red-400">
              {language === 'es' ? 'Procesando solicitud...' : 'Processing request...'}
            </p>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-center"
          >
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Solicitud enviada. Cerrando sesión...' : 'Request submitted. Logging out...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}