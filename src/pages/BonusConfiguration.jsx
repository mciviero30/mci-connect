import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Plus, Edit, Trash2, DollarSign, Percent, AlertTriangle, CheckCircle2, History } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";

export default function BonusConfiguration() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [editingBonus, setEditingBonus] = useState(null);
  const [selectedBonusForAudit, setSelectedBonusForAudit] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: bonuses, isLoading } = useQuery({
    queryKey: ['bonuses'],
    queryFn: () => base44.entities.BonusConfiguration.list('-created_date'),
    initialData: [],
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['bonusAuditLogs'],
    queryFn: () => base44.entities.BonusAuditLog.list('-change_timestamp', 100),
    initialData: []
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('name'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    initialData: [],
  });

  // ============================================
  // AUDIT MUTATION - Log all changes
  // ============================================
  const createAuditLogMutation = useMutation({
    mutationFn: (logData) => base44.entities.BonusAuditLog.create(logData)
  });

  // ============================================
  // CREATE MUTATION WITH AUDIT & VALIDATION
  // ============================================
  const createMutation = useMutation({
    mutationFn: async (data) => {
      // VALIDATION: For percentage bonuses, validate job has profit/revenue
      if (data.bonus_type === 'percentage') {
        const selectedJob = jobs.find(j => j.id === data.job_id);
        
        if (!selectedJob) {
          throw new Error('Selected job not found');
        }

        // Check if job has profit or revenue defined and > 0
        const hasValidBase = (selectedJob.profit && selectedJob.profit > 0) || 
                            (selectedJob.contract_amount && selectedJob.contract_amount > 0);

        if (!hasValidBase) {
          // Force status to inactive if no calculation base
          data.status = 'inactive';
          toast.error('Job has no profit/revenue base. Bonus set to Inactive.');
        }
      }

      // Create the bonus
      const newBonus = await base44.entities.BonusConfiguration.create(data);

      // AUDIT LOG: Record creation
      await createAuditLogMutation.mutateAsync({
        bonus_configuration_id: newBonus.id,
        action_type: 'created',
        changed_by_email: user.email,
        changed_by_name: user.full_name,
        previous_value: null,
        new_value: newBonus,
        change_timestamp: new Date().toISOString(),
        notes: `Bonus configuration created for ${data.employee_name} on ${data.job_name}`
      });

      return newBonus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonuses'] });
      queryClient.invalidateQueries({ queryKey: ['bonusAuditLogs'] });
      setShowDialog(false);
      setEditingBonus(null);
      toast.success('Bonus created and logged');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // ============================================
  // UPDATE MUTATION WITH AUDIT & VALIDATION
  // ============================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Get previous state for audit
      const previousBonus = bonuses.find(b => b.id === id);

      // VALIDATION: For percentage bonuses, validate job has profit/revenue
      if (data.bonus_type === 'percentage') {
        const selectedJob = jobs.find(j => j.id === data.job_id);
        
        if (selectedJob) {
          const hasValidBase = (selectedJob.profit && selectedJob.profit > 0) || 
                              (selectedJob.contract_amount && selectedJob.contract_amount > 0);

          if (!hasValidBase && data.status === 'active') {
            throw new Error('Cannot activate: Job has no profit/revenue base for percentage calculation');
          }
        }
      }

      // Update the bonus
      const updatedBonus = await base44.entities.BonusConfiguration.update(id, data);

      // AUDIT LOG: Record update
      await createAuditLogMutation.mutateAsync({
        bonus_configuration_id: id,
        action_type: 'updated',
        changed_by_email: user.email,
        changed_by_name: user.full_name,
        previous_value: previousBonus,
        new_value: updatedBonus,
        change_timestamp: new Date().toISOString(),
        notes: `Bonus configuration updated`
      });

      return updatedBonus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonuses'] });
      queryClient.invalidateQueries({ queryKey: ['bonusAuditLogs'] });
      setShowDialog(false);
      setEditingBonus(null);
      toast.success('Bonus updated and logged');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // ============================================
  // DELETE MUTATION WITH AUDIT
  // ============================================
  const deleteMutation = useMutation({
    mutationFn: async (bonus) => {
      // AUDIT LOG: Record deletion
      await createAuditLogMutation.mutateAsync({
        bonus_configuration_id: bonus.id,
        action_type: 'deleted',
        changed_by_email: user.email,
        changed_by_name: user.full_name,
        previous_value: bonus,
        new_value: null,
        change_timestamp: new Date().toISOString(),
        notes: `Bonus configuration deleted for ${bonus.employee_name}`
      });

      // Delete the bonus
      return base44.entities.BonusConfiguration.delete(bonus.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonuses'] });
      queryClient.invalidateQueries({ queryKey: ['bonusAuditLogs'] });
      toast.success('Bonus deleted and logged');
    }
  });

  const [formData, setFormData] = useState({
    job_id: '',
    job_name: '',
    employee_email: '',
    employee_name: '',
    bonus_type: 'percentage',
    bonus_value: 0,
    notes: '',
    status: 'active'
  });

  // Validation helper - check if job has valid calculation base
  const jobHasValidBase = useMemo(() => {
    if (!formData.job_id || formData.bonus_type !== 'percentage') return true;
    
    const selectedJob = jobs.find(j => j.id === formData.job_id);
    if (!selectedJob) return false;
    
    return (selectedJob.profit && selectedJob.profit > 0) || 
           (selectedJob.contract_amount && selectedJob.contract_amount > 0);
  }, [formData.job_id, formData.bonus_type, jobs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedJob = jobs.find(j => j.id === formData.job_id);
    const selectedEmployee = employees.find(e => e.email === formData.employee_email);
    
    const data = {
      ...formData,
      job_name: selectedJob?.name || '',
      employee_name: selectedEmployee?.full_name || ''
    };

    if (editingBonus) {
      updateMutation.mutate({ id: editingBonus.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (bonus) => {
    setEditingBonus(bonus);
    setFormData(bonus);
    setShowDialog(true);
  };

  const handleDelete = (bonus) => {
    if (window.confirm(`Delete bonus configuration for ${bonus.employee_name}?`)) {
      deleteMutation.mutate(bonus);
    }
  };

  const handleOpenDialog = () => {
    setEditingBonus(null);
    setFormData({
      job_id: '',
      job_name: '',
      employee_email: '',
      employee_name: '',
      bonus_type: 'percentage',
      bonus_value: 0,
      notes: '',
      status: 'active'
    });
    setShowDialog(true);
  };

  const handleViewAudit = (bonus) => {
    setSelectedBonusForAudit(bonus);
    setShowAuditDialog(true);
  };

  const activeBonuses = bonuses.filter(b => b.status === 'active');
  const relevantAuditLogs = selectedBonusForAudit 
    ? auditLogs.filter(log => log.bonus_configuration_id === selectedBonusForAudit.id)
    : [];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Bonus Configuration"
          description={`${activeBonuses.length} active bonus configurations`}
          icon={Award}
          actions={
            <Button onClick={handleOpenDialog} size="lg" className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/30">
              <Plus className="w-5 h-5 mr-2" />
              New Bonus
            </Button>
          }
        />

        {/* AUDIT NOTICE */}
        <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800">
          <History className="w-4 h-4 dark:text-blue-400" />
          <AlertDescription className="text-blue-900 dark:text-blue-300 text-sm">
            <strong>Audit Trail Active:</strong> All bonus creations, modifications, and deletions are automatically logged for payroll reporting and compliance.
          </AlertDescription>
        </Alert>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bonuses.map(bonus => {
            const bonusJob = jobs.find(j => j.id === bonus.job_id);
            const hasValidBase = bonusJob && (
              (bonusJob.profit && bonusJob.profit > 0) || 
              (bonusJob.contract_amount && bonusJob.contract_amount > 0)
            );
            const needsReview = bonus.bonus_type === 'percentage' && !hasValidBase;

            return (
              <Card key={bonus.id} className={`bg-white dark:bg-[#282828] shadow-lg hover:shadow-xl transition-all duration-300 ${
                needsReview ? 'border-amber-400' : 'border-slate-200 dark:border-slate-700'
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                        <CardTitle className="text-lg text-slate-900 dark:text-white">{bonus.employee_name}</CardTitle>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{bonus.job_name}</p>
                    </div>
                    <Badge className={
                      bonus.status === 'active' 
                        ? 'bg-green-100 border-green-300 text-green-700' 
                        : 'bg-slate-200 border-slate-300 text-slate-600'
                    }>
                      {bonus.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* VALIDATION ALERT */}
                  {needsReview && (
                    <Alert className="mb-4 bg-amber-50 border-amber-300">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription className="text-amber-800 text-xs">
                        Missing calculation base: Job has no profit/revenue defined. Bonus cannot be activated.
                      </AlertDescription>
                    </Alert>
                  )}

                  {hasValidBase && bonus.status === 'active' && bonus.bonus_type === 'percentage' && (
                    <Alert className="mb-4 bg-green-50 border-green-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <AlertDescription className="text-green-800 text-xs">
                        Calculation base verified: {bonusJob.profit ? `$${bonusJob.profit.toFixed(2)} profit` : `$${bonusJob.contract_amount.toFixed(2)} contract`}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-1">
                      {bonus.bonus_type === 'percentage' ? (
                        <Percent className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                      )}
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {bonus.bonus_type === 'percentage' ? 'Percentage of Profit' : 'Fixed Amount'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                      {bonus.bonus_type === 'percentage' ? `${bonus.bonus_value}%` : `$${bonus.bonus_value}`}
                    </p>
                  </div>

                  {bonus.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{bonus.notes}</p>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={() => handleEdit(bonus)} variant="outline" className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button onClick={() => handleViewAudit(bonus)} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                      <History className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => handleDelete(bonus)} variant="outline" className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* BONUS FORM DIALOG */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl dark:text-white">{editingBonus ? 'Edit Bonus' : 'New Bonus'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">Job *</Label>
                  <Select value={formData.job_id} onValueChange={(value) => setFormData({...formData, job_id: value})} required>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                      <SelectValue placeholder="Select job" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {jobs.filter(j => j.status === 'active').map(job => (
                        <SelectItem key={job.id} value={job.id} className="text-slate-900 hover:bg-slate-100">
                          {job.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700">Employee *</Label>
                  <Select value={formData.employee_email} onValueChange={(value) => setFormData({...formData, employee_email: value})} required>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {employees.filter(e => e.employment_status === 'active').map(emp => (
                        <SelectItem key={emp.id} value={emp.email} className="text-slate-900 hover:bg-slate-100">
                          {emp.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700">Bonus Type *</Label>
                  <Select value={formData.bonus_type} onValueChange={(value) => setFormData({...formData, bonus_type: value})} required>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="percentage" className="text-slate-900 hover:bg-slate-100">Percentage (%)</SelectItem>
                      <SelectItem value="fixed_amount" className="text-slate-900 hover:bg-slate-100">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700">Bonus Value *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.bonus_value}
                    onChange={(e) => setFormData({...formData, bonus_value: parseFloat(e.target.value)})}
                    className="bg-slate-50 border-slate-200 text-slate-900"
                    required
                  />
                </div>

                <div>
                  <Label className="text-slate-700">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({...formData, status: value})}
                    disabled={formData.bonus_type === 'percentage' && !jobHasValidBase && value === 'active'}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="active" className="text-slate-900 hover:bg-slate-100">Active</SelectItem>
                      <SelectItem value="inactive" className="text-slate-900 hover:bg-slate-100">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* VALIDATION WARNING IN FORM */}
                {formData.bonus_type === 'percentage' && !jobHasValidBase && (
                  <div className="md:col-span-2">
                    <Alert className="bg-amber-50 border-amber-300">
                      <AlertTriangle className="w-4 h-4" />
                      <AlertDescription className="text-amber-800 text-sm">
                        Selected job has no profit/revenue base. Bonus will be created as <strong>Inactive</strong> and cannot be activated until job has valid financial data.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <div className="md:col-span-2">
                  <Label className="text-slate-700">Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="bg-slate-50 border-slate-200 text-slate-900 h-24"
                    placeholder="Additional notes about this bonus configuration..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="bg-slate-50 border-slate-200 text-slate-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white">
                  {editingBonus ? 'Update Bonus' : 'Create Bonus'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* AUDIT TRAIL DIALOG */}
        <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
          <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">Bonus Audit Trail</DialogTitle>
              {selectedBonusForAudit && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedBonusForAudit.employee_name} - {selectedBonusForAudit.job_name}
                </p>
              )}
            </DialogHeader>

            <div className="space-y-3">
              {relevantAuditLogs.length === 0 && (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No audit logs available</p>
                </div>
              )}

              {relevantAuditLogs.map(log => (
                <div key={log.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={
                      log.action_type === 'created' ? 'bg-green-100 text-green-700' :
                      log.action_type === 'updated' ? 'bg-blue-100 text-blue-700' :
                      log.action_type === 'deleted' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {log.action_type}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {format(new Date(log.change_timestamp), 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mb-1">
                    <strong>By:</strong> {log.changed_by_name}
                  </p>
                  {log.notes && (
                    <p className="text-xs text-slate-600">{log.notes}</p>
                  )}
                  {log.action_type === 'updated' && log.previous_value && log.new_value && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-slate-500 font-semibold">Previous:</p>
                          <p className="text-slate-700">
                            {log.previous_value.bonus_type === 'percentage' 
                              ? `${log.previous_value.bonus_value}%` 
                              : `$${log.previous_value.bonus_value}`}
                          </p>
                          <p className="text-slate-600">Status: {log.previous_value.status}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 font-semibold">New:</p>
                          <p className="text-slate-700">
                            {log.new_value.bonus_type === 'percentage' 
                              ? `${log.new_value.bonus_value}%` 
                              : `$${log.new_value.bonus_value}`}
                          </p>
                          <p className="text-slate-600">Status: {log.new_value.status}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}