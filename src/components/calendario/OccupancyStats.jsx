import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, eachDayOfInterval } from 'date-fns';

const COLORS = ['#3B9FF3', '#8B5CF6', '#F59E0B', '#10B981', '#EF4444'];

export default function OccupancyStats({ 
  shifts, 
  employees,
  currentDate,
  language = 'en'
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Calculate daily hours
  const dailyData = weekDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(s => s.date === dateStr);
    
    const totalHours = dayShifts.reduce((sum, s) => {
      if (!s.start_time || !s.end_time) return sum;
      const [startH, startM] = s.start_time.split(':').map(Number);
      const [endH, endM] = s.end_time.split(':').map(Number);
      return sum + ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
    }, 0);

    return {
      day: format(day, 'EEE'),
      hours: totalHours,
      shifts: dayShifts.length
    };
  });

  // Calculate shift type distribution
  const typeDistribution = [
    { name: language === 'es' ? 'Trabajo' : 'Job Work', value: shifts.filter(s => s.shift_type === 'job_work').length },
    { name: language === 'es' ? 'Citas' : 'Appointments', value: shifts.filter(s => s.shift_type === 'appointment').length },
    { name: language === 'es' ? 'Ausencias' : 'Time-Off', value: shifts.filter(s => s.shift_type === 'time_off').length },
  ].filter(d => d.value > 0);

  // Calculate top employees by hours
  const employeeHours = {};
  shifts.forEach(shift => {
    if (!shift.employee_email || !shift.start_time || !shift.end_time) return;
    const [startH, startM] = shift.start_time.split(':').map(Number);
    const [endH, endM] = shift.end_time.split(':').map(Number);
    const hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
    
    if (!employeeHours[shift.employee_email]) {
      employeeHours[shift.employee_email] = { email: shift.employee_email, name: shift.employee_name, hours: 0 };
    }
    employeeHours[shift.employee_email].hours += hours;
  });

  const topEmployees = Object.values(employeeHours)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  const totalWeekHours = dailyData.reduce((sum, d) => sum + d.hours, 0);
  const avgDailyHours = totalWeekHours / 7;
  const activeEmployeesCount = employees.filter(e => e.employment_status === 'active').length;
  const utilizationRate = activeEmployeesCount > 0 
    ? ((totalWeekHours / (activeEmployeesCount * 40)) * 100).toFixed(0) 
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/90 dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-[#3B9FF3]" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'es' ? 'Horas Semana' : 'Week Hours'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalWeekHours.toFixed(0)}h
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/90 dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'es' ? 'Promedio Diario' : 'Daily Avg'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {avgDailyHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/90 dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'es' ? 'Empleados' : 'Employees'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {activeEmployeesCount}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/90 dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {language === 'es' ? 'Utilización' : 'Utilization'}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {utilizationRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Daily Hours Chart */}
        <Card className="bg-white/90 dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-900 dark:text-white">
              {language === 'es' ? 'Horas por Día' : 'Hours by Day'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData}>
                <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="hours" fill="#3B9FF3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Shift Type Distribution */}
        <Card className="bg-white/90 dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-900 dark:text-white">
              {language === 'es' ? 'Distribución por Tipo' : 'Distribution by Type'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {typeDistribution.map((entry, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}