import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

export default function GoalProgressChart({ goalId }) {
  const { data: progressData = [], isLoading } = useQuery({
    queryKey: ['goalProgress', goalId],
    queryFn: () => base44.entities.GoalProgress.filter({ goal_id: goalId }, 'created_date'),
    enabled: !!goalId,
  });

  if (isLoading) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (progressData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
        No progress updates yet
      </div>
    );
  }

  const chartData = progressData.map(p => ({
    date: format(new Date(p.created_date), 'MMM dd'),
    value: p.new_value,
    fullDate: p.created_date
  }));

  return (
    <Card className="bg-slate-50 dark:bg-slate-900/50">
      <CardContent className="p-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3B9FF3" 
              strokeWidth={3}
              dot={{ fill: '#3B9FF3', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}