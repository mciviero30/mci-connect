import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Filter, LayoutGrid, List, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CreateTaskDialog from './CreateTaskDialog.jsx';
import TaskDetailPanel from './TaskDetailPanel.jsx';
import { useWorkUnits } from './hooks/useWorkUnits';

export default function FieldTasksView({ jobId, tasks: legacyTasks, plans }) {
  // Use new unified hook, fall back to legacy tasks if provided
  const { workUnits, updateMutation: workUnitUpdate } = useWorkUnits(jobId, { type: 'task' });
  const tasks = legacyTasks?.length > 0 ? legacyTasks : workUnits;
  const [view, setView] = useState('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const queryClient = useQueryClient();

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => {
      // Try WorkUnit first, fallback to Task
      return base44.entities.WorkUnit.update(id, data).catch(() => 
        base44.entities.Task.update(id, data)
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
      queryClient.invalidateQueries({ queryKey: ['work-units', jobId] });
    },
  });

  // Extract wall number for sorting
  const getWallNumber = (title) => {
    const match = title?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 999999;
  };

  // Filter and sort tasks by wall number
  const filteredTasks = tasks
    .filter(task => {
      const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => getWallNumber(a.title) - getWallNumber(b.title));

  const columns = [
    { id: 'pending', label: 'Pending', color: 'amber' },
    { id: 'in_progress', label: 'In Progress', color: 'blue' },
    { id: 'completed', label: 'Completed', color: 'green' },
    { id: 'blocked', label: 'Blocked', color: 'red' },
  ];

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    updateTaskMutation.mutate({ id: taskId, data: { status } });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const priorityColors = {
    urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tasks</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white w-48"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectItem value="all" className="text-slate-900 dark:text-white">All</SelectItem>
              <SelectItem value="pending" className="text-slate-900 dark:text-white">Pending</SelectItem>
              <SelectItem value="in_progress" className="text-slate-900 dark:text-white">In Progress</SelectItem>
              <SelectItem value="completed" className="text-slate-900 dark:text-white">Completed</SelectItem>
              <SelectItem value="blocked" className="text-slate-900 dark:text-white">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setView('kanban')}
              className={`p-2 rounded ${view === 'kanban' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded ${view === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button 
            onClick={() => setShowCreateTask(true)}
            className="bg-[#FFB800] hover:bg-[#E5A600] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Kanban View - Responsive */}
      {view === 'kanban' && (
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 overflow-x-auto">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter(t => t.status === column.id);
            return (
              <div 
                key={column.id}
                className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-2 md:p-4 min-h-[300px] md:min-h-[400px] shadow-sm"
                onDrop={(e) => handleDrop(e, column.id)}
                onDragOver={handleDragOver}
              >
                <div className="flex items-center justify-between mb-2 md:mb-4">
                  <h3 className={`font-semibold text-xs md:text-sm text-${column.color}-600 dark:text-${column.color}-400`}>{column.label}</h3>
                  <Badge className={`bg-${column.color}-100 dark:bg-${column.color}-500/20 text-${column.color}-600 dark:text-${column.color}-400 border-${column.color}-200 dark:border-${column.color}-500/30 text-[10px] md:text-xs`}>
                    {columnTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {columnTasks.sort((a, b) => getWallNumber(a.title) - getWallNumber(b.title)).map((task) => {
                    const wallNum = task.title?.match(/(\d+)/)?.[1] || '?';
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onClick={() => { setEditingTask(task); setShowCreateTask(true); }}
                        className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-2 cursor-pointer hover:border-[#FFB800]/50 transition-all flex items-center gap-2"
                      >
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          task.status === 'blocked' ? 'bg-red-500' :
                          'bg-amber-500'
                        }`}>
                          {wallNum}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge className={`${priorityColors[task.priority]} text-[10px] px-1.5 py-0`}>
                            {task.priority?.[0]?.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="flex-1 bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-4 text-slate-600 dark:text-slate-400 font-medium">Wall #</th>
                <th className="text-left p-4 text-slate-600 dark:text-slate-400 font-medium">Status</th>
                <th className="text-left p-4 text-slate-600 dark:text-slate-400 font-medium">Priority</th>
                <th className="text-left p-4 text-slate-600 dark:text-slate-400 font-medium">Category</th>
                <th className="text-left p-4 text-slate-600 dark:text-slate-400 font-medium">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const wallNum = task.title?.match(/(\d+)/)?.[1] || '?';
                return (
                  <tr 
                    key={task.id}
                    onClick={() => { setEditingTask(task); setShowCreateTask(true); }}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          task.status === 'blocked' ? 'bg-red-500' :
                          'bg-amber-500'
                        }`}>
                          {wallNum}
                        </div>
                        <span className="text-slate-900 dark:text-white font-medium">Wall {wallNum}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`${
                        task.status === 'completed' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' :
                        task.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                        task.status === 'blocked' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                        'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {task.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{task.category}</td>
                    <td className="p-4 text-slate-500 dark:text-slate-400">{task.assigned_to || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Task Dialog */}
      <CreateTaskDialog 
        open={showCreateTask}
        onOpenChange={(open) => {
          setShowCreateTask(open);
          if (!open) setEditingTask(null);
        }}
        jobId={jobId}
        onCreated={() => { setShowCreateTask(false); setEditingTask(null); }}
        existingTask={editingTask}
      />
    </div>
  );
}