import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_QUERY_KEY, AGREEMENT_SIGNATURES_QUERY_KEY } from '@/components/constants/queryKeys';
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
  const user = queryClient.getQueryData(CURRENT_USER_QUERY_KEY);
  const userEmail = user?.email;
  const userId = user?.id;
  const userFullName = user?.full_name;
  const userPosition = user?.position;

  // CRITICAL: Check for Field route - skip gate for Field (sandboxed)
  const isFieldRoute = typeof window !== 'undefined' && window.location.pathname.includes('/Field');
  
  // Fetch signatures - simple, no complex enabled logic
  const { data: signatures = [], isLoading } = useQuery({
    queryKey: AGREEMENT_SIGNATURES_QUERY_KEY(userEmail),
    queryFn: async () => {
      if (!userEmail) return [];
      return await base44.entities.AgreementSignature.filter({ employee_email: userEmail });
    },
    enabled: !!userEmail,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Sign mutation - optimistic updates, no complex state
  const signMutation = useMutation({
    mutationFn: async (agreementData) => {
      // Check for duplicates
      const existing = await base44.entities.AgreementSignature.filter({
        employee_email: userEmail,
        agreement_type: agreementData.type,
        version: agreementData.version,
        accepted: true
      });

      if (existing?.length > 0) {
        return existing[0]; // Return existing
      }

      // Create new signature
      return await base44.entities.AgreementSignature.create({
        user_id: userId,
        employee_email: userEmail,
        employee_name: userFullName,
        employee_position: userPosition,
        agreement_type: agreementData.type,
        version: agreementData.version,
        accepted: true,
        accepted_at: new Date().toISOString(),
        signature_name: signatureName,
        metadata: {
          user_agent: navigator.userAgent,
          device: /Mobile/.test(navigator.userAgent) ? 'mobile' : 'desktop',
          app_version: 'v1.0',
        },
      });
    },
    onSuccess: (data, agreementData) => {
      // ATOMIC: Update cache optimistically
      queryClient.setQueryData(AGREEMENT_SIGNATURES_QUERY_KEY(userEmail), (old = []) => {
        const newSig = {
          id: data.id,
          employee_email: userEmail,
          agreement_type: agreementData.type,
          version: agreementData.version,
          accepted: true,
        };
        return [...old, newSig];
      });

      // Move to next or reset form
      if (currentStep < unsignedAgreements.length - 1) {
        setCurrentStep(prev => prev + 1);
        setHasRead(false);
        setSignatureName('');
      } else {
        // All done - reset form (component will naturally pass through on next render)
        setHasRead(false);
        setSignatureName('');
      }
    },
  });

  // Handlers
  const handleSign = () => {
    if (!hasRead || !signatureName.trim() || signMutation.isPending) return;
    signMutation.mutate(currentAgreement);
  };

  const handlePrint = () => window.print();

  // CRITICAL: Field routes are sandboxed - skip all gate logic
  if (isFieldRoute) {
    return children;
  }

  // Defensive checks - NEVER block on loading
  if (!userEmail || isLoading) return children;

  // Calculate unsigned agreements
  const requiredAgreements = getRequiredAgreements(user) || [];
  const unsignedAgreements = requiredAgreements.filter(agreement => {
    return !signatures?.some(sig => 
      sig?.agreement_type === agreement?.type && 
      sig?.version === agreement?.version &&
      sig?.accepted === true
    );
  });

  // If all signed, pass through immediately
  if (unsignedAgreements.length === 0) {
    return children;
  }

  // Get current agreement to sign
  const currentAgreement = unsignedAgreements[currentStep];
  if (!currentAgreement) return children;

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