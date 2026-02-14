import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Users, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TeamUtilizationReport() {
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-active'],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ status: 'active' })
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries-range', dateRange],
    queryFn: () => base44.entities.TimeEntry.filter({})
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-range', dateRange],
    queryFn: () => base44.entities.JobAssignment.filter({})
  });

  // Filter time entries by date range
  const filteredEntries = timeEntries.filter(entry => 
    entry.date >= dateRange.start && entry.date <= dateRange.end
  );

  // Calculate utilization per employee
  const utilizationData = employees.map(emp => {
    const empEntries = filteredEntries.filter(e => e.employee_email === emp.employee_email);
    const totalHours = empEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    const daysInRange = Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24));
    const workDays = Math.floor(daysInRange * (5/7)); // Approximate work days
    const expectedHours = workDays * 8;
    const utilizationRate = expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0;

    return {
      name: emp.full_name,
      hours: totalHours,
      utilization: Math.round(utilizationRate),
      expectedHours: expectedHours
    };
  }).sort((a, b) => b.utilization - a.utilization);

  const avgUtilization = utilizationData.length > 0 
    ? Math.round(utilizationData.reduce((sum, d) => sum + d.utilization, 0) / utilizationData.length)
    : 0;

  const underUtilized = utilizationData.filter(d => d.utilization < 70).length;
  const overUtilized = utilizationData.filter(d => d.utilization > 110).length;

  const getBarColor = (utilization) => {
    if (utilization < 70) return '#ef4444'; // red
    if (utilization > 110) return '#f59e0b'; // amber
    return '#10b981'; // green
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Team Utilization Report"
        description="Employee productivity and capacity analysis"
        icon={Users}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{avgUtilization}%</div>
            <p className="text-xs text-slate-500 mt-1">Target: 80-100%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Under-Utilized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{underUtilized}</div>
            <p className="text-xs text-slate-500 mt-1">Below 70% capacity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Over-Utilized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{overUtilized}</div>
            <p className="text-xs text-slate-500 mt-1">Above 110% capacity</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilization by Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={utilizationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="utilization" name="Utilization %">
                {utilizationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.utilization)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {utilizationData.map((emp, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{emp.name}</p>
                  <p className="text-xs text-slate-500">
                    {emp.hours}h worked / {emp.expectedHours}h expected
                  </p>
                </div>
                <Badge 
                  className={
                    emp.utilization < 70 ? 'bg-red-100 text-red-800' :
                    emp.utilization > 110 ? 'bg-amber-100 text-amber-800' :
                    'bg-green-100 text-green-800'
                  }
                >
                  {emp.utilization}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}