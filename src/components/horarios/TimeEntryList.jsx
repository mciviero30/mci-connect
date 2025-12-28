import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X, MapPin, Clock, Briefcase, Filter, CheckCheck, Loader2, Download, AlertTriangle, Info, Edit, Save, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { getDisplayName } from '@/components/utils/nameHelpers';
import { notifyTimesheetStatus } from '../notifications/notificationHelpers';
import { canCreateTimeEntry } from "../trabajos/JobStatusValidator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";

export default function TimeEntryList({ timeEntries, onApproveEntry, onRejectEntry, isAdmin = false, loading }) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    check_in: '',
    check_out: '',
    job_id: '',
    correction_reason: ''
  });
  const toast = useToast();

  // State to support time entry creation form (not fully implemented in this file's UI, but required for outline changes)
  const [formData, setFormData] = useState({
    job_id: null,
    // Add other fields relevant to time entry creation if this component were to include a form
    // For now, only job_id is needed for the validation logic provided in the outline
  });
  const [showDialog, setShowDialog] = useState(false); // To support `setShowDialog(false)` in createMutation

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    initialData: [],
  });

  // Fetch jobs for validation
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: []
  });

  // approveMutation and rejectMutation hooks are removed as their logic is handled by onApproveEntry/onRejectEntry props
  // and the notification is added within handleApprove/handleReject

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // VALIDATION: Check if job allows new time entries
      if (data.job_id) {
        const job = jobs.find(j => j.id === data.job_id);
        const validation = canCreateTimeEntry(job);
        
        if (!validation.allowed) {
          throw new Error(validation.reason);
        }
      }

      return base44.entities.TimeEntry.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] }); // Invalidate current user's entries too
      setShowDialog(false); // Assuming a dialog exists for creation
      toast.success(t('timeEntryCreated', { defaultValue: 'Time entry created successfully!' }));
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const approveMutation = useMutation({
    mutationFn: (entry) => base44.entities.TimeEntry.update(entry.id, { 
      status: 'approved',
      approved_date: new Date().toISOString(),
      is_locked: true,
      ready_for_payment: true
    }),
    onSuccess: async (_, entry) => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      toast.success(t('approved'));
      
      try {
        // Create notification for the employee
        await base44.entities.Notification.create({
          recipient_email: entry.employee_email,
          recipient_name: entry.employee_name,
          title: '✅ Timecard Approved - Ready for Payment',
          message: `Your hours for ${entry.date} (${entry.hours_worked?.toFixed(1)}h) have been approved and are ready for payment.`,
          type: 'payroll_approval',
          priority: 'high',
          link: '/page/MyPayroll',
          related_entity_id: entry.id,
          related_entity_type: 'timeentry',
          read: false
        });

        // Send browser notification
        if (Notification.permission === 'granted') {
          new Notification('✅ Timecard Approved', {
            body: `${entry.hours_worked?.toFixed(1)}h ready for payment - ${entry.date}`,
            icon: '/logo192.png',
            badge: '/badge-icon.png',
            tag: `timecard_${entry.id}`,
            requireInteraction: false,
            vibrate: [200, 100, 200]
          });
        }

        await notifyTimesheetStatus(entry, 'approved', null);
      } catch (error) {
        console.error('Notification failed:', error);
      }
    }
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ entryId, updates, reason }) => {
      // Log the manual correction
      const changeLog = {
        edited_by: (await base44.auth.me()).email,
        edited_at: new Date().toISOString(),
        reason: reason,
        changes: updates
      };
      
      // Update the time entry with correction log
      return base44.entities.TimeEntry.update(entryId, {
        ...updates,
        manual_corrections: changeLog,
        last_modified: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      toast.success(language === 'es' ? 'Entrada actualizada correctamente' : 'Entry updated successfully');
      setEditDialogOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (entry) => base44.entities.TimeEntry.update(entry.id, { status: 'rejected' }),
    onSuccess: async (_, entry) => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      toast.success(t('rejected'));
      
      try {
        // Create notification for rejection
        await base44.entities.Notification.create({
          recipient_email: entry.employee_email,
          recipient_name: entry.employee_name,
          title: '❌ Timecard Rejected - Needs Review',
          message: `Your hours for ${entry.date} have been rejected. Please check with your manager.`,
          type: 'timesheet_rejected',
          priority: 'high',
          link: '/page/MisHoras',
          related_entity_id: entry.id,
          related_entity_type: 'timeentry',
          read: false
        });

        await notifyTimesheetStatus(entry, 'rejected', null);
      } catch (error) {
        console.error('Notification failed:', error);
      }
    }
  });

  const handleApprove = (entry) => {
    if (window.confirm(language === 'es' ? '¿Aprobar estas horas?' : 'Approve these hours?')) {
      approveMutation.mutate(entry);
    }
  };

  const handleReject = (entry) => {
    if (window.confirm(language === 'es' ? '¿Rechazar estas horas?' : 'Reject these hours?')) {
      rejectMutation.mutate(entry);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setEditFormData({
      check_in: entry.check_in || '',
      check_out: entry.check_out || '',
      job_id: entry.job_id || '',
      correction_reason: ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editFormData.correction_reason.trim()) {
      toast.error(language === 'es' ? 'Por favor ingrese la razón de la corrección' : 'Please enter correction reason');
      return;
    }

    const updates = {
      check_in: editFormData.check_in,
      check_out: editFormData.check_out,
      job_id: editFormData.job_id
    };

    // Recalculate hours if times changed
    if (editFormData.check_in && editFormData.check_out) {
      const [inH, inM, inS] = editFormData.check_in.split(':').map(Number);
      const [outH, outM, outS] = editFormData.check_out.split(':').map(Number);
      const hoursWorked = (outH + outM/60 + outS/3600) - (inH + inM/60 + inS/3600);
      updates.hours_worked = Math.max(0, hoursWorked - ((editingEntry.lunch_minutes || 0) / 60));
    }

    updateEntryMutation.mutate({
      entryId: editingEntry.id,
      updates,
      reason: editFormData.correction_reason
    });
  };

  const handleApproveAll = async () => {
    const pendingEntries = filteredEntries.filter(e => e.status === 'pending');
    
    if (pendingEntries.length === 0) {
      alert(language === 'es' ? 'No hay entradas pendientes para aprobar' : 'No pending entries to approve');
      return;
    }

    const confirmed = window.confirm(
      language === 'es' 
        ? `¿Aprobar ${pendingEntries.length} entradas pendientes? Todas serán marcadas como "Listas para Pago".` 
        : `Approve ${pendingEntries.length} pending entries? All will be marked "Ready for Payment".`
    );

    if (!confirmed) return;

    setIsApprovingAll(true);
    try {
      for (const entry of pendingEntries) {
        await base44.entities.TimeEntry.update(entry.id, { 
          status: 'approved',
          approved_date: new Date().toISOString(),
          is_locked: true,
          ready_for_payment: true
        });
        try {
          await notifyTimesheetStatus(entry, 'approved', null);
        } catch (error) {
          console.error(`Failed to send notification for entry ${entry.id}:`, error);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      alert(language === 'es' 
        ? `✅ ${pendingEntries.length} entradas aprobadas - Listas para Pago` 
        : `✅ ${pendingEntries.length} entries approved - Ready for Payment`
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
    pending: { label: t('pending'), color: "bg-amber-50 text-amber-900 border-2 border-amber-400 shadow-sm" },
    approved: { label: language === 'es' ? '✓ Listo para Pago' : '✓ Ready for Payment', color: "bg-green-50 text-green-900 border-2 border-green-400 shadow-sm" },
    rejected: { label: t('rejected'), color: "bg-red-50 text-red-900 border-2 border-red-400 shadow-sm" }
  };

  // Group entries by employee for breakdown
  const employeeBreakdown = filteredEntries.reduce((acc, entry) => {
    const empEmail = entry.employee_email;
    if (!acc[empEmail]) {
      acc[empEmail] = {
        name: entry.employee_name,
        email: empEmail,
        totalHours: 0,
        regularHours: 0,
        overtimeHours: 0,
        jobs: {},
        entries: []
      };
    }
    
    const hours = entry.hours_worked || 0;
    acc[empEmail].totalHours += hours;
    
    // Calculate regular vs OT (assuming 40h/week threshold)
    if (acc[empEmail].regularHours < 40) {
      const regularToAdd = Math.min(hours, 40 - acc[empEmail].regularHours);
      acc[empEmail].regularHours += regularToAdd;
      acc[empEmail].overtimeHours += Math.max(0, hours - regularToAdd);
    } else {
      acc[empEmail].overtimeHours += hours;
    }
    
    // Track by job
    const jobName = entry.job_name || 'Unknown';
    if (!acc[empEmail].jobs[jobName]) {
      acc[empEmail].jobs[jobName] = 0;
    }
    acc[empEmail].jobs[jobName] += hours;
    
    acc[empEmail].entries.push(entry);
    return acc;
  }, {});

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

  // Validation for the (hypothetical) time entry creation form
  const selectedJob = jobs.find(j => j.id === formData.job_id);
  const validation = canCreateTimeEntry(selectedJob);

  return (
    <div className="space-y-4">
      {formData.job_id && !validation.allowed && (
        <Alert className="mb-4 bg-red-50 border-red-300">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-red-800 text-sm">
            {validation.reason}
          </AlertDescription>
        </Alert>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white text-xl font-bold">
              {language === 'es' ? 'Editar Entrada de Tiempo' : 'Edit Time Entry'}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {language === 'es' 
                ? 'Modifica la entrada y proporciona una razón para el registro de auditoría'
                : 'Modify the entry and provide a reason for audit logging'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                  {language === 'es' ? 'Hora de Entrada' : 'Check In Time'}
                </Label>
                <Input
                  type="time"
                  value={editFormData.check_in}
                  onChange={(e) => setEditFormData({...editFormData, check_in: e.target.value})}
                  className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                  {language === 'es' ? 'Hora de Salida' : 'Check Out Time'}
                </Label>
                <Input
                  type="time"
                  value={editFormData.check_out}
                  onChange={(e) => setEditFormData({...editFormData, check_out: e.target.value})}
                  className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                {language === 'es' ? 'Trabajo' : 'Job'}
              </Label>
              <Select value={editFormData.job_id} onValueChange={(value) => setEditFormData({...editFormData, job_id: value})}>
                <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl">
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id} className="cursor-pointer">
                      {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                {language === 'es' ? 'Razón de la Corrección *' : 'Correction Reason *'}
              </Label>
              <Textarea
                value={editFormData.correction_reason}
                onChange={(e) => setEditFormData({...editFormData, correction_reason: e.target.value})}
                placeholder={language === 'es' ? 'Ej: Olvidó registrar salida, error en selección de trabajo...' : 'E.g: Forgot to clock out, wrong job selection...'}
                className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded-xl min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={updateEntryMutation.isPending || !editFormData.correction_reason.trim()}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md rounded-xl"
            >
              {updateEntryMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {language === 'es' ? 'Guardando...' : 'Saving...'}</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> {language === 'es' ? 'Guardar Cambios' : 'Save Changes'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 rounded-2xl">
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
                  className={statusFilter === 'all' ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-md' : 'bg-white border-slate-200 text-slate-700'}
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
                  className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md rounded-xl"
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
                <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200">
                  {isAdmin && (
                    <TableHead className="text-slate-700 dark:text-slate-300 font-bold w-16">
                      {language === 'es' ? 'Auditoría' : 'Audit'}
                    </TableHead>
                  )}
                  <TableHead className="text-slate-700 dark:text-slate-300 font-bold">
                    {language === 'es' ? 'Empleado' : 'Employee'}
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-300 font-bold">
                    {language === 'es' ? 'Total Hrs' : 'Total Hrs'}
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-300 font-bold">
                    {language === 'es' ? 'Regular' : 'Regular'}
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-300 font-bold">
                    {language === 'es' ? 'OT' : 'OT'}
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-300 font-bold">
                    {language === 'es' ? 'Breakdown por Job' : 'Job Breakdown'}
                  </TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-300 font-bold">
                    {language === 'es' ? 'Estado' : 'Status'}
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="text-slate-700 dark:text-slate-300 font-bold text-right">
                      {t('actions')}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(employeeBreakdown).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12">
                      <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">
                        {statusFilter === 'pending' 
                          ? (language === 'es' ? 'No hay registros pendientes' : 'No pending records')
                          : (language === 'es' ? 'No hay registros de horas' : 'No time records')
                        }
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.values(employeeBreakdown).flatMap(empData => {
                    // Get the first entry to determine overall status
                    const firstEntry = empData.entries[0];
                    const hasAnyPending = empData.entries.some(e => e.status === 'pending');
                    const allApproved = empData.entries.every(e => e.status === 'approved');
                    const currentStatus = allApproved ? 'approved' : (hasAnyPending ? 'pending' : 'rejected');
                    const displayStatus = statusConfig[currentStatus] || statusConfig.pending;

                    return [
                        <TableRow key={`${empData.email}-summary`} className="bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border-t-2 border-slate-300 dark:border-slate-600">
                          {isAdmin && (
                            <TableCell>
                              <TooltipProvider>
                                <div className="flex flex-col gap-1 items-center">
                                  {empData.entries.some(e => e.requires_location_review) && (
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 text-white">
                                        <p className="text-xs">{language === 'es' ? '⚠️ Tiene alertas de ubicación' : '⚠️ Has location alerts'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TooltipProvider>
                            </TableCell>
                          )}

                          <TableCell className="font-bold text-slate-900 dark:text-white">
                            {empData.name || empData.email}
                          </TableCell>

                          <TableCell>
                            <div className="font-bold text-lg text-indigo-600 dark:text-indigo-400">
                              {empData.totalHours.toFixed(1)}h
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="font-semibold text-green-700 dark:text-green-400">
                              {empData.regularHours.toFixed(1)}h
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="font-semibold text-amber-700 dark:text-amber-400">
                              {empData.overtimeHours.toFixed(1)}h
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(empData.jobs).map(([jobName, hours]) => (
                                <TooltipProvider key={jobName}>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge className="bg-blue-50/60 text-[#507DB4] border border-blue-200/40 px-2 py-0.5 rounded-full text-xs font-semibold">
                                        {jobName.substring(0, 15)}{jobName.length > 15 ? '...' : ''}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">{jobName}: {hours.toFixed(1)}h</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
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
                                {hasAnyPending && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        empData.entries.filter(e => e.status === 'pending').forEach(e => handleApprove(e));
                                      }}
                                      className="soft-green-gradient text-white rounded-xl shadow-md"
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      {language === 'es' ? 'Aprobar' : 'Approve'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(firstEntry)}
                                      className="border-[#507DB4]/30 text-[#507DB4] hover:bg-blue-50/30 dark:border-[#507DB4]/40 dark:text-[#6B9DD8] dark:hover:bg-blue-900/10 rounded-xl"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>

                        ,
                        ...empData.entries.map(entry => (
                          <TableRow key={entry.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
                            {isAdmin && <TableCell className="pl-8"></TableCell>}
                            <TableCell className="pl-8 text-slate-600 dark:text-slate-400">
                              {format(new Date(entry.date), 'MMM dd')}
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">
                              {entry.hours_worked?.toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-slate-500 dark:text-slate-500">-</TableCell>
                            <TableCell className="text-slate-500 dark:text-slate-500">-</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <Briefcase className="w-3 h-3 text-indigo-500" />
                                <span className="text-xs truncate max-w-[150px]">{entry.job_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs space-y-0.5">
                                <div className="text-green-600 dark:text-green-400">{entry.check_in}</div>
                                {entry.check_out && <div className="text-red-600 dark:text-red-400">{entry.check_out}</div>}
                              </div>
                            </TableCell>
                            {isAdmin && (
                              <TableCell>
                                {entry.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEdit(entry)}
                                    className="text-[#507DB4] hover:text-[#507DB4]/90 hover:bg-blue-50/30 dark:text-[#6B9DD8] dark:hover:bg-blue-900/10 rounded-lg"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                    ];
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}