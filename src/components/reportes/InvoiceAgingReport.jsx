import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AGING_BUCKETS = [
  { label: '0–30 days', key: 'b0_30', color: '#10b981' },
  { label: '31–60 days', key: 'b31_60', color: '#f59e0b' },
  { label: '61–90 days', key: 'b61_90', color: '#f97316' },
  { label: '90+ days', key: 'b90plus', color: '#ef4444' },
];

export default function InvoiceAgingReport({ invoices = [], language = 'en' }) {
  const today = new Date();

  const { buckets, agingRows } = useMemo(() => {
    const overdueInvoices = invoices.filter(inv =>
      ['sent', 'partial', 'overdue'].includes(inv.status) &&
      inv.due_date &&
      inv.balance > 0
    );

    const buckets = { b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0 };
    const rows = [];

    overdueInvoices.forEach(inv => {
      const days = differenceInDays(today, parseISO(inv.due_date));
      const balance = inv.balance || inv.total || 0;

      let bucket = 'b0_30';
      if (days > 90) bucket = 'b90plus';
      else if (days > 60) bucket = 'b61_90';
      else if (days > 30) bucket = 'b31_60';

      buckets[bucket] += balance;
      rows.push({ ...inv, days_overdue: Math.max(0, days), bucket });
    });

    return {
      buckets,
      agingRows: rows.sort((a, b) => b.days_overdue - a.days_overdue)
    };
  }, [invoices]);

  const chartData = AGING_BUCKETS.map(b => ({
    name: b.label,
    amount: buckets[b.key],
    color: b.color,
    key: b.key
  }));

  const totalOutstanding = Object.values(buckets).reduce((a, b) => a + b, 0);

  const getBucketBadge = (bucket) => {
    const b = AGING_BUCKETS.find(x => x.key === bucket);
    const styles = {
      b0_30: 'bg-emerald-100 text-emerald-800',
      b31_60: 'bg-amber-100 text-amber-800',
      b61_90: 'bg-orange-100 text-orange-800',
      b90plus: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[bucket] || ''}>{b?.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {AGING_BUCKETS.map(b => (
          <Card key={b.key} className="border-slate-200 dark:border-slate-700 bg-white dark:bg-[#282828]">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{b.label}</p>
              <p className="text-xl font-bold" style={{ color: b.color }}>
                ${buckets[b.key].toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Outstanding Banner */}
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                {language === 'es' ? 'Total Pendiente de Cobro' : 'Total Outstanding'}
              </p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                ${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {agingRows.length} {language === 'es' ? 'facturas pendientes' : 'outstanding invoices'}
          </p>
        </CardContent>
      </Card>

      {/* Chart */}
      {totalOutstanding > 0 && (
        <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#3B9FF3]" />
              {language === 'es' ? 'Aging por Período' : 'Aging by Period'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                <XAxis dataKey="name" stroke="rgba(100,116,139,0.8)" />
                <YAxis stroke="rgba(100,116,139,0.8)" tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Detail Table */}
      {agingRows.length > 0 && (
        <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="text-slate-900 dark:text-white">
              {language === 'es' ? 'Detalle de Facturas Vencidas' : 'Overdue Invoice Detail'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left p-3 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Factura' : 'Invoice'}</th>
                    <th className="text-left p-3 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Cliente' : 'Customer'}</th>
                    <th className="text-left p-3 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Vence' : 'Due Date'}</th>
                    <th className="text-right p-3 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Días Vencida' : 'Days Overdue'}</th>
                    <th className="text-right p-3 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Balance' : 'Balance'}</th>
                    <th className="text-center p-3 text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Período' : 'Period'}</th>
                  </tr>
                </thead>
                <tbody>
                  {agingRows.map((inv, idx) => (
                    <tr key={inv.id || idx} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono text-slate-900 dark:text-white font-medium">{inv.invoice_number}</td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{inv.customer_name}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{inv.due_date}</td>
                      <td className="p-3 text-right font-bold text-red-600 dark:text-red-400">{inv.days_overdue}d</td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                        ${(inv.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">{getBucketBadge(inv.bucket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {agingRows.length === 0 && (
        <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <CheckCircle className="w-12 h-12 text-emerald-500" />
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {language === 'es' ? '¡Todo al día!' : 'All caught up!'}
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {language === 'es' ? 'No hay facturas vencidas en este período.' : 'No overdue invoices for this period.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}