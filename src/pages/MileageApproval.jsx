
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
import StatsCard from "../components/shared/StatsCard";
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
  const [showCreateDialog, setShowCreateDialog] = useState(false); // Controls the employee selection dialog
  const [selectedEmployee, setSelectedEmployee] = useState(null); // Stores the selected employee for mileage/expense creation
  const [showMileageForm, setShowMileageForm] = useState(false); // Controls the mileage creation form dialog

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
    hours: '', // Added hours field
    start_location: '',
    end_location: '',
    job_id: '',
    notes: ''
  });

  const createMileageMutation = useMutation({
    mutationFn: async (data) => {
      // Ensure selectedEmployee is not null before proceeding
      if (!selectedEmployee) {
        throw new Error("No employee selected for mileage creation.");
      }

      const miles = parseFloat(data.miles) || 0;
      const hours = parseFloat(data.hours) || 0;
      const ratePerMile = 0.60; // Example fixed rate
      const hourlyRate = parseFloat(selectedEmployee.hourly_rate || 25); // Default hourly rate if not set for employee
      const totalAmount = (miles * ratePerMile) + (hours * hourlyRate);
      const selectedJob = jobs.find(j => j.id === data.job_id);

      return base44.entities.DrivingLog.create({
        ...data,
        employee_email: selectedEmployee.email,
        employee_name: selectedEmployee.full_name || `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
        rate_per_mile: ratePerMile,
        total_amount: totalAmount,
        job_name: selectedJob?.name,
        status: 'pending' // Admin created logs are pending by default
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivingLogs'] });
      setShowMileageForm(false);
      setShowCreateDialog(false); // Close both dialogs
      setSelectedEmployee(null); // Reset selected employee
      setMileageFormData({ // Reset form data
        date: format(new Date(), 'yyyy-MM-dd'),
        miles: '',
        hours: '',
        start_location: '',
        end_location: '',
        job_id: '',
        notes: ''
      });
      alert('✅ Mileage record created!');
    },
    onError: (error) => {
      console.error("Error creating mileage record:", error);
      alert('❌ Failed to create mileage record: ' + error.message);
    }
  });

  const approveMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.DrivingLog.update(id, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivingLogs'] });
      alert('✅ Mileage approved!');
    },
    onError: (error) => {
      console.error("Error approving mileage:", error);
      alert('❌ Failed to approve mileage: ' + error.message);
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
      alert('✅ Mileage rejected');
    },
    onError: (error) => {
      console.error("Error rejecting mileage:", error);
      alert('❌ Failed to reject mileage: ' + error.message);
    }
  });

  const handleApprove = (log) => {
    if (confirm(`Approve ${log.miles} miles for ${log.employee_name}?`)) {
      approveMutation.mutate({ id: log.id });
    }
  };

  const handleReject = () => {
    if (!rejectDialog.notes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({
      id: rejectDialog.log.id,
      notes: rejectDialog.notes
    });
  };

  const handleSelectEmployee = () => {
    if (selectedEmployee) {
      setShowMileageForm(true); // Open the mileage form
    }
  };

  const handleSubmitMileage = (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      alert('Please select an employee.');
      return;
    }
    if (!mileageFormData.job_id) {
      alert('Please select a job.');
      return;
    }
    const miles = parseFloat(mileageFormData.miles);
    const hours = parseFloat(mileageFormData.hours);
    if ((isNaN(miles) || miles <= 0) && (isNaN(hours) || hours <= 0)) {
      alert('Miles or Hours must be greater than zero.');
      return;
    }
    createMileageMutation.mutate(mileageFormData);
  };

  // Filter active employees and jobs
  const activeEmployees = employees.filter(e => !e.employment_status || e.employment_status === 'active');
  const activeJobs = jobs.filter(j => j.status === 'active');

  const pendingLogs = drivingLogs.filter(d => d.status === 'pending');
  const approvedLogs = drivingLogs.filter(d => d.status === 'approved');
  const rejectedLogs = drivingLogs.filter(d => d.status === 'rejected');

  const totalPendingMiles = pendingLogs.reduce((sum, d) => sum + (d.miles || 0), 0);
  const totalPendingAmount = pendingLogs.reduce((sum, d) => sum + (d.total_amount || 0), 0);
  const totalApprovedAmount = approvedLogs.reduce((sum, d) => sum + (d.total_amount || 0), 0);

  const statusConfig = {
    pending: { label: language === 'es' ? 'Pendiente' : 'Pending', color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    approved: { label: language === 'es' ? 'Aprobado' : 'Approved', color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
    rejected: { label: language === 'es' ? 'Rechazado' : 'Rejected', color: "bg-red-500/20 text-red-400 border-red-500/30" }
  };

  return (
    <div className="min-h-screen p-4 md:p-8" style={{background: 'linear-gradient(135deg, #0f1117 0%, #1a1d29 100%)'}}>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Aprobación de Millas' : 'Mileage Approval'}
          description={language === 'es' ? 'Revisar y aprobar reembolsos de millas' : 'Review and approve mileage reimbursements'}
          icon={Car}
          actions={
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/30"
            >
              <Plus className="w-5 h-5 mr-2" />
              {language === 'es' ? 'Nueva Milla' : 'New Mileage'}
            </Button>
          }
        />

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title={language === 'es' ? 'Pendientes' : 'Pending'}
            value={pendingLogs.length}
            icon={Car}
            color="from-amber-500 to-amber-600"
            loading={isLoading}
          />
          <StatsCard
            title={language === 'es' ? 'Millas Pendientes' : 'Pending Miles'}
            value={`${totalPendingMiles.toFixed(0)} mi`}
            icon={MapPin}
            color="from-slate-600 to-slate-700"
            loading={isLoading}
          />
          <StatsCard
            title={language === 'es' ? 'Monto Pendiente' : 'Pending Amount'}
            value={`$${totalPendingAmount.toFixed(2)}`}
            icon={Car}
            color="from-amber-500 to-amber-600"
            loading={isLoading}
          />
          <StatsCard
            title={language === 'es' ? 'Total Aprobado' : 'Total Approved'}
            value={`$${totalApprovedAmount.toFixed(2)}`}
            icon={CheckCircle}
            color="from-[#3B9FF3] to-[#2A8FE3]"
            loading={isLoading}
          />
        </div>

        <Card className="glass-card shadow-xl border-slate-800">
          <CardHeader className="border-b border-slate-800">
            <CardTitle className="flex items-center gap-2 text-white">
              <Car className="w-5 h-5 text-[#3B9FF3]" />
              {language === 'es' ? 'Registros de Millas' : 'Mileage Records'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full mb-3 bg-slate-800" />
                ))}
              </div>
            ) : drivingLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                {language === 'es' ? 'No hay registros de millas' : 'No mileage records'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800/50 border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-300">{language === 'es' ? 'Empleado' : 'Employee'}</TableHead>
                      <TableHead className="text-slate-300">{t('date')}</TableHead>
                      <TableHead className="text-slate-300">{language === 'es' ? 'Desde' : 'From'}</TableHead>
                      <TableHead className="text-slate-300">{language === 'es' ? 'Hasta' : 'To'}</TableHead>
                      <TableHead className="text-slate-300">{t('job')}</TableHead>
                      <TableHead className="text-right text-slate-300">{language === 'es' ? 'Millas' : 'Miles'}</TableHead>
                      <TableHead className="text-right text-slate-300">{language === 'es' ? 'Tarifa' : 'Rate'}</TableHead>
                      <TableHead className="text-right text-slate-300">{language === 'es' ? 'Monto' : 'Amount'}</TableHead>
                      <TableHead className="text-slate-300">{t('status')}</TableHead>
                      <TableHead className="text-right text-slate-300">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivingLogs.map((log) => {
                      const config = statusConfig[log.status] || statusConfig.pending;
                      return (
                        <TableRow key={log.id} className="hover:bg-slate-800/30 border-slate-800">
                          <TableCell className="font-medium text-white">{log.employee_name}</TableCell>
                          <TableCell className="text-slate-300">
                            {format(new Date(log.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {log.start_location || '-'}
                          </TableCell>
                          <TableCell className="text-slate-300 text-sm">
                            {log.end_location || '-'}
                          </TableCell>
                          <TableCell>
                            {log.job_name ? (
                              <span className="text-sm text-slate-300">{log.job_name}</span>
                            ) : (
                              <span className="text-sm text-slate-600">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-white">
                            {log.miles} mi
                          </TableCell>
                          <TableCell className="text-right text-slate-400 text-sm">
                            ${log.rate_per_mile?.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-[#3B9FF3]">
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
                                  className="hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  {language === 'es' ? 'Aprobar' : 'Approve'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRejectDialog({ open: true, log, notes: "" })}
                                  className="hover:bg-red-500/20 hover:text-red-400 text-slate-300"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  {language === 'es' ? 'Rechazar' : 'Reject'}
                                </Button>
                              </div>
                            )}
                            {log.status === 'rejected' && log.notes && (
                              <p className="text-xs text-red-400 text-right">{log.notes}</p>
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
        {/* This dialog is the first step for creating a new mileage record */}
        <Dialog open={showCreateDialog && !showMileageForm} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setSelectedEmployee(null);
          }
        }}>
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">{t('selectEmployee')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-slate-300 mb-2 block">{t('employee')}</Label>
                <Select value={selectedEmployee?.id} onValueChange={(id) => {
                  const emp = activeEmployees.find(e => e.id === id);
                  setSelectedEmployee(emp);
                }}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder={t('selectEmployee')} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {activeEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id} className="text-white hover:bg-slate-700">
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
        {/* This dialog opens after an employee is selected */}
        <Dialog open={showMileageForm} onOpenChange={(open) => {
          if (!open) {
            setShowMileageForm(false);
            setShowCreateDialog(false); // Close the initial dialog context as well
            setSelectedEmployee(null); // Reset selected employee
            setMileageFormData({ // Reset form data
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
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-white">
                {language === 'es' ? 'Nuevo Registro de Millas' : 'New Mileage Record'} - {selectedEmployee?.full_name || `${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitMileage} className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">{t('date')}</Label>
                  <Input
                    type="date"
                    value={mileageFormData.date}
                    onChange={(e) => setMileageFormData({...mileageFormData, date: e.target.value})}
                    required
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">{language === 'es' ? 'Millas' : 'Miles'} *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={mileageFormData.miles}
                    onChange={(e) => setMileageFormData({...mileageFormData, miles: e.target.value})}
                    placeholder="0.0"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">{language === 'es' ? 'Horas' : 'Hours'}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={mileageFormData.hours}
                    onChange={(e) => setMileageFormData({...mileageFormData, hours: e.target.value})}
                    placeholder="0.0"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">{language === 'es' ? 'Ubicación de Inicio' : 'Start Location'}</Label>
                  <Input
                    value={mileageFormData.start_location}
                    onChange={(e) => setMileageFormData({...mileageFormData, start_location: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">{language === 'es' ? 'Ubicación de Destino' : 'End Location'}</Label>
                  <Input
                    value={mileageFormData.end_location}
                    onChange={(e) => setMileageFormData({...mileageFormData, end_location: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">{t('job')} *</Label>
                <Select
                  value={mileageFormData.job_id}
                  onValueChange={(value) => setMileageFormData({...mileageFormData, job_id: value})}
                  required
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder={language === 'es' ? 'Seleccionar trabajo' : 'Select job'} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {activeJobs.map(job => (
                      <SelectItem key={job.id} value={job.id} className="text-white hover:bg-slate-700">
                        {job.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">{t('notes')}</Label>
                <Textarea
                  value={mileageFormData.notes}
                  onChange={(e) => setMileageFormData({...mileageFormData, notes: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowMileageForm(false);
                    setShowCreateDialog(false); // Reset all relevant state
                    setSelectedEmployee(null);
                    setMileageFormData({ // Reset form data
                      date: format(new Date(), 'yyyy-MM-dd'),
                      miles: '',
                      hours: '',
                      start_location: '',
                      end_location: '',
                      job_id: '',
                      notes: ''
                    });
                  }}
                  className="bg-slate-800 border-slate-700 text-white"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={createMileageMutation.isPending || !mileageFormData.job_id || (!parseFloat(mileageFormData.miles) && !parseFloat(mileageFormData.hours))}
                  className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
                >
                  {createMileageMutation.isPending ? t('saving') : t('save')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      {/* Reject Dialog - existing code */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {language === 'es' ? 'Rechazar Millas' : 'Reject Mileage'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {rejectDialog.log && (
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <p className="text-white mb-2">
                  <strong>{rejectDialog.log.employee_name}</strong> - {rejectDialog.log.miles} {language === 'es' ? 'millas' : 'miles'}
                </p>
                <p className="text-sm text-slate-400">
                  ${rejectDialog.log.total_amount?.toFixed(2)} - {format(new Date(rejectDialog.log.date), 'MMM dd, yyyy')}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-slate-300">
                {language === 'es' ? 'Motivo del rechazo' : 'Reason for rejection'}
              </Label>
              <Textarea
                value={rejectDialog.notes}
                onChange={(e) => setRejectDialog({ ...rejectDialog, notes: e.target.value })}
                placeholder={language === 'es' ? 'Explica por qué se rechaza...' : 'Explain why this is rejected...'}
                className="h-24 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog({ open: false, log: null, notes: "" })}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleReject}
              disabled={!rejectDialog.notes.trim() || rejectMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
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
