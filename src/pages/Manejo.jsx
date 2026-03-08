import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Car, Save, X, MapPin, Edit, DollarSign, TrendingUp } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EmployeePageLayout, { ModernCard } from "@/components/shared/EmployeePageLayout";
import { buildUserQuery } from "@/components/utils/userResolution";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";

const MileageForm = ({ log, onSubmit, onCancel, isProcessing }) => {
  const { t, language } = useLanguage();
  const { data: jobs } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
  });

  const [formData, setFormData] = useState(log || {
    date: format(new Date(), 'yyyy-MM-dd'),
    miles: '',
    hours: '',
    rate_per_mile: 0.70,
    start_location: '',
    end_location: '',
    job_id: null,
    notes: ''
  });

  const totalAmount = (parseFloat(formData.miles) || 0) * (parseFloat(formData.rate_per_mile) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ 
      date: formData.date,
      miles: parseFloat(formData.miles),
      hours: parseFloat(formData.hours) || 0,
      start_location: formData.start_location,
      end_location: formData.end_location,
      job_id: formData.job_id,
      notes: formData.notes,
      job_name: jobs?.find(j => j.id === formData.job_id)?.name
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-slate-500 uppercase tracking-wider">{t('date')}</Label>
          <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 uppercase tracking-wider">{language === 'es' ? 'Millas' : 'Miles'}</Label>
          <Input type="number" step="0.1" min="0" value={formData.miles} onChange={e => setFormData({...formData, miles: e.target.value})} placeholder="0.0" required className="mt-1" />
        </div>
      </div>

      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-blue-600">{language === 'es' ? 'Total' : 'Total'}:</span>
            <p className="text-xs text-slate-600">${formData.rate_per_mile} × {formData.miles || 0} mi</p>
          </div>
          <span className="text-2xl font-bold text-blue-600">${totalAmount.toFixed(2)}</span>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {language === 'es' ? 'Desde' : 'From'}
          </Label>
          <Input value={formData.start_location} onChange={e => setFormData({...formData, start_location: e.target.value})} placeholder={language === 'es' ? 'Ej: Casa' : 'Ex: Home'} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {language === 'es' ? 'Hasta' : 'To'}
          </Label>
          <Input value={formData.end_location} onChange={e => setFormData({...formData, end_location: e.target.value})} placeholder={language === 'es' ? 'Ej: Trabajo' : 'Ex: Job site'} className="mt-1" />
        </div>
      </div>

      <div>
        <Label className="text-xs text-slate-500 uppercase tracking-wider">{language === 'es' ? 'Trabajo' : 'Job'} *</Label>
        <Select value={formData.job_id} onValueChange={(value) => setFormData({ ...formData, job_id: value })} required>
          <SelectTrigger className="mt-1"><SelectValue placeholder={language === 'es' ? 'Seleccionar trabajo' : 'Select job'} /></SelectTrigger>
          <SelectContent>{jobs?.map(job => <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs text-slate-500 uppercase tracking-wider">{t('notes')}</Label>
        <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder={language === 'es' ? 'Propósito del viaje...' : 'Trip purpose...'} className="mt-1" />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2"/>{t('cancel')}</Button>
        <Button type="submit" disabled={isProcessing || !formData.job_id} className="bg-blue-600 hover:bg-blue-700 text-white"><Save className="w-4 h-4 mr-2"/>{t('save')}</Button>
      </div>
    </form>
  );
};

export default function Manejo() {
  const { t, language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: CURRENT_USER_QUERY_KEY });

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const { data: drivingLogs = [], isLoading } = useQuery({
    queryKey: ['myMileageLogs', user?.id, user?.email],
    queryFn: () => {
      if (!user) return [];
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return base44.entities.DrivingLog.filter(query, '-date');
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const miles = parseFloat(data.miles) || 0;
      const hours = parseFloat(data.hours) || 0;
      const ratePerMile = 0.70;
      const hourlyRate = user?.hourly_rate || 25;
      const totalAmount = (miles * ratePerMile) + (hours * hourlyRate);

      // WRITE GUARD — user_id required for new records (legacy tolerated)
      const writeData = {
        ...data,
        user_id: user?.id, // NEW: Enforce user_id
        employee_email: user.email, 
        employee_name: user.full_name,
        rate_per_mile: ratePerMile,
        total_amount: totalAmount,
        status: 'pending'
      };

      if (!user?.id) {
        console.warn('[WRITE GUARD] ⚠️ Creating DrivingLog without user_id', {
          email: user?.email,
          miles
        });
      }

      return base44.entities.DrivingLog.create(writeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myMileageLogs']);
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DrivingLog.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myMileageLogs']);
      setEditingLog(null);
    }
  });

  const today = new Date();
  const monthStart = startOfMonth(today);
  const yearStart = startOfYear(today);

  const stats = useMemo(() => {
    const monthLogs = drivingLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= monthStart && logDate <= endOfMonth(today) && log.status === 'approved';
    });
    const monthMiles = monthLogs.reduce((sum, log) => sum + (log.miles || 0), 0);
    const monthAmount = monthLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);

    const ytdLogs = drivingLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= yearStart && log.status === 'approved';
    });
    const ytdMiles = ytdLogs.reduce((sum, log) => sum + (log.miles || 0), 0);
    const ytdAmount = ytdLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);

    const pendingLogs = drivingLogs.filter(log => log.status === 'pending');
    const pendingAmount = pendingLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);

    return { monthMiles, monthAmount, ytdMiles, ytdAmount, pendingAmount };
  }, [drivingLogs, monthStart, yearStart, today]);

  const statusConfig = {
    pending: { label: t('pending'), color: "bg-amber-100 text-amber-700" },
    approved: { label: t('approved'), color: "bg-emerald-100 text-emerald-700" },
    rejected: { label: t('rejected'), color: "bg-red-100 text-red-700" }
  };

  const pageStats = [
    { icon: Car, value: `${stats.monthMiles.toFixed(0)}mi`, label: language === 'es' ? 'Este Mes' : 'This Month', subtitle: `$${stats.monthAmount.toFixed(0)}`, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    { icon: TrendingUp, value: `${stats.ytdMiles.toFixed(0)}mi`, label: language === 'es' ? 'Año' : 'Year', subtitle: `$${stats.ytdAmount.toFixed(0)}`, iconBg: "bg-green-100", iconColor: "text-green-600" },
    { icon: DollarSign, value: `$${stats.pendingAmount.toFixed(0)}`, label: t('pending'), iconBg: "bg-amber-100", iconColor: "text-amber-600" }
  ];

  return (
    <EmployeePageLayout
      title={language === 'es' ? 'Millas' : 'Mileage'}
      subtitle={language === 'es' ? 'Registra las millas recorridas' : 'Track miles driven'}
      stats={pageStats}
      headerActions={
        <Button onClick={() => setShowForm(!showForm)} className="bg-white/10 border-white/30 text-white hover:bg-white/20 min-h-[44px] w-full sm:w-auto" variant="outline">
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2"/>{language === 'es' ? 'Nuevo' : 'New'}
        </Button>
      }
    >
      <Card className="mb-6 bg-white dark:bg-[#282828] shadow-sm border-0">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
            <Car className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{language === 'es' ? 'Tarifa por milla:' : 'Rate per mile:'}</p>
            <p className="text-xl font-bold text-blue-600">$0.70</p>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <ModernCard className="mb-6">
          <MileageForm log={null} onSubmit={d => createMutation.mutate(d)} onCancel={() => setShowForm(false)} isProcessing={createMutation.isPending} />
        </ModernCard>
      )}

      <ModernCard title={language === 'es' ? 'Mis Registros' : 'My Records'} icon={Car} noPadding>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead>{t('date')}</TableHead>
                <TableHead>{language === 'es' ? 'Ruta' : 'Route'}</TableHead>
                <TableHead>{t('job')}</TableHead>
                <TableHead className="text-right">{language === 'es' ? 'Millas' : 'Miles'}</TableHead>
                <TableHead className="text-right">{language === 'es' ? 'Monto' : 'Amount'}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24 text-slate-500">{t('loading')}...</TableCell></TableRow>
              ) : drivingLogs?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center h-24 text-slate-500">{language === 'es' ? 'No hay registros' : 'No records'}</TableCell></TableRow>
              ) : (
                drivingLogs?.map(log => {
                  const config = statusConfig[log.status] || statusConfig.pending;
                  return (
                    <TableRow key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <TableCell className="font-medium">{format(new Date(log.date), 'MMM dd')}</TableCell>
                      <TableCell className="text-sm text-slate-600">{log.start_location || '-'} → {log.end_location || '-'}</TableCell>
                      <TableCell className="text-sm">{log.job_name || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">{log.miles}mi</TableCell>
                      <TableCell className="text-right font-bold">${log.total_amount?.toFixed(2)}</TableCell>
                      <TableCell><Badge className={config.color}>{config.label}</Badge></TableCell>
                      <TableCell>
                        {log.status === 'pending' && (
                          <Button variant="ghost" size="sm" onClick={() => setEditingLog(log)}><Edit className="w-4 h-4" /></Button>
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

      <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{language === 'es' ? 'Editar Millas' : 'Edit Mileage'}</DialogTitle></DialogHeader>
          {editingLog && <MileageForm log={editingLog} onSubmit={(data) => updateMutation.mutate({ id: editingLog.id, data })} onCancel={() => setEditingLog(null)} isProcessing={updateMutation.isPending} />}
        </DialogContent>
      </Dialog>
    </EmployeePageLayout>
  );
}