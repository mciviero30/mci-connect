import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2, Calendar } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';

export default function RevenueForecaster({ invoices }) {
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [forecastMonths, setForecastMonths] = useState(3);

  // Calculate historical monthly revenue
  const historicalData = useMemo(() => {
    const months = {};
    invoices.forEach(inv => {
      if (inv.invoice_date && inv.status !== 'cancelled') {
        const monthKey = inv.invoice_date.substring(0, 7); // YYYY-MM
        if (!months[monthKey]) {
          months[monthKey] = { revenue: 0, count: 0 };
        }
        months[monthKey].revenue += inv.total || 0;
        months[monthKey].count += 1;
      }
    });

    return Object.entries(months)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        invoiceCount: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }, [invoices]);

  const generateForecast = async () => {
    setLoading(true);
    try {
      const prompt = `Analyze this construction company's revenue history and forecast the next ${forecastMonths} months:

HISTORICAL MONTHLY REVENUE (Last 12 months):
${JSON.stringify(historicalData, null, 2)}

Provide:
1. Revenue forecast for next ${forecastMonths} months
2. Growth rate prediction
3. Seasonality insights
4. Confidence intervals`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            forecast: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  month: { type: 'string' },
                  predicted_revenue: { type: 'number' },
                  lower_bound: { type: 'number' },
                  upper_bound: { type: 'number' }
                }
              }
            },
            growth_rate: { type: 'number' },
            seasonality: { type: 'string' },
            insights: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      });

      setForecast(result);
    } catch (error) {
      console.error('Forecast error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Combine historical + forecast for chart
  const chartData = useMemo(() => {
    if (!forecast) return historicalData;

    const historical = historicalData.map(d => ({
      month: d.month,
      actual: d.revenue,
      predicted: null
    }));

    const predicted = forecast.forecast.map(f => ({
      month: f.month,
      actual: null,
      predicted: f.predicted_revenue,
      lower: f.lower_bound,
      upper: f.upper_bound
    }));

    return [...historical, ...predicted];
  }, [historicalData, forecast]);

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Revenue Forecasting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <Button
            onClick={generateForecast}
            disabled={loading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Forecasting...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Generate {forecastMonths}-Month Forecast
              </>
            )}
          </Button>
          <select
            value={forecastMonths}
            onChange={(e) => setForecastMonths(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value={3}>3 Months</option>
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
          </select>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#3b82f6" name="Actual Revenue" strokeWidth={2} />
            {forecast && (
              <Line type="monotone" dataKey="predicted" stroke="#8b5cf6" name="Predicted Revenue" strokeWidth={2} strokeDasharray="5 5" />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Insights */}
        {forecast && (
          <div className="space-y-4 mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
                <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-1">Predicted Growth Rate</p>
                <p className="text-2xl font-bold text-indigo-600">{forecast.growth_rate > 0 ? '+' : ''}{forecast.growth_rate}%</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                <p className="text-xs text-purple-700 dark:text-purple-400 mb-1">Seasonality Pattern</p>
                <p className="text-sm font-semibold text-purple-600">{forecast.seasonality}</p>
              </div>
            </div>

            {forecast.insights?.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">AI Insights</h4>
                <ul className="space-y-1">
                  {forecast.insights.map((insight, idx) => (
                    <li key={idx} className="text-sm text-slate-700 dark:text-slate-300">• {insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}