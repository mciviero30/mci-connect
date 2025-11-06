import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, MapPin, Clock, Briefcase, Filter, CheckCheck, Loader2, Download, AlertTriangle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from 'date-fns';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { getDisplayName } from '@/components/utils/nameHelpers';

export default function TimeEntryList({ timeEntries, isAdmin, loading }) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    initialData: [],
  });

  const approveMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeEntry.update(id, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeEntry.update(id, { status: 'rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
    },
  });

  const handleApprove = (id) => {
    if (window.confirm(language === 'es' ? '¿Aprobar estas horas?' : 'Approve these hours?')) {
      approveMutation.mutate(id);
    }
  };

  const handleReject = (id) => {
    if (window.confirm(language === 'es' ? '¿Rechazar estas horas?' : 'Reject these hours?')) {
      rejectMutation.mutate(id);
    }
  };

  const handleApproveAll = async () => {
    const pendingEntries = filteredEntries.filter(e => e.status === 'pending');
    
    if (pendingEntries.length === 0) {
      alert(language === 'es' ? 'No hay entradas pendientes para aprobar' : 'No pending entries to approve');
      return;
    }

    const confirmed = window.confirm(
      language === 'es' 
        ? `¿Aprobar ${pendingEntries.length} entradas pendientes?` 
        : `Approve ${pendingEntries.length} pending entries?`
    );

    if (!confirmed) return;

    setIsApprovingAll(true);
    try {
      for (const entry of pendingEntries) {
        await base44.entities.TimeEntry.update(entry.id, { status: 'approved' });
      }
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      alert(language === 'es' 
        ? `✅ ${pendingEntries.length} entradas aprobadas exitosamente` 
        : `✅ ${pendingEntries.length} entries approved successfully`
      );
    } catch (error) {
      console.error('Error approving entries:', error);
      alert(language === 'es' ? 'Error al aprobar las entradas' : 'Error approving entries');
    } finally {
      setIsApprovingAll(false);
    }
  };

  const handleExportToExcel = () => {
    if (filteredEntries.length === 0) {
      alert(language === 'es' ? 'No hay registros para exportar' : 'No records to export');
      return;
    }

    const headers = [
      language === 'es' ? 'Empleado' : 'Employee',
      language === 'es' ? 'Fecha' : 'Date',
      language === 'es' ? 'Trabajo' : 'Job',
      language === 'es' ? 'Tipo de Trabajo' : 'Work Type',
      language === 'es' ? 'Entrada' : 'Check In',
      language === 'es' ? 'Salida' : 'Check Out',
      language === 'es' ? 'Pausa (min)' : 'Lunch Break (min)',
      language === 'es' ? 'Horas Trabajadas' : 'Hours Worked',
      language === 'es' ? 'Estado' : 'Status',
      language === 'es' ? 'Notas' : 'Notes',
      language === 'es' ? 'Detalles de Tarea' : 'Task Details',
      language === 'es' ? 'Requiere Revisión Ubicación' : 'Requires Location Review',
      language === 'es' ? 'Distancia Geofence (m)' : 'Geofence Distance (m)',
      language === 'es' ? 'Excede Horas Máx' : 'Exceeds Max Hours',
    ];

    const rows = filteredEntries.map(entry => [
      getEmployeeName(entry),
      format(new Date(entry.date), 'MM/dd/yyyy'),
      entry.job_name || '',
      entry.work_type === 'driving' ? (language === 'es' ? 'Manejo' : 'Driving') :
      entry.work_type === 'setup' ? 'Setup' :
      entry.work_type === 'cleanup' ? 'Cleanup' :
      (language === 'es' ? 'Normal' : 'Normal'),
      entry.check_in || '',
      entry.check_out || '',
      entry.lunch_minutes || 0,
      entry.hours_worked?.toFixed(2) || '0.00',
      entry.status === 'approved' ? t('approved') : entry.status === 'rejected' ? t('rejected') : t('pending'),
      entry.notes || '',
      entry.task_details || '',
      entry.requires_location_review ? 'Yes' : 'No',
      entry.geofence_distance_meters || 'N/A',
      entry.exceeds_max_hours ? 'Yes' : 'No',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `timesheet_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEmployeeName = (entry) => {
    const employee = employees.find(e => e.email === entry.employee_email);
    if (employee) {
      return getDisplayName(employee);
    }
    return entry.employee_name || entry.employee_email || 'Unknown';
  };

  const filteredEntries = statusFilter === 'all' 
    ? timeEntries 
    : timeEntries.filter(e => e.status === statusFilter);

  const pendingCount = timeEntries.filter(e => e.status === 'pending').length;
  const showApproveAll = statusFilter === 'pending' && pendingCount > 0;

  const statusConfig = {
    pending: { label: t('pending'), color: "bg-amber-100 text-amber-800 border-amber-300" },
    approved: { label: t('approved'), color: "bg-green-100 text-green-800 border-green-300" },
    rejected: { label: t('rejected'), color: "bg-red-100 text-red-800 border-red-300" }
  };

  if (loading) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">{t('loading')}...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-slate-900">
            {language === 'es' ? 'Registros de Horas' : 'Time Records'}
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-[#3B9FF3] text-white' : 'bg-white border-slate-200 text-slate-700'}
              >
                <Filter className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Todos' : 'All'} ({timeEntries.length})
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
                className={statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-white border-amber-200 text-amber-700'}
              >
                <Clock className="w-4 h-4 mr-2" />
                {t('pending')} ({pendingCount})
              </Button>
              <Button
                variant={statusFilter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('approved')}
                className={statusFilter === 'approved' ? 'bg-green-500 text-white' : 'bg-white border-green-200 text-green-700'}
              >
                <Check className="w-4 h-4 mr-2" />
                {t('approved')} ({timeEntries.filter(e => e.status === 'approved').length})
              </Button>
            </div>

            <Button
              onClick={handleExportToExcel}
              variant="outline"
              size="sm"
              className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              disabled={filteredEntries.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Exportar' : 'Export'}
            </Button>

            {showApproveAll && isAdmin && (
              <Button
                onClick={handleApproveAll}
                disabled={isApprovingAll}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
              >
                {isApprovingAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4 mr-2" />
                )}
                {language === 'es' ? 'Aprobar Todos' : 'Approve All'} ({pendingCount})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-slate-200">
                {isAdmin && (
                  <TableHead className="text-slate-700 font-semibold w-16">
                    {language === 'es' ? 'Auditoría' : 'Audit'}
                  </TableHead>
                )}
                <TableHead className="text-slate-700 font-semibold">
                  {language === 'es' ? 'Empleado' : 'Employee'}
                </TableHead>
                <TableHead className="text-slate-700 font-semibold">
                  {language === 'es' ? 'Fecha' : 'Date'}
                </TableHead>
                <TableHead className="text-slate-700 font-semibold">
                  {language === 'es' ? 'Trabajo' : 'Job'}
                </TableHead>
                <TableHead className="text-slate-700 font-semibold">
                  {language === 'es' ? 'Tipo' : 'Type'}
                </TableHead>
                <TableHead className="text-slate-700 font-semibold">
                  {language === 'es' ? 'Horas' : 'Hours'}
                </TableHead>
                <TableHead className="text-slate-700 font-semibold">
                  {language === 'es' ? 'Entrada/Salida' : 'Check In/Out'}
                </TableHead>
                <TableHead className="text-slate-700 font-semibold">
                  {language === 'es' ? 'Estado' : 'Status'}
                </TableHead>
                {isAdmin && (
                  <TableHead className="text-slate-700 font-semibold text-right">
                    {t('actions')}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 7} className="text-center py-12">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">
                      {statusFilter === 'pending' 
                        ? (language === 'es' ? 'No hay registros pendientes' : 'No pending records')
                        : (language === 'es' ? 'No hay registros de horas' : 'No time records')
                      }
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map(entry => {
                  const currentStatus = entry.status;
                  const displayStatus = statusConfig[currentStatus] || statusConfig.pending;

                  return (
                    <TableRow key={entry.id} className="hover:bg-slate-50 transition-colors">
                      {isAdmin && (
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex flex-col gap-1 items-center">
                              {entry.requires_location_review && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-white">
                                    <p className="text-xs">
                                      {language === 'es' 
                                        ? `⚠️ Ubicación: ${Math.round(entry.geofence_distance_meters || 0)}m del sitio`
                                        : `⚠️ Location: ${Math.round(entry.geofence_distance_meters || 0)}m from site`}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {entry.exceeds_max_hours && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-white">
                                    <p className="text-xs">
                                      {language === 'es' 
                                        ? '🚫 Excede 14 horas' 
                                        : '🚫 Exceeds 14 hours'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {entry.task_details && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="w-5 h-5 text-blue-600" />
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-slate-900 text-white max-w-xs">
                                    <p className="text-xs font-semibold mb-1">
                                      {language === 'es' ? 'Detalles de Tarea:' : 'Task Details:'}
                                    </p>
                                    <p className="text-xs">{entry.task_details}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      )}

                      <TableCell className="font-medium text-slate-900">
                        {getEmployeeName(entry)}
                      </TableCell>
                      <TableCell className="text-slate-700">
                        {format(new Date(entry.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-900">
                          <Briefcase className="w-4 h-4 text-[#3B9FF3]" />
                          <span className="truncate max-w-[200px]">{entry.job_name}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline" className={
                          entry.work_type === 'driving' ? 'bg-purple-100 border-purple-300 text-purple-800' :
                          entry.work_type === 'setup' ? 'bg-blue-100 border-blue-300 text-blue-800' :
                          entry.work_type === 'cleanup' ? 'bg-green-100 border-green-300 text-green-800' :
                          'bg-slate-100 border-slate-300 text-slate-800'
                        }>
                          {entry.work_type === 'driving' ? (language === 'es' ? 'Manejo' : 'Driving') :
                           entry.work_type === 'setup' ? 'Setup' :
                           entry.work_type === 'cleanup' ? 'Cleanup' :
                           (language === 'es' ? 'Normal' : 'Normal')}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="font-semibold text-slate-900">
                          {entry.hours_worked?.toFixed(2)}h
                        </div>
                        {entry.lunch_minutes > 0 && (
                          <div className="text-xs text-slate-600">
                            ({entry.lunch_minutes}min {language === 'es' ? 'pausa' : 'break'})
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-2 text-green-700">
                            <MapPin className="w-3 h-3" />
                            <span>{entry.check_in}</span>
                          </div>
                          {entry.check_out && (
                            <div className="flex items-center gap-2 text-red-700">
                              <MapPin className="w-3 h-3" />
                              <span>{entry.check_out}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={displayStatus.color}>
                          {displayStatus.label}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {entry.status === 'pending' ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(entry.id)}
                                  disabled={approveMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  {language === 'es' ? 'Aprobar' : 'Approve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(entry.id)}
                                  disabled={rejectMutation.isPending}
                                  className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  {language === 'es' ? 'Rechazar' : 'Reject'}
                                </Button>
                              </>
                            ) : (
                              <Badge variant="outline" className="text-slate-500 border-slate-300">
                                {entry.status === 'approved' 
                                  ? (language === 'es' ? 'Revisado' : 'Reviewed')
                                  : (language === 'es' ? 'Rechazado' : 'Rejected')
                                }
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}