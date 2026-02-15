import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function CustomerLifetimeValue({ customers, invoices }) {
  const customerAnalytics = useMemo(() => {
    return customers.map(customer => {
      const customerInvoices = invoices.filter(inv => inv.customer_id === customer.id);
      const totalRevenue = customerInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const paidRevenue = customerInvoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total || 0), 0);
      const invoiceCount = customerInvoices.length;
      const avgInvoiceValue = invoiceCount > 0 ? totalRevenue / invoiceCount : 0;

      return {
        id: customer.id,
        name: customer.name || customer.company || customer.email,
        totalRevenue,
        paidRevenue,
        invoiceCount,
        avgInvoiceValue,
        customerSince: customer.customer_since
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [customers, invoices]);

  const topCustomers = customerAnalytics.slice(0, 10);
  const totalLTV = customerAnalytics.reduce((sum, c) => sum + c.totalRevenue, 0);
  const avgLTV = customerAnalytics.length > 0 ? totalLTV / customerAnalytics.length : 0;

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-600" />
          Customer Lifetime Value (LTV)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
            <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">Total LTV</p>
            <p className="text-2xl font-bold text-purple-600">${totalLTV.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Avg. LTV per Customer</p>
            <p className="text-2xl font-bold text-blue-600">${avgLTV.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <p className="text-xs text-green-700 dark:text-green-400 mb-1">Active Customers</p>
            <p className="text-2xl font-bold text-green-600">{customerAnalytics.length}</p>
          </div>
        </div>

        {/* Top Customers Chart */}
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Top 10 Customers by Revenue</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCustomers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="totalRevenue" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Customers Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-3 text-slate-700 dark:text-slate-300">Customer</th>
                <th className="text-right py-2 px-3 text-slate-700 dark:text-slate-300">Total Revenue</th>
                <th className="text-right py-2 px-3 text-slate-700 dark:text-slate-300">Invoices</th>
                <th className="text-right py-2 px-3 text-slate-700 dark:text-slate-300">Avg. Invoice</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map(customer => (
                <tr key={customer.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">{customer.name}</td>
                  <td className="py-3 px-3 text-right font-bold text-green-600">${customer.totalRevenue.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">{customer.invoiceCount}</td>
                  <td className="py-3 px-3 text-right text-slate-600 dark:text-slate-400">${customer.avgInvoiceValue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}