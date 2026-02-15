import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

/**
 * AI Predictive Analytics
 * Predicts job completion, revenue, and resource needs
 */

export const AIPredictor = ({ jobs = [], timeEntries = [], invoices = [] }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (jobs.length === 0 || timeEntries.length === 0) return;
    
    runPredictions();
  }, [jobs.length, timeEntries.length]);

  const runPredictions = async () => {
    setLoading(true);
    
    try {
      // Calculate average completion time
      const completedJobs = jobs.filter(j => j.status === 'completed');
      const avgCompletionDays = completedJobs.length > 0
        ? completedJobs.reduce((sum, job) => {
            if (job.completed_date && job.created_date) {
              const start = new Date(job.created_date);
              const end = new Date(job.completed_date);
              const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
              return sum + days;
            }
            return sum;
          }, 0) / completedJobs.length
        : 30;

      // Predict active jobs completion
      const activeJobs = jobs.filter(j => j.status === 'active');
      const jobPredictions = activeJobs.map(job => {
        const daysSinceStart = job.created_date 
          ? Math.floor((new Date() - new Date(job.created_date)) / (1000 * 60 * 60 * 24))
          : 0;
        
        const estimatedDaysRemaining = Math.max(0, avgCompletionDays - daysSinceStart);
        const completionProbability = Math.min(100, (daysSinceStart / avgCompletionDays) * 100);
        
        return {
          job_name: job.name,
          estimated_completion: estimatedDaysRemaining,
          probability: completionProbability
        };
      });

      // Revenue prediction
      const monthlyRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .filter(inv => {
          const paidDate = new Date(inv.payment_date);
          const now = new Date();
          return paidDate.getMonth() === now.getMonth() && 
                 paidDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, inv) => sum + (inv.total || 0), 0);

      const avgMonthlyRevenue = invoices
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + (inv.total || 0), 0) / 12;

      const projectedNextMonth = avgMonthlyRevenue * 1.1; // 10% growth assumption

      setPredictions({
        jobPredictions: jobPredictions.slice(0, 5),
        revenueProjection: projectedNextMonth,
        currentMonthRevenue: monthlyRevenue,
        riskJobs: activeJobs.filter(j => {
          const daysSinceStart = j.created_date 
            ? Math.floor((new Date() - new Date(j.created_date)) / (1000 * 60 * 60 * 24))
            : 0;
          return daysSinceStart > avgCompletionDays * 1.5; // Over 150% of avg time
        }).length
      });
    } catch (error) {
      console.error('Prediction error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!predictions) return null;

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Predictions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Prediction */}
        <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Next Month Revenue
            </span>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            ${predictions.revenueProjection?.toLocaleString() || 0}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Based on ${predictions.currentMonthRevenue?.toLocaleString() || 0} this month
          </p>
        </div>

        {/* At-Risk Jobs */}
        {predictions.riskJobs > 0 && (
          <div className="p-4 bg-red-50/60 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-900 dark:text-red-200">
                {predictions.riskJobs} jobs at risk
              </span>
            </div>
            <p className="text-xs text-red-700 dark:text-red-300">
              Taking longer than average - may need attention
            </p>
          </div>
        )}

        {/* Job Completion Predictions */}
        {predictions.jobPredictions.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase">
              Estimated Completions
            </h4>
            <div className="space-y-2">
              {predictions.jobPredictions.map((pred, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300 truncate flex-1">
                    {pred.job_name}
                  </span>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 ml-2">
                    {pred.estimated_completion}d
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};