import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import PageHeader from "@/components/shared/PageHeader";
import {
  CheckCircle2,
  Circle,
  Rocket,
  Users,
  Settings,
  Briefcase,
  Globe,
  AlertCircle,
  Shield
} from "lucide-react";

const statusConfig = {
  training: {
    label: 'Training Mode',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    icon: Settings
  },
  pilot: {
    label: 'Pilot Phase',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    icon: AlertCircle
  },
  live: {
    label: 'Go-Live',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    icon: Rocket
  }
};

const sections = [
  {
    id: 'system',
    title: 'System Readiness',
    icon: Settings,
    items: [
      'All employee profiles complete',
      'Jobs imported from MCI Connect',
      'Time tracking and payroll tested',
      'Expense workflows validated',
      'Forms and templates configured',
      'Notifications enabled'
    ]
  },
  {
    id: 'people',
    title: 'People & Training',
    icon: Users,
    items: [
      'All employees invited and onboarded',
      'Admin roles assigned',
      'Training courses completed',
      'Knowledge library reviewed',
      'Compliance documents signed'
    ]
  },
  {
    id: 'operations',
    title: 'Operations',
    icon: Briefcase,
    items: [
      'Job workflows tested end-to-end',
      'Blueprint uploads and tasks validated',
      'Drive integration working',
      'Daily reports generated',
      'Team assignments configured'
    ]
  },
  {
    id: 'client',
    title: 'Client Portal',
    icon: Globe,
    items: [
      'Client access tested',
      'Notification rules configured',
      'Photo uploads validated',
      'Comment system working',
      'Daily reports accessible'
    ]
  }
];

export default function GoLivePlaybook() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedSection, setExpandedSection] = useState(null);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Check if user has access
  const userRole = currentUser?.role?.toLowerCase();
  const isAuthorized = userRole === 'admin' || userRole === 'ceo' || userRole === 'manager';

  // Fetch company settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const allSettings = await base44.entities.CompanySettings.list();
      if (allSettings.length > 0) {
        return allSettings[0];
      }
      // Create default settings if none exist
      return await base44.entities.CompanySettings.create({
        go_live_status: 'training',
        go_live_checklist: {},
        go_live_audit: {}
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates) => {
      return await base44.entities.CompanySettings.update(settings.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast.success('Settings updated');
    }
  });

  const handleStatusChange = (newStatus) => {
    if (!isAuthorized) return;
    
    const audit = {
      ...(settings?.go_live_audit || {}),
      [`status_${newStatus}`]: {
        changed_by: currentUser.email,
        changed_by_name: currentUser.full_name,
        changed_at: new Date().toISOString()
      }
    };

    updateMutation.mutate({
      go_live_status: newStatus,
      go_live_audit: audit
    });
  };

  const handleSectionToggle = (sectionId) => {
    if (!isAuthorized) return;

    const checklist = settings?.go_live_checklist || {};
    const isComplete = checklist[sectionId];
    
    const newChecklist = {
      ...checklist,
      [sectionId]: !isComplete
    };

    const audit = {
      ...(settings?.go_live_audit || {}),
      [`section_${sectionId}`]: {
        confirmed_by: currentUser.email,
        confirmed_by_name: currentUser.full_name,
        confirmed_at: new Date().toISOString(),
        status: !isComplete ? 'confirmed' : 'unconfirmed'
      }
    };

    updateMutation.mutate({
      go_live_checklist: newChecklist,
      go_live_audit: audit
    });
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400">
              This page is only accessible to Administrators, Managers, and CEOs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentStatus = settings?.go_live_status || 'training';
  const checklist = settings?.go_live_checklist || {};
  const audit = settings?.go_live_audit || {};
  const StatusIcon = statusConfig[currentStatus]?.icon || Settings;
  
  const completedSections = Object.values(checklist).filter(Boolean).length;
  const totalSections = sections.length;
  const progressPercent = (completedSections / totalSections) * 100;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Go-Live Playbook"
          description="Operational readiness confirmation and status tracking"
          icon={Rocket}
        />

        {/* Current Status Card */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <StatusIcon className="w-5 h-5" />
                Current Status
              </span>
              <Badge className={statusConfig[currentStatus]?.color}>
                {statusConfig[currentStatus]?.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">System Readiness</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    {completedSections} / {totalSections} sections confirmed
                  </span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {Object.entries(statusConfig).map(([key, config]) => (
                  <Button
                    key={key}
                    variant={currentStatus === key ? "default" : "outline"}
                    onClick={() => handleStatusChange(key)}
                    className="flex-1"
                    disabled={updateMutation.isPending}
                  >
                    <config.icon className="w-4 h-4 mr-2" />
                    {config.label}
                  </Button>
                ))}
              </div>

              {audit[`status_${currentStatus}`] && (
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t">
                  Set by {audit[`status_${currentStatus}`].changed_by_name} on{' '}
                  {new Date(audit[`status_${currentStatus}`].changed_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Readiness Sections */}
        <div className="grid gap-4">
          {sections.map((section) => {
            const SectionIcon = section.icon;
            const isComplete = checklist[section.id];
            const auditData = audit[`section_${section.id}`];
            const isExpanded = expandedSection === section.id;

            return (
              <Card key={section.id} className="border-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <SectionIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      <span>{section.title}</span>
                    </button>
                    <Button
                      size="sm"
                      variant={isComplete ? "default" : "outline"}
                      onClick={() => handleSectionToggle(section.id)}
                      disabled={updateMutation.isPending}
                      className="ml-4"
                    >
                      {isComplete ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Confirmed
                        </>
                      ) : (
                        <>
                          <Circle className="w-4 h-4 mr-2" />
                          Confirm
                        </>
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {section.items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600 mt-1.5" />
                          <span className="text-slate-700 dark:text-slate-300">{item}</span>
                        </div>
                      ))}
                    </div>

                    {auditData && (
                      <div className="pt-3 border-t text-xs text-slate-500 dark:text-slate-400">
                        {auditData.status === 'confirmed' ? (
                          <>
                            ✓ Confirmed by {auditData.confirmed_by_name} on{' '}
                            {new Date(auditData.confirmed_at).toLocaleDateString()}
                          </>
                        ) : (
                          <>
                            Unconfirmed by {auditData.confirmed_by_name} on{' '}
                            {new Date(auditData.confirmed_at).toLocaleDateString()}
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>Note:</strong> This playbook is for operational tracking only. Confirming sections does not block or enable any system functionality.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}