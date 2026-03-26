import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  FileCheck,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, differenceInDays } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function Submittals() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: submittals = [], isLoading } = useQuery({
    queryKey: ['submittals'],
    queryFn: () => base44.entities.Submittal.list('-created_date', 100),
    initialData: [],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs-for-submittals'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    initialData: [],
  });

  const isAdmin = user?.role === 'admin';

  const filteredSubmittals = submittals.filter(sub => {
    const matchesSearch = !searchTerm || 
      sub.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.submittal_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.job_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesType = typeFilter === 'all' || sub.submittal_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusMeta = (status) => {
    const meta = {
      draft: { label: 'Draft', color: 'soft-slate-bg', icon: Edit },
      submitted: { label: 'Submitted', color: 'soft-blue-bg', icon: Clock },
      under_review: { label: 'Under Review', color: 'soft-amber-bg', icon: Clock },
      approved: { label: 'Approved', color: 'soft-green-bg', icon: CheckCircle },
      approved_as_noted: { label: 'Approved as Noted', color: 'soft-cyan-bg', icon: CheckCircle },
      revise_resubmit: { label: 'Revise & Resubmit', color: 'soft-purple-bg', icon: AlertCircle },
      rejected: { label: 'Rejected', color: 'soft-red-bg', icon: XCircle },
      cancelled: { label: 'Cancelled', color: 'soft-slate-bg', icon: XCircle }
    };
    return meta[status] || meta.draft;
  };

  const getDaysUntilDue = (dateRequired) => {
    if (!dateRequired) return null;
    return differenceInDays(new Date(dateRequired), new Date());
  };

  const stats = {
    total: submittals.length,
    submitted: submittals.filter(s => s.status === 'submitted').length,
    underReview: submittals.filter(s => s.status === 'under_review').length,
    approved: submittals.filter(s => s.status === 'approved' || s.status === 'approved_as_noted').length,
    needsRevision: submittals.filter(s => s.status === 'revise_resubmit').length,
    overdue: submittals.filter(s => {
      if (!s.date_required || s.status === 'approved' || s.status === 'approved_as_noted') return false;
      return getDaysUntilDue(s.date_required) < 0;
    }).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Submittal Tracking"
          description="Product data, shop drawings, and material approvals"
          icon={FileCheck}
          actions={
            isAdmin && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Submittal
              </Button>
            )
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="soft-blue-gradient rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-600 uppercase mb-1">Total</p>
            <p className="text-3xl font-bold text-blue-800 dark:text-blue-700">{stats.total}</p>
          </div>
          <div className="soft-amber-gradient rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-600 uppercase mb-1">Submitted</p>
            <p className="text-3xl font-bold text-amber-800 dark:text-amber-700">{stats.submitted}</p>
          </div>
          <div className="soft-purple-gradient rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-purple-700 dark:text-purple-600 uppercase mb-1">Review</p>
            <p className="text-3xl font-bold text-purple-800 dark:text-purple-700">{stats.underReview}</p>
          </div>
          <div className="soft-green-gradient rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-green-700 dark:text-green-600 uppercase mb-1">Approved</p>
            <p className="text-3xl font-bold text-green-800 dark:text-green-700">{stats.approved}</p>
          </div>
          <div className="soft-cyan-gradient rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-cyan-700 dark:text-cyan-600 uppercase mb-1">Revision</p>
            <p className="text-3xl font-bold text-cyan-800 dark:text-cyan-700">{stats.needsRevision}</p>
          </div>
          <div className="soft-red-gradient rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-red-700 dark:text-red-600 uppercase mb-1">Overdue</p>
            <p className="text-3xl font-bold text-red-800 dark:text-red-700">{stats.overdue}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search submittals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="approved_as_noted">Approved as Noted</SelectItem>
                <SelectItem value="revise_resubmit">Revise & Resubmit</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="product_data">Product Data</SelectItem>
                <SelectItem value="shop_drawings">Shop Drawings</SelectItem>
                <SelectItem value="samples">Samples</SelectItem>
                <SelectItem value="test_reports">Test Reports</SelectItem>
                <SelectItem value="certifications">Certifications</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Submittal List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#507DB4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading submittals...</p>
          </div>
        ) : filteredSubmittals.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileCheck className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Submittals Found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Start by creating your first submittal'}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Submittal
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSubmittals.map((submittal) => {
              const statusMeta = getStatusMeta(submittal.status);
              const daysUntilDue = getDaysUntilDue(submittal.date_required);
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && 
                submittal.status !== 'approved' && submittal.status !== 'approved_as_noted';
              const StatusIcon = statusMeta.icon;

              return (
                <div
                  key={submittal.id}
                  onClick={() => navigate(createPageUrl(`VerSubmittal?id=${submittal.id}`))}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-500">{submittal.submittal_number || 'DRAFT'}</span>
                        {submittal.revision_number > 1 && (
                          <Badge className="soft-purple-bg">
                            Rev {submittal.revision_number}
                          </Badge>
                        )}
                        {isOverdue && (
                          <Badge className="soft-red-gradient animate-pulse">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        {submittal.title}
                      </h3>
                      {submittal.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                          {submittal.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{submittal.job_name}</span>
                        <span>• {submittal.submittal_type?.replace('_', ' ')}</span>
                        {submittal.manufacturer && <span>• {submittal.manufacturer}</span>}
                        {submittal.date_required && (
                          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                            • Due: {format(new Date(submittal.date_required), 'MMM dd')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={statusMeta.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusMeta.label}
                      </Badge>
                      {daysUntilDue !== null && !isOverdue && 
                       submittal.status !== 'approved' && submittal.status !== 'approved_as_noted' && (
                        <span className="text-xs text-slate-500">
                          {daysUntilDue} days left
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Submittal Dialog */}
      <CreateSubmittalDialog 
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        jobs={jobs}
        user={user}
      />
    </div>
  );
}

function CreateSubmittalDialog({ open, onClose, jobs, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    job_id: '',
    title: '',
    description: '',
    submittal_type: 'product_data',
    spec_section: '',
    manufacturer: '',
    model_number: '',
    date_required: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Submittal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submittals'] });
      onClose();
      setFormData({
        job_id: '',
        title: '',
        description: '',
        submittal_type: 'product_data',
        spec_section: '',
        manufacturer: '',
        model_number: '',
        date_required: ''
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const selectedJob = jobs.find(j => j.id === formData.job_id);
    
    // WRITE GUARD — user_id required for new records (legacy tolerated)
    const writeData = {
      ...formData,
      job_name: selectedJob?.name,
      submitted_by_user_id: user?.id, // NEW: Enforce user_id
      submitted_by: user?.email,
      submitted_by_name: user?.full_name,
      status: 'draft',
      revision_number: 1,
      ball_in_court: 'contractor'
    };

    if (!user?.id) {
    }

    createMutation.mutate(writeData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Submittal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Job</Label>
            <Select value={formData.job_id} onValueChange={(val) => setFormData({...formData, job_id: val})}>
              <SelectTrigger>
                <SelectValue placeholder="Select job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Roof Membrane Product Data"
              required
            />
          </div>

          <div>
            <Label>Type</Label>
            <Select value={formData.submittal_type} onValueChange={(val) => setFormData({...formData, submittal_type: val})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product_data">Product Data</SelectItem>
                <SelectItem value="shop_drawings">Shop Drawings</SelectItem>
                <SelectItem value="samples">Samples</SelectItem>
                <SelectItem value="design_data">Design Data</SelectItem>
                <SelectItem value="test_reports">Test Reports</SelectItem>
                <SelectItem value="certifications">Certifications</SelectItem>
                <SelectItem value="warranties">Warranties</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Manufacturer</Label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                placeholder="Manufacturer name"
              />
            </div>
            <div>
              <Label>Model/Product #</Label>
              <Input
                value={formData.model_number}
                onChange={(e) => setFormData({...formData, model_number: e.target.value})}
                placeholder="Model number"
              />
            </div>
          </div>

          <div>
            <Label>Response Required By</Label>
            <Input
              type="date"
              value={formData.date_required}
              onChange={(e) => setFormData({...formData, date_required: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Submittal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}