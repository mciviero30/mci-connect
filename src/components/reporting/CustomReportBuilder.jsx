import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Play } from 'lucide-react';
import { format } from 'date-fns';
import { exportToCSV } from '../reportes/ExportButtons';
import { Input } from '@/components/ui/input';

export default function CustomReportBuilder({ open, onClose }) {
  const [reportType, setReportType] = useState('employees');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFields, setSelectedFields] = useState({});
  const [generatedReport, setGeneratedReport] = useState(null);

  const reportConfigs = {
    employees: {
      title: 'Employee Performance Report',
      entity: 'User',
      fields: ['full_name', 'email', 'position', 'team_name', 'hire_date', 'hourly_rate'],
      relatedData: ['timeEntries', 'expenses', 'recognitions']
    },
    projects: {
      title: 'Project Completion Report',
      entity: 'Job',
      fields: ['name', 'status', 'contract_amount', 'customer_name', 'completed_date'],
      relatedData: ['timeEntries', 'expenses']
    },
    financial: {
      title: 'Financial Summary Report',
      entity: 'Invoice',
      fields: ['invoice_number', 'customer_name', 'invoice_date', 'total_amount', 'status'],
      relatedData: ['expenses']
    },
    notifications: {
      title: 'Notification Engagement Report',
      entity: 'Notification',
      fields: ['title', 'type', 'priority', 'created_date', 'is_read', 'read_date'],
      relatedData: []
    },
    timeTracking: {
      title: 'Time Tracking Report',
      entity: 'TimeEntry',
      fields: ['employee_name', 'date', 'hours_worked', 'job_name', 'status'],
      relatedData: []
    }
  };

  const currentConfig = reportConfigs[reportType];

  // Initialize selected fields
  React.useEffect(() => {
    if (currentConfig) {
      const initial = {};
      currentConfig.fields.forEach(field => {
        initial[field] = true;
      });
      setSelectedFields(initial);
    }
  }, [reportType]);

  // Fetch data based on report type
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    enabled: reportType === 'employees',
    initialData: []
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    enabled: reportType === 'projects',
    initialData: []
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    enabled: reportType === 'financial',
    initialData: []
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list('-created_date', 500),
    enabled: reportType === 'notifications',
    initialData: []
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 1000),
    enabled: reportType === 'timeTracking' || currentConfig?.relatedData.includes('timeEntries'),
    initialData: []
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    enabled: currentConfig?.relatedData.includes('expenses'),
    initialData: []
  });

  const { data: recognitions = [] } = useQuery({
    queryKey: ['recognitions'],
    queryFn: () => base44.entities.Recognition.list(),
    enabled: currentConfig?.relatedData.includes('recognitions'),
    initialData: []
  });

  const generateReport = () => {
    let data = [];
    
    switch (reportType) {
      case 'employees':
        data = employees
          .filter(e => e.employment_status === 'active')
          .map(emp => {
            const empTimeEntries = timeEntries.filter(t => 
              t.employee_email === emp.email &&
              t.date >= startDate && t.date <= endDate
            );
            const empExpenses = expenses.filter(e => 
              e.employee_email === emp.email &&
              e.date >= startDate && e.date <= endDate
            );
            const empRecognitions = recognitions.filter(r => 
              r.employee_email === emp.email &&
              r.created_date >= startDate && r.created_date <= endDate
            );

            const result = {};
            Object.keys(selectedFields).forEach(field => {
              if (selectedFields[field]) {
                result[field] = emp[field] || '';
              }
            });

            // Add calculated metrics
            result.total_hours = empTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0).toFixed(2);
            result.total_expenses = empExpenses.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2);
            result.recognition_points = empRecognitions.reduce((sum, r) => sum + (r.points || 0), 0);

            return result;
          });
        break;

      case 'projects':
        data = jobs
          .filter(j => {
            if (j.completed_date) {
              return j.completed_date >= startDate && j.completed_date <= endDate;
            }
            return j.created_date >= startDate && j.created_date <= endDate;
          })
          .map(job => {
            const jobTimeEntries = timeEntries.filter(t => t.job_id === job.id);
            const jobExpenses = expenses.filter(e => e.job_id === job.id);

            const result = {};
            Object.keys(selectedFields).forEach(field => {
              if (selectedFields[field]) {
                result[field] = job[field] || '';
              }
            });

            result.total_hours = jobTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0).toFixed(2);
            result.total_expenses = jobExpenses.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2);

            return result;
          });
        break;

      case 'financial':
        data = invoices
          .filter(i => i.invoice_date >= startDate && i.invoice_date <= endDate)
          .map(invoice => {
            const result = {};
            Object.keys(selectedFields).forEach(field => {
              if (selectedFields[field]) {
                result[field] = invoice[field] || '';
              }
            });
            return result;
          });

        // Add expense summary
        const periodExpenses = expenses.filter(e => e.date >= startDate && e.date <= endDate);
        const totalExpenses = periodExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        data.push({
          invoice_number: 'SUMMARY',
          customer_name: 'Total Expenses',
          total_amount: -totalExpenses
        });
        break;

      case 'notifications':
        data = notifications
          .filter(n => n.created_date >= startDate && n.created_date <= endDate)
          .map(notif => {
            const result = {};
            Object.keys(selectedFields).forEach(field => {
              if (selectedFields[field]) {
                result[field] = notif[field] || '';
              }
            });
            
            if (notif.is_read && notif.read_date && notif.created_date) {
              const responseTime = (new Date(notif.read_date) - new Date(notif.created_date)) / (1000 * 60 * 60);
              result.response_time_hours = responseTime.toFixed(2);
            }

            return result;
          });
        break;

      case 'timeTracking':
        data = timeEntries
          .filter(t => t.date >= startDate && t.date <= endDate)
          .map(entry => {
            const result = {};
            Object.keys(selectedFields).forEach(field => {
              if (selectedFields[field]) {
                result[field] = entry[field] || '';
              }
            });
            return result;
          });
        break;
    }

    setGeneratedReport(data);
  };

  const handleExport = () => {
    if (generatedReport) {
      exportToCSV(generatedReport, `${currentConfig.title}_${format(new Date(), 'yyyy-MM-dd')}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">Custom Report Builder</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-white">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#282828]">
                <SelectItem value="employees">Employee Performance</SelectItem>
                <SelectItem value="projects">Project Completion</SelectItem>
                <SelectItem value="financial">Financial Summary</SelectItem>
                <SelectItem value="notifications">Notification Engagement</SelectItem>
                <SelectItem value="timeTracking">Time Tracking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-white">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white dark:bg-[#282828]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-white">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white dark:bg-[#282828]"
              />
            </div>
          </div>

          {/* Field Selection */}
          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-white">Select Fields to Include</Label>
            <div className="grid grid-cols-2 gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
              {currentConfig?.fields.map(field => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={field}
                    checked={selectedFields[field] || false}
                    onCheckedChange={(checked) => 
                      setSelectedFields({ ...selectedFields, [field]: checked })
                    }
                  />
                  <label
                    htmlFor={field}
                    className="text-sm text-slate-900 dark:text-white cursor-pointer"
                  >
                    {field.replace(/_/g, ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex gap-2">
            <Button onClick={generateReport} className="flex-1 bg-blue-600 hover:bg-blue-700">
              <Play className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            {generatedReport && (
              <Button onClick={handleExport} variant="outline" className="border-green-300 text-green-700">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>

          {/* Report Preview */}
          {generatedReport && (
            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-white">
                Report Preview ({generatedReport.length} records)
              </Label>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                      <tr>
                        {Object.keys(generatedReport[0] || {}).map(key => (
                          <th key={key} className="px-4 py-2 text-left text-slate-900 dark:text-white">
                            {key.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {generatedReport.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                          {Object.values(row).map((value, i) => (
                            <td key={i} className="px-4 py-2 text-slate-900 dark:text-white">
                              {String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {generatedReport.length > 50 && (
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 text-center text-sm text-slate-600 dark:text-slate-400">
                    Showing first 50 of {generatedReport.length} records. Export to see all.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}