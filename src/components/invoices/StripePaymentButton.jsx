import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { createPaymentCheckout } from '@/functions/createPaymentCheckout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function StripePaymentButton({ invoice }) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if in iframe (preview mode)
  const isInIframe = window.self !== window.top;

  const handlePayment = async () => {
    if (isInIframe) {
      alert(
        language === 'es'
          ? '⚠️ Los pagos solo funcionan en la aplicación publicada, no en preview mode. Por favor accede desde tu app publicada.'
          : '⚠️ Payments only work in the published app, not in preview mode. Please access from your published app.'
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await createPaymentCheckout({ invoice_id: invoice.id });

      if (data.success && data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  // Don't show if already paid
  if (invoice.status === 'paid') {
    return null;
  }

  // Only show for sent, overdue, or partial invoices
  if (!['sent', 'overdue', 'partial'].includes(invoice.status)) {
    return null;
  }

  const amountDue = invoice.balance || (invoice.total - (invoice.amount_paid || 0));

  if (amountDue <= 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {isInIframe && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertDescription className="text-amber-900 text-sm">
            {language === 'es' 
              ? '⚠️ Los pagos online solo funcionan en la app publicada'
              : '⚠️ Online payments only work in the published app'}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-300">
          <AlertDescription className="text-red-900 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handlePayment}
        disabled={loading || isInIframe}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg h-12"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {language === 'es' ? 'Procesando...' : 'Processing...'}
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            {language === 'es' ? 'Pagar Ahora' : 'Pay Now'} - ${amountDue.toFixed(2)}
            <ExternalLink className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>

      <p className="text-xs text-center text-slate-500">
        {language === 'es'
          ? 'Procesamiento seguro vía Stripe'
          : 'Secure payment processing via Stripe'}
      </p>
    </div>
  );
}