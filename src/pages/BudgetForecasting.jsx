import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import AIBudgetForecaster from "../components/budget/AIBudgetForecaster";
import DateRangeFilter from "../components/reportes/DateRangeFilter";
import { startOfMonth, endOfMonth } from "date-fns";
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
    queryFn: () => base44.entities.Expense.list('-date', 1000),
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

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const activeEmployees = employees.filter(e => 
    e.employment_status !== 'deleted' && e.employment_status !== 'archived'
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Pronóstico Presupuestario' : 'Budget Forecasting'}
          description={language === 'es' 
            ? 'Análisis predictivo y optimización de costos con IA' 
            : 'AI-powered predictive analysis and cost optimization'}
          icon={TrendingUp}
          actions={
            <DateRangeFilter 
              onDateRangeChange={setDateRange}
              defaultRange="this_month"
            />
          }
        />

        <AIBudgetForecaster
          expenses={expenses}
          jobs={jobs}
          employees={activeEmployees}
          dateRange={dateRange}
          showFullAnalysis={true}
        />
      </div>
    </div>
  );
}