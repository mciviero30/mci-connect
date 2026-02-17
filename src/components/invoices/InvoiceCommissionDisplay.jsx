/**
 * ============================================================================
 * INVOICE COMMISSION DISPLAY (VISIBILITY CONTROL)
 * ============================================================================
 * 
 * Shows commission ONLY if:
 * - User is admin OR CEO
 * - commission_visible = true
 * - Both conditions must be met
 */

import React from 'react';
import { DollarSign, Eye, EyeOff, Info } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function InvoiceCommissionDisplay({ invoice, user }) {
  const { language } = useLanguage();
  
  const isAdminOrCEO = user?.role === 'admin' || user?.role === 'ceo';
  const shouldDisplay = isAdminOrCEO && invoice.commission_visible;
  
  // If not admin/ceo, show nothing
  if (!isAdminOrCEO) {
    return null;
  }
  
  return (
    <div className="space-y-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {language === 'es' ? 'Comisión' : 'Commission'}
          </span>
        </div>
        
        {!shouldDisplay && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <EyeOff className="w-3 h-3" />
            {language === 'es' ? 'Oculto' : 'Hidden'}
          </span>
        )}
      </div>
      
      {shouldDisplay ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-blue-900 dark:text-blue-200">
              {language === 'es' ? 'Monto de Comisión' : 'Commission Amount'}
            </span>
            <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
              ${invoice.commission_amount?.toFixed(2) || '0.00'}
            </span>
          </div>
          
          <div className="mt-2 text-xs text-blue-700 dark:text-blue-400">
            <p>
              {language === 'es' ? 'Ganancia Real' : 'Actual Profit'}: ${invoice.profit_real?.toFixed(2) || '0.00'}
            </p>
            <p>
              {language === 'es' ? 'Porcentaje' : 'Percentage'}: {invoice.commission_percentage || 10}%
            </p>
          </div>
        </div>
      ) : (
        <Alert className="border-slate-300 bg-slate-50 dark:bg-slate-900/50">
          <Info className="w-4 h-4 text-slate-600" />
          <AlertDescription className="text-xs text-slate-600 dark:text-slate-400">
            {language === 'es'
              ? 'La comisión está oculta para los usuarios no autorizados'
              : 'Commission is hidden from unauthorized users'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}