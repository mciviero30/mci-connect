import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function ReportFilters({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange,
  department,
  onDepartmentChange,
  teams = [],
  showTeamFilter = true,
  showQuickFilters = true
}) {
  const quickFilters = [
    { value: 'thisWeek', label: 'This Week' },
    { value: 'lastWeek', label: 'Last Week' },
    { value: 'thisMonth', label: 'This Month' },
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'thisQuarter', label: 'This Quarter' },
    { value: 'thisYear', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const handleQuickFilter = (value) => {
    const today = new Date();
    let start, end;

    switch(value) {
      case 'thisWeek':
        start = new Date(today.setDate(today.getDate() - today.getDay()));
        end = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        break;
      case 'lastWeek':
        start = new Date(today.setDate(today.getDate() - today.getDay() - 7));
        end = new Date(today.setDate(today.getDate() - today.getDay() - 1));
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    onStartDateChange(format(start, 'yyyy-MM-dd'));
    onEndDateChange(format(end, 'yyyy-MM-dd'));
  };

  return (
    <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 shadow-sm mb-6">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-bold text-slate-900 dark:text-white">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Quick Filters */}
          {showQuickFilters && (
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Quick Filter</Label>
              <Select onValueChange={handleQuickFilter}>
                <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  {quickFilters.map(filter => (
                    <SelectItem key={filter.value} value={filter.value} className="text-slate-900 dark:text-white">
                      {filter.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Start Date */}
          <div>
            <Label className="text-slate-700 dark:text-slate-300">Start Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="pl-10 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <Label className="text-slate-700 dark:text-slate-300">End Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="pl-10 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Department/Team Filter */}
          {showTeamFilter && (
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Team/Department</Label>
              <Select value={department} onValueChange={onDepartmentChange}>
                <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="text-slate-900 dark:text-white">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id} className="text-slate-900 dark:text-white">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}