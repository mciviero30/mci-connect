import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function CostAccumulationChart({ 
  job, 
  timeEntries = [], 
  expenses = [], 
  estimatedHours = 0,
  language = 'en' 
}) {
  const chartData = useMemo(() => {
    const dataPoints = new Map();
    
    // Combine all costs with dates
    const allCosts = [];

    // Add time entries as labor costs
    timeEntries.forEach(entry => {
      if (entry.status === 'approved') {
        const laborCost = (entry.hours_worked || 0) * 25; // $25/hour average
        allCosts.push({
          date: entry.date,
          amount: laborCost,
          type: 'labor'
        });
      }
    });

    // Add expenses
    expenses.forEach(expense => {
      if (expense.status === 'approved') {
        allCosts.push({
          date: expense.date,
          amount: expense.amount,
          type: 'expense'
        });
      }
    });

    // Sort by date
    allCosts.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate cumulative costs
    let cumulativeCost = 0;
    allCosts.forEach(cost => {
      cumulativeCost += cost.amount;
      const dateKey = cost.date;
      
      if (!dataPoints.has(dateKey)) {
        dataPoints.set(dateKey, {
          date: dateKey,
          actualCost: 0,
          estimatedBudget: job.contract_amount || 0
        });
      }
      
      dataPoints.get(dateKey).actualCost = cumulativeCost;
    });

    // Convert to array and sort
    const data = Array.from(dataPoints.values()).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Add job creation point if we have data
    if (data.length > 0 && job.created_date) {
      data.unshift({
        date: job.created_date,
        actualCost: 0,
        estimatedBudget: job.contract_amount || 0
      });
    }

    return data;
  }, [timeEntries, expenses, job]);

  const totalActualCost = useMemo(() => {
    const laborCost = timeEntries
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + (e.hours_worked || 0) * 25, 0);
    const expenseCost = expenses
      .filter(e => e.status === 'approved')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    return laborCost + expenseCost;
  }, [timeEntries, expenses]);

  const estimatedBudget = job.contract_amount || 0;
  const variance = estimatedBudget - totalActualCost;
  const variancePercent = estimatedBudget > 0 ? (variance / estimatedBudget) * 100 : 0;
  const isOverBudget = variance < 0;

  if (chartData.length === 0) {
    return (
      <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
        <CardContent className="p-12 text-center">
          <TrendingUp className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">
            {language === 'es' ? 'No hay datos de costos aún' : 'No cost data available yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">
              {language === 'es' ? 'Presupuesto Estimado' : 'Estimated Budget'}
            </p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
              ${estimatedBudget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <p className="text-sm text-purple-700 dark:text-purple-400 mb-1">
              {language === 'es' ? 'Costo Real' : 'Actual Cost'}
            </p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
              ${totalActualCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${
          isOverBudget 
            ? 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800' 
            : 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className={`text-sm ${isOverBudget ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                {language === 'es' ? 'Variación' : 'Variance'}
              </p>
              {isOverBudget && <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />}
            </div>
            <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-900 dark:text-red-300' : 'text-green-900 dark:text-green-300'}`}>
              {isOverBudget ? '-' : '+'}${Math.abs(variance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className={`text-xs ${isOverBudget ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'} mt-1`}>
              {variancePercent.toFixed(1)}% {isOverBudget ? (language === 'es' ? 'sobre presupuesto' : 'over budget') : (language === 'es' ? 'bajo presupuesto' : 'under budget')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Accumulation Chart */}
      <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <TrendingUp className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
            {language === 'es' ? 'Acumulación de Costos vs. Presupuesto' : 'Cost Accumulation vs. Budget'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                stroke="rgba(100,116,139,0.8)"
              />
              <YAxis 
                stroke="rgba(100,116,139,0.8)"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 1)',
                  borderRadius: '8px',
                  color: '#0f172a'
                }}
                labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                formatter={(value) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, '']}
              />
              <Legend />
              <ReferenceLine 
                y={estimatedBudget} 
                stroke="#10b981" 
                strokeDasharray="5 5" 
                label={{ 
                  value: language === 'es' ? 'Presupuesto' : 'Budget', 
                  position: 'right',
                  fill: '#10b981'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="actualCost" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorActual)"
                name={language === 'es' ? 'Costo Real' : 'Actual Cost'}
              />
            </AreaChart>
          </ResponsiveContainer>

          {isOverBudget && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-900 dark:text-red-300 font-medium">
                {language === 'es' 
                  ? '⚠️ Este proyecto está sobre presupuesto. Se recomienda revisar los costos.' 
                  : '⚠️ This project is over budget. Cost review recommended.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}