import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, TrendingDown, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export default function CostAnalysisBreakdown({ expenses, timeEntries }) {
  const costBreakdown = useMemo(() => {
    // Categorize expenses
    const expensesByCategory = expenses.reduce((acc, exp) => {
      const cat = exp.category || 'other';
      acc[cat] = (acc[cat] || 0) + (exp.amount || 0);
      return acc;
    }, {});

    // Calculate labor costs
    const laborCost = timeEntries.reduce((sum, entry) => {
      const hours = entry.hours_worked || 0;
      const rate = entry.hour_type === 'overtime' ? 90 : 60; // Default rates
      return sum + (hours * rate);
    }, 0);

    // Combine all costs
    const allCosts = {
      Labor: laborCost,
      ...expensesByCategory
    };

    return Object.entries(allCosts).map(([name, value]) => ({
      name,
      value
    }));
  }, [expenses, timeEntries]);

  const totalCosts = costBreakdown.reduce((sum, item) => sum + item.value, 0);

  // Find top cost drivers
  const topCostDrivers = [...costBreakdown]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-orange-600" />
          Cost Analysis Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Costs */}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
          <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">Total Operating Costs</p>
          <p className="text-3xl font-bold text-orange-600">${totalCosts.toLocaleString()}</p>
        </div>

        {/* Pie Chart */}
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={costBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {costBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

        {/* Top Cost Drivers */}
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            Top Cost Drivers
          </h4>
          <div className="space-y-2">
            {topCostDrivers.map((driver, idx) => (
              <div key={driver.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-orange-600">#{idx + 1}</span>
                  </div>
                  <span className="font-medium text-slate-900 dark:text-white">{driver.name}</span>
                </div>
                <span className="font-bold text-orange-600">${driver.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}