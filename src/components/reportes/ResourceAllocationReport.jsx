import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Briefcase, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { getDisplayName } from '@/components/utils/nameHelpers';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

export default function ResourceAllocationReport({ 
  teams, 
  employees, 
  jobs, 
  assignments,
  timeEntries,
  dateRange 
}) {
  const { language } = useLanguage();

  // Filter active jobs
  const activeJobs = jobs.filter(j => j.status === 'active');

  // Filter assignments in date range
  const filteredAssignments = assignments.filter(a => {
    const assignDate = new Date(a.date);
    return assignDate >= dateRange.start && assignDate <= dateRange.end;
  });

  // Calculate team workload
  const teamMetrics = teams.map(team => {
    const teamEmployees = employees.filter(e => e.team_id === team.id && e.employment_status === 'active');
    const teamJobs = activeJobs.filter(j => j.team_id === team.id);
    
    const teamAssignments = filteredAssignments.filter(a => 
      teamEmployees.some(e => e.email === a.employee_email)
    );
    
    const teamTimeEntries = timeEntries.filter(e => 
      e.status === 'approved' &&
      teamEmployees.some(emp => emp.email === e.employee_email)
    );
    
    const totalHours = teamTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    const avgHoursPerEmployee = totalHours / Math.max(1, teamEmployees.length);
    
    // Calculate capacity utilization (assuming 40h/week per employee)
    const weekCount = Math.ceil((dateRange.end - dateRange.start) / (7 * 24 * 60 * 60 * 1000));
    const theoreticalCapacity = teamEmployees.length * 40 * weekCount;
    const utilization = theoreticalCapacity > 0 ? (totalHours / theoreticalCapacity) * 100 : 0;
    
    return {
      ...team,
      employeeCount: teamEmployees.length,
      activeJobs: teamJobs.length,
      assignments: teamAssignments.length,
      totalHours,
      avgHoursPerEmployee,
      utilization
    };
  });

  const chartData = teamMetrics.map(team => ({
    name: team.team_name,
    employees: team.employeeCount,
    jobs: team.activeJobs,
    hours: team.totalHours,
    utilization: team.utilization
  }));

  // Employee availability
  const employeeWorkload = employees
    .filter(e => e.employment_status === 'active')
    .map(emp => {
      const empAssignments = filteredAssignments.filter(a => a.employee_email === emp.email);
      const empTimeEntries = timeEntries.filter(e => 
        e.employee_email === emp.email && 
        e.status === 'approved'
      );
      const hours = empTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      const uniqueJobs = [...new Set(empAssignments.map(a => a.job_id))].length;
      
      return {
        ...emp,
        displayName: getDisplayName(emp),
        assignmentCount: empAssignments.length,
        totalHours: hours,
        activeJobs: uniqueJobs
      };
    })
    .sort((a, b) => b.totalHours - a.totalHours);

  const overloadedEmployees = employeeWorkload.filter(e => e.totalHours > 160); // More than 40h/week for 4 weeks
  const underutilizedEmployees = employeeWorkload.filter(e => e.totalHours < 80 && e.assignmentCount > 0);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {overloadedEmployees.length > 0 && (
        <Card className="bg-amber-50 border-amber-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              {language === 'es' ? 'Empleados Sobrecargados' : 'Overloaded Employees'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 mb-3">
              {language === 'es' 
                ? `${overloadedEmployees.length} empleados con más de 160 horas en el período`
                : `${overloadedEmployees.length} employees with over 160 hours in the period`}
            </p>
            <div className="flex flex-wrap gap-2">
              {overloadedEmployees.map(emp => (
                <Badge key={emp.id} className="bg-amber-100 text-amber-700 border-amber-300">
                  {emp.displayName}: {emp.totalHours.toFixed(0)}h
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Workload Chart */}
      <Card className="bg-white shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-slate-900">
            {language === 'es' ? 'Carga de Trabajo por Equipo' : 'Team Workload'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
              <XAxis dataKey="name" stroke="rgba(100,116,139,0.8)" />
              <YAxis stroke="rgba(100,116,139,0.8)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 1)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="employees" fill="#8b5cf6" name={language === 'es' ? 'Empleados' : 'Employees'} radius={[8, 8, 0, 0]} />
              <Bar dataKey="jobs" fill="#3B9FF3" name={language === 'es' ? 'Trabajos Activos' : 'Active Jobs'} radius={[8, 8, 0, 0]} />
              <Bar dataKey="hours" fill="#10b981" name={language === 'es' ? 'Horas Totales' : 'Total Hours'} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Team Details */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMetrics.map(team => (
          <Link key={team.id} to={createPageUrl(`TeamDetails?id=${team.id}`)}>
            <Card className="bg-white shadow-lg border-slate-200 hover:shadow-xl transition-all cursor-pointer">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-lg text-slate-900 flex items-center justify-between">
                  <span>{team.team_name}</span>
                  {team.is_headquarters && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-300">HQ</Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-slate-500">{team.location}, {team.state}</p>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-4 h-4" />
                      <span>{language === 'es' ? 'Empleados' : 'Employees'}</span>
                    </div>
                    <span className="font-bold text-slate-900">{team.employeeCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Briefcase className="w-4 h-4" />
                      <span>{language === 'es' ? 'Trabajos Activos' : 'Active Jobs'}</span>
                    </div>
                    <span className="font-bold text-slate-900">{team.activeJobs}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4" />
                      <span>{language === 'es' ? 'Total Horas' : 'Total Hours'}</span>
                    </div>
                    <span className="font-bold text-blue-600">{team.totalHours.toFixed(1)}h</span>
                  </div>

                  {/* Utilization Bar */}
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-slate-600">
                        {language === 'es' ? 'Utilización' : 'Utilization'}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {team.utilization.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          team.utilization >= 90 ? 'bg-red-500' :
                          team.utilization >= 70 ? 'bg-amber-500' :
                          team.utilization >= 50 ? 'bg-green-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(team.utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Employee Availability */}
      <Card className="bg-white shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-slate-900">
            {language === 'es' ? 'Disponibilidad de Empleados' : 'Employee Availability'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employeeWorkload.map(emp => (
              <Link key={emp.id} to={createPageUrl(`EmployeeProfile?id=${emp.id}`)}>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {emp.displayName[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{emp.displayName}</p>
                      <p className="text-xs text-slate-500 truncate">{emp.team_name}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">{language === 'es' ? 'Horas' : 'Hours'}:</span>
                      <span className="font-bold text-blue-600">{emp.totalHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{language === 'es' ? 'Trabajos' : 'Jobs'}:</span>
                      <span className="font-bold text-slate-900">{emp.activeJobs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">{language === 'es' ? 'Asignaciones' : 'Assignments'}:</span>
                      <span className="font-bold text-slate-900">{emp.assignmentCount}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <Badge className={
                      emp.totalHours >= 160 ? 'bg-red-100 text-red-700 border-red-300' :
                      emp.totalHours >= 120 ? 'bg-amber-100 text-amber-700 border-amber-300' :
                      emp.totalHours >= 80 ? 'bg-green-100 text-green-700 border-green-300' :
                      'bg-blue-100 text-blue-700 border-blue-300'
                    }>
                      {emp.totalHours >= 160 ? (language === 'es' ? 'Sobrecargado' : 'Overloaded') :
                       emp.totalHours >= 120 ? (language === 'es' ? 'Alta carga' : 'High load') :
                       emp.totalHours >= 80 ? (language === 'es' ? 'Óptimo' : 'Optimal') :
                       (language === 'es' ? 'Disponible' : 'Available')}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}