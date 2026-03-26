import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Search, 
  Command, 
  FileText, 
  CheckSquare, 
  FolderOpen, 
  MapPin,
  Users,
  Clock,
  ArrowRight,
  X
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function QuickSearchDialog({ open, onOpenChange }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const { data: jobs = [] } = useQuery({
    queryKey: ['field-jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 50),
    enabled: open,
    initialData: [], // FIX: Ensure jobs is always an array
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['all-field-tasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 100),
    enabled: open,
    initialData: [], // FIX: Ensure tasks is always an array
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['all-field-plans'],
    queryFn: () => base44.entities.Plan.list('-created_date', 50),
    enabled: open,
    initialData: [], // FIX: Ensure plans is always an array
  });

  // Filter results based on query
  const filteredResults = React.useMemo(() => {
    // FIX: Ensure arrays before using slice/forEach
    const safeJobs = Array.isArray(jobs) ? jobs : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safePlans = Array.isArray(plans) ? plans : [];
    
    if (!query.trim()) {
      // Show recent items when no query
      return [
        ...safeJobs.slice(0, 3).map(j => ({ type: 'project', item: j })),
        ...safeTasks.slice(0, 3).map(t => ({ type: 'task', item: t })),
      ];
    }

    const q = query.toLowerCase();
    const results = [];

    // Search projects
    safeJobs.forEach(job => {
      if (job.name?.toLowerCase().includes(q) || 
          job.address?.toLowerCase().includes(q) ||
          job.client_name_field?.toLowerCase().includes(q)) {
        results.push({ type: 'project', item: job });
      }
    });

    // Search tasks
    safeTasks.forEach(task => {
      if (task.title?.toLowerCase().includes(q) ||
          task.description?.toLowerCase().includes(q)) {
        results.push({ type: 'task', item: task });
      }
    });

    // Search plans
    safePlans.forEach(plan => {
      if (plan.name?.toLowerCase().includes(q)) {
        results.push({ type: 'plan', item: plan });
      }
    });

    return results.slice(0, 10);
  }, [query, jobs, tasks, plans]);

  // Reset on open
  useEffect(() => {
    let focusTimer = null;
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => { if (focusTimer) clearTimeout(focusTimer); };
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredResults[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, filteredResults]);

  const handleSelect = (result) => {
    onOpenChange(false);
    if (result.type === 'project') {
      window.location.href = createPageUrl(`FieldProject?id=${result.item.id}`);
    } else if (result.type === 'task') {
      window.location.href = createPageUrl(`FieldProject?id=${result.item.job_id}&tab=tasks`);
    } else if (result.type === 'plan') {
      window.location.href = createPageUrl(`FieldProject?id=${result.item.job_id}&tab=plans`);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'project': return FolderOpen;
      case 'task': return CheckSquare;
      case 'plan': return MapPin;
      default: return FileText;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'project': return 'Project';
      case 'task': return 'Task';
      case 'plan': return 'Plan';
      default: return type;
    }
  };

  const statusColors = {
    pending: 'bg-amber-500/20 text-amber-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    completed: 'bg-green-500/20 text-green-400',
    blocked: 'bg-red-500/20 text-red-400',
    active: 'bg-green-500/20 text-green-400',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search projects, tasks, plans..."
            className="flex-1 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
            autoFocus
          />
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">ESC</kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="py-2">
              {!query && (
                <div className="px-4 py-1.5 text-xs font-medium text-slate-400 uppercase">
                  Recent
                </div>
              )}
              {filteredResults.map((result, idx) => {
                const Icon = getIcon(result.type);
                const isSelected = idx === selectedIndex;
                
                return (
                  <button
                    key={`${result.type}-${result.item.id}`}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected 
                        ? 'bg-[#FFB800]/10 dark:bg-[#FFB800]/20' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-[#FFB800]/20' : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FFB800]' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${
                          isSelected ? 'text-[#FFB800]' : 'text-slate-900 dark:text-white'
                        }`}>
                          {result.item.name || result.item.title}
                        </span>
                        <Badge className={`text-[10px] ${statusColors[result.item.status] || 'bg-slate-500/20 text-slate-400'}`}>
                          {result.item.status || getTypeLabel(result.type)}
                        </Badge>
                      </div>
                      {result.item.address && (
                        <p className="text-xs text-slate-400 truncate">{result.item.address}</p>
                      )}
                      {result.item.description && (
                        <p className="text-xs text-slate-400 truncate">{result.item.description}</p>
                      )}
                    </div>
                    <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-[#FFB800]' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded shadow-sm">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded shadow-sm">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded shadow-sm">↵</kbd>
                to select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <Command className="w-3 h-3" />K to search
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}