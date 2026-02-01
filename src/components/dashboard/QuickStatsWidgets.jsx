import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  AlertCircle, 
  Briefcase, 
  FileText, 
  TrendingUp,
  Clock,
  CheckCircle2 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/components/i18n/LanguageContext";

const StatWidget = ({ icon: Icon, title, value, subtext, color = "blue", trend = null }) => (
  <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          {title}
        </p>
        <p className={`text-2xl sm:text-3xl font-bold ${
          color === 'blue' ? 'text-[#507DB4] dark:text-[#6B9DD8]' :
          color === 'green' ? 'text-emerald-600 dark:text-emerald-400' :
          color === 'red' ? 'text-red-600 dark:text-red-400' :
          color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
          'text-slate-600 dark:text-slate-400'
        }`}>
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {subtext}
          </p>
        )}
      </div>
      <div className={`p-3 rounded-lg ${
        color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 text-[#507DB4]' :
        color === 'green' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
        color === 'red' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' :
        color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' :
        'bg-slate-100 dark:bg-slate-900/20 text-slate-600'
      }`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    {trend && (
      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-1">
        <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          {trend}
        </span>
      </div>
    )}
  </Card>
);

export default function QuickStatsWidgets({ user }) {
  const { t } = useLanguage();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', user?.id],
    queryFn: () => base44.entities.Customer.list(),
    enabled: !!user?.id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', user?.id],
    queryFn: () => base44.entities.Invoice.filter({ created_by_user_id: user?.id }, '-created_date', 100),
    enabled: !!user?.id,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', user?.id],
    queryFn: () => base44.entities.Job.filter({ created_by_user_id: user?.id }, '-created_date', 100),
    enabled: !!user?.id,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes', user?.id],
    queryFn: () => base44.entities.Quote.filter({ assigned_to_user_id: user?.id }, '-created_date', 100),
    enabled: !!user?.id,
  });

  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const activeJobs = jobs.filter(j => j.status === 'active').length;
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const pendingInvoices = invoices.filter(i => ['draft', 'sent', 'partial'].includes(i.status)).length;
    const unconvertedQuotes = quotes.filter(q => q.status !== 'converted_to_invoice').length;
    const thisMonthRevenue = invoices
      .filter(i => {
        const invoiceDate = new Date(i.invoice_date);
        const now = new Date();
        return invoiceDate.getMonth() === now.getMonth() && 
               invoiceDate.getFullYear() === now.getFullYear() &&
               i.status === 'paid';
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    return {
      totalCustomers,
      activeJobs,
      totalRevenue,
      pendingInvoices,
      unconvertedQuotes,
      thisMonthRevenue,
      paidInvoicesCount: paidInvoices.length,
    };
  }, [customers, invoices, jobs, quotes]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      <StatWidget
        icon={Users}
        title={t('customers')}
        value={stats.totalCustomers}
        subtext={`${stats.totalCustomers} ${stats.totalCustomers === 1 ? 'cliente' : 'clientes'}`}
        color="blue"
      />

      <StatWidget
        icon={DollarSign}
        title={t('totalIncome')}
        value={`$${(stats.totalRevenue / 1000).toFixed(1)}k`}
        subtext={`${stats.paidInvoicesCount} facturas pagadas`}
        color="green"
        trend={`+$${(stats.thisMonthRevenue).toLocaleString('es-US')} este mes`}
      />

      <StatWidget
        icon={AlertCircle}
        title="Facturas Pendientes"
        value={stats.pendingInvoices}
        subtext={stats.pendingInvoices === 1 ? '1 factura pendiente' : `${stats.pendingInvoices} facturas pendientes`}
        color={stats.pendingInvoices > 0 ? 'amber' : 'green'}
      />

      <StatWidget
        icon={Briefcase}
        title="Jobs Activos"
        value={stats.activeJobs}
        subtext={`${stats.activeJobs} ${stats.activeJobs === 1 ? 'trabajo activo' : 'trabajos activos'}`}
        color="blue"
      />

      <StatWidget
        icon={FileText}
        title="Estimados Sin Convertir"
        value={stats.unconvertedQuotes}
        subtext={`${stats.unconvertedQuotes} estimados por convertir`}
        color="blue"
      />

      <StatWidget
        icon={CheckCircle2}
        title="Tasa de Conversión"
        value={`${quotes.length > 0 ? Math.round(((quotes.length - stats.unconvertedQuotes) / quotes.length) * 100) : 0}%`}
        subtext={`De ${quotes.length} estimados totales`}
        color="green"
      />
    </div>
  );
}