import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { addDays, isWithinInterval, parseISO } from 'date-fns';

export default function CashFlowForecast({ days = 30 }) {
  const today = new Date();
  const forecastEnd = addDays(today, days);

  // Fetch all financial data
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-forecast'],
    queryFn: () => base44.entities.Invoice.list()
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes-forecast'],
    queryFn: () => base44.entities.Quote.list()
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs-forecast'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' })
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-forecast'],
    queryFn: () => base44.entities.Expense.filter({ status: 'approved' })
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions-forecast'],
    queryFn: () => base44.entities.Transaction.list()
  });

  // Calculate forecast
  const forecast = useMemo(() => {
    // Expected income from unpaid invoices
    const unpaidInvoices = invoices.filter(inv => 
      inv.status !== 'paid' && 
      inv.due_date &&
      isWithinInterval(parseISO(inv.due_date), { start: today, end: forecastEnd })
    );
    const expectedIncome = unpaidInvoices.reduce((sum, inv) => sum + (inv.balance || inv.total || 0), 0);

    // Potential income from approved quotes
    const approvedQuotes = quotes.filter(q => q.status === 'approved');
    const potentialIncome = approvedQuotes.reduce((sum, q) => sum + (q.total || 0), 0);

    // Estimated income from active jobs (job value - paid)
    const jobIncome = jobs.reduce((sum, job) => {
      const jobValue = job.contract_amount || 0;
      const paidInvoices = invoices.filter(inv => 
        inv.job_id === job.id && inv.status === 'paid'
      );
      const alreadyPaid = paidInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
      return sum + Math.max(0, jobValue - alreadyPaid);
    }, 0);

    // Pending expenses to be paid
    const pendingExpenses = expenses.filter(exp => 
      exp.payment_method === 'personal' && 
      exp.date &&
      isWithinInterval(parseISO(exp.date), { start: today, end: forecastEnd })
    );
    const expensesPayout = pendingExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    // Average monthly operating costs (from transactions)
    const recentTransactions = transactions.filter(t => 
      t.type === 'expense' &&
      t.date &&
      isWithinInterval(parseISO(t.date), { start: addDays(today, -90), end: today })
    );
    const avgMonthlyExpenses = recentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0) / 3;
    const projectedExpenses = (avgMonthlyExpenses / 30) * days;

    // Net forecast
    const totalIncoming = expectedIncome + (potentialIncome * 0.7) + (jobIncome * 0.5); // Apply probability
    const totalOutgoing = expensesPayout + projectedExpenses;
    const netCashFlow = totalIncoming - totalOutgoing;

    // Risk assessment
    const riskLevel = 
      netCashFlow > totalIncoming * 0.3 ? 'low' :
      netCashFlow > 0 ? 'moderate' :
      'high';

    return {
      expectedIncome,
      potentialIncome,
      jobIncome,
      totalIncoming,
      expensesPayout,
      projectedExpenses,
      totalOutgoing,
      netCashFlow,
      riskLevel,
      unpaidInvoicesCount: unpaidInvoices.length,
      approvedQuotesCount: approvedQuotes.length,
      activeJobsCount: jobs.length
    };
  }, [invoices, quotes, jobs, expenses, transactions, days]);

  const riskColors = {
    low: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    moderate: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    high: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
  };

  const riskIcons = {
    low: CheckCircle2,
    moderate: Clock,
    high: AlertTriangle
  };

  const RiskIcon = riskIcons[forecast.riskLevel];

  return (
    <div className="space-y-6">
      {/* Main Forecast Card */}
      <Card className={`border-2 ${riskColors[forecast.riskLevel]}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {days}-Day Cash Flow Forecast
            </CardTitle>
            <Badge className={`${
              forecast.netCashFlow > 0 
                ? 'bg-green-600 text-white' 
                : 'bg-red-600 text-white'
            }`}>
              <RiskIcon className="w-3 h-3 mr-1" />
              {forecast.riskLevel.toUpperCase()} Risk
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <p className="text-sm mb-2">Projected Net Cash Flow</p>
            <p className={`text-4xl font-bold ${
              forecast.netCashFlow > 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {forecast.netCashFlow > 0 ? '+' : ''}${forecast.netCashFlow.toFixed(2)}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Incoming */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <h4 className="font-semibold">Incoming</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Invoices Due ({forecast.unpaidInvoicesCount})</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+${forecast.expectedIncome.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Approved Quotes ({forecast.approvedQuotesCount})</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+${(forecast.potentialIncome * 0.7).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Active Jobs ({forecast.activeJobsCount})</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+${(forecast.jobIncome * 0.5).toFixed(0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>Total Incoming</span>
                  <span className="text-green-600 dark:text-green-400">${forecast.totalIncoming.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Outgoing */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <h4 className="font-semibold">Outgoing</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Expense Reimbursements</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">-${forecast.expensesPayout.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Projected Operating Costs</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">-${forecast.projectedExpenses.toFixed(0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t font-bold">
                  <span>Total Outgoing</span>
                  <span className="text-red-600 dark:text-red-400">${forecast.totalOutgoing.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-sm text-purple-900 dark:text-purple-100">AI Financial Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-purple-800 dark:text-purple-200">
            {forecast.netCashFlow < 0 && (
              <li className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Cash flow is projected to be negative. Consider delaying non-essential expenses or accelerating invoice collections.</span>
              </li>
            )}
            {forecast.approvedQuotesCount > 0 && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>You have {forecast.approvedQuotesCount} approved quotes worth ${forecast.potentialIncome.toFixed(0)}. Convert them to invoices to secure revenue.</span>
              </li>
            )}
            {forecast.unpaidInvoicesCount > 3 && (
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{forecast.unpaidInvoicesCount} invoices are pending payment. Consider sending reminders to improve collection rate.</span>
              </li>
            )}
            {forecast.riskLevel === 'low' && (
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Financial outlook is healthy with a comfortable cash flow buffer.</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}