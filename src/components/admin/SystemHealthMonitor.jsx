import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SystemHealthMonitor() {
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['systemHealthAlerts', showResolved],
    queryFn: () => base44.entities.SystemHealthAlert.filter(
      showResolved ? {} : { status: 'active' },
      '-detected_at'
    ),
    refetchInterval: 60000, // Refresh every minute
  });

  const runHealthCheckMutation = useMutation({
    mutationFn: () => base44.functions.invoke('healthMonitor'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemHealthAlerts'] });
      toast.success('Health check completed');
    },
    onError: (error) => {
      toast.error('Health check failed: ' + error.message);
    }
  });

  const updateAlertMutation = useMutation({
    mutationFn: ({ alertId, status }) => 
      base44.entities.SystemHealthAlert.update(alertId, {
        status,
        resolved_at: status === 'resolved' || status === 'ignored' ? new Date().toISOString() : null,
        resolved_by: user?.email
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemHealthAlerts'] });
    }
  });

  const severityConfig = {
    critical: {
      label: 'Critical',
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: XCircle,
      iconColor: 'text-red-600'
    },
    warning: {
      label: 'Warning',
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: AlertTriangle,
      iconColor: 'text-amber-600'
    }
  };

  const alertTypeLabels = {
    job_without_employees: 'Job Without Employees',
    time_entry_without_job: 'Time Entry Not Linked',
    orphan_invoice: 'Orphan Invoice',
    employee_without_assignments: 'Employee Unassigned',
    active_job_without_schedules: 'Job Without Schedules',
    stale_commission: 'Stale Commission',
    pending_time_entries_old: 'Old Pending Time Entry',
    job_without_field_sync: 'Job Not Synced to Field',
    missing_tax_profiles: 'Missing Tax Profile'
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length;

  const AlertCard = ({ alert }) => {
    const config = severityConfig[alert.severity];
    const Icon = config.icon;

    return (
      <Card className={`border-2 ${config.color}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-slate-900">
                  {alertTypeLabels[alert.alert_type] || alert.alert_type}
                </h4>
                <Badge variant="outline" className="text-xs">
                  {alert.entity_type}
                </Badge>
              </div>
              <p className="text-sm text-slate-700 mb-2">{alert.message}</p>
              {alert.entity_name && (
                <p className="text-xs text-slate-600 mb-2">
                  <strong>Affected:</strong> {alert.entity_name}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Detected {format(new Date(alert.detected_at), 'MMM d, h:mm a')}</span>
                {alert.status === 'resolved' && alert.resolved_at && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">
                      Resolved {format(new Date(alert.resolved_at), 'MMM d, h:mm a')}
                    </span>
                  </>
                )}
                {alert.status === 'ignored' && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400">Ignored</span>
                  </>
                )}
              </div>
            </div>
            {alert.status === 'active' && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateAlertMutation.mutate({ 
                    alertId: alert.id, 
                    status: 'resolved' 
                  })}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateAlertMutation.mutate({ 
                    alertId: alert.id, 
                    status: 'ignored' 
                  })}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                >
                  <EyeOff className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle>System Health Monitor</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Automatic detection of anomalies and issues
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runHealthCheckMutation.mutate()}
            disabled={runHealthCheckMutation.isPending}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${runHealthCheckMutation.isPending ? 'animate-spin' : ''}`} />
            Run Check Now
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-2 border-slate-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-slate-900">{activeAlerts.length}</div>
              <div className="text-xs text-slate-600">Active Alerts</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
              <div className="text-xs text-red-700">Critical</div>
            </CardContent>
          </Card>
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
              <div className="text-xs text-amber-700">Warnings</div>
            </CardContent>
          </Card>
        </div>

        {/* Toggle Resolved */}
        <div className="flex items-center justify-between py-2 border-t border-b border-slate-200">
          <span className="text-sm text-slate-600">Show resolved alerts</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
        </div>

        {/* Alerts List */}
        {alerts.length === 0 ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800">
              ✅ <strong>All systems operational</strong> – No issues detected
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* Info */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-800 text-xs">
            Health checks run automatically every hour. Issues are detected based on data patterns and business rules.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}