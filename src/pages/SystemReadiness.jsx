import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Rocket, 
  PlayCircle,
  Shield,
  Users,
  Briefcase,
  MapPin,
  CalendarDays,
  FileText,
  Clock,
  Banknote,
  DollarSign,
  LayoutDashboard,
  Lock,
  Unlock
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { toast } from 'sonner';

export default function SystemReadiness() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showPilotDialog, setShowPilotDialog] = useState(false);
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isCEO = user?.role === 'admin' || user?.role === 'ceo' || user?.position === 'CEO';

  // Fetch or create readiness record
  const { data: readinessRecord, isLoading } = useQuery({
    queryKey: ['systemReadiness'],
    queryFn: async () => {
      const records = await base44.entities.SystemReadiness.list();
      if (records.length > 0) return records[0];
      
      // Create default record
      return await base44.entities.SystemReadiness.create({
        status: 'not_started',
        manual_checks: {
          employees_trained: false,
          field_workers_know_jobs: false,
          calendar_reviewed: false,
          payroll_process_tested: false,
          commission_agreements_signed: false,
          invoicing_process_tested: false
        }
      });
    },
    enabled: !!user && isCEO,
  });

  // Fetch data for automatic checks (only if in pilot or go-live mode)
  const isActive = readinessRecord?.status !== 'not_started';

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.filter({ employment_status: 'active' }),
    enabled: isActive,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    enabled: isActive,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    enabled: isActive,
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['scheduleShifts'],
    queryFn: () => base44.entities.ScheduleShift.list(),
    enabled: isActive,
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
    enabled: isActive,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    enabled: isActive,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    enabled: isActive,
  });

  const { data: payrolls = [] } = useQuery({
    queryKey: ['payrolls'],
    queryFn: () => base44.entities.WeeklyPayroll.list(),
    enabled: isActive,
  });

  const { data: agreements = [] } = useQuery({
    queryKey: ['agreements'],
    queryFn: () => base44.entities.CommissionAgreement.list(),
    enabled: isActive,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => base44.entities.CommissionResult.list(),
    enabled: isActive,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SystemReadiness.update(readinessRecord.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemReadiness'] });
    },
  });

  const handleStartPilot = () => {
    updateMutation.mutate({
      status: 'pilot_mode',
      pilot_started_at: new Date().toISOString(),
      pilot_started_by: user.email
    });
    setShowPilotDialog(false);
    toast.success(language === 'es' ? 'Modo piloto activado' : 'Pilot mode activated');
  };

  const handleGoLive = () => {
    if (confirmText !== 'GO LIVE') {
      toast.error(language === 'es' ? 'Escribe "GO LIVE" para confirmar' : 'Type "GO LIVE" to confirm');
      return;
    }

    updateMutation.mutate({
      status: 'go_live',
      go_live_at: new Date().toISOString(),
      go_live_by: user.email
    });
    setShowGoLiveDialog(false);
    setConfirmText('');
    toast.success('🚀 ' + (language === 'es' ? 'Sistema activado para producción' : 'System activated for production'));
  };

  const handleManualCheck = (checkKey) => {
    if (readinessRecord.status === 'not_started') return;
    
    updateMutation.mutate({
      manual_checks: {
        ...readinessRecord.manual_checks,
        [checkKey]: !readinessRecord.manual_checks[checkKey]
      }
    });
  };

  // Automatic checks (only evaluated in active modes)
  const automaticChecks = isActive ? [
    {
      id: 'employees',
      label: language === 'es' ? 'Al menos 2 empleados activos' : 'At least 2 active employees',
      icon: Users,
      passed: employees.length >= 2,
      count: employees.length,
      description: language === 'es' ? 'empleados activos' : 'active employees'
    },
    {
      id: 'jobs',
      label: language === 'es' ? 'Al menos 1 trabajo activo' : 'At least 1 active job',
      icon: Briefcase,
      passed: jobs.length >= 1,
      count: jobs.length,
      description: language === 'es' ? 'trabajos activos' : 'active jobs'
    },
    {
      id: 'field_tasks',
      label: language === 'es' ? 'Al menos 1 tarea en Field' : 'At least 1 task in Field',
      icon: MapPin,
      passed: tasks.length >= 1,
      count: tasks.length,
      description: language === 'es' ? 'tareas en Field' : 'tasks in Field'
    },
    {
      id: 'calendar',
      label: language === 'es' ? 'Al menos 1 turno programado' : 'At least 1 scheduled shift',
      icon: CalendarDays,
      passed: shifts.length >= 1,
      count: shifts.length,
      description: language === 'es' ? 'turnos programados' : 'scheduled shifts'
    },
    {
      id: 'quotes',
      label: language === 'es' ? 'Al menos 1 estimado creado' : 'At least 1 quote created',
      icon: FileText,
      passed: quotes.length >= 1,
      count: quotes.length,
      description: language === 'es' ? 'estimados' : 'quotes'
    },
    {
      id: 'invoices',
      label: language === 'es' ? 'Al menos 1 factura enviada' : 'At least 1 invoice sent',
      icon: FileText,
      passed: invoices.some(inv => inv.status === 'sent' || inv.status === 'paid'),
      count: invoices.filter(inv => inv.status === 'sent' || inv.status === 'paid').length,
      description: language === 'es' ? 'facturas enviadas' : 'invoices sent'
    },
    {
      id: 'time_tracking',
      label: language === 'es' ? 'Al menos 1 entrada de tiempo aprobada' : 'At least 1 time entry approved',
      icon: Clock,
      passed: timeEntries.some(te => te.status === 'approved'),
      count: timeEntries.filter(te => te.status === 'approved').length,
      description: language === 'es' ? 'entradas aprobadas' : 'approved entries'
    },
    {
      id: 'payroll',
      label: language === 'es' ? 'Al menos 1 nómina generada' : 'At least 1 payroll generated',
      icon: Banknote,
      passed: payrolls.length >= 1,
      count: payrolls.length,
      description: language === 'es' ? 'nóminas' : 'payrolls'
    },
    {
      id: 'commissions',
      label: language === 'es' ? 'Acuerdos de comisión configurados' : 'Commission agreements configured',
      icon: DollarSign,
      passed: agreements.some(a => a.status === 'active' && a.signed),
      count: agreements.filter(a => a.status === 'active' && a.signed).length,
      description: language === 'es' ? 'acuerdos firmados' : 'signed agreements'
    }
  ] : [];

  // Manual checks
  const manualChecks = [
    {
      id: 'employees_trained',
      label: language === 'es' 
        ? 'Empleados capacitados en uso de la app' 
        : 'Employees trained on app usage',
      icon: Users
    },
    {
      id: 'field_workers_know_jobs',
      label: language === 'es' 
        ? 'Trabajadores de campo saben a dónde ir sin llamar' 
        : 'Field workers know where to go without calling',
      icon: MapPin
    },
    {
      id: 'calendar_reviewed',
      label: language === 'es' 
        ? 'Calendario revisado y validado para próxima semana' 
        : 'Calendar reviewed and validated for next week',
      icon: CalendarDays
    },
    {
      id: 'payroll_process_tested',
      label: language === 'es' 
        ? 'Proceso de nómina probado de punta a punta' 
        : 'Payroll process tested end-to-end',
      icon: Banknote
    },
    {
      id: 'commission_agreements_signed',
      label: language === 'es' 
        ? 'Todos los managers firmaron acuerdos de comisión' 
        : 'All managers signed commission agreements',
      icon: DollarSign
    },
    {
      id: 'invoicing_process_tested',
      label: language === 'es' 
        ? 'Proceso de facturación probado con cliente real' 
        : 'Invoicing process tested with real customer',
      icon: FileText
    }
  ];

  const autoPassedCount = isActive ? automaticChecks.filter(c => c.passed).length : 0;
  const autoTotalCount = automaticChecks.length;
  const manualPassedCount = readinessRecord?.manual_checks 
    ? Object.values(readinessRecord.manual_checks).filter(Boolean).length 
    : 0;
  const manualTotalCount = manualChecks.length;

  const allChecksPassed = isActive && 
    autoPassedCount === autoTotalCount && 
    manualPassedCount === manualTotalCount;

  if (!isCEO) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800">
            {language === 'es' 
              ? 'Solo CEO/Admin puede acceder a System Readiness' 
              : 'Only CEO/Admin can access System Readiness'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusConfig = {
    not_started: {
      label: language === 'es' ? 'No Iniciado' : 'Not Started',
      color: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: Lock,
      description: language === 'es' 
        ? 'El checklist de preparación está listo pero no ha sido activado' 
        : 'Readiness checklist is ready but not activated'
    },
    pilot_mode: {
      label: language === 'es' ? 'Modo Piloto' : 'Pilot Mode',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: PlayCircle,
      description: language === 'es' 
        ? 'Sistema en validación - checks automáticos activos' 
        : 'System under validation - automatic checks active'
    },
    go_live: {
      label: language === 'es' ? 'Producción' : 'Go-Live',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: Rocket,
      description: language === 'es' 
        ? 'Sistema validado y listo para operación completa' 
        : 'System validated and ready for full operation'
    }
  };

  const currentStatus = statusConfig[readinessRecord?.status || 'not_started'];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-[#F1F5F9] pb-20 md:pb-0">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <PageHeader
          title={language === 'es' ? 'System Readiness' : 'System Readiness'}
          description={language === 'es' 
            ? 'Validación de preparación operativa' 
            : 'Operational readiness validation'}
          icon={Shield}
        />

        {/* Status Banner */}
        <Card className={`mb-6 border-2 ${
          readinessRecord?.status === 'go_live' 
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
            : readinessRecord?.status === 'pilot_mode'
            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300'
            : 'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-300'
        }`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  readinessRecord?.status === 'go_live' 
                    ? 'bg-green-600'
                    : readinessRecord?.status === 'pilot_mode'
                    ? 'bg-amber-600'
                    : 'bg-slate-600'
                }`}>
                  <StatusIcon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {currentStatus.label}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">{currentStatus.description}</p>
                  {readinessRecord?.status === 'pilot_mode' && readinessRecord.pilot_started_at && (
                    <p className="text-xs text-slate-500 mt-1">
                      {language === 'es' ? 'Iniciado' : 'Started'}: {format(new Date(readinessRecord.pilot_started_at), 'MMM d, yyyy h:mm a')} {language === 'es' ? 'por' : 'by'} {readinessRecord.pilot_started_by}
                    </p>
                  )}
                  {readinessRecord?.status === 'go_live' && readinessRecord.go_live_at && (
                    <p className="text-xs text-slate-500 mt-1">
                      {language === 'es' ? 'Activado' : 'Activated'}: {format(new Date(readinessRecord.go_live_at), 'MMM d, yyyy h:mm a')} {language === 'es' ? 'por' : 'by'} {readinessRecord.go_live_by}
                    </p>
                  )}
                </div>
              </div>

              {readinessRecord?.status === 'not_started' && (
                <Button 
                  onClick={() => setShowPilotDialog(true)}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Iniciar Validación' : 'Start System Readiness'}
                </Button>
              )}

              {readinessRecord?.status === 'pilot_mode' && allChecksPassed && (
                <Button 
                  onClick={() => setShowGoLiveDialog(true)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Confirmar Go-Live' : 'Confirm Go-Live'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pilot Mode Banner */}
        {readinessRecord?.status === 'pilot_mode' && (
          <Alert className="mb-6 border-amber-300 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800 font-medium">
              {language === 'es' 
                ? '⚠️ MCI Connect está en Modo Piloto. Validación en progreso.' 
                : '⚠️ MCI Connect is in Pilot Mode. Validation in progress.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Overview */}
        {isActive && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5" />
                  {language === 'es' ? 'Checks Automáticos' : 'Automatic Checks'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all"
                        style={{ width: `${(autoPassedCount / autoTotalCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    {autoPassedCount}/{autoTotalCount}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {language === 'es' ? 'Validaciones Manuales' : 'Manual Validations'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-600 to-green-500 transition-all"
                        style={{ width: `${(manualPassedCount / manualTotalCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-lg font-bold text-slate-900">
                    {manualPassedCount}/{manualTotalCount}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Automatic Checks */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5" />
              {language === 'es' ? 'Checks Automáticos del Sistema' : 'Automatic System Checks'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readinessRecord?.status === 'not_started' ? (
              <div className="text-center py-8 text-slate-500">
                <Lock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">
                  {language === 'es' 
                    ? 'Checks automáticos se activarán al iniciar validación' 
                    : 'Automatic checks will activate when you start validation'}
                </p>
              </div>
            ) : (
              automaticChecks.map((check) => {
                const Icon = check.icon;
                return (
                  <div 
                    key={check.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      check.passed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${check.passed ? 'text-green-600' : 'text-red-600'}`} />
                      <div>
                        <p className="font-medium text-slate-900">{check.label}</p>
                        <p className="text-sm text-slate-600">
                          {check.count} {check.description}
                        </p>
                      </div>
                    </div>
                    {check.passed ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Manual Checks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {language === 'es' ? 'Validaciones Manuales (CEO)' : 'Manual Validations (CEO)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readinessRecord?.status === 'not_started' ? (
              <div className="text-center py-8 text-slate-500">
                <Lock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">
                  {language === 'es' 
                    ? 'Validaciones manuales se habilitarán al iniciar modo piloto' 
                    : 'Manual validations will be enabled when you start pilot mode'}
                </p>
              </div>
            ) : (
              manualChecks.map((check) => {
                const Icon = check.icon;
                const isChecked = readinessRecord?.manual_checks?.[check.id] || false;
                
                return (
                  <div 
                    key={check.id}
                    onClick={() => handleManualCheck(check.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      isChecked 
                        ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Checkbox 
                      checked={isChecked}
                      className="pointer-events-none"
                    />
                    <Icon className={`w-5 h-5 ${isChecked ? 'text-green-600' : 'text-slate-500'}`} />
                    <p className="flex-1 font-medium text-slate-900">{check.label}</p>
                    {isChecked && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Notes Section */}
        {isActive && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'es' ? 'Notas del CEO' : 'CEO Notes'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={readinessRecord?.notes || ''}
                onChange={(e) => updateMutation.mutate({ notes: e.target.value })}
                placeholder={language === 'es' 
                  ? 'Observaciones sobre la preparación del sistema...' 
                  : 'Observations about system readiness...'}
                className="h-32"
              />
            </CardContent>
          </Card>
        )}

        {/* Start Pilot Dialog */}
        <Dialog open={showPilotDialog} onOpenChange={setShowPilotDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlayCircle className="w-6 h-6 text-amber-600" />
                {language === 'es' ? 'Iniciar Modo Piloto' : 'Start Pilot Mode'}
              </DialogTitle>
              <DialogDescription>
                {language === 'es' 
                  ? 'Esto activará los checks automáticos y habilitará las validaciones manuales.' 
                  : 'This will activate automatic checks and enable manual validations.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Alert className="border-amber-300 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  {language === 'es' 
                    ? 'El sistema seguirá siendo completamente funcional. Los checks solo monitorizan el estado de preparación.' 
                    : 'The system will remain fully functional. Checks only monitor readiness status.'}
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPilotDialog(false)}>
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleStartPilot}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Iniciar Validación' : 'Start Validation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Go-Live Dialog */}
        <Dialog open={showGoLiveDialog} onOpenChange={setShowGoLiveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-700">
                <Rocket className="w-6 h-6" />
                {language === 'es' ? 'Confirmar Go-Live' : 'Confirm Go-Live'}
              </DialogTitle>
              <DialogDescription>
                {language === 'es' 
                  ? 'Esta acción marca el sistema como listo para producción completa.' 
                  : 'This action marks the system as ready for full production.'}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800 font-medium">
                  ✅ {language === 'es' ? 'Todos los checks completados' : 'All checks completed'}
                </AlertDescription>
              </Alert>
              
              <div>
                <Label className="text-slate-700 font-semibold">
                  {language === 'es' 
                    ? 'Escribe "GO LIVE" para confirmar:' 
                    : 'Type "GO LIVE" to confirm:'}
                </Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="GO LIVE"
                  className="mt-2 font-mono"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowGoLiveDialog(false);
                setConfirmText('');
              }}>
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleGoLive}
                disabled={confirmText !== 'GO LIVE'}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Rocket className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Activar Go-Live' : 'Activate Go-Live'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}