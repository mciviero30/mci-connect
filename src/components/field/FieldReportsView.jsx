import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Plus, 
  FileText,
  Download,
  Clock,
  MoreVertical,
  Trash2,
  Send,
  Settings2,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { generateProgressReportPDF } from './ProgressReportGenerator';
import { toast } from 'sonner';

export default function FieldReportsView({ jobId }) {
  const [showCreate, setShowCreate] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(null);
  const [newReport, setNewReport] = useState({
    name: '',
    description: '',
    report_type: 'progress_report',
    type: 'pdf_detailed',
    recipients: [],
    schedule: 'send_now',
    include_options: {
      photos: true,
      tasks: true,
      messages: true,
      plans: true,
    },
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => base44.entities.Job.filter({ id: jobId }).then(jobs => jobs[0]),
    enabled: !!jobId,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['field-reports', jobId],
    queryFn: () => base44.entities.Report.filter({ job_id: jobId }, '-created_date'),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['field-tasks', jobId],
    queryFn: () => base44.entities.Task.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: workUnits = [] } = useQuery({
    queryKey: ['work-units', jobId],
    queryFn: () => base44.entities.WorkUnit.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['field-plans', jobId],
    queryFn: () => base44.entities.Plan.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['field-photos', jobId],
    queryFn: () => base44.entities.Photo.filter({ job_id: jobId }),
    enabled: !!jobId,
  });

  // Merge tasks and work units
  const allTasks = [...tasks, ...workUnits.filter(wu => wu.type === 'task')];

  // Set job name automatically when dialog opens
  React.useEffect(() => {
    if (showCreate && job && !newReport.name) {
      const jobName = job.name || job.job_name_field || 'Project Report';
      setNewReport(prev => ({ ...prev, name: jobName }));
    }
  }, [showCreate, job]);

  const createReportMutation = useMutation({
    mutationFn: (data) => base44.entities.Report.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-reports', jobId] });
      setShowCreate(false);
      setNewReport({
        name: '',
        description: '',
        report_type: 'progress_report',
        type: 'pdf_detailed',
        recipients: [],
        schedule: 'send_now',
        include_options: {
          photos: true,
          tasks: true,
          messages: true,
          plans: true,
        },
      });
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => base44.entities.Report.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-reports', jobId] });
    },
  });

  const handleCreateReport = () => {
    if (!newReport.name) return;
    
    // Calculate next report number
    const existingReports = reports.filter(r => r.report_type === newReport.report_type);
    const reportNumber = String(existingReports.length + 1).padStart(3, '0');
    
    createReportMutation.mutate({
      job_id: jobId,
      report_number: reportNumber,
      ...newReport,
    });
  };

  const handleDownloadReport = async (report) => {
    setDownloadingReport(report.id);
    try {
      const pdf = await generateProgressReportPDF(
        report,
        job,
        allTasks,
        photos,
        plans,
        user
      );
      
      const reportTypeLabel = {
        progress_report: 'Progress',
        punch_report: 'Punch',
        rfi_report: 'RFI',
        change_order_report: 'ChangeOrder',
      }[report.report_type] || 'Progress';
      
      const fileName = `${job.name || 'Project'}_${reportTypeLabel}_${report.report_number || '001'}.pdf`;
      pdf.save(fileName);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report');
    } finally {
      setDownloadingReport(null);
    }
  };

  const typeColors = {
    pdf_detailed: 'bg-red-500/20 text-red-400 border-red-500/30',
    pdf_summary: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    excel: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  const typeIcons = {
    pdf_detailed: FileText,
    pdf_summary: FileText,
    excel: FileSpreadsheet,
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-12 text-center shadow-sm">
          <FileText className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No reports</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">Generate PDF or Excel reports of project progress</p>
          <Button 
            onClick={() => setShowCreate(true)}
            className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Report
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const TypeIcon = typeIcons[report.type] || FileText;
            return (
              <div 
                key={report.id}
                className="flex items-center justify-between p-5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl hover:border-[#FFB800]/50 transition-all group shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${
                    report.type === 'excel' ? 'bg-green-500/20' : 'bg-blue-500/20'
                  }`}>
                    <TypeIcon className={`w-6 h-6 ${
                      report.type === 'excel' ? 'text-green-400' : 'text-blue-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{report.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {report.report_type === 'progress_report' ? 'Progress Report' :
                       report.report_type === 'punch_report' ? 'Punch Report' :
                       report.report_type === 'rfi_report' ? 'RFI Report' :
                       'Change Order Report'} #{report.report_number || '001'}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge className={typeColors[report.type]}>
                        {report.type === 'pdf_detailed' ? 'PDF Detailed' :
                         report.type === 'pdf_summary' ? 'PDF Summary' : 'Excel'}
                      </Badge>
                      {report.schedule !== 'send_now' && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {report.schedule}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadReport(report)}
                    disabled={downloadingReport === report.id}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    {downloadingReport === report.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-slate-400 hover:text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <DropdownMenuItem className="text-slate-900 dark:text-white">
                        <Settings2 className="w-4 h-4 mr-2" />
                        Configure
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteReportMutation.mutate(report.id)}
                        className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Report Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Create Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Report Name</Label>
              <Input 
                value={newReport.name}
                onChange={(e) => setNewReport({...newReport, name: e.target.value})}
                placeholder="e.g., Weekly Progress Report"
                className="mt-1.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Report Type</Label>
              <Select value={newReport.report_type} onValueChange={(v) => setNewReport({...newReport, report_type: v})}>
                <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="progress_report" className="text-slate-900 dark:text-white">Progress Report</SelectItem>
                  <SelectItem value="punch_report" className="text-slate-900 dark:text-white">Punch Report</SelectItem>
                  <SelectItem value="rfi_report" className="text-slate-900 dark:text-white">RFI Report</SelectItem>
                  <SelectItem value="change_order_report" className="text-slate-900 dark:text-white">Change of Order Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Format</Label>
              <Select value={newReport.type} onValueChange={(v) => setNewReport({...newReport, type: v})}>
                <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="pdf_detailed" className="text-slate-900 dark:text-white">PDF Detailed</SelectItem>
                  <SelectItem value="pdf_summary" className="text-slate-900 dark:text-white">PDF Summary</SelectItem>
                  <SelectItem value="excel" className="text-slate-900 dark:text-white">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Schedule</Label>
              <Select value={newReport.schedule} onValueChange={(v) => setNewReport({...newReport, schedule: v})}>
                <SelectTrigger className="mt-1.5 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="send_now" className="text-slate-900 dark:text-white">Generate Now</SelectItem>
                  <SelectItem value="daily" className="text-slate-900 dark:text-white">Daily</SelectItem>
                  <SelectItem value="weekly" className="text-slate-900 dark:text-white">Weekly</SelectItem>
                  <SelectItem value="monthly" className="text-slate-900 dark:text-white">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Options */}
            <div>
              <Label className="text-slate-700 dark:text-slate-300 mb-3 block">Include in Report</Label>
              <div className="space-y-3">
                {[
                  { key: 'photos', label: 'Photos' },
                  { key: 'tasks', label: 'Tasks' },
                  { key: 'messages', label: 'Messages' },
                  { key: 'plans', label: 'Plans' },
                ].map((option) => (
                  <div key={option.key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{option.label}</span>
                    <Switch 
                      checked={newReport.include_options[option.key]}
                      onCheckedChange={(checked) => setNewReport({
                        ...newReport,
                        include_options: {
                          ...newReport.include_options,
                          [option.key]: checked,
                        }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateReport}
                disabled={!newReport.name || createReportMutation.isPending}
                className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
              >
                {createReportMutation.isPending ? 'Creating...' : 'Create Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}