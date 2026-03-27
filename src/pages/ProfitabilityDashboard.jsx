import React, { useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/i18n/LanguageContext';
import CommissionAccessGuard from '@/components/commission/CommissionAccessGuard';
import PageHeader from '@/components/shared/PageHeader';
import ProfitabilityKPIs from '@/components/profitability/ProfitabilityKPIs';
import JobProfitabilityTable from '@/components/profitability/JobProfitabilityTable';
import ProfitMarginChart from '@/components/profitability/ProfitMarginChart';
import ClientProfitChart from '@/components/profitability/ClientProfitChart';
import MarginSimulator from '@/components/profitability/MarginSimulator';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hasFullAccess } from '@/components/core/roleRules';

export default function ProfitabilityDashboard() {
  const { language } = useLanguage();
  const [dateRange, setDateRange] = useState('all'); // all, ytd, q4, q3, q2, q1
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulatedData, setSimulatedData] = useState(null);

  // Fetch all required data (read-only)
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['profitability-invoices'],
    queryFn: () => base44.entities.Invoice.filter({ deleted_at: null }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['profitability-expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date', 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: timeEntries = [], isLoading: loadingTime } = useQuery({
    queryKey: ['profitability-time'],
    queryFn: () => base44.entities.TimeEntry.list('-created_date', 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: commissions = [], isLoading: loadingCommissions } = useQuery({
    queryKey: ['profitability-commissions'],
    queryFn: () => base44.entities.CommissionRecord.list('-created_date', 300),
    staleTime: 5 * 60 * 1000,
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['profitability-jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 500),
    staleTime: 5 * 60 * 1000,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['profitability-employees'],
    queryFn: () => base44.entities.EmployeeDirectory.list('-created_date', 200),
    staleTime: 5 * 60 * 1000,
  });

  const { data: quotes = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ['profitability-quotes'],
    queryFn: () => base44.entities.Quote.filter({ deleted_at: null }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isLoading = loadingInvoices || loadingExpenses || loadingTime || loadingCommissions || loadingJobs || loadingEmployees || loadingQuotes;

  const canSimulate = hasFullAccess(user);

  const handleSimulationToggle = useCallback(() => {
    setSimulationActive(prev => !prev);
    if (simulationActive) {
      setSimulatedData(null);
    }
  }, [simulationActive]);

  const handleSimulationChange = useCallback((data) => {
    setSimulatedData(data);
  }, []);

  // Memoized aggregations (read-only calculations)
  const profitabilityData = useMemo(() => {
    if (isLoading) return null;

    // Filter by date range
    const filterByDate = (dateStr) => {
      if (dateRange === 'all') return true;
      if (!dateStr) return false;
      
      const date = new Date(dateStr);
      const now = new Date();
      
      if (dateRange === 'ytd') {
        return date.getFullYear() === now.getFullYear();
      }
      if (dateRange.startsWith('q')) {
        const quarter = parseInt(dateRange.substring(1));
        const year = now.getFullYear();
        const qStart = new Date(year, (quarter - 1) * 3, 1);
        const qEnd = new Date(year, quarter * 3, 0);
        return date >= qStart && date <= qEnd;
      }
      return true;
    };

    // Build job-level profitability
    const jobMap = new Map();

    jobs.forEach(job => {
      // Find related quote to get estimated margin
      const relatedQuote = quotes.find(q => q.job_id === job.id || q.quote_id === job.quote_id);
      const estimatedMargin = relatedQuote?.profit_margin || job.profit_margin || null;

      jobMap.set(job.id, {
        job_id: job.id,
        job_name: job.name,
        job_number: job.id,
        customer_name: job.customer_name,
        estimated_cost: Number(job.estimated_cost) || 0,
        estimated_margin: estimatedMargin !== null ? Number(estimatedMargin) : null,
        status: job.status,
        revenue: 0,
        laborCost: 0,
        expenseCost: 0,
        commissions: 0,
        totalCost: 0,
        profit: 0,
        margin: 0,
        drift: null
      });
    });

    // Aggregate revenue from invoices
    invoices.filter(inv => filterByDate(inv.invoice_date)).forEach(inv => {
      if (inv.status === 'paid' || inv.status === 'partial') {
        const jobId = inv.job_id;
        if (jobId && jobMap.has(jobId)) {
          const job = jobMap.get(jobId);
          job.revenue += Number(inv.total) || 0;
        }
      }
    });

    // Aggregate labor costs from time entries
    timeEntries.filter(te => filterByDate(te.date)).forEach(te => {
      const jobId = te.job_id;
      if (jobId && jobMap.has(jobId)) {
        const job = jobMap.get(jobId);
        const hours = Number(te.hours_worked) || 0;
        
        // Find employee hourly rate
        const employee = employees.find(emp => emp.user_id === te.user_id || emp.employee_email === te.employee_email);
        const hourlyRate = Number(employee?.hourly_rate) || 50; // Default $50/hr
        
        job.laborCost += hours * hourlyRate;
      }
    });

    // Aggregate expense costs
    expenses.filter(exp => filterByDate(exp.date)).forEach(exp => {
      const jobId = exp.job_id;
      if (jobId && jobMap.has(jobId)) {
        const job = jobMap.get(jobId);
        job.expenseCost += Number(exp.amount) || 0;
      }
    });

    // Aggregate commissions
    commissions.filter(comm => filterByDate(comm.created_date)).forEach(comm => {
      const jobId = comm.job_id;
      if (jobId && jobMap.has(jobId)) {
        const job = jobMap.get(jobId);
        if (comm.status === 'approved' || comm.status === 'paid') {
          job.commissions += Number(comm.commission_amount) || 0;
        }
      }
    });

    // Calculate totals and drift
    jobMap.forEach(job => {
      job.totalCost = job.laborCost + job.expenseCost + job.commissions;
      job.profit = job.revenue - job.totalCost;
      job.margin = job.revenue > 0 ? (job.profit / job.revenue) * 100 : 0;
      
      // Drift = current margin - estimated margin (visual only, no prediction)
      if (job.estimated_margin !== null) {
        job.drift = job.margin - job.estimated_margin;
      }
    });

    const jobsArray = Array.from(jobMap.values()).filter(j => j.revenue > 0 || j.totalCost > 0);

    // Global KPIs
    const totalRevenue = jobsArray.reduce((sum, j) => sum + j.revenue, 0);
    const totalCost = jobsArray.reduce((sum, j) => sum + j.totalCost, 0);
    const totalCommissions = jobsArray.reduce((sum, j) => sum + j.commissions, 0);
    const netProfit = totalRevenue - totalCost;
    const avgMargin = jobsArray.length > 0 ? jobsArray.reduce((sum, j) => sum + j.margin, 0) / jobsArray.length : 0;
    const negativeMarginCount = jobsArray.filter(j => j.margin < 0).length;
    const jobsOffTrack = jobsArray.filter(j => j.drift !== null && j.drift < -3).length;

    // Aggregate by client
    const clientMap = new Map();
    jobsArray.forEach(job => {
      const client = job.customer_name || 'Unknown';
      if (!clientMap.has(client)) {
        clientMap.set(client, {
          customer_name: client,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0
        });
      }
      const c = clientMap.get(client);
      c.revenue += job.revenue;
      c.cost += job.totalCost;
      c.profit += job.profit;
    });

    clientMap.forEach(c => {
      c.margin = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
    });

    const clientData = Array.from(clientMap.values());

    return {
      jobs: jobsArray,
      kpis: {
        totalRevenue,
        totalCost,
        totalCommissions,
        netProfit,
        avgMargin,
        negativeMarginCount,
        jobsOffTrack
      },
      clientData
    };
  }, [invoices, expenses, timeEntries, commissions, jobs, employees, quotes, dateRange, isLoading]);

  const displayData = simulationActive && simulatedData ? simulatedData : profitabilityData;

  return (
    <CommissionAccessGuard>
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <PageHeader
            title={language === 'es' ? 'Inteligencia de Rentabilidad' : 'Profitability Intelligence'}
            description={language === 'es' ? 'Análisis de márgenes y costos por trabajo' : 'Margin and cost analysis by job'}
            icon={TrendingUp}
            actions={
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'es' ? 'Todo' : 'All Time'}</SelectItem>
                  <SelectItem value="ytd">{language === 'es' ? 'Este Año' : 'Year to Date'}</SelectItem>
                  <SelectItem value="q1">Q1 2026</SelectItem>
                  <SelectItem value="q2">Q2 2026</SelectItem>
                  <SelectItem value="q3">Q3 2026</SelectItem>
                  <SelectItem value="q4">Q4 2026</SelectItem>
                </SelectContent>
              </Select>
            }
          />

          {isLoading ? (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">
                  {language === 'es' ? 'Calculando rentabilidad...' : 'Calculating profitability...'}
                </p>
              </CardContent>
            </Card>
          ) : profitabilityData ? (
            <>
              {canSimulate && (
                <MarginSimulator
                  originalData={profitabilityData}
                  isActive={simulationActive}
                  onToggle={handleSimulationToggle}
                  onSimulationChange={handleSimulationChange}
                  language={language}
                />
              )}

              <ProfitabilityKPIs kpis={displayData.kpis} language={language} />

              <Tabs defaultValue="jobs" className="space-y-6">
                <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <TabsTrigger value="jobs">
                    {language === 'es' ? 'Por Trabajo' : 'By Job'}
                  </TabsTrigger>
                  <TabsTrigger value="clients">
                    {language === 'es' ? 'Por Cliente' : 'By Client'}
                  </TabsTrigger>
                  <TabsTrigger value="distribution">
                    {language === 'es' ? 'Distribución' : 'Distribution'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="jobs">
                  <JobProfitabilityTable 
                    jobs={displayData.jobs} 
                    language={language} 
                    simulationActive={simulationActive}
                  />
                </TabsContent>

                <TabsContent value="clients">
                  <ClientProfitChart clientData={profitabilityData.clientData} language={language} />
                </TabsContent>

                <TabsContent value="distribution">
                  <ProfitMarginChart jobs={profitabilityData.jobs} language={language} />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="p-12 text-center">
                <TrendingUp className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {language === 'es' ? 'Sin datos' : 'No Data'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {language === 'es' ? 'No hay datos de rentabilidad disponibles' : 'No profitability data available'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CommissionAccessGuard>
  );
}