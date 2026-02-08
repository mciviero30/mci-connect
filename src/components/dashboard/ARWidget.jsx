import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function ARWidget() {
  const { language } = useLanguage();

  const { data: unpaidInvoices = [] } = useQuery({
    queryKey: ['ar-summary'],
    queryFn: () => base44.entities.Invoice.filter({
      status: { $in: ['sent', 'overdue', 'partial'] }
    }),
    staleTime: 60000, // 1 min
  });

  const totalAR = unpaidInvoices.reduce((sum, inv) => {
    const balance = inv.balance || (inv.total - (inv.amount_paid || 0));
    return sum + balance;
  }, 0);

  const overdueInvoices = unpaidInvoices.filter(inv => {
    if (!inv.due_date) return false;
    return differenceInDays(new Date(), new Date(inv.due_date)) > 0;
  });

  const totalOverdue = overdueInvoices.reduce((sum, inv) => {
    const balance = inv.balance || (inv.total - (inv.amount_paid || 0));
    return sum + balance;
  }, 0);

  const oldestInvoice = unpaidInvoices.reduce((oldest, inv) => {
    if (!inv.due_date) return oldest;
    if (!oldest || new Date(inv.due_date) < new Date(oldest.due_date)) {
      return inv;
    }
    return oldest;
  }, null);

  const oldestAge = oldestInvoice 
    ? differenceInDays(new Date(), new Date(oldestInvoice.due_date))
    : 0;

  return (
    <Link to={createPageUrl('AgingReport')}>
      <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-700 dark:to-indigo-800 border-0 shadow-xl hover:shadow-2xl transition-all cursor-pointer">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {language === 'es' ? 'Cuentas por Cobrar' : 'Accounts Receivable'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total AR */}
          <div className="flex items-center justify-between">
            <span className="text-blue-100 text-sm">
              {language === 'es' ? 'Total AR' : 'Total AR'}
            </span>
            <span className="text-2xl font-bold text-white">
              ${totalAR.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Overdue */}
          {totalOverdue > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/20 border border-red-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-100" />
                <span className="text-red-100 text-sm">
                  {language === 'es' ? 'Vencido' : 'Overdue'}
                </span>
              </div>
              <span className="text-lg font-bold text-white">
                ${totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Oldest Invoice */}
          {oldestInvoice && oldestAge > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-200" />
                <span className="text-blue-100 text-sm">
                  {language === 'es' ? 'Más antigua' : 'Oldest'}
                </span>
              </div>
              <span className="text-white font-semibold">
                {oldestAge} {language === 'es' ? 'días' : 'days'}
              </span>
            </div>
          )}

          {/* Invoice Count */}
          <div className="flex items-center justify-between pt-2 border-t border-white/20">
            <span className="text-blue-100 text-xs">
              {language === 'es' ? 'Facturas pendientes' : 'Outstanding invoices'}
            </span>
            <span className="text-white font-semibold">
              {unpaidInvoices.length}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}