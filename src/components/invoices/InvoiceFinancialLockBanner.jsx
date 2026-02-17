/**
 * ============================================================================
 * INVOICE FINANCIAL LOCK BANNER (CAPA 4 - UI INDICATOR)
 * ============================================================================
 * 
 * Displays lock status for sent invoices
 * Shows admin unlock option if user has permission
 */

import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Unlock, AlertTriangle, Shield } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function InvoiceFinancialLockBanner({ invoice, user, onUnlocked }) {
  const { language } = useLanguage();
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  const isLocked = invoice.margin_locked === true || invoice.commission_locked === true;
  const isAdmin = user?.role === 'admin';
  
  if (!isLocked) {
    return null; // Only show for locked invoices
  }
  
  const handleUnlock = async () => {
    if (!unlockReason.trim()) {
      toast.error(language === 'es' 
        ? 'Debes proporcionar una razón para desbloquear'
        : 'You must provide a reason to unlock');
      return;
    }
    
    setIsUnlocking(true);
    
    try {
      const response = await base44.functions.invoke('unlockInvoiceFinancials', {
        invoice_id: invoice.id,
        unlock_reason: unlockReason
      });
      
      if (response.data.status === 'success') {
        toast.success(language === 'es' 
          ? 'Factura desbloqueada exitosamente'
          : 'Invoice unlocked successfully');
        
        setUnlockDialogOpen(false);
        setUnlockReason('');
        
        if (onUnlocked) {
          onUnlocked();
        }
      } else {
        toast.error(response.data.error || 'Unlock failed');
      }
    } catch (error) {
      console.error('[Unlock] Error:', error);
      toast.error(error.message || 'Failed to unlock invoice');
    } finally {
      setIsUnlocking(false);
    }
  };
  
  return (
    <>
      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-900/20 mb-4">
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {language === 'es' 
                ? '🔒 Factura Bloqueada - Datos Financieros Congelados'
                : '🔒 Invoice Locked - Financial Data Frozen'}
            </span>
          </div>
          
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUnlockDialogOpen(true)}
              className="border-amber-600 text-amber-700 hover:bg-amber-100"
            >
              <Unlock className="w-3 h-3 mr-1" />
              {language === 'es' ? 'Desbloquear (Admin)' : 'Unlock (Admin)'}
            </Button>
          )}
        </AlertDescription>
        
        <div className="mt-2 text-xs text-amber-800 dark:text-amber-300">
          <p>
            {language === 'es'
              ? 'Esta factura fue enviada al cliente. El margen y la comisión están bloqueados para prevenir cambios accidentales.'
              : 'This invoice was sent to the customer. Margin and commission are locked to prevent accidental changes.'}
          </p>
          {invoice.locked_at && (
            <p className="mt-1 text-amber-700 dark:text-amber-400">
              {language === 'es' ? 'Bloqueado el:' : 'Locked on:'} {new Date(invoice.locked_at).toLocaleString()}
            </p>
          )}
        </div>
      </Alert>
      
      {/* Admin Unlock Dialog */}
      {isAdmin && (
        <Dialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                <DialogTitle>
                  {language === 'es' ? 'Desbloquear Factura' : 'Unlock Invoice'}
                </DialogTitle>
              </div>
              <DialogDescription>
                {language === 'es'
                  ? 'Esta acción permitirá recalcular el margen y la comisión. Requiere justificación administrativa.'
                  : 'This action will allow margin and commission recalculation. Requires administrative justification.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <p className="font-semibold mb-1">
                      {language === 'es' ? '⚠️ Advertencia Crítica' : '⚠️ Critical Warning'}
                    </p>
                    <p>
                      {language === 'es'
                        ? 'Desbloquear permitirá cambios en datos financieros ya enviados al cliente. Esta acción quedará auditada.'
                        : 'Unlocking will allow changes to financial data already sent to customer. This action will be audited.'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="unlock_reason" className="text-sm font-semibold">
                  {language === 'es' ? 'Razón de Desbloqueo' : 'Unlock Reason'}
                </Label>
                <Input
                  id="unlock_reason"
                  value={unlockReason}
                  onChange={(e) => setUnlockReason(e.target.value)}
                  placeholder={language === 'es' 
                    ? 'Ej: Cliente solicitó cambio en costos...'
                    : 'Ex: Customer requested cost change...'}
                  className="mt-2"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUnlockDialogOpen(false)}
                  className="flex-1"
                  disabled={isUnlocking}
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleUnlock}
                  disabled={!unlockReason.trim() || isUnlocking}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isUnlocking ? (
                    language === 'es' ? 'Desbloqueando...' : 'Unlocking...'
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-1" />
                      {language === 'es' ? 'Desbloquear' : 'Unlock'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}