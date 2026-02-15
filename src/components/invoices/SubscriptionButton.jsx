import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, ExternalLink, CreditCard, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { useToast } from '@/components/ui/toast';

/**
 * Button to set up Stripe subscription for recurring invoices
 */
export default function SubscriptionButton({ template }) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Check if already has active subscription
  const hasSubscription = !!template.stripe_subscription_id;

  const handleSetupSubscription = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('createRecurringSubscription', { 
        recurring_invoice_id: template.id 
      });

      if (data.success && data.checkout_url) {
        // Redirect to Stripe subscription setup
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Failed to create subscription');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create subscription',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  if (hasSubscription) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
        <CheckCircle className="w-4 h-4" />
        <span>{language === 'es' ? 'Suscripción Activa' : 'Subscription Active'}</span>
      </div>
    );
  }

  if (template.status !== 'active') {
    return null;
  }

  return (
    <Button
      onClick={handleSetupSubscription}
      disabled={loading}
      size="sm"
      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {language === 'es' ? 'Procesando...' : 'Processing...'}
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Activar Pago Automático' : 'Set Up Auto-Payment'}
        </>
      )}
    </Button>
  );
}