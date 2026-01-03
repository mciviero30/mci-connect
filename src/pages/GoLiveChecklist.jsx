import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  CheckCircle2, 
  Circle, 
  Rocket, 
  AlertTriangle,
  Shield,
  Database,
  Users,
  FileText,
  Settings as SettingsIcon,
  Trash2,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

export default function GoLiveChecklist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isGoingLive, setIsGoingLive] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const allSettings = await base44.entities.CompanySettings.list();
      return allSettings[0] || null;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['training-stats'],
    queryFn: async () => {
      const [jobs, employees, quotes, invoices] = await Promise.all([
        base44.entities.Job.list(),
        base44.entities.EmployeeDirectory.list(),
        base44.entities.Quote.list(),
        base44.entities.Invoice.list(),
      ]);
      
      return {
        jobs: jobs.length,
        employees: employees.length,
        quotes: quotes.length,
        invoices: invoices.length,
      };
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates) => {
      if (!settings?.id) {
        return await base44.entities.CompanySettings.create(updates);
      }
      return await base44.entities.CompanySettings.update(settings.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    },
  });

  const isAdminOrCEO = user?.role === 'admin' || 
                       (user?.role || '').toLowerCase() === 'ceo';

  if (!isAdminOrCEO) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">Only CEO and Admin users can access the Go-Live Checklist.</p>
        </Card>
      </div>
    );
  }

  const checklist = [
    {
      id: 'employees',
      title: 'Employee Setup',
      description: 'Review and verify employee roster',
      icon: Users,
      status: stats?.employees > 0 ? 'complete' : 'pending',
      count: stats?.employees,
      color: 'blue'
    },
    {
      id: 'customers',
      title: 'Customer Data',
      description: 'Ensure customer records are ready',
      icon: Users,
      status: 'manual',
      color: 'green'
    },
    {
      id: 'jobs',
      title: 'Active Projects',
      description: 'Verify job configurations',
      icon: FileText,
      status: stats?.jobs > 0 ? 'complete' : 'pending',
      count: stats?.jobs,
      color: 'purple'
    },
    {
      id: 'permissions',
      title: 'User Permissions',
      description: 'Review role assignments',
      icon: Shield,
      status: 'manual',
      color: 'amber'
    },
    {
      id: 'integrations',
      title: 'Integrations',
      description: 'Verify Google Drive and other connections',
      icon: SettingsIcon,
      status: 'manual',
      color: 'indigo'
    },
    {
      id: 'training',
      title: 'Team Training',
      description: 'Ensure team is trained on the system',
      icon: Database,
      status: 'manual',
      color: 'cyan'
    },
  ];

  const handleGoLive = async () => {
    setIsGoingLive(true);
    try {
      // Turn off training mode
      await updateSettingsMutation.mutateAsync({
        training_mode: false,
        go_live_date: new Date().toISOString(),
        go_live_by: user.email
      });

      // Log to audit trail
      await base44.entities.AuditLog.create({
        action: 'system_go_live',
        entity_type: 'System',
        entity_id: 'system',
        performed_by: user.email,
        performed_by_name: user.full_name,
        changes: {
          training_mode: { from: true, to: false },
          go_live_date: new Date().toISOString(),
        },
        details: 'System launched to production',
        severity: 'critical'
      });

      toast.success('System is now LIVE! 🚀');
      setShowConfirmDialog(false);
      
      // Clear session storage
      sessionStorage.removeItem('training_banner_dismissed');
      
      // Refresh page after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Go-live error:', error);
      toast.error('Failed to go live: ' + error.message);
    } finally {
      setIsGoingLive(false);
    }
  };

  const isInTrainingMode = settings?.training_mode === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-4 rounded-2xl ${
              isInTrainingMode 
                ? 'bg-gradient-to-br from-amber-500 to-orange-500' 
                : 'bg-gradient-to-br from-green-500 to-emerald-500'
            }`}>
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Go-Live Checklist</h1>
              <p className="text-slate-600">Prepare MCI Connect for production launch</p>
            </div>
          </div>

          {/* Status Badge */}
          <Badge className={`text-sm px-4 py-2 ${
            isInTrainingMode 
              ? 'soft-amber-gradient' 
              : 'soft-green-gradient'
          }`}>
            {isInTrainingMode ? (
              <>
                <Circle className="w-4 h-4 mr-2" />
                Training Mode Active
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                System Live
              </>
            )}
          </Badge>
        </div>

        {/* Warning Card */}
        {isInTrainingMode && (
          <Card className="p-6 mb-6 border-2 border-amber-500/30 bg-amber-50">
            <div className="flex gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-amber-900 mb-2">System in Training Mode</h3>
                <p className="text-sm text-amber-800 mb-3 leading-relaxed">
                  Training mode allows you to test the system with sample data. When you go live, 
                  training mode will be disabled and you can start using the system in production.
                </p>
                <p className="text-xs text-amber-700 font-medium">
                  Note: Going live does NOT delete any data. All existing data will remain.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Checklist Items */}
        <div className="space-y-4 mb-8">
          {checklist.map((item) => {
            const Icon = item.icon;
            const isComplete = item.status === 'complete';
            
            return (
              <Card 
                key={item.id}
                className={`p-6 border-2 transition-all ${
                  isComplete 
                    ? 'border-green-500/30 bg-green-50/50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-${item.color}-100`}>
                    <Icon className={`w-6 h-6 text-${item.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-slate-900">{item.title}</h3>
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{item.description}</p>
                    {item.count !== undefined && (
                      <Badge className="soft-slate-gradient text-xs">
                        {item.count} items
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Action Buttons */}
        {isInTrainingMode && (
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-500/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Ready to Launch?</h3>
                <p className="text-sm text-slate-600">
                  Review the checklist above, then click to take the system live.
                </p>
              </div>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg min-w-[180px]"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Go Live Now
              </Button>
            </div>
          </Card>
        )}

        {/* Already Live */}
        {!isInTrainingMode && (
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-500/30">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-bold text-green-900 mb-1">System is Live! 🎉</h3>
                <p className="text-sm text-green-800">
                  MCI Connect is running in production mode.
                  {settings?.go_live_date && (
                    <span className="block mt-1 text-xs">
                      Launched on {new Date(settings.go_live_date).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Rocket className="w-6 h-6 text-green-600" />
              Confirm Go-Live
            </DialogTitle>
            <DialogDescription>
              This will disable training mode and mark the system as production-ready.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900 font-medium mb-2">What will happen:</p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• Training mode banner will be removed</li>
                <li>• System will be marked as production</li>
                <li>• All existing data will remain intact</li>
                <li>• Go-live event will be logged for audit</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-900 font-medium mb-2">Important:</p>
              <ul className="text-sm text-amber-800 space-y-1 ml-4">
                <li>• This action cannot be easily reversed</li>
                <li>• Make sure your team is trained</li>
                <li>• Verify all critical data is correct</li>
              </ul>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <Checkbox
                id="confirm-checkbox"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked)}
                className="mt-0.5"
              />
              <label 
                htmlFor="confirm-checkbox"
                className="text-sm text-slate-700 leading-relaxed cursor-pointer"
              >
                I confirm that I have reviewed the checklist and the team is ready to launch
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmChecked(false);
              }}
              disabled={isGoingLive}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGoLive}
              disabled={!confirmChecked || isGoingLive}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {isGoingLive ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4 mr-2" />
                  Launch System
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}