import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Car, Save, X, MapPin, Edit } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
        rate_per_mile: 0.60,
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
        <Card className="bg-white shadow-xl border-slate-200">
            <form onSubmit={handleSubmit}>
                <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-[#3B9FF3]/10 to-blue-500/10">
                    <CardTitle className="text-slate-900">{language === 'es' ? 'Nuevo Registro de Millas' : 'New Mileage Record'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-slate-700 font-medium">{t('date')}</Label>
                            <Input 
                                type="date" 
                                value={formData.date} 
                                onChange={e => setFormData({...formData, date: e.target.value})} 
                                required
                                className="bg-white border-slate-300 text-slate-900"
                            />
                        </div>
                        <div>
                            <Label className="text-slate-700 font-medium">{language === 'es' ? 'Millas Recorridas' : 'Miles Driven'}</Label>
                            <Input 
                                type="number" 
                                step="0.1"
                                min="0"
                                value={formData.miles} 
                                onChange={e => setFormData({...formData, miles: e.target.value})} 
                                placeholder="0.0"
                                required
                                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <Card className="border-[#3B9FF3] bg-gradient-to-br from-blue-50 to-indigo-50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-sm font-medium text-[#3B9FF3]">{language === 'es' ? 'Total Millaje' : 'Total Mileage'}:</span>
                                    <p className="text-xs text-slate-600">${formData.rate_per_mile} × {formData.miles || 0} {language === 'es' ? 'millas' : 'miles'}</p>
                                </div>
                                <span className="text-2xl font-bold text-[#3B9FF3]">
                                    ${totalAmount.toFixed(2)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label className="flex items-center gap-2 text-slate-700 font-medium">
                                <MapPin className="w-4 h-4" />
                                {language === 'es' ? 'Ubicación de Inicio' : 'Start Location'}
                            </Label>
                            <Input 
                                value={formData.start_location} 
                                onChange={e => setFormData({...formData, start_location: e.target.value})} 
                                placeholder={language === 'es' ? 'Ej: Casa, Oficina' : 'Ex: Home, Office'}
                                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                        <div>
                            <Label className="flex items-center gap-2 text-slate-700 font-medium">
                                <MapPin className="w-4 h-4" />
                                {language === 'es' ? 'Ubicación de Destino' : 'End Location'}
                            </Label>
                            <Input 
                                value={formData.end_location} 
                                onChange={e => setFormData({...formData, end_location: e.target.value})} 
                                placeholder={language === 'es' ? 'Ej: Sitio de trabajo' : 'Ex: Job site'}
                                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="text-slate-700 font-medium">{language === 'es' ? 'Asociar a Trabajo' : 'Associate with Job'} *</Label>
                        <Select
                            value={formData.job_id}
                            onValueChange={(value) => setFormData({ ...formData, job_id: value })}
                            required
                        >
                            <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                                <SelectValue placeholder={language === 'es' ? 'Seleccionar trabajo' : 'Select job'} />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200">
                                {jobs?.map(job => (
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
                            value={formData.notes} 
                            onChange={e => setFormData({...formData, notes: e.target.value})} 
                            placeholder={language === 'es' ? 'Propósito del viaje...' : 'Trip purpose...'}
                            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3 border-t border-slate-200 pt-6 bg-slate-50">
                    <Button type="button" variant="outline" onClick={onCancel} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
                        <X className="w-4 h-4 mr-2"/>
                        {t('cancel')}
                    </Button>
                    <Button type="submit" disabled={isProcessing || !formData.job_id} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg">
                        <Save className="w-4 h-4 mr-2"/>
                        {t('save')}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default function Manejo() {
    const { t, language } = useLanguage();
    const [showForm, setShowForm] = useState(false);
    const [editingLog, setEditingLog] = useState(null);
    const queryClient = useQueryClient();
    const { data: user } = useQuery({ queryKey: ['currentUser'] });

    const { data: drivingLogs, isLoading } = useQuery({
        queryKey: ['myMileageLogs', user?.email],
        queryFn: () => user ? base44.entities.DrivingLog.filter({ employee_email: user.email }, '-date') : [],
        enabled: !!user,
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const miles = parseFloat(data.miles) || 0;
            const hours = parseFloat(data.hours) || 0;
            const ratePerMile = 0.60;
            const hourlyRate = user?.hourly_rate || 25;
            const totalAmount = (miles * ratePerMile) + (hours * hourlyRate);

            return base44.entities.DrivingLog.create({
                ...data,
                employee_email: user.email, 
                employee_name: user.full_name,
                rate_per_mile: ratePerMile,
                total_amount: totalAmount,
                status: 'pending'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['myMileageLogs']);
            setShowForm(false);
            alert('✅ ' + (language === 'es' ? 'Registro de manejo creado! Pendiente de aprobación.' : 'Driving log created! Pending approval.'));
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.DrivingLog.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['myMileageLogs']);
            setEditingLog(null);
        }
    });

    const canEdit = (log) => {
        return user && log.employee_email === user.email && log.status === 'pending';
    };

    const statusConfig = {
        pending: { label: t('pending'), color: "bg-amber-100 text-amber-700 border-amber-300" },
        approved: { label: t('approved'), color: "bg-green-100 text-green-700 border-green-300" },
        rejected: { label: t('rejected'), color: "bg-red-100 text-red-700 border-red-300" }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="max-w-6xl mx-auto">
                <PageHeader
                    title={language === 'es' ? 'Millas' : 'Mileage'}
                    description={language === 'es' ? 'Registra las millas recorridas con tu vehículo' : 'Track miles driven in your vehicle'}
                    icon={Car}
                    actions={
                        <Button onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg">
                            <Plus className="w-5 h-5 mr-2"/>
                            {language === 'es' ? 'Nuevo Registro' : 'New Record'}
                        </Button>
                    }
                />

                <Card className="mb-6 bg-white shadow-xl border-slate-200">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-gradient-to-br from-[#3B9FF3] to-[#2A8FE3] rounded-2xl shadow-lg">
                                <Car className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-slate-900 mb-2">
                                    {language === 'es' ? 'Información de Reembolso de Millas' : 'Mileage Reimbursement Information'}
                                </h3>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-700">{language === 'es' ? 'Tarifa por milla:' : 'Rate per mile:'}</span>
                                        <span className="font-bold text-[#3B9FF3]">$0.60</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {showForm && (
                    <div className="mb-8">
                        <MileageForm 
                            log={null}
                            onSubmit={d => createMutation.mutate(d)} 
                            onCancel={() => setShowForm(false)} 
                            isProcessing={createMutation.isPending}
                        />
                    </div>
                )}

                <Card className="bg-white shadow-xl border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                        <CardTitle className="flex items-center gap-2 text-slate-900">
                            <Car className="w-5 h-5 text-[#3B9FF3]"/>
                            {language === 'es' ? 'Mis Registros de Millas' : 'My Mileage Records'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 border-slate-200">
                                        <TableHead className="text-slate-700 font-semibold">{t('date')}</TableHead>
                                        <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Desde' : 'From'}</TableHead>
                                        <TableHead className="text-slate-700 font-semibold">{language === 'es' ? 'Hasta' : 'To'}</TableHead>
                                        <TableHead className="text-slate-700 font-semibold">{t('job')}</TableHead>
                                        <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Millas' : 'Miles'}</TableHead>
                                        <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Monto' : 'Amount'}</TableHead>
                                        <TableHead className="text-slate-700 font-semibold">{t('status')}</TableHead>
                                        <TableHead className="text-slate-700 font-semibold">{t('notes')}</TableHead>
                                        <TableHead className="text-right text-slate-700 font-semibold">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center h-24 text-slate-500">{t('loading')}...</TableCell>
                                        </TableRow>
                                    ) : drivingLogs?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center h-24 text-slate-500">
                                                {language === 'es' ? 'No hay registros de millas' : 'No mileage records'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        drivingLogs?.map(log => {
                                            const config = statusConfig[log.status] || statusConfig.pending;
                                            return (
                                                <TableRow key={log.id} className="hover:bg-slate-50 border-slate-200">
                                                    <TableCell className="text-slate-900 font-medium">{format(new Date(log.date), 'MMM dd, yyyy')}</TableCell>
                                                    <TableCell className="text-slate-700">{log.start_location || '-'}</TableCell>
                                                    <TableCell className="text-slate-700">{log.end_location || '-'}</TableCell>
                                                    <TableCell>
                                                        {log.job_name ? (
                                                            <span className="text-sm text-slate-900 font-medium">{log.job_name}</span>
                                                        ) : (
                                                            <span className="text-sm text-slate-500">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-slate-900">{log.miles} mi</TableCell>
                                                    <TableCell className="text-right font-bold text-[#3B9FF3]">
                                                        ${log.total_amount?.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={config.color}>{config.label}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">{log.notes || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        {canEdit(log) && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setEditingLog(log)}
                                                                className="hover:bg-slate-100 text-slate-700 hover:text-[#3B9FF3]"
                                                            >
                                                                <Edit className="w-4 h-4 mr-1" />
                                                                {language === 'es' ? 'Editar' : 'Edit'}
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

            <Dialog open={!!editingLog} onOpenChange={() => setEditingLog(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">{language === 'es' ? 'Editar Millas' : 'Edit Mileage'}</DialogTitle>
                    </DialogHeader>
                    {editingLog && (
                        <MileageForm
                            log={editingLog}
                            onSubmit={(data) => updateMutation.mutate({ id: editingLog.id, data })}
                            onCancel={() => setEditingLog(null)}
                            isProcessing={updateMutation.isPending}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}