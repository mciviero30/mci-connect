
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import LiveTimeTracker from '../components/horarios/LiveTimeTracker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function HorasManejo() {
    const { t, language } = useLanguage();
    const queryClient = useQueryClient();
    const { data: user } = useQuery({ queryKey: ['currentUser'] });

    const { data: drivingLogs, isLoading } = useQuery({
        queryKey: ['myDrivingLogs', user?.email], 
        queryFn: () => user ? base44.entities.DrivingLog.filter({ employee_email: user.email }, '-date') : [],
        enabled: !!user,
    });

    const createDrivingMutation = useMutation({
        mutationFn: async (entryData) => {
            const miles = parseFloat(entryData.miles) || 0;
            const hours = parseFloat(entryData.hours) || 0;
            const ratePerMile = 0.60;
            const hourlyRate = parseFloat(user?.hourly_rate || 25);
            const totalAmount = (miles * ratePerMile) + (hours * hourlyRate);

            return base44.entities.DrivingLog.create({
                ...entryData,
                employee_email: user.email,
                employee_name: user.full_name,
                rate_per_mile: ratePerMile,
                total_amount: totalAmount,
                status: 'pending'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myDrivingLogs'] });
            alert('✅ Driving hours logged! Pending approval.');
        }
    });

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const yearStart = startOfYear(today);

    const hourlyRate = parseFloat(user?.hourly_rate || 25);
    
    // Current Week
    const currentWeekLogs = drivingLogs?.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= weekStart && logDate <= weekEnd && log.status === 'approved';
    }) || [];
    
    const currentWeekHours = currentWeekLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    const currentWeekMiles = currentWeekLogs.reduce((sum, log) => sum + (log.miles || 0), 0);
    const weekPay = currentWeekLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);

    // Current Month
    const currentMonthLogs = drivingLogs?.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= monthStart && logDate <= monthEnd && log.status === 'approved';
    }) || [];
    
    const currentMonthHours = currentMonthLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    const currentMonthMiles = currentMonthLogs.reduce((sum, log) => sum + (log.miles || 0), 0);
    const monthPay = currentMonthLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);
    
    // Year to Date
    const ytdLogs = drivingLogs?.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= yearStart && log.status === 'approved';
    }) || [];
    
    const ytdHours = ytdLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    const ytdMiles = ytdLogs.reduce((sum, log) => sum + (log.miles || 0), 0);
    const ytdPay = ytdLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);

    const statusConfig = {
        pending: { label: t('pending'), color: "bg-amber-100 text-amber-700" },
        approved: { label: t('approved'), color: "bg-emerald-100 text-emerald-700" },
        rejected: { label: t('rejected'), color: "bg-red-100 text-red-700" }
    };
    
    return (
        <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
            <div className="max-w-5xl mx-auto">
                <PageHeader
                    title={language === 'es' ? 'Horas de Manejo' : 'Driving Hours'}
                    description={language === 'es' ? 'Registra tus horas de conducción' : 'Track your driving hours'}
                    icon={Clock}
                />

                <LiveTimeTracker 
                  trackingType="driving"
                  onSave={(data) => createDrivingMutation.mutate(data)}
                  isLoading={createDrivingMutation.isPending}
                />

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-white shadow-xl border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-700">
                                {t('currentWeek')}
                            </CardTitle>
                            <Calendar className="w-5 h-5 text-[#3B9FF3]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-[#3B9FF3]">{currentWeekHours.toFixed(1)}h</div>
                            <div className="flex items-center gap-2 mt-2">
                                <DollarSign className="w-4 h-4 text-slate-600" />
                                <span className="text-xl font-bold text-slate-800">${weekPay.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                                {currentWeekMiles.toFixed(0)} miles
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white shadow-xl border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-700">
                                {t('thisMonth')}
                            </CardTitle>
                            <Calendar className="w-5 h-5 text-[#3B9FF3]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-[#3B9FF3]">{currentMonthHours.toFixed(1)}h</div>
                            <div className="flex items-center gap-2 mt-2">
                                <DollarSign className="w-4 h-4 text-slate-600" />
                                <span className="text-xl font-bold text-slate-800">${monthPay.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                                {currentMonthMiles.toFixed(0)} miles
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {format(monthStart, 'MMM yyyy')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white shadow-xl border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-700">
                                {t('yearToDate')}
                            </CardTitle>
                            <TrendingUp className="w-5 h-5 text-[#3B9FF3]" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-[#3B9FF3]">{ytdHours.toFixed(1)}h</div>
                            <div className="flex items-center gap-2 mt-2">
                                <DollarSign className="w-4 h-4 text-slate-600" />
                                <span className="text-xl font-bold text-slate-800">${ytdPay.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">
                                {ytdMiles.toFixed(0)} miles
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {new Date().getFullYear()}
                            </p>
                        </CardContent>
                    </Card>
                </div>
                
                <Card className="bg-white shadow-xl border-slate-200">
                    <CardHeader className="border-b border-slate-200">
                        <CardTitle className="flex items-center gap-2 text-slate-900">
                            <Clock className="w-5 h-5 text-[#3B9FF3]" />
                            {t('myRecords')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 border-slate-200">
                                        <TableHead className="text-slate-700">{t('date')}</TableHead>
                                        <TableHead className="text-slate-700">{t('job')}</TableHead>
                                        <TableHead className="text-right text-slate-700">{language === 'es' ? 'Horas' : 'Hours'}</TableHead>
                                        <TableHead className="text-right text-slate-700">{language === 'es' ? 'Millas' : 'Miles'}</TableHead>
                                        <TableHead className="text-right text-slate-700">{language === 'es' ? 'Pago' : 'Pay'}</TableHead>
                                        <TableHead className="text-slate-700">{t('status')}</TableHead>
                                        <TableHead className="text-slate-700">{t('notes')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24 text-slate-500">{t('loading')}...</TableCell>
                                        </TableRow>
                                    ) : drivingLogs?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24 text-slate-500">
                                                {language === 'es' ? 'No hay registros de horas de manejo' : 'No driving hours records'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        drivingLogs?.map(log => {
                                            const config = statusConfig[log.status] || statusConfig.pending;
                                            return (
                                                <TableRow key={log.id} className="hover:bg-slate-50 border-slate-200">
                                                    <TableCell className="text-slate-700">{format(new Date(log.date), 'MMM dd, yyyy')}</TableCell>
                                                    <TableCell>
                                                        {log.job_name ? (
                                                            <span className="text-sm text-slate-700">{log.job_name}</span>
                                                        ) : (
                                                            <span className="text-sm text-slate-400">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-[#3B9FF3]">{(log.hours || 0).toFixed(1)}h</TableCell>
                                                    <TableCell className="text-right font-semibold text-[#3B9FF3]">{(log.miles || 0).toFixed(1)}mi</TableCell>
                                                    <TableCell className="text-right font-bold text-slate-800">
                                                        ${(log.total_amount || 0).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={config.color}>{config.label}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-slate-600">{log.notes || '-'}</TableCell>
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
