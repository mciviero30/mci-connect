import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { startOfWeek, endOfWeek, isSameDay, addDays } from 'date-fns';

export default function TeamUtilization({ 
  employees, 
  shifts, 
  currentDate, 
  language 
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Calculate utilization per employee
  const employeeStats = employees.map(employee => {
    const employeeShifts = shifts.filter(s => 
      s.employee_email === employee.email &&
      s.date &&
      new Date(s.date) >= weekStart &&
      new Date(s.date) <= weekEnd
    );

    const totalHours = employeeShifts.reduce((sum, shift) => {
      if (!shift.start_time || !shift.end_time) return sum;
      const [startH, startM] = shift.start_time.split(':').map(Number);
      const [endH, endM] = shift.end_time.split(':').map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      return sum + (hours > 0 ? hours : 0);
    }, 0);

    const targetHours = 40; // Standard work week
    const utilization = Math.min((totalHours / targetHours) * 100, 100);

    return {
      employee,
      totalHours,
      utilization,
      shiftsCount: employeeShifts.length
    };
  });

  // Sort by utilization (highest first)
  const sortedStats = [...employeeStats].sort((a, b) => b.utilization - a.utilization);

  // Calculate overall metrics
  const avgUtilization = employeeStats.reduce((sum, s) => sum + s.utilization, 0) / employeeStats.length;
  const overworked = employeeStats.filter(s => s.totalHours > 45).length;
  const underutilized = employeeStats.filter(s => s.totalHours < 30).length;

  const getUtilizationColor = (utilization) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 75) return 'text-green-600';
    if (utilization >= 50) return 'text-yellow-600';
    return 'text-slate-600';
  };

  const getProgressColor = (utilization) => {
    if (utilization >= 90) return 'bg-red-500';
    if (utilization >= 75) return 'bg-green-500';
    if (utilization >= 50) return 'bg-yellow-500';
    return 'bg-slate-300';
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {avgUtilization.toFixed(0)}%
                </div>
                <div className="text-xs text-blue-700 font-medium">
                  {language === 'es' ? 'Utilización Promedio' : 'Avg Utilization'}
                </div>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-900">
                  {overworked}
                </div>
                <div className="text-xs text-red-700 font-medium">
                  {language === 'es' ? 'Sobrecargados (>45h)' : 'Overloaded (>45h)'}
                </div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600 opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-900">
                  {underutilized}
                </div>
                <div className="text-xs text-yellow-700 font-medium">
                  {language === 'es' ? 'Subutilizados (<30h)' : 'Underutilized (<30h)'}
                </div>
              </div>
              <TrendingDown className="w-8 h-8 text-yellow-600 opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5" />
            {language === 'es' ? 'Utilización por Empleado' : 'Utilization by Employee'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedStats.map(({ employee, totalHours, utilization, shiftsCount }) => (
              <div key={employee.email} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm truncate">
                      {employee.full_name}
                    </div>
                    <div className={`text-sm font-bold ${getUtilizationColor(utilization)}`}>
                      {utilization.toFixed(0)}%
                    </div>
                  </div>
                  
                  <Progress 
                    value={utilization} 
                    className="h-2"
                  />
                  
                  <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                    <span>{totalHours.toFixed(1)}h / 40h</span>
                    <span>{shiftsCount} {language === 'es' ? 'turnos' : 'shifts'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}