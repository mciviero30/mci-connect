import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileText } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";
import { buildUserQuery } from "@/components/utils/userResolution";

export default function TimeReportsView({ user }) {
  const { language } = useLanguage();
  const toast = useToast();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['reportTimeEntries', user?.id, user?.email, startDate, endDate],
    queryFn: async () => {
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return await base44.entities.TimeEntry.filter({
        ...query,
        date: { $gte: startDate, $lte: endDate }
      });
    },
    enabled: !!user && !!startDate && !!endDate,
  });

  const stats = {
    totalHours: entries.reduce((sum, e) => sum + (e.hours_worked || 0), 0),
    totalDays: new Set(entries.map(e => e.date)).size,
    approvedHours: entries.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.hours_worked || 0), 0),
    pendingHours: entries.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.hours_worked || 0), 0),
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Check In', 'Check Out', 'Hours', 'Job', 'Status', 'Notes'];
    const rows = entries.map(e => [
      e.date,
      e.check_in,
      e.check_out || '',
      e.hours_worked || 0,
      e.job_name || '',
      e.status,
      e.notes || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-report-${startDate}-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success(language === 'es' ? 'Reporte exportado' : 'Report exported');
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {language === 'es' ? 'Generar Reporte' : 'Generate Report'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === 'es' ? 'Fecha Inicio' : 'Start Date'}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>{language === 'es' ? 'Fecha Fin' : 'End Date'}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => refetch()} variant="outline" className="flex-1">
              {language === 'es' ? 'Actualizar' : 'Refresh'}
            </Button>
            <Button onClick={exportToCSV} className="flex-1" disabled={entries.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Exportar CSV' : 'Export CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">{language === 'es' ? 'Total Horas' : 'Total Hours'}</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalHours.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">{language === 'es' ? 'Días Trabajados' : 'Days Worked'}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalDays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">{language === 'es' ? 'Horas Aprobadas' : 'Approved Hours'}</p>
            <p className="text-3xl font-bold text-green-600">{stats.approvedHours.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">{language === 'es' ? 'Horas Pendientes' : 'Pending Hours'}</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingHours.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Entry List */}
      <Card>
        <CardHeader>
          <CardTitle>{language === 'es' ? 'Registros del Período' : 'Period Entries'}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-slate-500">{language === 'es' ? 'Cargando...' : 'Loading...'}</p>
          ) : entries.length === 0 ? (
            <p className="text-center py-8 text-slate-500">{language === 'es' ? 'No hay registros' : 'No entries found'}</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{format(new Date(entry.date), 'MMM d, yyyy')}</p>
                    <p className="text-sm text-slate-600">{entry.check_in} - {entry.check_out || 'En curso'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{entry.hours_worked?.toFixed(2) || '0.00'}h</p>
                    <p className="text-sm text-slate-600">{entry.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}