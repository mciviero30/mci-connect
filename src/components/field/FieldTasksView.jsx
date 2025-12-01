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

export default function FieldTasksView({ jobId, tasks, plans }) {
  const [view, setView] = useState('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const queryClient = useQueryClient();

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
    },
  });

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#FFB800]">Tasks</h1>
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

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter(t => t.status === column.id);
            return (
              <div 
                key={column.id}
                className="bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 min-h-[400px] shadow-sm"
                onDrop={(e) => handleDrop(e, column.id)}
                onDragOver={handleDragOver}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-semibold text-${column.color}-600 dark:text-${column.color}-400`}>{column.label}</h3>
                  <Badge className={`bg-${column.color}-100 dark:bg-${column.color}-500/20 text-${column.color}-600 dark:text-${column.color}-400 border-${column.color}-200 dark:border-${column.color}-500/30`}>
                    {columnTasks.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onClick={() => setSelectedTask(task)}
                      className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-3 cursor-pointer hover:border-[#FFB800]/50 transition-all"
                    >
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-2">{task.title}</h4>
                      <div className="flex items-center justify-between">
                        <Badge className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                        {task.category && (
                          <span className="text-xs text-slate-500">{task.category}</span>
                        )}
                      </div>
                    </div>
                  ))}
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
                <th className="text-left p-4 text-slate-600 dark:text-slate-400 font-medium">Title</th>
                <th className="text-left p-4 text-slate-600 dark:text-slate-400 font-medium">Status</th>
                <th className="text-left p-4 text-slate-600 dark:text-slate-400 font-medium">Priority</th>
                <th className="text-left p-4 text-slate-600 dark:text-slate-400 font-medium">Category</th>
                <th className="text-left p-4 text-slate-600 dark:text-slate-400 font-medium">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr 
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                >
                  <td className="p-4 text-slate-900 dark:text-white">{task.title}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog 
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        jobId={jobId}
        onCreated={() => setShowCreateTask(false)}
      />

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <div className="fixed inset-y-0 right-0 z-50">
          <TaskDetailPanel 
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            jobId={jobId}
            allTasks={tasks}
          />
        </div>
      )}
    </div>
  );
}