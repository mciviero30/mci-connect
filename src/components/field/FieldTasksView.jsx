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
    { id: 'pending', label: 'Pending', color: 'red' },
    { id: 'in_progress', label: 'In Progress', color: 'blue' },
    { id: 'completed', label: 'Completed', color: 'green' },
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
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-orange-600 to-yellow-500 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold text-black">Tasks</h1>
          <Button 
            onClick={() => setShowCreateTask(true)}
            size="sm"
            className="bg-black/20 hover:bg-black/30 text-black border-none h-8"
          >
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
        
        {/* Mobile Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-black/60" />
            <Input 
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-white/20 border-none text-black placeholder:text-black/60 h-9 text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28 bg-white/20 border-none text-black h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex justify-between items-center p-6">
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl">
          <h1 className="text-2xl font-bold text-black">Tasks</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-800/50 border-slate-700 text-white w-48"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All</SelectItem>
              <SelectItem value="pending" className="text-white">Pending</SelectItem>
              <SelectItem value="in_progress" className="text-white">In Progress</SelectItem>
              <SelectItem value="completed" className="text-white">Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={() => setView('kanban')}
              className={`p-2 rounded ${view === 'kanban' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded ${view === 'list' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button 
            onClick={() => setShowCreateTask(true)}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Mobile Kanban View - Horizontal Scroll */}
      {view === 'kanban' && (
        <div className="flex-1 overflow-x-auto md:overflow-x-visible px-3 md:px-6 pb-4">
          <div className="flex md:grid md:grid-cols-3 gap-3 md:gap-4 min-w-max md:min-w-0">
            {columns.map((column) => {
              const columnTasks = filteredTasks.filter(t => t.status === column.id);
              const colorMap = {
                red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
                blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
                green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500/20 text-green-300' },
              };
              const colors = colorMap[column.color];
              
              return (
                <div 
                  key={column.id}
                  className={`${colors.bg} border-2 ${colors.border} rounded-2xl p-3 md:p-4 w-[280px] md:w-auto min-h-[450px] md:min-h-[500px]`}
                  onDrop={(e) => handleDrop(e, column.id)}
                  onDragOver={handleDragOver}
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-700/50">
                    <h3 className={`font-bold text-sm md:text-base ${colors.text}`}>{column.label}</h3>
                    <Badge className={`${colors.badge} border-none text-xs font-bold px-2 py-1`}>
                      {columnTasks.length}
                    </Badge>
                  </div>
                  <div className="space-y-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                    {columnTasks.sort((a, b) => getWallNumber(a.title) - getWallNumber(b.title)).map((task) => {
                      const wallNum = task.title?.match(/(\d+)/)?.[1] || '?';
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onClick={() => { setEditingTask(task); setShowCreateTask(true); }}
                          className="bg-slate-800/80 border-2 border-slate-700 hover:border-[#FFB800] rounded-xl p-3 cursor-pointer transition-all active:scale-95"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white flex-shrink-0 shadow-lg ${
                              task.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                              task.status === 'in_progress' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                              'bg-gradient-to-br from-red-500 to-red-600'
                            }`}>
                              {wallNum}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-semibold text-sm mb-1 truncate">Wall {wallNum}</div>
                              <Badge className={`${priorityColors[task.priority]} text-[10px] px-2 py-0.5 border`}>
                                {task.priority}
                              </Badge>
                            </div>
                          </div>
                          {task.category && (
                            <div className="text-xs text-slate-400 mt-2 truncate">{task.category}</div>
                          )}
                        </div>
                      );
                    })}
                    {columnTasks.length === 0 && (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="flex-1 px-3 md:px-6 pb-4">
          <div className="space-y-2">
            {filteredTasks.map((task) => {
              const wallNum = task.title?.match(/(\d+)/)?.[1] || '?';
              return (
                <div
                  key={task.id}
                  onClick={() => { setEditingTask(task); setShowCreateTask(true); }}
                  className="bg-slate-800/80 border-2 border-slate-700 hover:border-[#FFB800] rounded-xl p-4 cursor-pointer transition-all active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white flex-shrink-0 shadow-lg ${
                      task.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                      task.status === 'in_progress' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                      'bg-gradient-to-br from-red-500 to-red-600'
                    }`}>
                      {wallNum}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold mb-1">Wall {wallNum}</div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className={`${priorityColors[task.priority]} text-[10px] px-2 py-0.5 border`}>
                          {task.priority}
                        </Badge>
                        <Badge className={`${
                          task.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        } text-[10px] px-2 py-0.5 border`}>
                          {task.status}
                        </Badge>
                        {task.category && (
                          <Badge className="bg-slate-600/30 text-slate-300 border-slate-600/50 text-[10px] px-2 py-0.5 border">
                            {task.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No tasks found
              </div>
            )}
          </div>
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