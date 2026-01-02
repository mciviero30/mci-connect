import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function CommissionFilters({ filters, onChange, jobs = [], employees = [], showEmployeeFilter = true }) {
  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const clearFilters = () => {
    onChange({
      status: 'all',
      job_id: 'all',
      employee_email: 'all',
      start_date: '',
      end_date: '',
    });
  };

  const hasActiveFilters = 
    filters.status !== 'all' || 
    filters.job_id !== 'all' || 
    filters.employee_email !== 'all' ||
    filters.start_date ||
    filters.end_date;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Filters</h3>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-slate-600 hover:text-slate-900"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <Label>Status</Label>
          <Select value={filters.status} onValueChange={(v) => handleChange('status', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="calculated">Calculated</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="invalidated">Invalidated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Job Filter */}
        <div>
          <Label>Job</Label>
          <Select value={filters.job_id} onValueChange={(v) => handleChange('job_id', v)}>
            <SelectTrigger>
              <SelectValue placeholder="All Jobs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {jobs.map(job => (
                <SelectItem key={job.id} value={job.id}>
                  {job.name || job.job_name || 'Unnamed Job'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Employee Filter (only for admin) */}
        {showEmployeeFilter && (
          <div>
            <Label>Manager/Employee</Label>
            <Select value={filters.employee_email} onValueChange={(v) => handleChange('employee_email', v)}>
              <SelectTrigger>
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.email} value={emp.email}>
                    {emp.full_name || emp.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date Range */}
        <div>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={filters.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
          />
        </div>

        <div>
          <Label>End Date</Label>
          <Input
            type="date"
            value={filters.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}