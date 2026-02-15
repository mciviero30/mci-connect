import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

/**
 * I1 - Actual vs Estimated Comparison Chart
 * Compares actual job costs against initial quote estimates
 * Identifies cost overruns early
 */

export default function ActualVsEstimatedChart({ jobs, quotes }) {
  // Match jobs with their original quotes
  const data = jobs
    .filter(job => job.quote_id)
    .map(job => {
      const quote = quotes.find(q => q.id === job.quote_id);
      if (!quote) return null;

      const estimated = quote.total || 0;
      const actual = job.estimated_cost || 0;
      const variance = actual - estimated;
      const variancePercent = estimated > 0 ? ((variance / estimated) * 100).toFixed(1) : 0;

      return {
        name: job.name.length > 20 ? job.name.substring(0, 20) + '...' : job.name,
        estimated,
        actual,
        variance: Math.abs(variance),
        isOverBudget: variance > 0,
        variancePercent
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    .slice(0, 10); // Top 10 jobs with biggest variance

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actual vs Estimated Costs</CardTitle>
          <CardDescription>No jobs with quotes to compare</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const overBudgetJobs = data.filter(d => d.isOverBudget).length;
  const totalVariance = data.reduce((sum, d) => sum + (d.isOverBudget ? d.variance : 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Actual vs Estimated Costs</span>
          {overBudgetJobs > 0 && (
            <span className="flex items-center gap-2 text-sm font-normal text-red-600">
              <AlertTriangle className="w-4 h-4" />
              {overBudgetJobs} over budget
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Top 10 jobs with largest cost variance
          {totalVariance > 0 && (
            <span className="text-red-600 font-medium ml-2">
              (${totalVariance.toFixed(0)} total overrun)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip 
              formatter={(value) => `$${value.toFixed(2)}`}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
                    <p className="font-semibold text-sm mb-2">{data.name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Estimated: <span className="font-medium">${data.estimated.toFixed(2)}</span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Actual: <span className="font-medium">${data.actual.toFixed(2)}</span>
                    </p>
                    <p className={`text-xs font-medium mt-1 ${data.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                      {data.isOverBudget ? 'Over' : 'Under'} by ${data.variance.toFixed(2)} ({data.variancePercent}%)
                    </p>
                  </div>
                );
              }}
            />
            <Legend />
            <Bar dataKey="estimated" fill="#3b82f6" name="Estimated" />
            <Bar dataKey="actual" fill="#ef4444" name="Actual" />
          </BarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Total Estimated</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              ${data.reduce((sum, d) => sum + d.estimated, 0).toFixed(0)}
            </p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Total Actual</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">
              ${data.reduce((sum, d) => sum + d.actual, 0).toFixed(0)}
            </p>
          </div>
          <div className="text-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Variance</p>
            <p className={`text-lg font-bold ${totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalVariance > 0 ? '+' : '-'}${Math.abs(totalVariance).toFixed(0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}