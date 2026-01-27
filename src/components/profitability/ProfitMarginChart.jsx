import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ProfitMarginChart({ jobs, language = 'en' }) {
  // Group jobs by margin buckets
  const buckets = [
    { range: '< 0%', min: -Infinity, max: 0, count: 0, color: '#EF4444' },
    { range: '0-10%', min: 0, max: 10, count: 0, color: '#F59E0B' },
    { range: '10-20%', min: 10, max: 20, count: 0, color: '#3B82F6' },
    { range: '20-30%', min: 20, max: 30, count: 0, color: '#10B981' },
    { range: '30%+', min: 30, max: Infinity, count: 0, color: '#059669' }
  ];

  jobs.forEach(job => {
    const margin = job.margin || 0;
    const bucket = buckets.find(b => margin >= b.min && margin < b.max);
    if (bucket) bucket.count++;
  });

  const chartData = buckets.map(b => ({
    range: b.range,
    count: b.count,
    color: b.color
  }));

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white">
          {language === 'es' ? 'Distribución de Márgenes' : 'Margin Distribution'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="range" stroke="#64748B" />
            <YAxis stroke="#64748B" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px'
              }}
              formatter={(value) => [value, language === 'es' ? 'Trabajos' : 'Jobs']}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}