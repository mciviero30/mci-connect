import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, Clock, AlertTriangle, Download, 
  TrendingUp, Calendar, User, FileText 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
// Lazy XLSX loader — keeps the 400KB chunk out of the initial bundle
const loadXLSX = () => import('xlsx').then(m => m.default || m);

export default function AgingReport() {
  const { t, language } = useLanguage();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices-aging'],
    queryFn: () => base44.entities.Invoice.filter({
      status: { $in: ['sent', 'overdue', 'partial'] }
    }),
  });

  // Categorize invoices by aging
  const agingCategories = useMemo(() => {
    const today = new Date();
    
    const categories = {
      current: [],
      days1_30: [],
      days31_60: [],
      days61_90: [],
      days90Plus: []
    };

    invoices.forEach(invoice => {
      const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
      if (!dueDate) return;

      const daysOverdue = differenceInDays(today, dueDate);
      const balance = invoice.balance || (invoice.total - (invoice.amount_paid || 0));

      const item = { ...invoice, daysOverdue, balance };

      if (daysOverdue < 0) {
        categories.current.push(item);
      } else if (daysOverdue <= 30) {
        categories.days1_30.push(item);
      } else if (daysOverdue <= 60) {
        categories.days31_60.push(item);
      } else if (daysOverdue <= 90) {
        categories.days61_90.push(item);
      } else {
        categories.days90Plus.push(item);
      }
    });

    return categories;
  }, [invoices]);

  // Calculate totals
  const totals = useMemo(() => {
    const calc = (arr) => arr.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    
    return {
      current: calc(agingCategories.current),
      days1_30: calc(agingCategories.days1_30),
      days31_60: calc(agingCategories.days31_60),
      days61_90: calc(agingCategories.days61_90),
      days90Plus: calc(agingCategories.days90Plus),
      total: calc([
        ...agingCategories.current,
        ...agingCategories.days1_30,
        ...agingCategories.days31_60,
        ...agingCategories.days61_90,
        ...agingCategories.days90Plus
      ])
    };
  }, [agingCategories]);

  const handleExport = () => {
    const data = [];
    
    Object.entries(agingCategories).forEach(([category, items]) => {
      items.forEach(inv => {
        data.push({
          'Invoice #': inv.invoice_number,
          'Customer': inv.customer_name,
          'Job': inv.job_name,
          'Invoice Date': inv.invoice_date,
          'Due Date': inv.due_date,
          'Days Overdue': inv.daysOverdue,
          'Amount': inv.total,
          'Paid': inv.amount_paid || 0,
          'Balance': inv.balance,
          'Category': category.replace('days', '').replace('Plus', '+')
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aging Report');
    XLSX.writeFile(wb, `aging_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {language === 'es' ? 'Reporte de Antigüedad (AR)' : 'Accounts Receivable Aging'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {language === 'es' ? 'Análisis de cuentas por cobrar' : 'Outstanding invoices analysis'}
            </p>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Exportar' : 'Export'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'es' ? 'Total Por Cobrar' : 'Total AR'}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    ${totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'es' ? 'Vencido' : 'Overdue'}
                  </p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    ${(totals.days1_30 + totals.days31_60 + totals.days61_90 + totals.days90Plus).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                    {language === 'es' ? 'Facturas Pendientes' : 'Outstanding Invoices'}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {invoices.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Aging Categories */}
        <div className="space-y-4">
          {/* Current */}
          <AgingCategory
            title={language === 'es' ? 'Vigentes (No Vencidas)' : 'Current (Not Due)'}
            color="green"
            invoices={agingCategories.current}
            total={totals.current}
            language={language}
          />

          {/* 1-30 Days */}
          <AgingCategory
            title={language === 'es' ? '1-30 Días Vencidos' : '1-30 Days Past Due'}
            color="yellow"
            invoices={agingCategories.days1_30}
            total={totals.days1_30}
            language={language}
          />

          {/* 31-60 Days */}
          <AgingCategory
            title={language === 'es' ? '31-60 Días Vencidos' : '31-60 Days Past Due'}
            color="orange"
            invoices={agingCategories.days31_60}
            total={totals.days31_60}
            language={language}
          />

          {/* 61-90 Days */}
          <AgingCategory
            title={language === 'es' ? '61-90 Días Vencidos' : '61-90 Days Past Due'}
            color="red"
            invoices={agingCategories.days61_90}
            total={totals.days61_90}
            language={language}
          />

          {/* 90+ Days */}
          <AgingCategory
            title={language === 'es' ? '90+ Días Vencidos (Crítico)' : '90+ Days Past Due (Critical)'}
            color="darkred"
            invoices={agingCategories.days90Plus}
            total={totals.days90Plus}
            language={language}
          />
        </div>
      </div>
    </div>
  );
}

function AgingCategory({ title, color, invoices, total, language }) {
  const colorMap = {
    green: 'from-green-500 to-emerald-600',
    yellow: 'from-yellow-500 to-amber-600',
    orange: 'from-orange-500 to-red-500',
    red: 'from-red-500 to-rose-600',
    darkred: 'from-rose-700 to-red-900'
  };

  const bgMap = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    darkred: 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-800'
  };

  if (invoices.length === 0) {
    return (
      <Card className={`${bgMap[color]} border-2`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>{title}</span>
            <Badge className={`bg-gradient-to-r ${colorMap[color]} text-white`}>
              $0.00
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
            {language === 'es' ? 'Sin facturas en esta categoría' : 'No invoices in this category'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${bgMap[color]} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{title}</span>
          <Badge className={`bg-gradient-to-r ${colorMap[color]} text-white text-base px-4 py-1`}>
            ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {invoices.map(invoice => (
            <Link 
              key={invoice.id} 
              to={createPageUrl('VerFactura') + `?id=${invoice.id}`}
              className="block"
            >
              <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {invoice.invoice_number}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {invoice.customer_name}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                    {invoice.job_name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                    </span>
                    {invoice.daysOverdue > 0 && (
                      <span className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {invoice.daysOverdue} {language === 'es' ? 'días tarde' : 'days late'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    ${invoice.balance.toFixed(2)}
                  </p>
                  {invoice.amount_paid > 0 && (
                    <p className="text-xs text-slate-500">
                      of ${invoice.total.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}