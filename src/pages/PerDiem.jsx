import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Banknote, Save, X, Info, Edit, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/i18n/LanguageContext";
import EmployeePageLayout, { ModernCard } from "@/components/shared/EmployeePageLayout";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { buildUserQuery } from "@/components/utils/userResolution";

const PerDiemForm = ({ request, onSubmit, onCancel, isProcessing }) => {
  const { t } = useLanguage();
  const { data: jobs } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
  });

  const [formData, setFormData] = useState({
    start_date: request?.date || format(new Date(), 'yyyy-MM-dd'),
    end_date: request?.end_date || format(new Date(), 'yyyy-MM-dd'),
    job_id: request?.job_id || null,
    notes: request?.notes || '',
    receipt_url: request?.receipt_url || 'per-diem-auto-generated'  // Auto-generated receipt URL
  });

  const calculateTotal = () => {
    if (!formData.start_date || !formData.end_date) return 40;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    if (end < start) return 40;
    const days = differenceInDays(end, start) + 1;
    return days * 40;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedJob = jobs?.find(j => j.id === formData.job_id);
    onSubmit({ 
      ...formData,
      date: formData.start_date,
      amount: calculateTotal(),
      job_name: selectedJob?.name
    });
  };

  const days = differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-blue-600">Per Diem - $40 {t('per_day')}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{t('select_date_range_to_calculate')}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-slate-500 uppercase tracking-wider">{t('start_date')} *</Label>
          <Input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} required className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 uppercase tracking-wider">{t('end_date')} *</Label>
          <Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} min={formData.start_date} required className="mt-1" />
        </div>
      </div>

      {formData.start_date && formData.end_date && days > 0 && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">{days} {t('days')}</p>
              <p className="text-xs text-slate-600">$40 × {days}</p>
            </div>
            <span className="text-2xl font-bold text-green-600">${calculateTotal()}.00</span>
          </CardContent>
        </Card>
      )}

      <div>
        <Label className="text-xs text-slate-500 uppercase tracking-wider">{t('associate_with_job')} *</Label>
        <Select value={formData.job_id} onValueChange={(value) => setFormData({ ...formData, job_id: value })} required>
          <SelectTrigger className="mt-1"><SelectValue placeholder={t('select_job')} /></SelectTrigger>
          <SelectContent>{jobs?.map(job => <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-slate-500 uppercase tracking-wider">{t('notes')}</Label>
        <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder={t('additional_notes')} className="mt-1" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2"/>{t('cancel')}</Button>
        <Button type="submit" disabled={isProcessing || !formData.job_id} className="bg-blue-600 hover:bg-blue-700 text-white"><Save className="w-4 h-4 mr-2"/>{request ? t('save') : t('submit')}</Button>
      </div>
    </form>
  );
};

export default function PerDiem() {
  const { t, language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: CURRENT_USER_QUERY_KEY });

  // Dual-Key Read: user_id preferred, email fallback (legacy)
  const { data: perDiemRequests = [], isLoading } = useQuery({
    queryKey: ['myPerDiem', user?.id, user?.email],
    queryFn: () => {
      if (!user) return [];
      const query = { ...buildUserQuery(user, 'user_id', 'employee_email'), category: 'per_diem' };
      return base44.entities.Expense.filter(query, '-date');
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({
      ...data,
      user_id: user?.id,              // SSOT: Write user_id
      employee_email: user.email,
      employee_name: user.full_name,
      category: 'per_diem',
      account_category: 'expense_travel_per_diem',  // For accounting purposes
      description: 'Per Diem / Viáticos',
      payment_method: 'personal',
      status: 'pending',
      receipt_url: data.receipt_url || ''  // Per-diem doesn't require receipt but entity requires it
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['myPerDiem']);
      setShowForm(false);
      setEditingRequest(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myPerDiem']);
      setShowForm(false);
      setEditingRequest(null);
    }
  });

  const today = new Date();
  const monthStart = startOfMonth(today);
  const yearStart = startOfYear(today);

  const stats = useMemo(() => {
    const monthReqs = perDiemRequests.filter(r => {
      const rDate = new Date(r.date);
      return rDate >= monthStart && rDate <= endOfMonth(today) && r.status === 'approved';
    });
    const monthAmount = monthReqs.reduce((sum, r) => sum + (r.amount || 0), 0);

    const ytdReqs = perDiemRequests.filter(r => {
      const rDate = new Date(r.date);
      return rDate >= yearStart && r.status === 'approved';
    });
    const ytdAmount = ytdReqs.reduce((sum, r) => sum + (r.amount || 0), 0);

    const pendingReqs = perDiemRequests.filter(r => r.status === 'pending');
    const pendingAmount = pendingReqs.reduce((sum, r) => sum + (r.amount || 0), 0);

    return { monthAmount, ytdAmount, pendingAmount, pendingCount: pendingReqs.length };
  }, [perDiemRequests, monthStart, yearStart, today]);

  const statusConfig = {
    pending: { label: t('pending'), color: "bg-amber-100 text-amber-700" },
    approved: { label: t('approved'), color: "bg-emerald-100 text-emerald-700" },
    rejected: { label: t('rejected'), color: "bg-red-100 text-red-700" }
  };

  const pageStats = [
    { icon: DollarSign, value: `$${stats.monthAmount.toFixed(0)}`, label: language === 'es' ? 'Este Mes' : 'This Month', iconBg: "bg-blue-100 dark:bg-blue-900/50", iconColor: "text-blue-600 dark:text-blue-400" },
    { icon: TrendingUp, value: `$${stats.ytdAmount.toFixed(0)}`, label: language === 'es' ? 'Año' : 'Year', iconBg: "bg-green-100 dark:bg-green-900/50", iconColor: "text-green-600 dark:text-green-400" },
    { icon: Clock, value: `$${stats.pendingAmount.toFixed(0)}`, label: t('pending'), subtitle: `${stats.pendingCount} ${language === 'es' ? 'solicitudes' : 'requests'}`, iconBg: "bg-amber-100 dark:bg-amber-900/50", iconColor: "text-amber-600 dark:text-amber-400" }
  ];

  return (
    <EmployeePageLayout
      title="Per Diem"
      subtitle={t('request_per_diem_for_work_days')}
      stats={pageStats}
      headerActions={
        <Button onClick={() => { setEditingRequest(null); setShowForm(!showForm); }} className="bg-white/10 border-white/30 text-white hover:bg-white/20 min-h-[44px] w-full sm:w-auto" variant="outline">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2"/>{t('request_per_diem')}
        </Button>
      }
    >
      <Card className="mb-6 bg-white dark:bg-[#282828] shadow-sm border-0">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{t('per_diem_information')}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('fixed_amount')}: <span className="font-bold text-blue-600">$40.00 {t('per_day')}</span></p>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <ModernCard className="mb-6">
          <PerDiemForm request={editingRequest} onSubmit={(data) => editingRequest ? updateMutation.mutate({ id: editingRequest.id, data }) : createMutation.mutate(data)} onCancel={() => { setShowForm(false); setEditingRequest(null); }} isProcessing={createMutation.isPending || updateMutation.isPending} />
        </ModernCard>
      )}

      <ModernCard title={t('my_per_diem_requests')} icon={Banknote} noPadding>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('job')}</TableHead>
                <TableHead className="text-right">{t('amount')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24 text-slate-500">{t('loading')}...</TableCell></TableRow>
              ) : perDiemRequests?.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24 text-slate-500">{t('no_per_diem_requests')}</TableCell></TableRow>
              ) : (
                perDiemRequests?.map(req => {
                  const config = statusConfig[req.status] || statusConfig.pending;
                  return (
                    <TableRow key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="font-medium">{format(new Date(req.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-sm">{req.job_name || '-'}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">${req.amount?.toFixed(2)}</TableCell>
                      <TableCell><Badge className={config.color}>{config.label}</Badge></TableCell>
                      <TableCell>
                        {req.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => { setEditingRequest(req); setShowForm(true); }}><Edit className="w-4 h-4" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ModernCard>
    </EmployeePageLayout>
  );
}