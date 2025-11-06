import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Plus, Edit, Trash2, DollarSign, Percent } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function BonusConfiguration() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingBonus, setEditingBonus] = useState(null);

  const { data: bonuses, isLoading } = useQuery({
    queryKey: ['bonuses'],
    queryFn: () => base44.entities.BonusConfiguration.list('-created_date'),
    initialData: [],
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BonusConfiguration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonuses'] });
      setShowDialog(false);
      setEditingBonus(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BonusConfiguration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonuses'] });
      setShowDialog(false);
      setEditingBonus(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BonusConfiguration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonuses'] });
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
      deleteMutation.mutate(bonus.id);
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

  const activeBonuses = bonuses.filter(b => b.status === 'active');

  return (
    <div className="p-4 md:p-8 min-h-screen">
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bonuses.map(bonus => (
            <Card key={bonus.id} className="glass-card shadow-xl hover:shadow-2xl hover:border-[#3B9FF3]/30 transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-[#3B9FF3]" />
                      <CardTitle className="text-lg text-white">{bonus.employee_name}</CardTitle>
                    </div>
                    <p className="text-sm text-slate-400 truncate">{bonus.job_name}</p>
                  </div>
                  <Badge className={
                    bonus.status === 'active' 
                      ? 'bg-[#3B9FF3]/20 border-[#3B9FF3] text-[#3B9FF3]' 
                      : 'bg-slate-700/50 border-slate-600 text-slate-300'
                  }>
                    {bonus.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    {bonus.bonus_type === 'percentage' ? (
                      <Percent className="w-5 h-5 text-[#3B9FF3]" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-[#3B9FF3]" />
                    )}
                    <span className="text-xs text-slate-400">
                      {bonus.bonus_type === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {bonus.bonus_type === 'percentage' ? `${bonus.bonus_value}%` : `$${bonus.bonus_value}`}
                  </p>
                </div>

                {bonus.notes && (
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">{bonus.notes}</p>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => handleEdit(bonus)} variant="outline" className="flex-1 bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={() => handleDelete(bonus)} variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">{editingBonus ? 'Edit Bonus' : 'New Bonus'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Job *</Label>
                  <Select value={formData.job_id} onValueChange={(value) => setFormData({...formData, job_id: value})} required>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select job" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      {jobs.filter(j => j.status === 'active').map(job => (
                        <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Employee *</Label>
                  <Select value={formData.employee_email} onValueChange={(value) => setFormData({...formData, employee_email: value})} required>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      {employees.filter(e => e.employment_status === 'active').map(emp => (
                        <SelectItem key={emp.id} value={emp.email}>{emp.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Bonus Type *</Label>
                  <Select value={formData.bonus_type} onValueChange={(value) => setFormData({...formData, bonus_type: value})} required>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Bonus Value *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.bonus_value}
                    onChange={(e) => setFormData({...formData, bonus_value: parseFloat(e.target.value)})}
                    className="bg-slate-800 border-slate-700 text-white"
                    required
                  />
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="bg-slate-800 border-slate-700 text-white h-24"
                    placeholder="Additional notes about this bonus configuration..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="bg-slate-800 border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white">
                  {editingBonus ? 'Update Bonus' : 'Create Bonus'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}