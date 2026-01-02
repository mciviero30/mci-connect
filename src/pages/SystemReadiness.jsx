import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  Circle,
  AlertCircle, 
  Rocket,
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
  PlayCircle,
  Lock,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { toast } from 'sonner';
import SystemHealthMonitor from '@/components/admin/SystemHealthMonitor';

export default function SystemReadiness() {
  const queryClient = useQueryClient();
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [openSections, setOpenSections] = useState({});

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isCEO = user?.role === 'admin' || user?.role === 'ceo';

  const { data: readinessRecord, isLoading } = useQuery({
    queryKey: ['systemReadiness'],
    queryFn: async () => {
      const records = await base44.entities.SystemReadiness.list();
      if (records.length > 0) return records[0];
      
      return await base44.entities.SystemReadiness.create({
        status: 'not_started',
        human_validations: {
          employee_knows_where_to_go: false,
          employee_can_checkin_alone: false,
          employee_uploads_photos_correctly: false,
          admin_invoices_without_excel: false,
          daily_operation_flows_smooth: false
        }
      });
    },
    enabled: !!user && isCEO,
  });

  const isActive = readinessRecord?.status !== 'not_started';

  // Fetch data for checks (only if active)
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.filter({ employment_status: 'active' }),
    enabled: isActive,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    enabled: isActive,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list(),
    enabled: isActive,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['photos'],
    queryFn: () => base44.entities.Photo.list(),
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

  const { data: commissions = [] } = useQuery({
    queryKey: ['commissions'],
    queryFn: () => base44.entities.CommissionResult.list(),
    enabled: isActive,
  });

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
      pilot_started_by: user.email,
      last_review_at: new Date().toISOString()
    });
    setShowStartDialog(false);
    toast.success('Pilot Mode activated');
  };

  const handleGoLive = () => {
    if (confirmText !== 'GO LIVE') {
      toast.error('Type "GO LIVE" to confirm');
      return;
    }

    updateMutation.mutate({
      status: 'go_live',
      go_live_at: new Date().toISOString(),
      go_live_by: user.email,
      last_review_at: new Date().toISOString()
    });
    setShowGoLiveDialog(false);
    setConfirmText('');
    toast.success('🚀 System marked as Ready for Go-Live');
  };

  const handleSaveState = () => {
    updateMutation.mutate({
      last_review_at: new Date().toISOString()
    });
    toast.success('State saved');
  };

  const handleHumanCheck = (checkKey) => {
    if (!isActive) return;
    
    updateMutation.mutate({
      human_validations: {
        ...readinessRecord.human_validations,
        [checkKey]: !readinessRecord.human_validations[checkKey]
      },
      last_review_at: new Date().toISOString()
    });
  };

  const toggleSection = (sectionId) => {
    setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Define checks
  const coreChecks = [
    {
      section: 'Employees & Access',
      checks: [
        { id: 'employees_created', label: 'Employees created (≥1)', passed: employees.length >= 1 },
        { id: 'roles_assigned', label: 'Roles assigned', passed: employees.some(e => e.role) },
        { id: 'ceo_admin_defined', label: 'CEO/Admin defined', passed: employees.some(e => e.role === 'admin' || e.role === 'ceo') }
      ]
    },
    {
      section: 'Jobs & Assignments',
      checks: [
        { id: 'jobs_created', label: 'Jobs created', passed: jobs.length >= 1 },
        { id: 'jobs_with_employees', label: 'Jobs with assigned employees', passed: jobs.some(j => j.assigned_team_field?.length > 0) },
        { id: 'job_in_progress', label: 'Job with status "In Progress"', passed: jobs.some(j => j.status === 'active') }
      ]
    },
    {
      section: 'MCI Field',
      checks: [
        { id: 'field_active_on_job', label: 'Field active on at least one Job', passed: jobs.some(j => j.field_project_id) },
        { id: 'photos_from_field', label: 'Photos created from Field', passed: photos.length >= 1 },
        { id: 'tasks_from_field', label: 'Tasks created from Field', passed: tasks.length >= 1 }
      ]
    },
    {
      section: 'Calendar & Schedules',
      checks: [
        { id: 'schedules_created', label: 'Schedules created', passed: shifts.length >= 1 },
        { id: 'employees_see_schedule', label: 'Employees can see their schedule', passed: shifts.some(s => s.employee_email) },
        { id: 'schedules_linked_jobs', label: 'Schedules linked to Jobs', passed: shifts.some(s => s.job_id) }
      ]
    }
  ];

  const financeChecks = [
    { id: 'quote_created', label: 'Quote created', passed: quotes.length >= 1 },
    { id: 'quote_approved', label: 'Quote approved', passed: quotes.some(q => q.status === 'sent' || q.status === 'approved') },
    { id: 'job_from_quote', label: 'Job generated from Quote', passed: jobs.some(j => j.quote_id) },
    { id: 'invoice_created', label: 'Invoice created', passed: invoices.length >= 1 },
    { id: 'invoice_paid', label: 'Invoice marked as Paid', passed: invoices.some(i => i.status === 'paid'), tooltip: 'Required to validate full financial flow' }
  ];

  const payrollChecks = [
    { id: 'time_entries_created', label: 'Time entries created', passed: timeEntries.length >= 1 },
    { id: 'breaks_registered', label: 'Breaks registered', passed: timeEntries.some(te => te.breaks?.length > 0) },
    { id: 'time_linked_jobs', label: 'Time entries linked to Jobs', passed: timeEntries.some(te => te.job_id) },
    { id: 'payroll_generated', label: 'Payroll preview generated', passed: payrolls.length >= 1 }
  ];

  const commissionChecks = [
    { id: 'commission_calculated', label: 'Commission calculated', passed: commissions.length >= 1 },
    { id: 'commission_approved', label: 'Commission approved', passed: commissions.some(c => c.status === 'approved') },
    { id: 'commission_paid', label: 'Commission paid (optional)', passed: commissions.some(c => c.status === 'paid'), optional: true, note: 'Commission payment may be simulated during Pilot Mode' }
  ];

  const dashboardChecks = [
    { id: 'exec_dashboard_data', label: 'Executive Dashboard shows data', passed: jobs.length >= 1 && invoices.length >= 1 },
    { id: 'manager_dashboard_jobs', label: 'Manager Dashboard shows assigned jobs', passed: jobs.some(j => j.assigned_team_field?.length > 0) },
    { id: 'kpis_nonzero', label: 'KPIs are non-zero', passed: timeEntries.length >= 1 || invoices.length >= 1 }
  ];

  const humanChecks = [
    { id: 'employee_knows_where_to_go', label: 'Employee knows where to go without calling', tooltip: 'Human confirmation based on real usage' },
    { id: 'employee_can_checkin_alone', label: 'Employee can check-in/out without help' },
    { id: 'employee_uploads_photos_correctly', label: 'Employee can upload photos correctly' },
    { id: 'admin_invoices_without_excel', label: 'Admin can invoice without Excel' },
    { id: 'daily_operation_flows_smooth', label: 'Daily operation flows without friction' }
  ];

  const calculateProgress = (checks) => {
    const passed = checks.filter(c => c.passed).length;
    return { passed, total: checks.length };
  };

  const coreProgress = coreChecks.reduce((acc, section) => {
    const prog = calculateProgress(section.checks);
    return { passed: acc.passed + prog.passed, total: acc.total + prog.total };
  }, { passed: 0, total: 0 });

  const financeProgress = calculateProgress(financeChecks);
  const payrollProgress = calculateProgress(payrollChecks);
  const commissionProgress = calculateProgress(commissionChecks.filter(c => !c.optional));
  const dashboardProgress = calculateProgress(dashboardChecks);
  const humanProgress = {
    passed: readinessRecord?.human_validations ? Object.values(readinessRecord.human_validations).filter(Boolean).length : 0,
    total: humanChecks.length
  };

  const allAutoChecksPassed = 
    coreProgress.passed === coreProgress.total &&
    financeProgress.passed === financeProgress.total &&
    payrollProgress.passed === payrollProgress.total &&
    commissionProgress.passed === commissionProgress.total &&
    dashboardProgress.passed === dashboardProgress.total;

  const allHumanChecksPassed = humanProgress.passed === humanProgress.total;
  const canGoLive = isActive && allAutoChecksPassed && allHumanChecksPassed;

  if (!isCEO) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800">
            Only CEO/Admin can access System Readiness
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
    not_started: { label: 'NOT STARTED', color: 'text-slate-500', icon: '⚪' },
    pilot_mode: { label: 'PILOT MODE', color: 'text-amber-600', icon: '🟡' },
    go_live: { label: 'READY FOR GO-LIVE', color: 'text-green-600', icon: '🟢' }
  };

  const status = statusConfig[readinessRecord?.status];

  const CheckItem = ({ check, disabled }) => (
    <div className={`flex items-center gap-3 py-2 ${disabled ? 'opacity-40' : ''}`}>
      {disabled ? (
        <Circle className="w-4 h-4 text-slate-300" />
      ) : check.passed ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : (
        <Circle className="w-4 h-4 text-slate-400" />
      )}
      <span className="text-sm text-slate-700">{check.label}</span>
      {check.optional && <Badge variant="outline" className="text-xs">Optional</Badge>}
      {check.tooltip && (
        <span className="text-xs text-slate-500 italic ml-auto">ℹ️ {check.tooltip}</span>
      )}
      {check.note && (
        <span className="text-xs text-slate-500 italic ml-auto">{check.note}</span>
      )}
    </div>
  );

  const SectionCollapsible = ({ title, progress, children, sectionId }) => {
    const isOpen = openSections[sectionId];
    const progressColor = progress.passed === progress.total ? 'text-green-600' : 'text-amber-600';
    
    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionId)}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span className="font-semibold text-slate-900">{title}</span>
            </div>
            <span className={`font-bold ${progressColor}`}>
              {progress.passed} / {progress.total}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 border-x border-b border-slate-200 rounded-b-lg bg-white">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col">
      {/* Fixed Header */}
      <div className="bg-white border-b border-slate-200 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                System Readiness – MCI Connect
              </h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-slate-600">System Status:</span>
                  <span className={`font-bold ${status.color}`}>
                    {status.icon} {status.label}
                  </span>
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-600">
                  Last Review: {readinessRecord?.last_review_at ? format(new Date(readinessRecord.last_review_at), 'MMM d, yyyy') : '—'}
                </span>
              </div>
            </div>
            
            {readinessRecord?.status === 'not_started' && (
              <Button 
                onClick={() => setShowStartDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Start System Readiness
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pilot Mode Banner */}
      {readinessRecord?.status === 'pilot_mode' && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-amber-800">
              🟡 <strong>MCI Connect is currently running in Pilot Mode</strong> – System validation is active
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto p-6 h-full flex flex-col">
          <Tabs defaultValue="core" className="flex-1 flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="core">Core</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
              <TabsTrigger value="payroll">Payroll</TabsTrigger>
              <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
              <TabsTrigger value="human">Human Validation</TabsTrigger>
              <TabsTrigger value="health">Health Monitor</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto pb-32">
              <TabsContent value="core" className="space-y-3 mt-0">
                {coreChecks.map((section, idx) => (
                  <SectionCollapsible 
                    key={idx} 
                    title={section.section}
                    progress={calculateProgress(section.checks)}
                    sectionId={`core-${idx}`}
                  >
                    {section.checks.map((check, checkIdx) => (
                      <CheckItem key={checkIdx} check={check} disabled={!isActive} />
                    ))}
                  </SectionCollapsible>
                ))}
              </TabsContent>

              <TabsContent value="finance" className="mt-0">
                <Card>
                  <CardContent className="p-6 space-y-2">
                    {financeChecks.map((check, idx) => (
                      <CheckItem key={idx} check={check} disabled={!isActive} />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payroll" className="mt-0">
                <Card>
                  <CardContent className="p-6 space-y-2">
                    {payrollChecks.map((check, idx) => (
                      <CheckItem key={idx} check={check} disabled={!isActive} />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dashboards" className="mt-0">
                <Card>
                  <CardContent className="p-6 space-y-2">
                    {dashboardChecks.map((check, idx) => (
                      <CheckItem key={idx} check={check} disabled={!isActive} />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="human" className="mt-0">
                <Card>
                  <CardContent className="p-6">
                    <Alert className="mb-6 border-amber-300 bg-amber-50">
                      <Shield className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800 text-sm">
                        ⚠️ These checks are <strong>never automatic</strong>. Human confirmation based on real usage, not data presence.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      {humanChecks.map((check) => {
                        const isChecked = readinessRecord?.human_validations?.[check.id] || false;
                        return (
                          <div 
                            key={check.id}
                            onClick={() => handleHumanCheck(check.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              !isActive 
                                ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50'
                                : isChecked 
                                ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                : 'bg-white border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <Checkbox 
                              checked={isChecked}
                              disabled={!isActive}
                              className="pointer-events-none"
                            />
                            <span className="flex-1 text-sm font-medium text-slate-900">{check.label}</span>
                            {check.tooltip && (
                              <span className="text-xs text-slate-500 italic">ℹ️ {check.tooltip}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6">
                      <label className="text-sm font-semibold text-slate-700 mb-2 block">CEO Notes</label>
                      <Textarea
                        value={readinessRecord?.notes || ''}
                        onChange={(e) => updateMutation.mutate({ notes: e.target.value })}
                        placeholder="Add notes about system readiness..."
                        className="h-24"
                        disabled={!isActive}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="health" className="mt-0">
                <SystemHealthMonitor />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="bg-white border-t border-slate-200 p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={handleSaveState}
            disabled={!isActive}
          >
            Save State
          </Button>
          
          <Button 
            onClick={() => setShowGoLiveDialog(true)}
            disabled={!canGoLive}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white disabled:from-slate-300 disabled:to-slate-400"
          >
            <Rocket className="w-4 h-4 mr-2" />
            Mark as Go-Live
          </Button>
        </div>
      </div>

      {/* Start Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="w-6 h-6 text-blue-600" />
              Start System Readiness
            </DialogTitle>
            <DialogDescription>
              Activate system validation when you are ready to test real operation.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              This will activate automatic checks and enable manual validations. Your system will remain fully functional.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartPilot}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Start Pilot Mode
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
              Confirm Go-Live
            </DialogTitle>
            <DialogDescription className="text-red-600 font-semibold">
              Confirming Go-Live means MCI Connect is now the primary operational system.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Alert className="border-green-300 bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-800 font-medium">
                ✅ All automatic checks completed<br />
                ✅ All human validations confirmed
              </AlertDescription>
            </Alert>
            
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Type "GO LIVE" to confirm:
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="GO LIVE"
                className="font-mono text-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowGoLiveDialog(false);
              setConfirmText('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleGoLive}
              disabled={confirmText !== 'GO LIVE'}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Confirm Go-Live
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}