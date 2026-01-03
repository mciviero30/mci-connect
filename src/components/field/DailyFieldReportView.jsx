import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar, Download, Edit2, Eye, FileText, Loader2, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

export default function DailyFieldReportView({ jobId, isClientView = false }) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editingReport, setEditingReport] = useState(null);
  const [managerNote, setManagerNote] = useState('');
  const [weather, setWeather] = useState('');
  const [crewSize, setCrewSize] = useState('');

  // Fetch reports for job
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['daily-field-reports', jobId],
    queryFn: () => base44.entities.DailyFieldReport.filter({ job_id: jobId }, '-report_date', 30),
    enabled: !!jobId
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateDailyFieldReport', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-field-reports', jobId] });
      setEditingReport(null);
    }
  });

  // Download PDF mutation
  const downloadPDFMutation = useMutation({
    mutationFn: async (reportId) => {
      const { data } = await base44.functions.invoke('exportDailyReportPDF', { report_id: reportId });
      return data;
    },
    onSuccess: (pdfData) => {
      // Trigger download
      const blob = new Blob([pdfData], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily-report-${selectedDate}.pdf`;
      a.click();
    }
  });

  const handleGenerateReport = () => {
    generateReportMutation.mutate({
      job_id: jobId,
      report_date: selectedDate,
      manager_note: managerNote,
      weather,
      crew_size: parseInt(crewSize) || 0
    });
  };

  const todayReport = reports.find(r => r.report_date === selectedDate);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Daily Field Reports</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Automated daily activity summaries</p>
        </div>
        {!isClientView && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Daily Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Report Date</Label>
                  <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Weather Conditions</Label>
                  <Input 
                    placeholder="e.g., Sunny, 72°F"
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Crew Size</Label>
                  <Input 
                    type="number"
                    placeholder="Number of crew members"
                    value={crewSize}
                    onChange={(e) => setCrewSize(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Manager Note (Optional)</Label>
                  <Textarea 
                    placeholder="Add notes about today's work..."
                    value={managerNote}
                    onChange={(e) => setManagerNote(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleGenerateReport}
                  disabled={generateReportMutation.isPending}
                  className="w-full"
                >
                  {generateReportMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Date Selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-slate-400" />
        <Input 
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Report Content */}
      {todayReport ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {format(new Date(todayReport.report_date), 'MMMM dd, yyyy')}
              </h3>
              <p className="text-sm text-slate-500">{todayReport.job_name}</p>
            </div>
            <Button 
              variant="outline"
              onClick={() => downloadPDFMutation.mutate(todayReport.id)}
              disabled={downloadPDFMutation.isPending}
            >
              {downloadPDFMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Tasks Worked</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {todayReport.summary?.tasks_worked || 0}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-green-600 dark:text-green-400">Completed</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {todayReport.summary?.tasks_completed || 0}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <p className="text-sm text-purple-600 dark:text-purple-400">Punch Items</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {todayReport.summary?.punch_items_created || 0}
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-600 dark:text-blue-400">Photos</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {todayReport.summary?.photos_uploaded || 0}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
              <p className="text-sm text-amber-600 dark:text-amber-400">Comments</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {todayReport.summary?.client_comments || 0}
              </p>
            </div>
            {todayReport.crew_size > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Crew Size</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {todayReport.crew_size}
                </p>
              </div>
            )}
          </div>

          {/* Weather */}
          {todayReport.weather && (
            <div className="mb-6 p-4 bg-sky-50 dark:bg-sky-900/20 rounded-lg">
              <p className="text-sm font-medium text-sky-900 dark:text-sky-300">Weather</p>
              <p className="text-slate-700 dark:text-slate-300">{todayReport.weather}</p>
            </div>
          )}

          {/* Manager Note */}
          {todayReport.manager_note && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-400">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-300">Manager Note</p>
              <p className="text-slate-700 dark:text-slate-300 mt-1">{todayReport.manager_note}</p>
            </div>
          )}

          {/* Tasks Snapshot */}
          {todayReport.tasks_snapshot?.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Tasks Worked</h4>
              <div className="space-y-2">
                {todayReport.tasks_snapshot.map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <span className="text-sm text-slate-700 dark:text-slate-300">{task.title}</span>
                    <Badge className={task.completed_today ? 'bg-green-500' : 'bg-blue-500'}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photos Preview */}
          {todayReport.photos_snapshot?.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Photos Uploaded</h4>
              <div className="grid grid-cols-3 gap-2">
                {todayReport.photos_snapshot.slice(0, 6).map((photo, idx) => (
                  <img 
                    key={idx}
                    src={photo.file_url}
                    alt={photo.caption}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Client Comments */}
          {!isClientView && todayReport.comments_snapshot?.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Client Comments</h4>
              <div className="space-y-2">
                {todayReport.comments_snapshot.map((comment, idx) => (
                  <div key={idx} className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="text-sm font-medium text-purple-900 dark:text-purple-300">
                      {comment.author_name}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 mb-4">No report available for {selectedDate}</p>
          {!isClientView && (
            <Button onClick={() => setEditingReport(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          )}
        </Card>
      )}

      {/* Recent Reports List */}
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Recent Reports</h3>
        <div className="space-y-2">
          {reports.slice(0, 7).map((report) => (
            <div 
              key={report.id}
              onClick={() => setSelectedDate(report.report_date)}
              className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-[#507DB4] transition-colors"
            >
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {format(new Date(report.report_date), 'MMMM dd, yyyy')}
                </p>
                <p className="text-sm text-slate-500">
                  {report.summary?.tasks_worked || 0} tasks • {report.summary?.photos_uploaded || 0} photos
                </p>
              </div>
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}