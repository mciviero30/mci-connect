import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2, AlertTriangle, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function ProfitabilityPredictor({ jobs, invoices }) {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(null);

  const analyzeProfitability = async () => {
    setLoading(true);
    try {
      // Prepare data for AI analysis
      const historicalData = jobs.map(job => ({
        name: job.name,
        contract_amount: job.contract_amount || 0,
        estimated_cost: job.estimated_cost || 0,
        profit_margin: job.profit_margin || 0,
        status: job.status,
        completed_date: job.completed_date
      }));

      const invoiceData = invoices.map(inv => ({
        total: inv.total,
        status: inv.status,
        date: inv.invoice_date
      }));

      const prompt = `Analyze this construction company's financial data and provide predictions:

JOBS DATA:
${JSON.stringify(historicalData, null, 2)}

INVOICE DATA:
${JSON.stringify(invoiceData, null, 2)}

Provide a comprehensive profitability analysis with:
1. Next 3 months revenue forecast
2. Profit margin trends
3. Risk factors
4. Optimization recommendations`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            revenue_forecast: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string' },
                  predicted_revenue: { type: 'number' },
                  confidence: { type: 'string' }
                }
              }
            },
            profit_trends: {
              type: 'object',
              properties: {
                current_margin: { type: 'number' },
                trend: { type: 'string' },
                projection_3_months: { type: 'number' }
              }
            },
            risk_factors: {
              type: 'array',
              items: { type: 'string' }
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      });

      setPredictions(result);
    } catch (error) {
      console.error('AI prediction error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          AI Profitability Predictions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!predictions ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Use AI to predict revenue and profit margins
            </p>
            <Button
              onClick={analyzeProfitability}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analyze Profitability
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Revenue Forecast Chart */}
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Revenue Forecast (Next 3 Months)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={predictions.revenue_forecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="predicted_revenue" stroke="#3b82f6" fill="#93c5fd" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Profit Trends */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">Current Margin</p>
                <p className="text-2xl font-bold text-green-600">{predictions.profit_trends.current_margin}%</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Trend</p>
                <p className="text-lg font-semibold text-blue-600">{predictions.profit_trends.trend}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">3-Month Projection</p>
                <p className="text-2xl font-bold text-purple-600">{predictions.profit_trends.projection_3_months}%</p>
              </div>
            </div>

            {/* Risk Factors */}
            {predictions.risk_factors?.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Risk Factors
                </h4>
                <ul className="space-y-1">
                  {predictions.risk_factors.map((risk, idx) => (
                    <li key={idx} className="text-sm text-amber-800 dark:text-amber-400">• {risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {predictions.recommendations?.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Recommendations
                </h4>
                <ul className="space-y-1">
                  {predictions.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-blue-800 dark:text-blue-400">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              onClick={analyzeProfitability}
              variant="outline"
              disabled={loading}
              size="sm"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Refresh Predictions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}