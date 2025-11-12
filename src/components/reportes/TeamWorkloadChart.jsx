import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users } from 'lucide-react';

export default function TeamWorkloadChart({ teams, employees, timeEntries, assignments, language }) {
  const teamWorkload = teams.map(team => {
    const teamEmployees = employees.filter(e => e.team_id === team.id && e.employment_status === 'active');
    const teamEmails = teamEmployees.map(e => e.email);
    
    const teamHours = timeEntries.filter(e => teamEmails.includes(e.employee_email))
      .reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    
    const teamEvents = assignments.filter(a => teamEmails.includes(a.employee_email)).length;
    
    const capacity = teamEmployees.length * 40; // 40 hours per week per employee
    const utilization = capacity > 0 ? (teamHours / capacity) * 100 : 0;
    
    return {
      name: team.team_name,
      hours: teamHours,
      events: teamEvents,
      employees: teamEmployees.length,
      utilization: utilization > 100 ? 100 : utilization
    };
  }).filter(t => t.hours > 0 || t.events > 0);

  return (
    <Card className="bg-white shadow-lg border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#3B9FF3]" />
          {language === 'es' ? 'Carga de Trabajo por Equipo' : 'Team Workload'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={teamWorkload}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
            <XAxis dataKey="name" stroke="rgba(100,116,139,0.8)" />
            <YAxis yAxisId="left" stroke="rgba(100,116,139,0.8)" />
            <YAxis yAxisId="right" orientation="right" stroke="rgba(100,116,139,0.8)" />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid rgba(226, 232, 240, 1)',
                borderRadius: '8px',
                color: '#0f172a'
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="hours" fill="#3B9FF3" name={language === 'es' ? 'Horas' : 'Hours'} radius={[8, 8, 0, 0]} />
            <Bar yAxisId="right" dataKey="events" fill="#10b981" name={language === 'es' ? 'Eventos' : 'Events'} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Team Details */}
        <div className="mt-6 space-y-3">
          {teamWorkload.map(team => (
            <div key={team.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-semibold text-slate-900">{team.name}</p>
                <p className="text-sm text-slate-600">
                  {team.employees} {language === 'es' ? 'empleados' : 'employees'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-[#3B9FF3]">{team.hours.toFixed(0)}h</p>
                <p className="text-xs text-slate-600">
                  {team.utilization.toFixed(0)}% {language === 'es' ? 'utilización' : 'utilization'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}