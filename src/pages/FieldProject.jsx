import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft,
  LayoutDashboard,
  Map,
  CheckSquare,
  Camera,
  FileText,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  ClipboardList,
  Loader2,
  DollarSign,
  Flag,
  ClipboardCheck,
  CheckCircle2,
  Activity,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import Field Components
import FieldProjectOverview from '@/components/field/FieldProjectOverview.jsx';
import FieldPlansView from '@/components/field/FieldPlansView.jsx';
import FieldTasksView from '@/components/field/FieldTasksView.jsx';
import FieldPhotosView from '@/components/field/FieldPhotosView.jsx';
import FieldDocumentsView from '@/components/field/FieldDocumentsView.jsx';
import FieldChatView from '@/components/field/FieldChatView.jsx';
import FieldMembersView from '@/components/field/FieldMembersView.jsx';
import FieldAnalyticsView from '@/components/field/FieldAnalyticsView.jsx';
import FieldFormsView from '@/components/field/FieldFormsView.jsx';
import FieldReportsView from '@/components/field/FieldReportsView.jsx';
import FieldBudgetView from '@/components/field/FieldBudgetView.jsx';
import FieldMilestonesView from '@/components/field/FieldMilestonesView.jsx';
import FieldChecklistsView from '@/components/field/FieldChecklistsView.jsx';
import ClientApprovalsView from '@/components/field/ClientApprovalsView.jsx';
import FieldActivityLogView from '@/components/field/FieldActivityLogView.jsx';
import QRCodeScanner from '@/components/field/QRCodeScanner.jsx';

export default function FieldProject() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('id');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: job, isLoading } = useQuery({
    queryKey: ['field-job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0] || null;
    },
    enabled: !!jobId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['field-tasks', jobId],
    queryFn: () => base44.entities.Task.filter({ job_id: jobId }, '-created_date'),
    enabled: !!jobId,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['field-plans', jobId],
    queryFn: () => base44.entities.Plan.filter({ job_id: jobId }, 'order'),
    enabled: !!jobId,
  });

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'plans', label: 'Plans', icon: Map, count: plans.length },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.length },
    { id: 'milestones', label: 'Milestones', icon: Flag },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'members', label: 'Team', icon: Users },
    { id: 'forms', label: 'Forms', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Project not found</p>
          <Link to={createPageUrl('Field')}>
            <Button className="bg-amber-500 hover:bg-amber-600">Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <FieldProjectOverview job={job} tasks={tasks} plans={plans} />;
      case 'plans':
        return <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />;
      case 'tasks':
        return <FieldTasksView jobId={jobId} tasks={tasks} plans={plans} />;
      case 'milestones':
        return <FieldMilestonesView jobId={jobId} />;
      case 'photos':
        return <FieldPhotosView jobId={jobId} />;
      case 'documents':
        return <FieldDocumentsView jobId={jobId} />;
      case 'budget':
        return <FieldBudgetView jobId={jobId} />;
      case 'checklists':
        return <FieldChecklistsView jobId={jobId} />;
      case 'approvals':
        return <ClientApprovalsView jobId={jobId} />;
      case 'materials':
        return <QRCodeScanner jobId={jobId} />;
      case 'chat':
        return <FieldChatView jobId={jobId} />;
      case 'members':
        return <FieldMembersView jobId={jobId} />;
      case 'forms':
        return <FieldFormsView jobId={jobId} />;
      case 'reports':
        return <FieldReportsView jobId={jobId} />;
      case 'activity':
        return <FieldActivityLogView jobId={jobId} />;
      case 'analytics':
        return <FieldAnalyticsView jobId={jobId} tasks={tasks} />;
      default:
        return <FieldProjectOverview job={job} tasks={tasks} plans={plans} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700/50 flex flex-col shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
          <Link to={createPageUrl('Field')}>
            <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/03ed46b90_Screenshot2025-12-01at23044AM.png"
              alt="MCI Field"
              className="w-8 h-8 object-contain"
            />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-slate-900 dark:text-white truncate">{job.name || job.job_name_field}</h2>
              <Badge className={`text-xs ${
                job.status === 'active' 
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
              }`}>
                {job.status === 'active' ? 'Active' : job.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === item.id
                    ? 'bg-amber-500/30 text-amber-600 dark:text-amber-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}