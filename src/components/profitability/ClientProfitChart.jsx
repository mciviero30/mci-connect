import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/components/utils/defensiveFormatting';

export default function ClientProfitChart({ clientData, language = 'en' }) {
  // Sort by profit descending and take top 10
  const sortedData = [...clientData]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white">
          {language === 'es' ? 'Top 10 Clientes por Rentabilidad' : 'Top 10 Clients by Profitability'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={sortedData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number" stroke="#64748B" />
            <YAxis 
              dataKey="customer_name" 
              type="category" 
              width={120}
              stroke="#64748B"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px'
              }}
              formatter={(value) => formatCurrency(value)}
            />
            <Bar 
              dataKey="profit" 
              fill="#10B981" 
              radius={[0, 8, 8, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}