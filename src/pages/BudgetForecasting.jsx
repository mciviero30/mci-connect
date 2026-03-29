import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, AlertTriangle, Users, Briefcase, ArrowUp, ArrowDown } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import DateRangeFilter from "../components/reportes/DateRangeFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { useLanguage } from "../components/i18n/LanguageContext";

export default function BudgetForecasting() {
  const { t, language } = useLanguage();
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
    preset: 'this_month'
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 500),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 500),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotesForBudget'],
    queryFn: () => base44.entities.Quote.list('-created_date', 500),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const stats = useMemo(() => {
    const inRange = (dateStr) => {
      if (!dateStr) return false;
      try {
        return isWithinInterval(parseISO(dateStr), { start: dateRange.start, end: dateRange.end });
      } catch { return false; }
    };

    const periodExpenses = expenses.filter(e => inRange(e.date));
    const totalExpenses = periodExpenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

    const periodJobs = jobs.filter(j => inRange(j.created_date));
    const activeJobs = jobs.filter(j => j.status === 'active' || j.status === 'in_progress');

    const acceptedQuotes = quotes.filter(q => q.status === 'accepted' && inRange(q.created_date));
    const totalRevenue = acceptedQuotes.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);

    const pendingQuotes = quotes.filter(q => q.status === 'pending' || q.status === 'sent');
    const pendingRevenue = pendingQuotes.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);

    const margin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    const expByCategory = {};
    periodExpenses.forEach(e => {
      const cat = e.category || 'Other';
      expByCategory[cat] = (expByCategory[cat] || 0) + (parseFloat(e.amount) || 0);
    });

    return {
      totalExpenses, totalRevenue, margin, activeJobs: activeJobs.length,
      newJobs: periodJobs.length, pendingRevenue, expByCategory
    };
  }, [expenses, jobs, quotes, dateRange]);

  const kpis = [
    {
      label: language === 'es' ? 'Ingresos del período' : 'Period Revenue',
      value: `$${stats.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      label: language === 'es' ? 'Gastos del período' : 'Period Expenses',
      value: `$${stats.totalExpenses.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20'
    },
    {
      label: language === 'es' ? 'Margen neto' : 'Net Margin',
      value: `${stats.margin.toFixed(1)}%`,
      icon: stats.margin >= 0 ? ArrowUp : ArrowDown,
      color: stats.margin >= 0 ? 'text-blue-600' : 'text-red-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      label: language === 'es' ? 'Pipeline pendiente' : 'Pending Pipeline',
      value: `$${stats.pendingRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      label: language === 'es' ? 'Trabajos activos' : 'Active Jobs',
      value: stats.activeJobs,
      icon: Briefcase, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20'
    },
  ];

  const topCategories = Object.entries(stats.expByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Pronóstico Presupuestario' : 'Budget Forecasting'}
          description={language === 'es'
            ? 'Resumen financiero del período seleccionado'
            : 'Financial summary for the selected period'}
          icon={TrendingUp}
          actions={
            <DateRangeFilter
              onDateRangeChange={setDateRange}
              defaultRange="this_month"
            />
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${kpi.bg}`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{kpi.value}</p>
                <p className="text-xs text-slate-500 mt-1">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {topCategories.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                {language === 'es' ? 'Gastos por categoría' : 'Expenses by Category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCategories.map(([cat, amount]) => {
                  const pct = stats.totalExpenses > 0 ? (amount / stats.totalExpenses) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                        <span className="font-medium">${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
