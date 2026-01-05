import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, CheckCircle, Download, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { AGREEMENTS, getRequiredAgreements } from '@/components/core/agreementsConfig';
import ReactMarkdown from 'react-markdown';

/**
 * Agreement Gate - REFACTORED FOR ZERO RE-RENDER LOOPS
 * Single source of truth: React Query cache
 * No sessionStorage, no complex state - just cache + optimistic updates
 */
export default function AgreementGate({ children }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  
  // Form state only - NOT gate control
  const [currentStep, setCurrentStep] = useState(0);
  const [hasRead, setHasRead] = useState(false);
  const [signatureName, setSignatureName] = useState('');

  // Read user from cache (stable)
  const user = queryClient.getQueryData(['currentUser']);
  const userEmail = user?.email;
  const userId = user?.id;
  const userFullName = user?.full_name;
  const userPosition = user?.position;
  
  // Fetch signatures - simple, no complex enabled logic
  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ['agreementSignatures', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return await base44.entities.AgreementSignature.filter({ employee_email: userEmail });
    },
    enabled: !!userEmail,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Sign mutation - MUST be declared before any returns
  const signMutation = useMutation({
    mutationFn: async (agreementData) => {
      // PREVENT DUPLICATES: Check if already signed
      const existing = await base44.entities.AgreementSignature.filter({
        employee_email: userEmail,
        agreement_type: agreementData.type,
        version: agreementData.version,
        accepted: true
      });

      if (existing && existing.length > 0) {
        if (import.meta.env.DEV) {
          console.log('⚠️ Agreement already signed, skipping duplicate');
        }
        // Return existing signature instead of creating duplicate
        return existing[0];
      }

      const metadata = {
        user_agent: navigator.userAgent,
        device: /Mobile/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        app_version: 'v1.0',
      };

      // Create signature with explicit field mapping
      const signatureData = {
        user_id: userId,
        employee_email: userEmail,
        employee_name: userFullName,
        employee_position: userPosition,
        agreement_type: agreementData.type,
        version: agreementData.version,
        accepted: true,
        accepted_at: new Date().toISOString(),
        signature_name: signatureName,
        metadata,
      };

      // Log for debugging (DEV only)
      if (import.meta.env.DEV) {
        console.log('🔐 Signing agreement:', {
          type: agreementData.type,
          version: agreementData.version,
          email: userEmail
        });
      }

      const result = await base44.entities.AgreementSignature.create(signatureData);

      // Verify signature was created
      if (!result?.id) {
        throw new Error('Signature creation failed - no ID returned');
      }

      if (import.meta.env.DEV) {
        console.log('✅ Signature created:', result.id);
      }

      return result;
    },
    onSuccess: async (data, agreementData) => {
      // Update cache IMMEDIATELY with new signature
      queryClient.setQueryData(['agreementSignatures', userEmail], (old = []) => [
        ...old,
        {
          id: data.id,
          employee_email: userEmail,
          agreement_type: agreementData.type,
          version: agreementData.version,
          accepted: true,
        }
      ]);

      // Move to next agreement or unlock session
      if (currentStep < unsignedAgreements.length - 1) {
        setCurrentStep(currentStep + 1);
        setHasRead(false);
        setSignatureName('');
        setIsSigningInProgress(false);
      } else {
        // CRITICAL: Update BOTH sessionStorage AND state to prevent query re-execution
        sessionStorage.setItem(SESSION_KEY, 'true');
        setGateUnlocked(true); // This stops the query from running again
        setIsSigningInProgress(false);
      }
    },
    onError: (error) => {
      // Log error for debugging
      console.error('❌ Signature save failed:', error);
      
      // Reset signing flag on error
      setIsSigningInProgress(false);
      
      // Error already displayed in UI via signMutation.isError
    },
  });

  // REMOVED: useEffect loops causing issues
  // Gate unlock happens ONCE in onSuccess, not in effects

  // Handler functions (not hooks)
  const handleSign = () => {
    if (!hasRead || !signatureName.trim()) return;
    setIsSigningInProgress(true);
    signMutation.mutate(currentAgreement);
  };

  const handlePrint = () => {
    window.print();
  };

  // ⚡ INSTANT PASSTHROUGH: Check session unlock BEFORE everything
  if (gateUnlocked) {
    return children;
  }

  // Defensive: ensure user exists
  if (!userEmail) {
    return children;
  }

  // NEVER show loading if gate is unlocked
  if (signaturesLoading && !gateUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Determine which agreements apply (based on role/position)
  const requiredAgreements = getRequiredAgreements(user) || [];

  // Check signatures query for signed state
  const unsignedAgreements = requiredAgreements.filter(agreement => {
    return !signatures.some(sig => 
      sig?.agreement_type === agreement?.type && 
      sig?.version === agreement?.version &&
      sig?.accepted === true
    );
  });

  // If no unsigned agreements, unlock ONCE and allow access
  if (unsignedAgreements.length === 0) {
    // Write to session but DON'T call setState - avoid re-render
    sessionStorage.setItem(SESSION_KEY, 'true');
    return children;
  }

  const currentAgreement = unsignedAgreements[currentStep];

  // Safety: no agreement to show
  if (!currentAgreement) {
    return children;
  }

  // Block access - render agreement modal
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-4xl"
        >
          <Card className="shadow-2xl border-2 border-blue-200 dark:border-slate-700">
            <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-xl">
                      {currentAgreement?.title?.[language] || 'Agreement'}
                    </CardTitle>
                    {unsignedAgreements.length > 1 && (
                      <p className="text-sm text-blue-100 mt-1">
                        {language === 'es' ? 'Paso' : 'Step'} {currentStep + 1} {language === 'es' ? 'de' : 'of'} {unsignedAgreements.length}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="text-blue-700 bg-white hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Imprimir' : 'Print'}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Agreement Content */}
              <div className="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto">
                <ReactMarkdown>
                  {currentAgreement?.body?.[language] || ''}
                </ReactMarkdown>
              </div>

              {/* Read Confirmation */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Checkbox
                  id="read-confirm"
                  checked={hasRead}
                  onCheckedChange={setHasRead}
                  className="mt-1"
                />
                <Label htmlFor="read-confirm" className="text-sm cursor-pointer">
                  {language === 'es' 
                    ? 'He leído y comprendo completamente este acuerdo de compensación variable y acepto sus términos y condiciones.'
                    : 'I have read and fully understand this variable compensation agreement and accept its terms and conditions.'}
                </Label>
              </div>

              {/* Signature Field */}
              {hasRead && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  <Label htmlFor="signature" className="text-base font-semibold">
                    {language === 'es' ? 'Firma (Nombre Completo)' : 'Signature (Full Name)'}
                  </Label>
                  <Input
                    id="signature"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder={userFullName || (language === 'es' ? 'Tu nombre completo' : 'Your full name')}
                    className="text-lg font-semibold h-12"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500">
                    {language === 'es' 
                      ? 'Al escribir tu nombre, certificas que has leído y aceptas este acuerdo.'
                      : 'By typing your name, you certify that you have read and accept this agreement.'}
                  </p>
                </motion.div>
              )}

              {/* Error Alert */}
              {signMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {language === 'es' 
                      ? 'Error al guardar la firma. Por favor intenta de nuevo.'
                      : 'Error saving signature. Please try again.'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>

            <CardFooter className="border-t bg-slate-50 dark:bg-slate-800/50 justify-end gap-3">
              <Button
                onClick={handleSign}
                disabled={!hasRead || !signatureName.trim() || signMutation.isPending}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-w-[200px]"
              >
                {signMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'es' ? 'Firmando...' : 'Signing...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {language === 'es' ? 'Firmar y Continuar' : 'Sign & Continue'}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Progress Indicator */}
          {unsignedAgreements.length > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              {unsignedAgreements.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep 
                      ? 'w-8 bg-blue-600' 
                      : index < currentStep 
                      ? 'w-2 bg-green-500' 
                      : 'w-2 bg-slate-300'
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}