import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function GoalProgressChart({ goals }) {
  const { data: allProgress = [] } = useQuery({
    queryKey: ['goalProgress'],
    queryFn: () => base44.entities.GoalProgress.list('-created_date', 100),
    staleTime: 60000,
  });

  // Group progress by goal
  const progressByGoal = goals.map(goal => {
    const goalProgress = allProgress
      .filter(p => p.goal_id === goal.id)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    return {
      goalTitle: goal.title,
      data: goalProgress.map(p => ({
        date: format(new Date(p.created_date), 'MMM d'),
        value: p.progress_percentage,
        rawValue: p.progress_value
      }))
    };
  }).filter(g => g.data.length > 0);

  // Overall progress trend
  const overallTrend = allProgress
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
    .slice(-10)
    .map(p => ({
      date: format(new Date(p.created_date), 'MMM d'),
      progress: p.progress_percentage
    }));

  // Goals completion stats
  const completionStats = [
    { name: 'Not Started', value: goals.filter(g => g.status === 'not_started').length },
    { name: 'On Track', value: goals.filter(g => g.status === 'on_track').length },
    { name: 'At Risk', value: goals.filter(g => g.status === 'at_risk').length },
    { name: 'Behind', value: goals.filter(g => g.status === 'behind').length },
    { name: 'Completed', value: goals.filter(g => g.status === 'completed').length }
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-6">
      {/* Overall Progress Trend */}
      <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">Recent Progress Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={overallTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="progress" 
                stroke="#3B9FF3" 
                strokeWidth={2}
                name="Progress %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Goals Status Distribution */}
      <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">Goals by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={completionStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B9FF3" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Individual Goal Progress */}
      {progressByGoal.map((goalData, idx) => (
        <Card key={idx} className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white text-base">
              {goalData.goalTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={goalData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Progress %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}