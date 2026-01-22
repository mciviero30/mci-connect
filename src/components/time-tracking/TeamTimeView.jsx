import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function TeamTimeView({ entries, jobs, employees }) {
  const { language } = useLanguage();

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const employeeStats = useMemo(() => {
    const stats = {};
    
    entries.forEach(entry => {
      // Group by user_id if available, otherwise fallback to email
      const key = entry.user_id || entry.employee_email;
      if (!stats[key]) {
        stats[key] = {
          email: entry.employee_email,
          user_id: entry.user_id,
          name: entry.employee_name,
          totalHours: 0,
          normalHours: 0,
          overtimeHours: 0,
          entries: []
        };
      }
      
      stats[key].totalHours += entry.hours_worked || 0;
      if (entry.hour_type === 'overtime') {
        stats[key].overtimeHours += entry.hours_worked || 0;
      } else {
        stats[key].normalHours += entry.hours_worked || 0;
      }
      stats[key].entries.push(entry);
    });

    return Object.values(stats).sort((a, b) => b.totalHours - a.totalHours);
  }, [entries]);

  const jobStats = useMemo(() => {
    const stats = {};
    
    entries.forEach(entry => {
      const jobId = entry.job_id || 'no-job';
      if (!stats[jobId]) {
        const job = jobs.find(j => j.id === entry.job_id);
        stats[jobId] = {
          jobId,
          jobName: job?.name || (language === 'es' ? 'Sin Trabajo' : 'No Job'),
          totalHours: 0,
          employees: new Set()
        };
      }
      
      stats[jobId].totalHours += entry.hours_worked || 0;
      // Dual-Key Read: count unique users by user_id or email
      const uniqueKey = entry.user_id || entry.employee_email;
      stats[jobId].employees.add(uniqueKey);
    });

    return Object.values(stats)
      .map(s => ({ ...s, employees: s.employees.size }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [entries, jobs, language]);

  const chartData = employeeStats.slice(0, 10).map(stat => ({
    name: stat.name.split(' ')[0], // First name only for chart
    Normal: parseFloat(stat.normalHours.toFixed(1)),
    Overtime: parseFloat(stat.overtimeHours.toFixed(1))
  }));

  return (
    <div className="space-y-6">
      {/* Hours by Employee Chart */}
      <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {language === 'es' ? 'Horas por Empleado' : 'Hours by Employee'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="name" className="text-slate-600 dark:text-slate-400" />
              <YAxis className="text-slate-600 dark:text-slate-400" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="Normal" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Overtime" fill="#f59e0b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Employee Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employeeStats.map(stat => (
          <Card key={stat.email} className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{stat.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{stat.entries.length} entries</p>
                </div>
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {language === 'es' ? 'Total' : 'Total'}
                  </span>
                  <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                    {stat.totalHours.toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {language === 'es' ? 'Normal' : 'Regular'}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {stat.normalHours.toFixed(1)}h
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {language === 'es' ? 'Extra' : 'Overtime'}
                  </span>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {stat.overtimeHours.toFixed(1)}h
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Job Stats */}
      <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            {language === 'es' ? 'Horas por Trabajo' : 'Hours by Job'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {jobStats.map(stat => (
              <div key={stat.jobId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900 dark:text-white">{stat.jobName}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {stat.employees} {language === 'es' ? 'empleados' : 'employees'}
                  </p>
                </div>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-lg font-bold px-4 py-2">
                  {stat.totalHours.toFixed(1)}h
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}