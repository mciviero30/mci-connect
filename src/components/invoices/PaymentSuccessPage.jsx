import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Download, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  // Get invoice_id from URL params
  const params = new URLSearchParams(location.search);
  const invoiceId = params.get('invoice_id');
  const paymentStatus = params.get('payment');

  useEffect(() => {
    // Clear URL params after 3 seconds
    const timer = setTimeout(() => {
      const url = new URL(window.location);
      url.searchParams.delete('payment');
      url.searchParams.delete('invoice_id');
      window.history.replaceState({}, '', url);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (paymentStatus === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
              <ArrowRight className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {language === 'es' ? 'Pago Cancelado' : 'Payment Cancelled'}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {language === 'es'
                ? 'No se procesó ningún cargo. Puedes intentar de nuevo cuando estés listo.'
                : 'No charges were made. You can try again when ready.'}
            </p>
            <Button onClick={() => navigate(createPageUrl('Facturas'))} className="w-full">
              {language === 'es' ? 'Ver Facturas' : 'View Invoices'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentStatus !== 'success') {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg"
            >
              <CheckCircle2 className="w-12 h-12 text-white" />
            </motion.div>

            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {language === 'es' ? '¡Pago Exitoso!' : 'Payment Successful!'}
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {language === 'es'
                ? 'Tu pago ha sido procesado correctamente. Recibirás un recibo por email.'
                : 'Your payment has been processed successfully. You will receive a receipt via email.'}
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => navigate(createPageUrl('Facturas'))}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              >
                {language === 'es' ? 'Ver Mis Facturas' : 'View My Invoices'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              {invoiceId && (
                <Button
                  onClick={() => navigate(createPageUrl('VerFactura') + `?id=${invoiceId}`)}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Descargar Recibo' : 'Download Receipt'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}