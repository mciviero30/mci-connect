import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  FileQuestion,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  Filter,
  Calendar
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

export default function RFIs() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: rfis = [], isLoading } = useQuery({
    queryKey: ['rfis'],
    queryFn: () => base44.entities.RFI.list('-created_date', 100),
    initialData: [],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs-for-rfis'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    initialData: [],
  });

  const isAdmin = user?.role === 'admin';

  const filteredRFIs = rfis.filter(rfi => {
    const matchesSearch = !searchTerm || 
      rfi.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfi.rfi_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfi.job_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || rfi.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || rfi.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusMeta = (status) => {
    const meta = {
      draft: { label: 'Draft', color: 'soft-slate-bg', icon: Edit },
      submitted: { label: 'Submitted', color: 'soft-blue-bg', icon: Clock },
      under_review: { label: 'Under Review', color: 'soft-amber-bg', icon: AlertCircle },
      answered: { label: 'Answered', color: 'soft-green-bg', icon: CheckCircle },
      closed: { label: 'Closed', color: 'soft-slate-bg', icon: CheckCircle },
      cancelled: { label: 'Cancelled', color: 'soft-red-bg', icon: AlertCircle }
    };
    return meta[status] || meta.draft;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'soft-blue-bg',
      medium: 'soft-amber-bg',
      high: 'soft-red-bg',
      critical: 'soft-red-gradient'
    };
    return colors[priority] || colors.medium;
  };

  const getDaysUntilDue = (dateRequired) => {
    if (!dateRequired) return null;
    return differenceInDays(new Date(dateRequired), new Date());
  };

  const stats = {
    total: rfis.length,
    submitted: rfis.filter(r => r.status === 'submitted').length,
    underReview: rfis.filter(r => r.status === 'under_review').length,
    answered: rfis.filter(r => r.status === 'answered').length,
    overdue: rfis.filter(r => {
      if (!r.date_required || r.status === 'answered' || r.status === 'closed') return false;
      return getDaysUntilDue(r.date_required) < 0;
    }).length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="RFI Tracking"
          description="Request for Information - Track questions and responses"
          icon={FileQuestion}
          actions={
            isAdmin && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                New RFI
              </Button>
            )
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="soft-blue-gradient rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-600 uppercase mb-1">Total</p>
            <p className="text-3xl font-bold text-blue-800 dark:text-blue-700">{stats.total}</p>
          </div>
          <div className="soft-amber-gradient rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-600 uppercase mb-1">Submitted</p>
            <p className="text-3xl font-bold text-amber-800 dark:text-amber-700">{stats.submitted}</p>
          </div>
          <div className="soft-purple-gradient rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-purple-700 dark:text-purple-600 uppercase mb-1">Under Review</p>
            <p className="text-3xl font-bold text-purple-800 dark:text-purple-700">{stats.underReview}</p>
          </div>
          <div className="soft-green-gradient rounded-xl p-4 shadow-sm">
            <p className="text-xs font-bold text-green-700 dark:text-green-600 uppercase mb-1">Answered</p>
            <p className="text-3xl font-bold text-green-800 dark:text-green-700">{stats.answered}</p>
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
                placeholder="Search RFIs..."
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="answered">Answered</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* RFI List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#507DB4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading RFIs...</p>
          </div>
        ) : filteredRFIs.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileQuestion className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No RFIs Found</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Start by creating your first RFI'}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First RFI
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRFIs.map((rfi) => {
              const statusMeta = getStatusMeta(rfi.status);
              const daysUntilDue = getDaysUntilDue(rfi.date_required);
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && rfi.status !== 'answered' && rfi.status !== 'closed';
              const StatusIcon = statusMeta.icon;

              return (
                <div
                  key={rfi.id}
                  onClick={() => navigate(createPageUrl(`VerRFI?id=${rfi.id}`))}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-500">{rfi.rfi_number || 'DRAFT'}</span>
                        <Badge className={getPriorityColor(rfi.priority)}>
                          {rfi.priority}
                        </Badge>
                        {isOverdue && (
                          <Badge className="soft-red-gradient animate-pulse">
                            Overdue
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                        {rfi.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                        {rfi.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{rfi.job_name}</span>
                        {rfi.category && <span>• {rfi.category}</span>}
                        {rfi.date_required && (
                          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                            • Due: {format(new Date(rfi.date_required), 'MMM dd')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={statusMeta.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusMeta.label}
                      </Badge>
                      {daysUntilDue !== null && !isOverdue && rfi.status !== 'answered' && rfi.status !== 'closed' && (
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

      {/* Create RFI Dialog - Basic */}
      <CreateRFIDialog 
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        jobs={jobs}
        user={user}
      />
    </div>
  );
}

function CreateRFIDialog({ open, onClose, jobs, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    job_id: '',
    title: '',
    description: '',
    category: 'other',
    priority: 'medium',
    date_required: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RFI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfis'] });
      onClose();
      setFormData({
        job_id: '',
        title: '',
        description: '',
        category: 'other',
        priority: 'medium',
        date_required: ''
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const selectedJob = jobs.find(j => j.id === formData.job_id);
    
    createMutation.mutate({
      ...formData,
      job_name: selectedJob?.name,
      requested_by: user?.email,
      requested_by_name: user?.full_name,
      status: 'draft'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New RFI</DialogTitle>
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
              placeholder="Brief description of question"
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Detailed question or information request"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="specification">Specification</SelectItem>
                  <SelectItem value="site_conditions">Site Conditions</SelectItem>
                  <SelectItem value="materials">Materials</SelectItem>
                  <SelectItem value="schedule">Schedule</SelectItem>
                  <SelectItem value="coordination">Coordination</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
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
              {createMutation.isPending ? 'Creating...' : 'Create RFI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}