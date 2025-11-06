
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Briefcase, FileText, Trash2, DollarSign, Clock, Receipt, TrendingUp, TrendingDown, Wallet, Car, Users, Award, ExternalLink, FileCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/toast';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <Card className={`overflow-hidden border-slate-800 shadow-xl glass-card`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${color}`} />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-white">{value}</div>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </CardContent>
    </Card>
);

export default function JobDetails() {
    const queryClient = useQueryClient();
    const toast = useToast();
    const jobId = new URLSearchParams(window.location.search).get('id');
    const { data: user } = useQuery({ queryKey: ['currentUser'] });
    const [language, setLanguage] = useState('es'); // Assuming 'es' for Spanish as default based on prompt

    const { data: job, isLoading: loadingJob } = useQuery({
        queryKey: ['job', jobId],
        queryFn: () => base44.entities.Job.get(jobId),
        enabled: !!jobId,
    });
    
    const { data: invoices, isLoading: loadingInvoices } = useQuery({
        queryKey: ['invoicesForJob', jobId],
        queryFn: () => base44.entities.Invoice.filter({ job_id: jobId }),
        enabled: !!jobId,
    });

    const { data: quotes, isLoading: loadingQuotes } = useQuery({
        queryKey: ['quotesForJob', jobId],
        queryFn: () => base44.entities.Quote.filter({ job_id: jobId }),
        enabled: !!jobId,
    });

    const { data: jobFiles, isLoading: loadingFiles } = useQuery({
        queryKey: ['jobFiles', jobId],
        queryFn: () => base44.entities.JobFile.filter({ job_id: jobId }),
        enabled: !!jobId,
    });

    const { data: timeEntries, isLoading: loadingTime } = useQuery({
        queryKey: ['timeEntriesForJob', jobId],
        queryFn: () => base44.entities.TimeEntry.filter({ job_id: jobId, status: 'approved' }),
        enabled: !!jobId,
    });
    
    const { data: expenses, isLoading: loadingExpenses } = useQuery({
        queryKey: ['expensesForJob', jobId],
        queryFn: () => base44.entities.Expense.filter({ job_id: jobId, status: 'approved' }),
        enabled: !!jobId,
    });

    const { data: drivingLogs, isLoading: loadingDriving } = useQuery({
        queryKey: ['drivingLogsForJob', jobId],
        queryFn: () => base44.entities.DrivingLog.filter({ job_id: jobId, status: 'approved' }),
        enabled: !!jobId,
    });
    
    const { data: employees, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees'],
        queryFn: () => base44.entities.User.list(),
    });

    const [uploading, setUploading] = useState(false);
    const [bonusPercentage, setBonusPercentage] = useState(job?.bonus_percentage || 0);
    const [supervisorEmail, setSupervisorEmail] = useState(job?.supervisor_email || '');

    const uploadMutation = useMutation({
        mutationFn: async (file) => {
            setUploading(true);
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.JobFile.create({ job_id: jobId, file_name: file.name, file_url });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['jobFiles']);
            setUploading(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (fileId) => base44.entities.JobFile.delete(fileId),
        onSuccess: () => queryClient.invalidateQueries(['jobFiles']),
    });

    const updateJobMutation = useMutation({
        mutationFn: (data) => base44.entities.Job.update(jobId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['job']);
            toast.success('Job updated successfully');
        }
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) uploadMutation.mutate(file);
    };

    const handleSaveBonusSettings = () => {
        updateJobMutation.mutate({
            bonus_percentage: parseFloat(bonusPercentage) || 0,
            supervisor_email: supervisorEmail
        });
    };

    const isLoading = loadingJob || loadingFiles || loadingTime || loadingExpenses || loadingDriving || loadingInvoices || loadingQuotes || loadingEmployees;
    const isAdmin = user?.role === 'admin';

    const employeeRateMap = new Map(employees?.map(emp => [emp.email, emp.hourly_rate || 25]));

    const totalIncome = invoices
        ?.filter(inv => inv.status !== 'draft' && inv.status !== 'cancelled')
        .reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
    
    const displayIncome = totalIncome > 0 ? totalIncome : (job?.contract_amount || 0);

    // WORK HOURS COST
    const totalHours = timeEntries?.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0) || 0;
    const totalPayrollCost = timeEntries?.reduce((sum, entry) => {
        const rate = employeeRateMap.get(entry.employee_email) || 25;
        const hours = entry.hours_worked || 0;
        
        // Calculate OT per employee per week (simplified - you might want weekly breakdown)
        const normalHours = Math.min(hours, 40);
        const overtimeHours = Math.max(0, hours - 40);
        const cost = (normalHours * rate) + (overtimeHours * rate * 1.5);
        return sum + cost;
    }, 0) || 0;

    // DRIVING COSTS
    const drivingHours = drivingLogs?.reduce((sum, log) => sum + (log.hours || 0), 0) || 0;
    const drivingMiles = drivingLogs?.reduce((sum, log) => sum + (log.miles || 0), 0) || 0;
    const drivingMilesPay = drivingMiles * 0.60; // $0.60 per mile
    const drivingHoursPay = drivingLogs?.reduce((sum, log) => {
        const rate = employeeRateMap.get(log.employee_email) || 25;
        return sum + ((log.hours || 0) * rate);
    }, 0) || 0;
    const totalDrivingCost = drivingMilesPay + drivingHoursPay;

    // PER DIEM
    const perDiemCost = expenses?.filter(e => e.category === 'per_diem').reduce((sum, e) => sum + e.amount, 0) || 0;

    // REIMBURSEMENTS (personal expenses only)
    const reimbursementsCost = expenses?.filter(e => e.category !== 'per_diem' && e.payment_method === 'personal').reduce((sum, e) => sum + e.amount, 0) || 0;

    // COMPANY EXPENSES (paid with company card - NOT reimbursable)
    const companyExpensesCost = expenses?.filter(e => e.payment_method === 'company_card').reduce((sum, e) => sum + e.amount, 0) || 0;
    
    const totalCost = totalPayrollCost + totalDrivingCost + perDiemCost + reimbursementsCost + companyExpensesCost;
    const grossProfit = displayIncome - totalCost;

    // BONUS CALCULATION
    const bonusAmount = (grossProfit * (bonusPercentage / 100));
    const netProfit = grossProfit - bonusAmount;

    const supervisors = employees?.filter(emp => emp.role === 'admin' || emp.position?.toLowerCase().includes('supervisor') || emp.position?.toLowerCase().includes('foreman'));

    // Performance Analysis
    const approvedQuote = quotes?.find(q => q.status === 'approved' || q.status === 'converted_to_invoice');
    const estimatedHours = approvedQuote?.estimated_hours || 0;
    const actualHours = totalHours;
    const hoursDifference = estimatedHours - actualHours;
    const efficiencyPercentage = estimatedHours > 0 && actualHours > 0 ? ((estimatedHours / actualHours) * 100) : 0;

    return (
        <div className="p-4 md:p-8 min-h-screen" style={{background: 'linear-gradient(135deg, #0f1117 0%, #1a1d29 100%)'}}>
            <div className="max-w-7xl mx-auto">
                {isLoading ? <Skeleton className="h-24 w-full mb-8 bg-slate-800"/> : (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                                    <Briefcase className="w-8 h-8 text-[#3B9FF3]"/> 
                                    {job?.name}
                                </h1>
                                <p className="text-slate-400">{job?.address}</p>
                                <p className="mt-2 text-slate-300">{job?.description}</p>
                            </div>
                            <Badge className={
                                job?.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                job?.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                'bg-slate-600/20 text-slate-400 border-slate-600/30'
                            }>
                                {job?.status}
                            </Badge>
                        </div>
                    </div>
                )}
                
                {/* NEW: Quick Links Section (Prompt #49) */}
                <Card className="glass-card shadow-xl mb-8 border-slate-800">
                    <CardHeader className="border-b border-slate-800">
                        <CardTitle className="flex items-center gap-2 text-white">
                            <ExternalLink className="w-5 h-5 text-[#3B9FF3]" />
                            {language === 'es' ? 'Enlaces Rápidos' : 'Quick Links'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid md:grid-cols-3 gap-4">
                            {/* Customer Link */}
                            {job?.customer_id && (
                                <Link to={createPageUrl(`Clientes`)}>
                                    <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg hover:from-purple-500/20 hover:to-pink-500/20 transition-all cursor-pointer">
                                        <div className="flex items-center justify-between mb-2">
                                            <Users className="w-5 h-5 text-purple-400" />
                                            <ExternalLink className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            {language === 'es' ? 'Cliente' : 'Customer'}
                                        </p>
                                        <p className="text-lg font-bold text-white truncate">
                                            {job?.customer_name}
                                        </p>
                                    </div>
                                </Link>
                            )}

                            {/* Quote Link */}
                            {quotes && quotes.length > 0 && (
                                <Link to={createPageUrl(`VerEstimado?id=${quotes[0].id}`)}>
                                    <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg hover:from-cyan-500/20 hover:to-blue-500/20 transition-all cursor-pointer">
                                        <div className="flex items-center justify-between mb-2">
                                            <FileText className="w-5 h-5 text-cyan-400" />
                                            <ExternalLink className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            {language === 'es' ? 'Cotización' : 'Quote'}
                                        </p>
                                        <p className="text-lg font-bold text-white">
                                            {quotes[0].quote_number}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            ${quotes[0].total?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </Link>
                            )}

                            {/* Invoice Link */}
                            {invoices && invoices.length > 0 && (
                                <Link to={createPageUrl(`VerFactura?id=${invoices[0].id}`)}>
                                    <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg hover:from-green-500/20 hover:to-emerald-500/20 transition-all cursor-pointer">
                                        <div className="flex items-center justify-between mb-2">
                                            <FileCheck className="w-5 h-5 text-green-400" />
                                            <ExternalLink className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <p className="text-sm text-slate-400">
                                            {language === 'es' ? 'Factura' : 'Invoice'}
                                        </p>
                                        <p className="text-lg font-bold text-white">
                                            {invoices[0].invoice_number}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            ${invoices[0].total?.toLocaleString('en-US', { minimumFractionDigits: 2 })} • 
                                            <span className={
                                                invoices[0].status === 'paid' ? 'text-green-400 ml-1' :
                                                invoices[0].status === 'overdue' ? 'text-red-400 ml-1' :
                                                'text-yellow-400 ml-1'
                                            }>
                                                {invoices[0].status === 'paid' ? (language === 'es' ? 'Pagado' : 'Paid') :
                                                 invoices[0].status === 'overdue' ? (language === 'es' ? 'Vencido' : 'Overdue') :
                                                 invoices[0].status === 'partial' ? (language === 'es' ? 'Parcial' : 'Partial') :
                                                 (language === 'es' ? 'Pendiente' : 'Pending')}
                                            </span>
                                        </p>
                                    </div>
                                </Link>
                            )}

                            {/* Show placeholders if no links */}
                            {(!job?.customer_id && (!quotes || quotes.length === 0) && (!invoices || invoices.length === 0)) && (
                                <div className="col-span-3 text-center py-8 text-slate-500">
                                    {language === 'es' 
                                        ? 'No hay documentos asociados a este proyecto.' 
                                        : 'No associated documents for this project.'}
                                </div>
                            )}
                        </div>

                        {/* Multiple documents indicator */}
                        <div className="mt-4 flex gap-4 text-sm">
                            {quotes && quotes.length > 1 && (
                                <p className="text-slate-400">
                                    +{quotes.length - 1} {language === 'es' ? 'cotizaciones más' : 'more quotes'}
                                </p>
                            )}
                            {invoices && invoices.length > 1 && (
                                <p className="text-slate-400">
                                    +{invoices.length - 1} {language === 'es' ? 'facturas más' : 'more invoices'}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {isAdmin && (
                    <>
                        {/* Financial Summary */}
                        <Card className="glass-card shadow-xl mb-8 border-slate-800">
                            <CardHeader className="border-b border-slate-800">
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <DollarSign className="w-5 h-5 text-emerald-400" />
                                    Resumen Financiero
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid md:grid-cols-2 gap-8">
                                    {/* Income Side */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5" />
                                            Ingresos
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                <span className="text-slate-300">Total Facturado</span>
                                                <span className="text-2xl font-bold text-emerald-400">
                                                    ${displayIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Costs Side */}
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                                            <TrendingDown className="w-5 h-5" />
                                            Costos
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-blue-400" />
                                                    <span className="text-slate-300 text-sm">Horas de Trabajo</span>
                                                </div>
                                                <span className="font-semibold text-white">${totalPayrollCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
                                                <div className="flex items-center gap-2">
                                                    <Car className="w-4 h-4 text-cyan-400" />
                                                    <span className="text-slate-300 text-sm">Millas ({drivingMiles.toFixed(0)} mi)</span>
                                                </div>
                                                <span className="font-semibold text-white">${drivingMilesPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>

                                            <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-blue-400" />
                                                    <span className="text-slate-300 text-sm">Horas de Manejo</span>
                                                </div>
                                                <span className="font-semibold text-white">${drivingHoursPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>

                                            <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
                                                <div className="flex items-center gap-2">
                                                    <Receipt className="w-4 h-4 text-purple-400" />
                                                    <span className="text-slate-300 text-sm">Per Diem</span>
                                                </div>
                                                <span className="font-semibold text-white">${perDiemCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>

                                            <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
                                                <div className="flex items-center gap-2">
                                                    <Receipt className="w-4 h-4 text-pink-400" />
                                                    <span className="text-slate-300 text-sm">Recibos (Reembolsos)</span>
                                                </div>
                                                <span className="font-semibold text-white">${reimbursementsCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>

                                            <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded">
                                                <div className="flex items-center gap-2">
                                                    <Receipt className="w-4 h-4 text-amber-400" />
                                                    <span className="text-slate-300 text-sm">Gastos de Compañía</span>
                                                </div>
                                                <span className="font-semibold text-white">${companyExpensesCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>

                                            <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/20 mt-2">
                                                <span className="text-slate-300 font-semibold">Total Costos</span>
                                                <span className="text-xl font-bold text-red-400">
                                                    ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Profit Section */}
                                <div className="mt-8 pt-6 border-t border-slate-700">
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-lg border border-emerald-500/30">
                                            <span className="text-lg font-semibold text-white">Ganancia Bruta</span>
                                            <span className="text-3xl font-bold text-emerald-400">
                                                ${grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {bonusAmount > 0 && (
                                            <>
                                                <div className="flex justify-between items-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                                    <div className="flex items-center gap-2">
                                                        <Award className="w-5 h-5 text-amber-400" />
                                                        <span className="text-slate-300">Bono Supervisor ({bonusPercentage}%)</span>
                                                    </div>
                                                    <span className="text-xl font-bold text-amber-400">
                                                        -${bonusAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
                                                    <span className="text-lg font-semibold text-white">Ganancia Neta</span>
                                                    <span className="text-3xl font-bold text-cyan-400">
                                                        ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Performance Analysis */}
                        {estimatedHours > 0 && (
                            <Card className="glass-card shadow-xl mb-8 border-slate-800">
                                <CardHeader className="border-b border-slate-800">
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                                        Análisis de Rendimiento
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid md:grid-cols-4 gap-6 mb-6">
                                        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 p-4 rounded-xl border border-cyan-500/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock className="w-5 h-5 text-cyan-400" />
                                                <span className="text-sm text-slate-400">Horas Estimadas</span>
                                            </div>
                                            <div className="text-3xl font-bold text-cyan-400">{estimatedHours.toFixed(1)}h</div>
                                        </div>

                                        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-4 rounded-xl border border-blue-500/20">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock className="w-5 h-5 text-blue-400" />
                                                <span className="text-sm text-slate-400">Horas Reales</span>
                                            </div>
                                            <div className="text-3xl font-bold text-blue-400">{actualHours.toFixed(1)}h</div>
                                        </div>

                                        <div className={`bg-gradient-to-br p-4 rounded-xl border ${
                                            hoursDifference >= 0 
                                                ? 'from-emerald-500/10 to-green-500/10 border-emerald-500/20' 
                                                : 'from-red-500/10 to-orange-500/10 border-red-500/20'
                                        }`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                {hoursDifference >= 0 ? (
                                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                                ) : (
                                                    <TrendingDown className="w-5 h-5 text-red-400" />
                                                )}
                                                <span className="text-sm text-slate-400">Diferencia</span>
                                            </div>
                                            <div className={`text-3xl font-bold ${hoursDifference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {hoursDifference >= 0 ? '+' : ''}{hoursDifference.toFixed(1)}h
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {hoursDifference >= 0 ? 'Bajo presupuesto' : 'Sobre presupuesto'}
                                            </div>
                                        </div>

                                        <div className={`bg-gradient-to-br p-4 rounded-xl border ${
                                            efficiencyPercentage >= 100 
                                                ? 'from-emerald-500/10 to-green-500/10 border-emerald-500/20' 
                                                : efficiencyPercentage >= 80
                                                ? 'from-yellow-500/10 to-amber-500/10 border-yellow-500/20'
                                                : 'from-red-500/10 to-orange-500/10 border-red-500/20'
                                        }`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Award className="w-5 h-5 text-purple-400" />
                                                <span className="text-sm text-slate-400">Eficiencia</span>
                                            </div>
                                            <div className={`text-3xl font-bold ${
                                                efficiencyPercentage >= 100 ? 'text-emerald-400' :
                                                efficiencyPercentage >= 80 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                                {efficiencyPercentage.toFixed(0)}%
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {efficiencyPercentage >= 100 ? '¡Excelente!' :
                                                 efficiencyPercentage >= 80 ? 'Bueno' : 'Mejorar'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative w-full h-8 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                                                efficiencyPercentage >= 100 
                                                    ? 'bg-gradient-to-r from-emerald-500 to-green-500' 
                                                    : 'bg-gradient-to-r from-red-500 to-orange-500'
                                            }`}
                                            style={{ width: `${Math.min(100, (actualHours / estimatedHours) * 100)}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-sm font-semibold text-white drop-shadow-lg">
                                                {actualHours.toFixed(1)}h / {estimatedHours.toFixed(1)}h
                                            </span>
                                        </div>
                                    </div>

                                    {/* Insights */}
                                    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
                                        <h4 className="font-semibold text-white mb-2">💡 Análisis:</h4>
                                        <ul className="space-y-2 text-sm text-slate-300">
                                            {hoursDifference >= 0 ? (
                                                <>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-emerald-400">✓</span>
                                                        <span>El equipo completó el trabajo {hoursDifference.toFixed(1)} horas más rápido de lo estimado.</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-cyan-400">→</span>
                                                        <span>Eficiencia del equipo: {efficiencyPercentage.toFixed(0)}% - {
                                                            efficiencyPercentage >= 120 ? '¡Excepcional!' :
                                                            efficiencyPercentage >= 100 ? '¡Excelente desempeño!' :
                                                            'Buen trabajo'
                                                        }</span>
                                                    </li>
                                                </>
                                            ) : (
                                                <>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-red-400">⚠</span>
                                                        <span>El trabajo tomó {Math.abs(hoursDifference).toFixed(1)} horas más de lo estimado.</span>
                                                    </li>
                                                    <li className="flex items-start gap-2">
                                                        <span className="text-yellow-400">→</span>
                                                        <span>Considerar ajustar estimaciones futuras o revisar procesos.</span>
                                                    </li>
                                                </>
                                            )}
                                            {actualHours > 0 && (
                                                <li className="flex items-start gap-2">
                                                    <span className="text-slate-500">•</span>
                                                    <span>Costo promedio por hora: ${(totalPayrollCost / actualHours).toFixed(2)}</span>
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        )}


                        {/* Bonus Settings */}
                        <Card className="glass-card shadow-xl mb-8 border-slate-800">
                            <CardHeader className="border-b border-slate-800">
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Award className="w-5 h-5 text-amber-400" />
                                    Configuración de Bonos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Supervisor</Label>
                                        <Select value={supervisorEmail} onValueChange={setSupervisorEmail}>
                                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                                <SelectValue placeholder="Seleccionar supervisor" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-slate-800">
                                                {supervisors?.map(emp => (
                                                    <SelectItem key={emp.email} value={emp.email} className="text-white hover:bg-slate-800">
                                                        {emp.full_name} - {emp.position}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-slate-300">Porcentaje de Bono (%)</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.5"
                                                value={bonusPercentage}
                                                onChange={(e) => setBonusPercentage(e.target.value)}
                                                className="bg-slate-800 border-slate-700 text-white"
                                                placeholder="0"
                                            />
                                            <Button 
                                                onClick={handleSaveBonusSettings}
                                                className="bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                                            >
                                                Guardar
                                            </Button>
                                        </div>
                                        {bonusAmount > 0 && supervisorEmail && (
                                            <p className="text-sm text-amber-400 mt-2">
                                                Bono para {employees?.find(e => e.email === supervisorEmail)?.full_name}: ${bonusAmount.toFixed(2)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatCard 
                                title="Total Horas" 
                                value={`${totalHours.toFixed(1)}h`} 
                                icon={Clock} 
                                color="text-blue-400"
                                subtitle={`$${totalPayrollCost.toFixed(2)}`}
                            />
                            <StatCard 
                                title="Millas Totales" 
                                value={`${drivingMiles.toFixed(0)} mi`} 
                                icon={Car} 
                                color="text-cyan-400"
                                subtitle={`$${totalDrivingCost.toFixed(2)}`}
                            />
                            <StatCard 
                                title="Per Diem + Recibos" 
                                value={`$${(perDiemCost + reimbursementsCost).toFixed(2)}`} 
                                icon={Receipt} 
                                color="text-purple-400"
                            />
                            <StatCard 
                                title="Ganancia Neta" 
                                value={`$${netProfit.toFixed(2)}`} 
                                icon={netProfit >= 0 ? Wallet : TrendingDown} 
                                color={netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}
                            />
                        </div>
                    </>
                )}

                {/* Files Section */}
                <Card className="border-slate-800 shadow-xl glass-card">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800">
                        <CardTitle className="text-white">Planos y Archivos</CardTitle>
                        {isAdmin && (
                            <>
                                <Button asChild variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                                    <label htmlFor="file-upload">
                                        <Upload className="w-4 h-4 mr-2"/>
                                        {uploading ? 'Subiendo...' : 'Subir Archivo'}
                                    </label>
                                </Button>
                                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} disabled={uploading}/>
                            </>
                        )}
                    </CardHeader>
                    <CardContent className="p-6">
                        {isLoading ? <Skeleton className="h-40 w-full bg-slate-800"/> : (
                            <ul className="space-y-3">
                                {jobFiles?.length === 0 ? <p className="text-slate-500 text-center py-8">No hay archivos para este trabajo.</p> :
                                jobFiles?.map(file => (
                                    <li key={file.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-[#3B9FF3] hover:text-[#2A8FE3] hover:underline">
                                            <FileText className="w-5 h-5"/>
                                            <span className="font-medium">{file.file_name}</span>
                                        </a>
                                        {isAdmin && (
                                            <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(file.id)} className="text-slate-500 hover:text-red-400 hover:bg-red-500/20">
                                                <Trash2 className="w-4 h-4"/>
                                            </Button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
