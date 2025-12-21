import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Brain, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  BarChart3, 
  Loader2, 
  Sparkles,
  RefreshCw,
  Download,
  ChevronRight,
  CheckCircle2,
  Clock,
  Users,
  Shield,
  TrendingUp,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import ReactMarkdown from 'react-markdown';

export default function FieldAIAssistant({ jobId, job, tasks = [], members = [], photos = [] }) {
  const [activeTab, setActiveTab] = useState('progress');
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState({
    progress: null,
    scheduling: null,
    safety: null,
    executive: null
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['field-milestones', jobId],
    queryFn: () => base44.entities.ProjectMilestone.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: recentPhotos = [] } = useQuery({
    queryKey: ['field-recent-photos', jobId],
    queryFn: () => base44.entities.Photo.filter({ job_id: jobId }, '-created_date', 10),
    enabled: !!jobId,
  });

  const getTaskStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    
    const today = new Date().toISOString().split('T')[0];
    const completedToday = tasks.filter(t => 
      t.status === 'completed' && 
      t.updated_date?.startsWith(today)
    ).length;

    return { total, completed, inProgress, blocked, pending, completedToday };
  };

  const generateProgressReport = async () => {
    setGenerating(true);
    try {
      const stats = getTaskStats();
      const taskDetails = tasks.slice(0, 20).map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assigned_to_name || t.assigned_to,
        checklist_progress: t.checklist ? 
          `${t.checklist.filter(c => c.completed).length}/${t.checklist.length}` : 'N/A'
      }));

      const prompt = `Generate a professional daily progress report for this construction project.

PROJECT: ${job?.name || job?.job_name_field || 'Field Project'}
DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

TASK STATISTICS:
- Total Tasks: ${stats.total}
- Completed: ${stats.completed} (${stats.total > 0 ? Math.round(stats.completed/stats.total*100) : 0}%)
- In Progress: ${stats.inProgress}
- Pending: ${stats.pending}
- Blocked: ${stats.blocked}
- Completed Today: ${stats.completedToday}

RECENT TASKS:
${JSON.stringify(taskDetails, null, 2)}

MILESTONES:
${milestones.map(m => `- ${m.name}: ${m.status} (Target: ${m.target_date})`).join('\n')}

Generate a clear, professional progress report with:
1. Executive Summary (2-3 sentences)
2. Today's Accomplishments
3. Work In Progress
4. Blockers/Issues (if any)
5. Tomorrow's Priorities
6. Overall Project Health (Good/Fair/Needs Attention)

Use markdown formatting. Be concise but informative.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setReports(prev => ({ ...prev, progress: result }));
    } catch (err) {
      console.error('Error generating progress report:', err);
    } finally {
      setGenerating(false);
    }
  };

  const generateSchedulingSuggestions = async () => {
    setGenerating(true);
    try {
      const stats = getTaskStats();
      const tasksByAssignee = {};
      tasks.forEach(t => {
        const assignee = t.assigned_to_name || t.assigned_to || 'Unassigned';
        if (!tasksByAssignee[assignee]) tasksByAssignee[assignee] = [];
        tasksByAssignee[assignee].push({
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date
        });
      });

      const prompt = `Analyze this construction project and provide optimal task scheduling and resource allocation suggestions.

PROJECT: ${job?.name || job?.job_name_field}
START DATE: ${job?.start_date || 'Not set'}

CURRENT WORKLOAD BY TEAM MEMBER:
${Object.entries(tasksByAssignee).map(([name, tasks]) => 
  `${name}: ${tasks.length} tasks (${tasks.filter(t => t.status === 'in_progress').length} in progress)`
).join('\n')}

TASK BREAKDOWN:
- High Priority: ${tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length}
- Medium Priority: ${tasks.filter(t => t.priority === 'medium').length}
- Low Priority: ${tasks.filter(t => t.priority === 'low').length}
- Blocked Tasks: ${stats.blocked}

MILESTONES:
${milestones.map(m => `- ${m.name}: ${m.status} (Due: ${m.target_date})`).join('\n')}

Provide actionable suggestions for:
1. **Workload Balancing** - Are tasks evenly distributed?
2. **Priority Optimization** - What should be tackled first?
3. **Resource Recommendations** - Do we need more resources in certain areas?
4. **Timeline Risks** - Are there any scheduling conflicts or risks?
5. **Efficiency Tips** - How to improve workflow

Use markdown. Be specific and actionable.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setReports(prev => ({ ...prev, scheduling: result }));
    } catch (err) {
      console.error('Error generating scheduling suggestions:', err);
    } finally {
      setGenerating(false);
    }
  };

  const generateSafetyAlerts = async () => {
    setGenerating(true);
    try {
      const photoUrls = recentPhotos.slice(0, 5).map(p => p.file_url).filter(Boolean);
      
      const prompt = `You are a construction safety expert. Analyze this project for potential safety concerns.

PROJECT: ${job?.name || job?.job_name_field}
TYPE: Falkbuilt Wall Installation

CURRENT SITE STATUS:
- Active workers: ${members.length}
- Tasks in progress: ${tasks.filter(t => t.status === 'in_progress').length}
- Blocked tasks: ${tasks.filter(t => t.status === 'blocked').length}

RECENT ACTIVITY:
${tasks.filter(t => t.status === 'in_progress').slice(0, 5).map(t => `- ${t.title}`).join('\n')}

${photoUrls.length > 0 ? 'Site photos have been provided for analysis.' : 'No recent site photos available.'}

Provide a safety assessment including:
1. **Safety Score** (1-10) with brief explanation
2. **Potential Hazards** - Based on typical Falkbuilt installations
3. **Required PPE** - Personal protective equipment reminders
4. **Safety Checklist** - Key items to verify
5. **Recommendations** - Immediate actions if needed

Common Falkbuilt installation hazards to consider:
- Glass panel handling and breakage
- Working at heights
- Lifting heavy materials
- Power tool usage
- Trip hazards from materials

Use markdown. Be thorough but practical.`;

      const result = await base44.integrations.Core.InvokeLLM({ 
        prompt,
        file_urls: photoUrls.length > 0 ? photoUrls : undefined
      });
      setReports(prev => ({ ...prev, safety: result }));
    } catch (err) {
      console.error('Error generating safety alerts:', err);
    } finally {
      setGenerating(false);
    }
  };

  const generateExecutiveSummary = async () => {
    setGenerating(true);
    try {
      const stats = getTaskStats();
      const completionRate = stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0;
      
      const overdueMilestones = milestones.filter(m => 
        m.status !== 'completed' && 
        new Date(m.target_date) < new Date()
      );

      const prompt = `Generate an executive summary for management about this construction project.

PROJECT: ${job?.name || job?.job_name_field}
CLIENT: ${job?.client_name || 'N/A'}
LOCATION: ${job?.address || job?.site_address || 'N/A'}

PROGRESS METRICS:
- Overall Completion: ${completionRate}%
- Total Tasks: ${stats.total}
- Completed: ${stats.completed}
- In Progress: ${stats.inProgress}
- Blocked: ${stats.blocked}

MILESTONE STATUS:
${milestones.map(m => `- ${m.name}: ${m.status}${m.status === 'completed' ? ' ✓' : ''}`).join('\n')}
Overdue Milestones: ${overdueMilestones.length}

TEAM SIZE: ${members.length} members

Generate a concise executive summary with:
1. **Project Status** (On Track / At Risk / Behind Schedule)
2. **Key Highlights** - Top 3 achievements
3. **Risk Assessment** - Potential issues and their impact
4. **Budget/Timeline Impact** - Any concerns
5. **Recommended Actions** - For management attention
6. **Confidence Level** - Project success probability

Keep it brief and focused on what executives need to know. Use markdown.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setReports(prev => ({ ...prev, executive: result }));
    } catch (err) {
      console.error('Error generating executive summary:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    switch (activeTab) {
      case 'progress': generateProgressReport(); break;
      case 'scheduling': generateSchedulingSuggestions(); break;
      case 'safety': generateSafetyAlerts(); break;
      case 'executive': generateExecutiveSummary(); break;
    }
  };

  const stats = getTaskStats();

  const tabs = [
    { id: 'progress', label: 'Daily Progress', icon: FileText, color: 'text-blue-400' },
    { id: 'scheduling', label: 'Scheduling', icon: Calendar, color: 'text-purple-400' },
    { id: 'safety', label: 'Safety Alerts', icon: Shield, color: 'text-red-400' },
    { id: 'executive', label: 'Executive Summary', icon: BarChart3, color: 'text-green-400' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl">
          <h1 className="text-2xl font-bold text-black" style={{ fontSize: '1.575rem' }}>AI Assistant</h1>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Completion</p>
                <p className="text-2xl font-bold text-white">
                  {stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0}%
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <Progress value={stats.total > 0 ? (stats.completed / stats.total * 100) : 0} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">In Progress</p>
                <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Team Size</p>
                <p className="text-2xl font-bold text-white">{members.length}</p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Blocked</p>
                <p className="text-2xl font-bold text-white">{stats.blocked}</p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${stats.blocked > 0 ? 'text-red-500' : 'text-slate-400'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Reports Tabs */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              AI-Generated Reports
            </CardTitle>
            <Button 
              onClick={handleGenerate}
              disabled={generating}
              className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none shadow-lg"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Generate Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 md:grid-cols-4 bg-slate-900/50 border border-slate-700">
              {tabs.map(tab => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center gap-2 text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-black"
                >
                  <tab.icon className={`w-4 h-4 ${tab.color}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="mt-4">
                {reports[tab.id] ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <ReactMarkdown>{reports[tab.id]}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700">
                    <tab.icon className={`w-12 h-12 mx-auto mb-4 ${tab.color} opacity-50`} />
                    <p className="text-slate-400">Click "Generate Report" to create your {tab.label.toLowerCase()}</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}