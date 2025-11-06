import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Clock, Briefcase, TrendingUp, Award, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getDisplayName } from '@/components/utils/nameHelpers';

export default function EmployeeProductivityReport({ 
  employees, 
  timeEntries, 
  jobs, 
  dateRange,
  onEmployeeClick 
}) {
  const { language } = useLanguage();
  const [sortBy, setSortBy] = useState('hours');
  const [sortOrder, setSortOrder] = useState('desc');

  // Filter data by date range
  const filteredTimeEntries = timeEntries.filter(e => {
    const entryDate = new Date(e.date);
    return e.status === 'approved' && 
           entryDate >= dateRange.start && 
           entryDate <= dateRange.end;
  });

  // Calculate metrics per employee
  const employeeMetrics = employees
    .filter(emp => emp.employment_status === 'active')
    .map(emp => {
      const empEntries = filteredTimeEntries.filter(e => e.employee_email === emp.email);
      const totalHours = empEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      const uniqueJobs = [...new Set(empEntries.map(e => e.job_id))].filter(Boolean).length;
      
      const completedJobs = jobs.filter(j => 
        j.status === 'completed' && 
        empEntries.some(e => e.job_id === j.id)
      ).length;
      
      const efficiency = uniqueJobs > 0 ? (totalHours / uniqueJobs).toFixed(1) : 0;
      const avgHoursPerWeek = totalHours / Math.max(1, Math.ceil(empEntries.length / 5));

      return {
        ...emp,
        displayName: getDisplayName(emp),
        totalHours,
        uniqueJobs,
        completedJobs,
        efficiency,
        avgHoursPerWeek,
        daysWorked: empEntries.length
      };
    })
    .sort((a, b) => {
      const direction = sortOrder === 'asc' ? 1 : -1;
      return (a[sortBy] - b[sortBy]) * direction;
    });

  const topPerformers = employeeMetrics.slice(0, 10);

  const chartData = topPerformers.map(emp => ({
    name: emp.displayName.split(' ').slice(0, 2).join(' '),
    hours: emp.totalHours,
    jobs: emp.completedJobs
  }));

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const totalHours = employeeMetrics.reduce((sum, e) => sum + e.totalHours, 0);
  const avgHoursPerEmployee = totalHours / Math.max(1, employeeMetrics.length);
  const totalJobsCompleted = employeeMetrics.reduce((sum, e) => sum + e.completedJobs, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-white shadow-lg border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">
              {language === 'es' ? 'Total Horas' : 'Total Hours'}
            </CardTitle>
            <Clock className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'es' ? 'Promedio' : 'Average'}: {avgHoursPerEmployee.toFixed(1)}h {language === 'es' ? 'por empleado' : 'per employee'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">
              {language === 'es' ? 'Empleados Activos' : 'Active Employees'}
            </CardTitle>
            <Users className="w-5 h-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{employeeMetrics.length}</div>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'es' ? 'con actividad' : 'with activity'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">
              {language === 'es' ? 'Trabajos Completados' : 'Jobs Completed'}
            </CardTitle>
            <Briefcase className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalJobsCompleted}</div>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'es' ? 'en este período' : 'in this period'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-slate-600">
              {language === 'es' ? 'Eficiencia Promedio' : 'Avg Efficiency'}
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {(totalHours / Math.max(1, totalJobsCompleted)).toFixed(1)}h
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'es' ? 'por trabajo' : 'per job'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Chart */}
      <Card className="bg-white shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-slate-900">
            {language === 'es' ? 'Top 10 Empleados por Productividad' : 'Top 10 Employees by Productivity'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
              <XAxis dataKey="name" stroke="rgba(100,116,139,0.8)" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="rgba(100,116,139,0.8)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 1)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar 
                dataKey="hours" 
                fill="#3B9FF3" 
                name={language === 'es' ? 'Horas Trabajadas' : 'Hours Worked'} 
                radius={[8, 8, 0, 0]}
              />
              <Bar 
                dataKey="jobs" 
                fill="#10b981" 
                name={language === 'es' ? 'Trabajos Completados' : 'Jobs Completed'} 
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card className="bg-white shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-slate-900">
            {language === 'es' ? 'Detalles de Productividad por Empleado' : 'Employee Productivity Details'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-slate-700 font-semibold">
                    {language === 'es' ? 'Empleado' : 'Employee'}
                  </TableHead>
                  <TableHead 
                    className="text-slate-700 font-semibold cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('totalHours')}
                  >
                    {language === 'es' ? 'Total Horas' : 'Total Hours'} {sortBy === 'totalHours' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-slate-700 font-semibold cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('uniqueJobs')}
                  >
                    {language === 'es' ? 'Trabajos' : 'Jobs'} {sortBy === 'uniqueJobs' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-slate-700 font-semibold cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort('completedJobs')}
                  >
                    {language === 'es' ? 'Completados' : 'Completed'} {sortBy === 'completedJobs' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold">
                    {language === 'es' ? 'Prom./Semana' : 'Avg/Week'}
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold">
                    {language === 'es' ? 'Días Trabajados' : 'Days Worked'}
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold">
                    {language === 'es' ? 'Acciones' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeMetrics.map((emp, idx) => (
                  <TableRow key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-xs">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{emp.displayName}</p>
                          <p className="text-xs text-slate-500">{emp.position}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-blue-600">{emp.totalHours.toFixed(1)}h</TableCell>
                    <TableCell className="text-slate-700">{emp.uniqueJobs}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        {emp.completedJobs}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700">{emp.avgHoursPerWeek.toFixed(1)}h</TableCell>
                    <TableCell className="text-slate-700">{emp.daysWorked}</TableCell>
                    <TableCell>
                      <Link to={createPageUrl(`EmployeeProfile?id=${emp.id}`)}>
                        <Button variant="ghost" size="sm" className="text-[#3B9FF3] hover:bg-blue-50">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}