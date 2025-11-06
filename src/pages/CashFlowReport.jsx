import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/shared/PageHeader';
import DateRangeFilter from '@/components/reportes/DateRangeFilter';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3B9FF3', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export default function CashFlowReport() {
  const { language } = useLanguage();
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
    preset: 'this_month'
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: []
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    initialData: []
  });

  const { data: items = [] } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list(),
    initialData: []
  });

  // Filter data by date range
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (inv.status !== 'paid') return false;
      const invDate = new Date(inv.payment_date || inv.invoice_date);
      return invDate >= dateRange.start && invDate <= dateRange.end;
    });
  }, [invoices, dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (exp.status !== 'approved') return false;
      const expDate = new Date(exp.date);
      return expDate >= dateRange.start && expDate <= dateRange.end;
    });
  }, [expenses, dateRange]);

  // Calculate Revenue by Account Category
  const revenueByCategory = useMemo(() => {
    const categories = {};
    
    filteredInvoices.forEach(invoice => {
      invoice.items?.forEach(item => {
        const category = item.account_category || 'revenue_other';
        categories[category] = (categories[category] || 0) + (item.total || 0);
      });
    });

    return Object.entries(categories).map(([category, amount]) => ({
      category: category.replace(/_/g, ' ').toUpperCase(),
      amount,
      type: 'revenue'
    }));
  }, [filteredInvoices]);

  // Calculate Expenses by Account Category
  const expensesByCategory = useMemo(() => {
    const categories = {};
    
    filteredExpenses.forEach(expense => {
      const category = expense.account_category || 'expense_other';
      categories[category] = (categories[category] || 0) + expense.amount;
    });

    return Object.entries(categories).map(([category, amount]) => ({
      category: category.replace(/_/g, ' ').toUpperCase(),
      amount,
      type: 'expense'
    }));
  }, [filteredExpenses]);

  // Totals
  const totalRevenue = revenueByCategory.reduce((sum, cat) => sum + cat.amount, 0);
  const totalExpenses = expensesByCategory.reduce((sum, cat) => sum + cat.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  // Chart data
  const revenueChartData = revenueByCategory.map(cat => ({
    name: cat.category,
    value: cat.amount
  }));

  const expenseChartData = expensesByCategory.map(cat => ({
    name: cat.category,
    value: cat.amount
  }));

  const comparisonData = [
    { name: language === 'es' ? 'Ingresos' : 'Revenue', amount: totalRevenue },
    { name: language === 'es' ? 'Gastos' : 'Expenses', amount: totalExpenses },
    { name: language === 'es' ? 'Ganancia Neta' : 'Net Income', amount: netIncome }
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Reporte de Flujo de Efectivo' : 'Cash Flow Report'}
          description={language === 'es' ? 'Ingresos vs. Gastos agrupados por categoría contable' : 'Revenue vs. Expenses grouped by account category'}
          icon={DollarSign}
        />

        <div className="mb-8">
          <DateRangeFilter onDateRangeChange={setDateRange} defaultRange="this_month" />
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-emerald-600" />
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                  {language === 'es' ? 'Ingresos' : 'Revenue'}
                </Badge>
              </div>
              <p className="text-4xl font-bold text-emerald-900">
                ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-emerald-700 mt-2">
                {filteredInvoices.length} {language === 'es' ? 'facturas pagadas' : 'paid invoices'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-red-600" />
                <Badge className="bg-red-100 text-red-700 border-red-300">
                  {language === 'es' ? 'Gastos' : 'Expenses'}
                </Badge>
              </div>
              <p className="text-4xl font-bold text-red-900">
                ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-red-700 mt-2">
                {filteredExpenses.length} {language === 'es' ? 'gastos aprobados' : 'approved expenses'}
              </p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${netIncome >= 0 ? 'from-cyan-50 to-blue-50 border-cyan-200' : 'from-orange-50 to-red-50 border-orange-200'} shadow-xl`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Wallet className={`w-8 h-8 ${netIncome >= 0 ? 'text-cyan-600' : 'text-orange-600'}`} />
                <Badge className={`${netIncome >= 0 ? 'bg-cyan-100 text-cyan-700 border-cyan-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>
                  {language === 'es' ? 'Ganancia Neta' : 'Net Income'}
                </Badge>
              </div>
              <p className={`text-4xl font-bold ${netIncome >= 0 ? 'text-cyan-900' : 'text-orange-900'}`}>
                ${netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-sm ${netIncome >= 0 ? 'text-cyan-700' : 'text-orange-700'} mt-2`}>
                {netIncome >= 0 
                  ? (language === 'es' ? '✓ Positivo' : '✓ Positive')
                  : (language === 'es' ? '⚠ Negativo' : '⚠ Negative')
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Breakdown */}
          <Card className="bg-white shadow-xl border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900">
                {language === 'es' ? 'Ingresos por Categoría' : 'Revenue by Category'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card className="bg-white shadow-xl border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900">
                {language === 'es' ? 'Gastos por Categoría' : 'Expenses by Category'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Bar Chart */}
        <Card className="bg-white shadow-xl border-slate-200 mb-8">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-slate-900">
              {language === 'es' ? 'Comparación General' : 'Overall Comparison'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Bar dataKey="amount" fill="#3B9FF3" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Tables */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Details */}
          <Card className="bg-white shadow-xl border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                {language === 'es' ? 'Detalles de Ingresos' : 'Revenue Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-slate-700">{language === 'es' ? 'Categoría' : 'Category'}</TableHead>
                    <TableHead className="text-right text-slate-700">{language === 'es' ? 'Monto' : 'Amount'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueByCategory.map((cat, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900">{cat.category}</TableCell>
                      <TableCell className="text-right font-bold text-emerald-600">
                        ${cat.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-emerald-50 font-bold">
                    <TableCell className="text-slate-900">{language === 'es' ? 'Total' : 'Total'}</TableCell>
                    <TableCell className="text-right text-emerald-900">
                      ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Expense Details */}
          <Card className="bg-white shadow-xl border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <TrendingDown className="w-5 h-5 text-red-600" />
                {language === 'es' ? 'Detalles de Gastos' : 'Expense Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-slate-700">{language === 'es' ? 'Categoría' : 'Category'}</TableHead>
                    <TableHead className="text-right text-slate-700">{language === 'es' ? 'Monto' : 'Amount'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesByCategory.map((cat, idx) => (
                    <TableRow key={idx} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900">{cat.category}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        ${cat.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-red-50 font-bold">
                    <TableCell className="text-slate-900">{language === 'es' ? 'Total' : 'Total'}</TableCell>
                    <TableCell className="text-right text-red-900">
                      ${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}