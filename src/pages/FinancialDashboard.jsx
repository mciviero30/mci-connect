import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/shared/PageHeader";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Line, Bar } from 'recharts';
import { LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function FinancialDashboard() {
  const { t, language } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');

  // Fetch all financial data
  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: []
  });

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: []
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    initialData: []
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    initialData: []
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // 1. BUDGET VS ACTUAL POR JOB
  const jobBudgetAnalysis = useMemo(() => {
    return jobs.filter(j => j.status === 'active').map(job => {
      const jobExpenses = expenses.filter(e => e.job_id === job.id);
      const jobTimeEntries = timeEntries.filter(t => t.job_id === job.id);
      
      const actualExpenses = jobExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const laborCost = jobTimeEntries.reduce((sum, t) => {
        const emp = employees.find(e => e.email === t.employee_email);
        const rate = emp?.hourly_rate || 25;
        return sum + ((t.hours_worked || 0) * rate);
      }, 0);
      
      const totalActual = actualExpenses + laborCost;
      const budget = job.contract_amount || 0;
      const variance = budget - totalActual;
      const variancePercent = budget > 0 ? ((variance / budget) * 100) : 0;
      
      return {
        id: job.id,
        name: job.name,
        budget,
        actual: totalActual,
        variance,
        variancePercent,
        status: variance >= 0 ? 'on-budget' : 'over-budget'
      };
    }).sort((a, b) => a.variance - b.variance);
  }, [jobs, expenses, timeEntries, employees]);

  // 2. CASH FLOW FORECAST (próximos 90 días)
  const cashFlowForecast = useMemo(() => {
    const today = new Date();
    const forecast = [];
    
    for (let i = 0; i < 12; i++) {
      const date = addMonths(today, i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      // Ingresos proyectados
      const monthInvoices = invoices.filter(inv => {
        const dueDate = new Date(inv.due_date);
        return dueDate >= monthStart && dueDate <= monthEnd && inv.status !== 'cancelled';
      });
      
      const projectedIncome = monthInvoices.reduce((sum, inv) => sum + (inv.balance || inv.total || 0), 0);
      
      // Gastos proyectados (promedio histórico)
      const monthExpenses = expenses.filter(e => {
        const expDate = new Date(e.date);
        return expDate >= monthStart && expDate <= monthEnd;
      });
      
      const avgExpenses = monthExpenses.length > 0 
        ? monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        : 0;
      
      forecast.push({
        month: format(date, 'MMM yyyy', { locale: language === 'es' ? es : undefined }),
        income: projectedIncome,
        expenses: avgExpenses,
        netCashFlow: projectedIncome - avgExpenses
      });
    }
    
    return forecast;
  }, [invoices, expenses, language]);

  // 3. PROFIT MARGIN TRACKER
  const profitMarginData = useMemo(() => {
    const last6Months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.invoice_date);
        return invDate >= monthStart && invDate <= monthEnd;
      });
      
      const monthExpenses = expenses.filter(e => {
        const expDate = new Date(e.date);
        return expDate >= monthStart && expDate <= monthEnd;
      });
      
      const revenue = monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      const costs = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const profit = revenue - costs;
      const margin = revenue > 0 ? ((profit / revenue) * 100) : 0;
      
      last6Months.push({
        month: format(date, 'MMM', { locale: language === 'es' ? es : undefined }),
        revenue,
        costs,
        profit,
        margin
      });
    }
    
    return last6Months;
  }, [invoices, expenses, language]);

  // 4. INVOICES OVERDUE (para auto-reminders)
  const overdueInvoices = useMemo(() => {
    const today = new Date();
    return invoices.filter(inv => {
      if (inv.status === 'paid' || inv.status === 'cancelled') return false;
      if (!inv.due_date) return false;
      
      const dueDate = new Date(inv.due_date);
      const daysOverdue = differenceInDays(today, dueDate);
      
      return daysOverdue > 0;
    }).map(inv => ({
      ...inv,
      daysOverdue: differenceInDays(today, new Date(inv.due_date))
    })).sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [invoices]);

  // 5. LATE PAYMENT PENALTIES CALCULATION
  const latePaymentPenalties = useMemo(() => {
    const penaltyRate = 0.015; // 1.5% per month
    let totalPenalties = 0;
    
    const invoicesWithPenalties = overdueInvoices.map(inv => {
      const monthsOverdue = Math.floor(inv.daysOverdue / 30);
      const penalty = (inv.balance || inv.total) * penaltyRate * monthsOverdue;
      totalPenalties += penalty;
      
      return {
        ...inv,
        penalty
      };
    });
    
    return { total: totalPenalties, invoices: invoicesWithPenalties };
  }, [overdueInvoices]);

  // 6. P&L STATEMENT
  const plStatement = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    // Revenue
    const monthInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.invoice_date);
      return invDate >= monthStart && invDate <= monthEnd;
    });
    
    const totalRevenue = monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    // Expenses by category
    const monthExpenses = expenses.filter(e => {
      const expDate = new Date(e.date);
      return expDate >= monthStart && expDate <= monthEnd;
    });
    
    const expensesByCategory = monthExpenses.reduce((acc, exp) => {
      const cat = exp.category || 'other';
      acc[cat] = (acc[cat] || 0) + (exp.amount || 0);
      return acc;
    }, {});
    
    const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
    const netIncome = totalRevenue - totalExpenses;
    const netMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100) : 0;
    
    return {
      revenue: totalRevenue,
      expenses: expensesByCategory,
      totalExpenses,
      netIncome,
      netMargin
    };
  }, [invoices, expenses]);

  // 7. EXPENSE FORECASTING
  const expenseForecast = useMemo(() => {
    // Calculate average expenses per category for last 3 months
    const today = new Date();
    const last3Months = expenses.filter(e => {
      const expDate = new Date(e.date);
      const monthsAgo = differenceInDays(today, expDate) / 30;
      return monthsAgo <= 3;
    });
    
    const avgByCategory = last3Months.reduce((acc, exp) => {
      const cat = exp.category || 'other';
      if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
      acc[cat].total += exp.amount || 0;
      acc[cat].count += 1;
      return acc;
    }, {});
    
    const nextMonthForecast = Object.entries(avgByCategory).map(([category, data]) => ({
      category,
      avgAmount: data.total / 3, // Average per month
      projected: data.total / 3, // Simple projection
      confidence: data.count > 10 ? 'high' : data.count > 5 ? 'medium' : 'low'
    }));
    
    return nextMonthForecast;
  }, [expenses]);

  const totalBudgetVariance = jobBudgetAnalysis.reduce((sum, job) => sum + job.variance, 0);
  const jobsOverBudget = jobBudgetAnalysis.filter(j => j.variance < 0).length;
  const avgProfitMargin = profitMarginData.length > 0 
    ? profitMarginData.reduce((sum, m) => sum + m.margin, 0) / profitMarginData.length 
    : 0;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? "Dashboard Financiero" : "Financial Dashboard"}
          description={language === 'es' ? "Análisis completo de finanzas y rentabilidad" : "Complete financial and profitability analysis"}
          icon={DollarSign}
        />

        {/* KEY METRICS */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-100 text-sm font-medium">
                  {language === 'es' ? 'Margen Promedio' : 'Avg Profit Margin'}
                </p>
                <TrendingUp className="w-5 h-5 text-green-100" />
              </div>
              <p className="text-3xl font-bold">{avgProfitMargin.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className={`shadow-lg border-0 ${totalBudgetVariance >= 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-red-500 to-red-600'} text-white`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/90 text-sm font-medium">
                  {language === 'es' ? 'Varianza Total' : 'Total Variance'}
                </p>
                {totalBudgetVariance >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              </div>
              <p className="text-3xl font-bold">
                ${Math.abs(totalBudgetVariance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-amber-100 text-sm font-medium">
                  {language === 'es' ? 'Facturas Vencidas' : 'Overdue Invoices'}
                </p>
                <AlertTriangle className="w-5 h-5 text-amber-100" />
              </div>
              <p className="text-3xl font-bold">{overdueInvoices.length}</p>
              <p className="text-amber-100 text-xs mt-1">
                ${overdueInvoices.reduce((sum, inv) => sum + (inv.balance || inv.total || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-sm font-medium">
                  {language === 'es' ? 'Penalidades' : 'Late Penalties'}
                </p>
                <DollarSign className="w-5 h-5 text-purple-100" />
              </div>
              <p className="text-3xl font-bold">
                ${latePaymentPenalties.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CASH FLOW FORECAST */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              {language === 'es' ? 'Pronóstico de Flujo de Caja (12 meses)' : 'Cash Flow Forecast (12 months)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlowForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name={language === 'es' ? 'Ingresos' : 'Income'}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name={language === 'es' ? 'Gastos' : 'Expenses'}
                />
                <Line 
                  type="monotone" 
                  dataKey="netCashFlow" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name={language === 'es' ? 'Flujo Neto' : 'Net Cash Flow'}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* PROFIT MARGIN TREND */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              {language === 'es' ? 'Tendencia de Margen de Ganancia' : 'Profit Margin Trend'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitMarginData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name.includes('Margin') || name.includes('Margen')) {
                      return `${value.toFixed(1)}%`;
                    }
                    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                  }}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="revenue" 
                  fill="#22c55e" 
                  name={language === 'es' ? 'Ingresos' : 'Revenue'}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="costs" 
                  fill="#ef4444" 
                  name={language === 'es' ? 'Costos' : 'Costs'}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="margin" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name={language === 'es' ? 'Margen %' : 'Margin %'}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* BUDGET VS ACTUAL */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>
              {language === 'es' ? 'Budget vs Real por Proyecto' : 'Budget vs Actual by Project'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobBudgetAnalysis.slice(0, 10).map(job => (
                <div key={job.id} className="border-b border-slate-200 pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">{job.name}</h4>
                      <div className="flex gap-4 text-sm text-slate-600 mt-1">
                        <span>Budget: ${job.budget.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        <span>Real: ${job.actual.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${job.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {job.variance >= 0 ? '+' : ''}${job.variance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-sm ${job.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {job.variancePercent >= 0 ? '+' : ''}{job.variancePercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${job.variance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min((job.actual / job.budget) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* P&L STATEMENT */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>
              {language === 'es' ? 'Estado de Pérdidas y Ganancias (Este Mes)' : 'Profit & Loss Statement (This Month)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">{language === 'es' ? 'Ingresos Totales' : 'Total Revenue'}</span>
                  <span className="font-bold text-green-600 text-lg">
                    ${plStatement.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="font-semibold text-slate-700">{language === 'es' ? 'Gastos por Categoría' : 'Expenses by Category'}</p>
                {Object.entries(plStatement.expenses).map(([category, amount]) => (
                  <div key={category} className="flex justify-between items-center pl-4">
                    <span className="text-slate-600 capitalize">{category.replace('_', ' ')}</span>
                    <span className="text-red-600">
                      -${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">{language === 'es' ? 'Total Gastos' : 'Total Expenses'}</span>
                  <span className="font-bold text-red-600 text-lg">
                    ${plStatement.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="border-t-2 border-slate-300 pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-lg">{language === 'es' ? 'Ingreso Neto' : 'Net Income'}</span>
                  <div className="text-right">
                    <p className={`font-bold text-xl ${plStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${plStatement.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-600">
                      {language === 'es' ? 'Margen' : 'Margin'}: {plStatement.netMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OVERDUE INVOICES ALERTS */}
        {overdueInvoices.length > 0 && (
          <Card className="mb-8 bg-red-50 border-red-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                {language === 'es' ? 'Facturas Vencidas - Acción Requerida' : 'Overdue Invoices - Action Required'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overdueInvoices.slice(0, 5).map(inv => (
                  <div key={inv.id} className="bg-white rounded-lg p-4 border border-red-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-900">{inv.customer_name}</p>
                        <p className="text-sm text-slate-600">{inv.invoice_number}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">${(inv.balance || inv.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-red-700 font-semibold">{inv.daysOverdue} {language === 'es' ? 'días vencido' : 'days overdue'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* EXPENSE FORECAST */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle>
              {language === 'es' ? 'Pronóstico de Gastos (Próximo Mes)' : 'Expense Forecast (Next Month)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenseForecast.map(forecast => (
                <div key={forecast.category} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 capitalize">{forecast.category.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-600">
                      {language === 'es' ? 'Confianza' : 'Confidence'}: 
                      <span className={`ml-1 font-semibold ${
                        forecast.confidence === 'high' ? 'text-green-600' : 
                        forecast.confidence === 'medium' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {forecast.confidence}
                      </span>
                    </p>
                  </div>
                  <p className="font-bold text-lg text-slate-900">
                    ${forecast.projected.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
              <div className="border-t-2 border-slate-300 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{language === 'es' ? 'Total Proyectado' : 'Total Projected'}</span>
                  <span className="font-bold text-xl text-slate-900">
                    ${expenseForecast.reduce((sum, f) => sum + f.projected, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}