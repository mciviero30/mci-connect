import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Loader2, CheckCircle, Camera, Users } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export default function DailyReportGenerator({ open, onOpenChange, jobId, jobName }) {
  const [reportData, setReportData] = useState({
    work_completed: '',
    materials_used: '',
    weather_conditions: 'Clear',
    issues_encountered: '',
    crew_present: '',
    hours_worked: '',
    next_steps: ''
  });

  const { data: todayPhotos = [] } = useQuery({
    queryKey: ['today-photos', jobId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const photos = await base44.entities.Photo.filter({ job_id: jobId });
      return photos.filter(p => p.created_date?.startsWith(today));
    },
    enabled: open && !!jobId
  });

  const { data: todayTasks = [] } = useQuery({
    queryKey: ['today-tasks', jobId],
    queryFn: async () => {
      const tasks = await base44.entities.Task.filter({ job_id: jobId, status: 'completed' });
      const today = new Date().toISOString().split('T')[0];
      return tasks.filter(t => t.updated_date?.startsWith(today));
    },
    enabled: open && !!jobId
  });

  const { data: crew = [] } = useQuery({
    queryKey: ['crew-today', jobId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const entries = await base44.entities.TimeEntry.filter({ date: today });
      return entries.filter(e => e.job_id === jobId);
    },
    enabled: open && !!jobId
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const report = {
        job_id: jobId,
        job_name: jobName,
        report_date: new Date().toISOString().split('T')[0],
        report_type: 'daily_progress',
        generated_by: (await base44.auth.me()).email,
        generated_by_name: (await base44.auth.me()).full_name,
        content: {
          work_completed: reportData.work_completed,
          materials_used: reportData.materials_used,
          weather_conditions: reportData.weather_conditions,
          issues_encountered: reportData.issues_encountered,
          crew_present: reportData.crew_present || crew.map(c => c.employee_name).join(', '),
          hours_worked: reportData.hours_worked || crew.reduce((sum, c) => sum + (c.hours_worked || 0), 0).toString(),
          next_steps: reportData.next_steps,
          tasks_completed: todayTasks.length,
          photos_taken: todayPhotos.length,
          crew_count: crew.length
        },
        attachments: todayPhotos.slice(0, 5).map(p => p.photo_url),
        status: 'draft'
      };

      return base44.entities.Report.create(report);
    },
    onSuccess: () => {
      onOpenChange(false);
      setReportData({
        work_completed: '',
        materials_used: '',
        weather_conditions: 'Clear',
        issues_encountered: '',
        crew_present: '',
        hours_worked: '',
        next_steps: ''
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    generateReportMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <FileText className="w-5 h-5 text-blue-600" />
            Daily Progress Report - {format(new Date(), 'MMM dd, yyyy')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Auto-populated stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700 dark:text-blue-300">Crew</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{crew.length}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 dark:text-green-300">Tasks</span>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{todayTasks.length}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-1">
                <Camera className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-purple-700 dark:text-purple-300">Photos</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{todayPhotos.length}</p>
            </div>
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">Work Completed Today *</Label>
            <Textarea
              value={reportData.work_completed}
              onChange={(e) => setReportData({...reportData, work_completed: e.target.value})}
              placeholder="Describe the work completed today..."
              className="bg-slate-50 dark:bg-slate-800 h-24"
              required
            />
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">Materials Used</Label>
            <Textarea
              value={reportData.materials_used}
              onChange={(e) => setReportData({...reportData, materials_used: e.target.value})}
              placeholder="List materials consumed or delivered..."
              className="bg-slate-50 dark:bg-slate-800 h-20"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-900 dark:text-white">Weather Conditions</Label>
              <select
                value={reportData.weather_conditions}
                onChange={(e) => setReportData({...reportData, weather_conditions: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="Clear">Clear</option>
                <option value="Cloudy">Cloudy</option>
                <option value="Rain">Rain</option>
                <option value="Snow">Snow</option>
                <option value="Extreme Heat">Extreme Heat</option>
                <option value="Windy">Windy</option>
              </select>
            </div>

            <div>
              <Label className="text-slate-900 dark:text-white">Total Crew Hours</Label>
              <input
                type="number"
                value={reportData.hours_worked || crew.reduce((sum, c) => sum + (c.hours_worked || 0), 0)}
                onChange={(e) => setReportData({...reportData, hours_worked: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-slate-900 dark:text-white"
                placeholder="Auto-calculated"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">Issues / Delays Encountered</Label>
            <Textarea
              value={reportData.issues_encountered}
              onChange={(e) => setReportData({...reportData, issues_encountered: e.target.value})}
              placeholder="Any problems, delays, or safety concerns..."
              className="bg-slate-50 dark:bg-slate-800 h-20"
            />
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">Next Steps / Plan for Tomorrow</Label>
            <Textarea
              value={reportData.next_steps}
              onChange={(e) => setReportData({...reportData, next_steps: e.target.value})}
              placeholder="What's planned for the next work day..."
              className="bg-slate-50 dark:bg-slate-800 h-20"
            />
          </div>

          {todayPhotos.length > 0 && (
            <div>
              <Label className="text-slate-900 dark:text-white mb-2 block">Today's Photos (First 5 will be attached)</Label>
              <div className="grid grid-cols-5 gap-2">
                {todayPhotos.slice(0, 5).map(photo => (
                  <img 
                    key={photo.id} 
                    src={photo.photo_url} 
                    alt="Progress"
                    className="w-full h-20 object-cover rounded-lg border border-slate-200"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white" disabled={generateReportMutation.isPending}>
              {generateReportMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}