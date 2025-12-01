import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Car, CheckCircle, XCircle, Calendar, MapPin, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function MileageApproval() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState({ open: false, log: null, notes: "" });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showMileageForm, setShowMileageForm] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
  });

  const { data: drivingLogs, isLoading } = useQuery({
    queryKey: ['drivingLogs'],
    queryFn: () => base44.entities.DrivingLog.list('-date'),
    initialData: [],
  });

  const [mileageFormData, setMileageFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    miles: '',
    hours: '',
    start_location: '',
    end_location: '',
    job_id: '',
    notes: ''
  });

  const createMileageMutation = useMutation({
    mutationFn: async (data) => {
      if (!selectedEmployee) {
        throw new Error("No employee selected for mileage creation.");
      }

      const miles = parseFloat(data.miles) || 0;
      const hours = parseFloat(data.hours) || 0;
      const ratePerMile = 0.60;
      const hourlyRate = parseFloat(selectedEmployee.hourly_rate || 25);
      const totalAmount = (miles * ratePerMile) + (hours * hourlyRate);
      const selectedJob = jobs.find(j => j.id === data.job_id);

      return base44.entities.DrivingLog.create({
        ...data,
        employee_email: selectedEmployee.email,
        employee_name: selectedEmployee.full_name || `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
        rate_per_mile: ratePerMile,
        total_amount: totalAmount,
        job_name: selectedJob?.name,
        status: 'pending'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivingLogs'] });
      setShowMileageForm(false);
      setShowCreateDialog(false);
      setSelectedEmployee(null);
      setMileageFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        miles: '',
        hours: '',
        start_location: '',
        end_location: '',
        job_id: '',
        notes: ''
      });
      alert('✅ ' + (language === 'es' ? 'Registro de millas creado!' : 'Mileage record created!'));
    },
    onError: (error) => {
      console.error("Error creating mileage record:", error);
      alert('❌ ' + (language === 'es' ? 'Error al crear registro: ' : 'Failed to create mileage record: ') + error.message);
    }
  });

  const approveMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.DrivingLog.update(id, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivingLogs'] });
      alert('✅ ' + (language === 'es' ? 'Millas aprobadas!' : 'Mileage approved!'));
    },
    onError: (error) => {
      console.error("Error approving mileage:", error);
      alert('❌ ' + (language === 'es' ? 'Error al aprobar: ' : 'Failed to approve mileage: ') + error.message);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }) => base44.entities.DrivingLog.update(id, {
      status: 'rejected',
      notes
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivingLogs'] });
      setRejectDialog({ open: false, log: null, notes: "" });
      alert('✅ ' + (language === 'es' ? 'Millas rechazadas' : 'Mileage rejected'));
    },
    onError: (error) => {
      console.error("Error rejecting mileage:", error);
      alert('❌ ' + (language === 'es' ? 'Error al rechazar: ' : 'Failed to reject mileage: ') + error.message);
    }
  });

  const handleApprove = (log) => {
    const message = language === 'es' 
      ? `¿Aprobar ${log.miles} millas para ${log.employee_name}?`
      : `Approve ${log.miles} miles for ${log.employee_name}?`;
    if (confirm(message)) {
      approveMutation.mutate({ id: log.id });
    }
  };

  const handleReject = () => {
    if (!rejectDialog.notes.trim()) {
      alert(language === 'es' ? 'Por favor proporciona una razón para el rechazo' : 'Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({
      id: rejectDialog.log.id,
      notes: rejectDialog.notes
    });
  };

  const handleSelectEmployee = () => {
    if (selectedEmployee) {
      setShowMileageForm(true);
    }
  };

  const handleSubmitMileage = (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      alert(language === 'es' ? 'Por favor selecciona un empleado.' : 'Please select an employee.');
      return;
    }
    if (!mileageFormData.job_id) {
      alert(language === 'es' ? 'Por favor selecciona un trabajo.' : 'Please select a job.');
      return;
    }
    const miles = parseFloat(mileageFormData.miles);
    const hours = parseFloat(mileageFormData.hours);
    if ((isNaN(miles) || miles <= 0) && (isNaN(hours) || hours <= 0)) {
      alert(language === 'es' ? 'Millas o Horas deben ser mayores a cero.' : 'Miles or Hours must be greater than zero.');
      return;
    }
    createMileageMutation.mutate(mileageFormData);
  };

  const activeEmployees = employees.filter(e => !e.employment_status || e.employment_status === 'active');
  const activeJobs = jobs.filter(j => j.status === 'active');

  const pendingLogs = drivingLogs.filter(d => d.status === 'pending');
  const approvedLogs = drivingLogs.filter(d => d.status === 'approved');

  const totalPendingMiles = pendingLogs.reduce((sum, d) => sum + (d.miles || 0), 0);
  const totalPendingAmount = pendingLogs.reduce((sum, d) => sum + (d.total_amount || 0), 0);
  const totalApprovedAmount = approvedLogs.reduce((sum, d) => sum + (d.total_amount || 0), 0);

  const statusConfig = {
    pending: { label: language === 'es' ? 'Pendiente' : 'Pending', color: "bg-amber-100 text-amber-700 border-amber-300" },
    approved: { label: language === 'es' ? 'Aprobado' : 'Approved', color: "bg-green-100 text-green-700 border-green-300" },
    rejected: { label: language === 'es' ? 'Rechazado' : 'Rejected', color: "bg-red-100 text-red-700 border-red-300" }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Aprobación de Millas' : 'Mileage Approval'}
          description={language === 'es' ? 'Revisar y aprobar reembolsos de millas' : 'Review and approve mileage reimbursements'}
          icon={Car}
          actions={
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              {language === 'es' ? 'Nueva Milla' : 'New Mileage'}
            </Button>
          }
        />

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg border-0 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90">{language === 'es' ? 'Pendientes' : 'Pending'}</p>
                  <p className="text-3xl font-bold text-white">{pendingLogs.length}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Car className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg border-0 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90">{language === 'es' ? 'Millas Pendientes' : 'Pending Miles'}</p>
                  <p className="text-3xl font-bold text-white">{totalPendingMiles.toFixed(0)} mi</p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg border-0 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90">{language === 'es' ? 'Monto Pendiente' : 'Pending Amount'}</p>
                  <p className="text-3xl font-bold text-white">${totalPendingAmount.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl">
                  <Car className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 shadow-lg border-0 hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white/90">{language === 'es' ? 'Total Aprobado' : 'Total Approved'}</p>
                  <p className="text-3xl font-bold text-white">${totalApprovedAmount.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-2xl">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white dark:bg-[#282828] shadow-xl border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-800">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Car className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
              {language === 'es' ? 'Registros de Millas' : 'Mileage Records'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full mb-3 bg-slate-100" />
                ))}
              </div>
            ) : drivingLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                {language === 'es' ? 'No hay registros de millas' : 'No mileage records'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Empleado' : 'Employee'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">{t('date')}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Desde' : 'From'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Hasta' : 'To'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">{t('job')}</TableHead>
                      <TableHead className="text-right text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Millas' : 'Miles'}</TableHead>
                      <TableHead className="text-right text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Tarifa' : 'Rate'}</TableHead>
                      <TableHead className="text-right text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Monto' : 'Amount'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">{t('status')}</TableHead>
                      <TableHead className="text-right text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivingLogs.map((log) => {
                      const config = statusConfig[log.status] || statusConfig.pending;
                      return (
                        <TableRow key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 border-slate-200 dark:border-slate-700">
                          <TableCell className="font-medium text-slate-900 dark:text-white">{log.employee_name}</TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300">
                            {format(new Date(log.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 text-sm">
                            {log.start_location || '-'}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-300 text-sm">
                            {log.end_location || '-'}
                          </TableCell>
                          <TableCell>
                            {log.job_name ? (
                              <span className="text-sm text-slate-900 dark:text-white font-medium">{log.job_name}</span>
                            ) : (
                              <span className="text-sm text-slate-500 dark:text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                            {log.miles} mi
                          </TableCell>
                          <TableCell className="text-right text-slate-600 dark:text-slate-400 text-sm">
                            ${log.rate_per_mile?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-[#3B9FF3] dark:text-blue-400">
                            ${log.total_amount?.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={config.color}>
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {log.status === 'pending' && user?.role === 'admin' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(log)}
                                  disabled={approveMutation.isPending}
                                  className="hover:bg-green-50 hover:text-green-700 text-slate-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  {language === 'es' ? 'Aprobar' : 'Approve'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRejectDialog({ open: true, log, notes: "" })}
                                  className="hover:bg-red-50 hover:text-red-700 text-slate-700"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  {language === 'es' ? 'Rechazar' : 'Reject'}
                                </Button>
                              </div>
                            )}
                            {log.status === 'rejected' && log.notes && (
                              <p className="text-xs text-red-600 text-right">{log.notes}</p>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Select Employee Dialog */}
        <Dialog open={showCreateDialog && !showMileageForm} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setSelectedEmployee(null);
          }
        }}>
          <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{t('selectEmployee')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-slate-700 font-medium mb-2 block">{t('employee')}</Label>
                <Select value={selectedEmployee?.id} onValueChange={(id) => {
                  const emp = activeEmployees.find(e => e.id === id);
                  setSelectedEmployee(emp);
                }}>
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue placeholder={t('selectEmployee')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {activeEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id} className="text-slate-900 hover:bg-slate-100">
                        {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleSelectEmployee}
                disabled={!selectedEmployee}
                className="w-full bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
              >
                {t('next')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mileage Form Dialog */}
        <Dialog open={showMileageForm} onOpenChange={(open) => {
          if (!open) {
            setShowMileageForm(false);
            setShowCreateDialog(false);
            setSelectedEmployee(null);
            setMileageFormData({
              date: format(new Date(), 'yyyy-MM-dd'),
              miles: '',
              hours: '',
              start_location: '',
              end_location: '',
              job_id: '',
              notes: ''
            });
          }
        }}>
          <DialogContent className="max-w-2xl bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {language === 'es' ? 'Nuevo Registro de Millas' : 'New Mileage Record'} - {selectedEmployee?.full_name || `${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitMileage} className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-medium">{t('date')}</Label>
                  <Input
                    type="date"
                    value={mileageFormData.date}
                    onChange={(e) => setMileageFormData({...mileageFormData, date: e.target.value})}
                    required
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium">{language === 'es' ? 'Millas' : 'Miles'} *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={mileageFormData.miles}
                    onChange={(e) => setMileageFormData({...mileageFormData, miles: e.target.value})}
                    placeholder="0.0"
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-medium">{language === 'es' ? 'Horas' : 'Hours'}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={mileageFormData.hours}
                  onChange={(e) => setMileageFormData({...mileageFormData, hours: e.target.value})}
                  placeholder="0.0"
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700 font-medium">{language === 'es' ? 'Ubicación de Inicio' : 'Start Location'}</Label>
                  <Input
                    value={mileageFormData.start_location}
                    onChange={(e) => setMileageFormData({...mileageFormData, start_location: e.target.value})}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-medium">{language === 'es' ? 'Ubicación de Destino' : 'End Location'}</Label>
                  <Input
                    value={mileageFormData.end_location}
                    onChange={(e) => setMileageFormData({...mileageFormData, end_location: e.target.value})}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-medium">{t('job')} *</Label>
                <Select
                  value={mileageFormData.job_id}
                  onValueChange={(value) => setMileageFormData({...mileageFormData, job_id: value})}
                  required
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                    <SelectValue placeholder={language === 'es' ? 'Seleccionar trabajo' : 'Select job'} />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {activeJobs.map(job => (
                      <SelectItem key={job.id} value={job.id} className="text-slate-900 hover:bg-slate-100">
                        {job.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-700 font-medium">{t('notes')}</Label>
                <Textarea
                  value={mileageFormData.notes}
                  onChange={(e) => setMileageFormData({...mileageFormData, notes: e.target.value})}
                  className="bg-white border-slate-300 text-slate-900"
                />
              </div>

              <DialogFooter className="pt-4 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowMileageForm(false);
                    setShowCreateDialog(false);
                    setSelectedEmployee(null);
                    setMileageFormData({
                      date: format(new Date(), 'yyyy-MM-dd'),
                      miles: '',
                      hours: '',
                      start_location: '',
                      end_location: '',
                      job_id: '',
                      notes: ''
                    });
                  }}
                  className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMileageMutation.isPending || !mileageFormData.job_id || (!parseFloat(mileageFormData.miles) && !parseFloat(mileageFormData.hours))}
                  className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
                >
                  {createMileageMutation.isPending ? (language === 'es' ? 'Guardando...' : 'Saving...') : t('save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              {language === 'es' ? 'Rechazar Millas' : 'Reject Mileage'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {rejectDialog.log && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <p className="text-slate-900 dark:text-white font-medium mb-2">
                  <strong>{rejectDialog.log.employee_name}</strong> - {rejectDialog.log.miles} {language === 'es' ? 'millas' : 'miles'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  ${rejectDialog.log.total_amount?.toFixed(2)} - {format(new Date(rejectDialog.log.date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300 font-medium">
                {language === 'es' ? 'Motivo del rechazo' : 'Reason for rejection'}
              </Label>
              <Textarea
                value={rejectDialog.notes}
                onChange={(e) => setRejectDialog({ ...rejectDialog, notes: e.target.value })}
                placeholder={language === 'es' ? 'Explica por qué se rechaza...' : 'Explain why this is rejected...'}
                className="h-24 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, log: null, notes: "" })}
              className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectDialog.notes.trim() || rejectMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {language === 'es' ? 'Rechazar' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
}