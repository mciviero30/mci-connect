import React, { useState } from 'react';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trash2, Play, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createTestTimeData } from '@/functions/createTestTimeData';

export default function TimeTrackingTestControl() {
  const { isAdmin } = usePermissions() || {};
  const [status, setStatus] = useState(null);

  // Guard: Only admins can access test control panel
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        <div className="text-center">
          <p className="text-2xl mb-2">🔒</p>
          <p className="text-sm">Admin access required</p>
        </div>
      </div>
    );
  }

  // Use current user's email for test data queries (no hardcoded emails)
  const testEmployeeEmail = null; // Set dynamically in test functions

  // Get test employee data
  const { data: testEmployee } = useQuery({
    queryKey: ['testEmployee', testEmployeeEmail],
    queryFn: async () => {
      const employees = await base44.entities.EmployeeDirectory.filter({
        employee_email: testEmployeeEmail
      });
      return employees[0];
    }
  });

  // Get test time entries
  const { data: testEntries = [], refetch: refetchEntries } = useQuery({
    queryKey: ['testTimeEntries', testEmployeeEmail],
    queryFn: async () => {
      const entries = await base44.entities.TimeEntry.filter({
        employee_email: testEmployeeEmail,
        test_data: true
      }, '-created_date', 100);
      return entries;
    }
  });

  // Get test jobs
  const { data: testJobs = [] } = useQuery({
    queryKey: ['testJobs'],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter(
        { name: { $in: ['MCI-house', 'LG Friend'] } }
      );
      return jobs;
    }
  });

  // Create test data mutation
  const createTestMutation = useMutation({
    mutationFn: async () => {
      const response = await createTestTimeData({
        action: 'create',
        testEmployeeEmail
      });
      return response;
    },
    onSuccess: (data) => {
      setStatus({ type: 'success', message: data.message, entries: data.entries });
      refetchEntries();
    },
    onError: (error) => {
      setStatus({ type: 'error', message: error.message });
    }
  });

  // Delete test data mutation
  const deleteTestMutation = useMutation({
    mutationFn: async () => {
      const response = await createTestTimeData({
        action: 'delete',
        testEmployeeEmail
      });
      return response;
    },
    onSuccess: (data) => {
      setStatus({ 
        type: 'warning', 
        message: `✅ Deleted: ${data.deleted.timeEntries} entries, ${data.deleted.payrollAllocations} payroll, ${data.deleted.transactions} transactions`
      });
      refetchEntries();
    },
    onError: (error) => {
      setStatus({ type: 'error', message: error.message });
    }
  });

  const totalHours = testEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          🧪 Time Tracking Test Control
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Create and manage test data for comprehensive testing before launch
        </p>
      </div>

      {/* Employee Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Employee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600">Email:</span>
            <Badge variant="outline">{testEmployeeEmail}</Badge>
          </div>
          {testEmployee && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Name:</span>
                <span className="text-sm">{testEmployee.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Status:</span>
                <Badge className="bg-green-100 text-green-900">Active</Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Jobs Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {testJobs.map(job => (
              <div key={job.id} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <span className="text-sm font-medium">{job.name}</span>
                <span className="text-xs text-slate-500">{job.address}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Message */}
      {status && (
        <Alert className={`border-2 ${
          status.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
          status.type === 'warning' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' :
          'border-red-500 bg-red-50 dark:bg-red-900/20'
        }`}>
          <AlertDescription className={`text-sm ${
            status.type === 'success' ? 'text-green-900 dark:text-green-200' :
            status.type === 'warning' ? 'text-amber-900 dark:text-amber-200' :
            'text-red-900 dark:text-red-200'
          }`}>
            {status.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Test Entries Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Data Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{testEntries.length}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Time Entries</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalHours.toFixed(1)}h</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Total Hours</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-center">
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {new Set(testEntries.map(e => e.job_id)).size}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Jobs</div>
            </div>
          </div>

          {testEntries.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {testEntries.map(entry => (
                  <div key={entry.id} className="text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded flex justify-between">
                    <span>{entry.date} - {entry.job_name}</span>
                    <span className="font-mono font-bold">{entry.hours_worked}h ({entry.work_type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Control Buttons */}
      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">Test Actions</h3>
            <div className="space-y-3">
              <Button
                onClick={() => createTestMutation.mutate()}
                disabled={createTestMutation.isPending || !testEmployee}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {createTestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Play className="w-4 h-4 mr-2" />
                Create Test Data (7 days)
              </Button>

              {testEntries.length > 0 && (
                <Button
                  onClick={() => {
                    if (confirm('⚠️ Delete ALL test data? This will also delete payroll and accounting entries.')) {
                      deleteTestMutation.mutate();
                    }
                  }}
                  disabled={deleteTestMutation.isPending}
                  variant="destructive"
                  className="w-full"
                >
                  {deleteTestMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All Test Data
                </Button>
              )}
            </div>
          </div>

          <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs text-amber-800 dark:text-amber-200 ml-2">
              Test data is tagged with <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded text-[10px]">test_data: true</code> for easy cleanup
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Testing Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Testing Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="c1" className="rounded" />
              <label htmlFor="c1">TimeEntry created with correct user_id</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="c2" className="rounded" />
              <label htmlFor="c2">Multiple jobs assigned across 7 days</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="c3" className="rounded" />
              <label htmlFor="c3">Total hours &gt; 40h (overtime calculation)</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="c4" className="rounded" />
              <label htmlFor="c4">Work type (normal/driving) tracked</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="c5" className="rounded" />
              <label htmlFor="c5">Data flows to PayrollAllocation</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="c6" className="rounded" />
              <label htmlFor="c6">Data flows to Transaction (Contabilidad)</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="c7" className="rounded" />
              <label htmlFor="c7">Delete cascade works (all related data removed)</label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}