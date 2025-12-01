import React from 'react';
import { Filter, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function BlueprintFilterBar({ 
  tasks, 
  activeFilters, 
  onFilterChange,
  onClearFilters 
}) {
  const statusOptions = [
    { id: 'pending', label: 'Pending', color: 'amber' },
    { id: 'in_progress', label: 'In Progress', color: 'blue' },
    { id: 'completed', label: 'Completed', color: 'green' },
    { id: 'blocked', label: 'Blocked', color: 'red' },
  ];

  const priorityOptions = [
    { id: 'urgent', label: 'Urgent', color: 'red' },
    { id: 'high', label: 'High', color: 'orange' },
    { id: 'medium', label: 'Medium', color: 'amber' },
    { id: 'low', label: 'Low', color: 'slate' },
  ];

  const categoryOptions = [
    { id: 'general', label: 'General' },
    { id: 'installation', label: 'Installation' },
    { id: 'inspection', label: 'Inspection' },
    { id: 'issue', label: 'Issue' },
    { id: 'rfi', label: 'RFI' },
  ];

  // Count tasks per filter
  const getCount = (type, value) => {
    return tasks.filter(t => t[type] === value).length;
  };

  const toggleFilter = (type, value) => {
    const current = activeFilters[type] || [];
    const newFilters = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFilterChange({ ...activeFilters, [type]: newFilters });
  };

  const hasActiveFilters = Object.values(activeFilters).some(arr => arr?.length > 0);

  return (
    <div className="absolute top-16 left-16 right-4 z-40 flex items-center gap-2 flex-wrap">
      {/* Status Filters */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-1">
        <Filter className="w-4 h-4 text-slate-400 mx-2" />
        {statusOptions.map(opt => {
          const count = getCount('status', opt.id);
          const isActive = activeFilters.status?.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggleFilter('status', opt.id)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                isActive 
                  ? `bg-${opt.color}-500 text-white` 
                  : `text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700`
              }`}
            >
              {opt.label}
              <span className={`text-[10px] ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Priority Quick Filters */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 p-1">
        {priorityOptions.map(opt => {
          const count = getCount('priority', opt.id);
          const isActive = activeFilters.priority?.includes(opt.id);
          if (count === 0) return null;
          return (
            <button
              key={opt.id}
              onClick={() => toggleFilter('priority', opt.id)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                isActive 
                  ? `bg-${opt.color}-500 text-white` 
                  : `text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700`
              }`}
            >
              {opt.label[0]}
            </button>
          );
        })}
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}