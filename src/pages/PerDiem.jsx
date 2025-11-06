
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Banknote, Save, X, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";

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
        notes: request?.notes || ''
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

    return (
        <Card className="glass-card shadow-xl border-slate-800">
            <form onSubmit={handleSubmit}>
                <CardHeader className="border-b border-slate-800">
                    <CardTitle className="text-white">{request ? t('edit') + ' Per Diem' : t('new_per_diem_request')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="p-4 bg-[#3B9FF3]/10 border border-[#3B9FF3]/30 rounded-lg">
                        <h4 className="font-semibold text-[#3B9FF3] mb-2">Per Diem - $40 {t('per_day')}</h4>
                        <p className="text-sm text-slate-400">{t('select_date_range_to_calculate')}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-slate-300">{t('start_date')} *</Label>
                            <Input 
                                type="date" 
                                value={formData.start_date} 
                                onChange={e => setFormData({...formData, start_date: e.target.value})} 
                                required
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                        <div>
                            <Label className="text-slate-300">{t('end_date')} *</Label>
                            <Input 
                                type="date" 
                                value={formData.end_date} 
                                onChange={e => setFormData({...formData, end_date: e.target.value})} 
                                min={formData.start_date}
                                required
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>
                    </div>

                    {formData.start_date && formData.end_date && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-emerald-400">
                                        {differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) >= 0 ? 
                                            `${differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1} ${t('days')}` : 
                                            t('invalid_dates')}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) >= 0 ? 
                                            `$40 × ${differenceInDays(new Date(formData.end_date), new Date(formData.start_date)) + 1} ${t('days')}` : 
                                            ""}
                                    </p>
                                </div>
                                <span className="text-2xl font-bold text-emerald-400">
                                    ${calculateTotal()}.00
                                </span>
                            </div>
                        </div>
                    )}

                    <div>
                        <Label className="text-slate-300">{t('associate_with_job')} *</Label>
                        <Select
                            value={formData.job_id}
                            onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                            required
                        >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                <SelectValue placeholder={t('select_job')} />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                                {jobs?.map(job => (
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
                            value={formData.notes} 
                            onChange={e => setFormData({...formData, notes: e.target.value})} 
                            placeholder={t('additional_notes')}
                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onCancel} className="bg-slate-800 border-slate-700 text-slate-300">
                            <X className="w-4 h-4 mr-2"/>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={isProcessing || !formData.job_id} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/30">
                            <Save className="w-4 h-4 mr-2"/>
                            {request ? t('save') : t('submit')}
                        </Button>
                    </div>
                </CardContent>
            </form>
        </Card>
    );
};

export default function PerDiem() {
    const { t } = useLanguage();
    const [showForm, setShowForm] = useState(false);
    const [editingRequest, setEditingRequest] = useState(null);
    const queryClient = useQueryClient();
    const { data: user } = useQuery({ queryKey: ['currentUser'] });

    const { data: perDiemRequests, isLoading } = useQuery({
        queryKey: ['myPerDiem', user?.email],
        queryFn: () => user ? base44.entities.Expense.filter({ 
            employee_email: user.email, 
            category: 'per_diem' 
        }, '-date') : [],
        enabled: !!user,
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Expense.create({
            ...data,
            employee_email: user.email,
            employee_name: user.full_name,
            category: 'per_diem',
            description: 'Solicitud de Per Diem / Viáticos',
            payment_method: 'personal',
            status: 'pending'
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['myPerDiem']);
            setShowForm(false);
            setEditingRequest(null);
            alert('✅ ' + t('per_diem_request_submitted'));
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['myPerDiem']);
            setShowForm(false);
            setEditingRequest(null);
            alert('✅ ' + t('savedSuccessfully'));
        }
    });

    const handleSubmit = (data) => {
        if (editingRequest) {
            updateMutation.mutate({ id: editingRequest.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleEdit = (request) => {
        setEditingRequest(request);
        setShowForm(true);
    };

    const statusConfig = {
        pending: { label: t('pending'), color: "bg-amber-100 text-amber-700" },
        approved: { label: t('approved'), color: "bg-emerald-100 text-emerald-700" },
        rejected: { label: t('rejected'), color: "bg-red-100 text-red-700" }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
            <div className="max-w-6xl mx-auto">
                <PageHeader
                    title="Per Diem"
                    description={t('request_per_diem_for_work_days')}
                    icon={Banknote}
                    actions={
                        <Button onClick={() => { setEditingRequest(null); setShowForm(!showForm); }} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg">
                            <Plus className="w-5 h-5 mr-2"/>
                            {t('request_per_diem')}
                        </Button>
                    }
                />

                <Card className="mb-6 bg-white shadow-xl border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-gradient-to-br from-[#3B9FF3] to-[#2A8FE3] rounded-2xl shadow-lg">
                                <Info className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-slate-900 mb-2">
                                    {t('per_diem_information')}
                                </h3>
                                <p className="text-sm text-slate-600">
                                    {t('fixed_amount')}: <span className="font-bold text-[#3B9FF3]">$40.00 {t('per_day')}</span>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {showForm && (
                    <div className="mb-8">
                        <PerDiemForm
                            request={editingRequest}
                            onSubmit={handleSubmit} 
                            onCancel={() => { setShowForm(false); setEditingRequest(null); }} 
                            isProcessing={createMutation.isPending || updateMutation.isPending}
                        />
                    </div>
                )}

                <Card className="bg-white shadow-xl border-slate-200">
                    <CardHeader className="border-b border-slate-200">
                        <CardTitle className="flex items-center gap-2 text-slate-900">
                            <Banknote className="w-5 h-5 text-[#3B9FF3]"/>
                            {t('my_per_diem_requests')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 border-slate-200">
                                        <TableHead className="text-slate-700">{t('date')}</TableHead>
                                        <TableHead className="text-slate-700">{t('description')}</TableHead>
                                        <TableHead className="text-slate-700">{t('category')}</TableHead>
                                        <TableHead className="text-slate-700">{t('payment_method')}</TableHead>
                                        <TableHead className="text-right text-slate-700">{t('amount')}</TableHead>
                                        <TableHead className="text-slate-700">{t('status')}</TableHead>
                                        <TableHead className="text-slate-700">{t('receipt')}</TableHead>
                                        <TableHead className="text-slate-700">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24 text-slate-500">{t('loading')}...</TableCell>
                                        </TableRow>
                                    ) : perDiemRequests?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24 text-slate-500">
                                                {t('no_per_diem_requests')}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        perDiemRequests?.map(req => {
                                            const config = statusConfig[req.status] || statusConfig.pending;
                                            return (
                                                <TableRow key={req.id} className="hover:bg-slate-50 border-slate-200">
                                                    <TableCell className="text-slate-700">{format(new Date(req.date), 'MMM dd, yyyy')}</TableCell>
                                                    <TableCell className="text-slate-700">{req.description}</TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-slate-100 text-slate-700 border-slate-300">
                                                            Per Diem
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                                                            {t('personal')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-[#3B9FF3]">
                                                        ${req.amount?.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={config.color}>{config.label}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-500">{t('no_receipt')}</TableCell>
                                                    <TableCell>
                                                        {req.status === 'pending' && (
                                                            <Button size="sm" variant="outline" onClick={() => handleEdit(req)} className="border-slate-300 text-slate-700 hover:bg-slate-100">
                                                                {t('edit')}
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
