import React, { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Filter, LayoutGrid, List, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CreateTaskDialog from './CreateTaskDialog.jsx';
import TaskDetailPanel from './TaskDetailPanel.jsx';
import { useWorkUnits } from './hooks/useWorkUnits';
import TaskVisibilityToggle from './TaskVisibilityToggle.jsx';
import PunchItemReview from './PunchItemReview.jsx';
import { canEditTasks } from './rolePermissions';

export default function FieldTasksView({ jobId, tasks: legacyTasks, plans }) {
  // Use new unified hook, fall back to legacy tasks if provided
  const { workUnits, updateMutation: workUnitUpdate } = useWorkUnits(jobId, { type: 'task' });
  const tasks = legacyTasks?.length > 0 ? legacyTasks : workUnits;
  const [view, setView] = useState('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [reviewingPunch, setReviewingPunch] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const queryClient = useQueryClient();
  
  // Check permissions
  const canEdit = canEditTasks(currentUser);

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
      const matchesType = taskTypeFilter === 'all' || task.task_type === taskTypeFilter;
      const matchesUser = !showMyTasks || task.assigned_to === currentUser?.email;
      return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesUser;
    })
    .sort((a, b) => getWallNumber(a.title) - getWallNumber(b.title));

  const columns = [
    { id: 'pending', label: 'Assigned', color: 'red', emoji: '📋' },
    { id: 'in_progress', label: 'Working', color: 'blue', emoji: '⚙️' },
    { id: 'completed', label: 'Done', color: 'green', emoji: '✅' },
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
    urgent: 'bg-red-500 text-white border-red-300',
    high: 'bg-orange-600 text-white border-orange-300',
    medium: 'bg-amber-500 text-black border-amber-300',
    low: 'bg-slate-600 text-white border-slate-400',
  };

  return (
    <div className="p-6 flex flex-col h-full" style={{
      WebkitOverflowScrolling: 'touch',
      overscrollBehavior: 'contain',
    }}>
      {/* Header - Enhanced with better mobile layout */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-black">Tasks</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 bg-slate-800 border-2 border-slate-600 text-white placeholder:text-slate-400 w-full sm:w-56 min-h-[48px] rounded-xl text-base font-medium"
            />
          </div>
          <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
            <SelectTrigger className="bg-slate-800 border-2 border-slate-600 text-white min-h-[48px] rounded-xl min-w-[140px] font-semibold">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-2 border-slate-700 rounded-xl">
              <SelectItem value="all" className="text-white min-h-[48px] text-base">All Types</SelectItem>
              <SelectItem value="task" className="text-white min-h-[48px] text-base">📋 Task</SelectItem>
              <SelectItem value="checklist" className="text-white min-h-[48px] text-base">✅ Checklist</SelectItem>
              <SelectItem value="inspection" className="text-white min-h-[48px] text-base">🔍 Inspection</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-slate-800 border-2 border-slate-600 text-white min-h-[48px] rounded-xl min-w-[140px] font-semibold">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-2 border-slate-700 rounded-xl">
              <SelectItem value="all" className="text-white min-h-[48px] text-base">All Status</SelectItem>
              <SelectItem value="pending" className="text-white min-h-[48px] text-base">📋 Assigned</SelectItem>
              <SelectItem value="in_progress" className="text-white min-h-[48px] text-base">⚙️ Working</SelectItem>
              <SelectItem value="completed" className="text-white min-h-[48px] text-base">✅ Done</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setShowMyTasks(!showMyTasks)}
            variant={showMyTasks ? "default" : "outline"}
            className={`min-h-[48px] rounded-xl font-bold touch-manipulation active:scale-95 transition-all ${
              showMyTasks 
                ? 'bg-gradient-to-r from-orange-600 to-yellow-500 text-black border-none shadow-lg' 
                : 'bg-slate-800 border-2 border-slate-600 text-white active:bg-slate-700'
            }`}
          >
            <User className="w-5 h-5 mr-2" />
            My Tasks
          </Button>
          <div className="hidden sm:flex bg-slate-800 rounded-xl p-1.5 shadow-md border-2 border-slate-700">
            <button
              onClick={() => setView('kanban')}
              className={`min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg transition-all touch-manipulation active:scale-95 ${view === 'kanban' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 active:bg-slate-700 active:text-white'}`}
            >
              <LayoutGrid className="w-6 h-6" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`min-w-[48px] min-h-[48px] flex items-center justify-center rounded-lg transition-all touch-manipulation active:scale-95 ${view === 'list' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 active:bg-slate-700 active:text-white'}`}
            >
              <List className="w-6 h-6" />
            </button>
          </div>
          {canEdit && (
            <Button 
              onClick={() => setShowCreateTask(true)}
              className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none shadow-lg min-h-[48px] rounded-xl w-full sm:w-auto touch-manipulation active:scale-[0.98] transition-transform"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span className="font-bold">New Task</span>
            </Button>
          )}
        </div>
      </div>

      {/* Kanban View - Enhanced with clear states */}
      {view === 'kanban' && (
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 overflow-x-auto">
          {columns.map((column) => {
            const columnTasks = filteredTasks.filter(t => t.status === column.id);
            return (
              <div 
                key={column.id}
                className="bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-600 rounded-xl p-4 min-h-[400px] shadow-xl"
                onDrop={(e) => handleDrop(e, column.id)}
                onDragOver={handleDragOver}
              >
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-600">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <span className="text-xl">{column.emoji}</span>
                    {column.label}
                  </h3>
                  <Badge className={`
                    ${column.color === 'red' ? 'bg-red-500/20 text-red-400 border-red-500/40' : ''}
                    ${column.color === 'blue' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : ''}
                    ${column.color === 'green' ? 'bg-green-500/20 text-green-400 border-green-500/40' : ''}
                    text-xs font-bold px-2.5 py-1
                  `}>
                    {columnTasks.length}
                  </Badge>
                </div>
                <div 
                  className="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto" 
                  data-scrollable="true"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    overscrollBehaviorY: 'contain',
                  }}
                >
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No {column.label.toLowerCase()} tasks
                    </div>
                  ) : (
                    columnTasks.sort((a, b) => getWallNumber(a.title) - getWallNumber(b.title)).map((task) => {
                      const wallNum = task.title?.match(/(\d+)/)?.[1] || '?';
                      return (
                        <div
                         key={task.id}
                         draggable
                         onDragStart={(e) => handleDragStart(e, task)}
                         onClick={() => {
                           if (task.created_by_client && task.task_type === 'punch_item') {
                             setReviewingPunch(task);
                           } else {
                             setEditingTask(task);
                             setShowCreateTask(true);
                           }
                         }}
                         className={`border-4 rounded-2xl p-4 cursor-pointer active:shadow-2xl active:scale-[0.97] transition-all touch-manipulation min-h-[72px] ${
                           task.created_by_client && task.task_type === 'punch_item'
                             ? 'bg-purple-900/60 border-purple-400 active:border-purple-300 shadow-lg shadow-purple-500/20'
                             : 'bg-slate-800 border-slate-600 active:border-[#FFB800] shadow-lg'
                         }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-xl border-2 border-white/20 ${
                              task.status === 'completed' ? 'bg-gradient-to-br from-green-500 to-green-700' :
                              task.status === 'in_progress' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                              'bg-gradient-to-br from-red-500 to-red-700'
                            }`}>
                              {wallNum}
                            </div>
                            <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-1.5">
                               <p className="text-white text-base font-bold truncate">Wall {wallNum}</p>
                               {task.created_by_client && task.task_type === 'punch_item' && (
                                 <Badge className="bg-purple-500 text-white text-xs px-2 py-1 font-bold border-2 border-purple-300">
                                   CLIENT
                                 </Badge>
                               )}
                             </div>
                             <Badge className={`${priorityColors[task.priority]} text-xs px-2.5 py-1 font-bold border-2`}>
                               {task.priority || 'normal'}
                             </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="flex-1 bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl overflow-hidden shadow-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left p-4 text-slate-400 font-medium">Wall #</th>
                <th className="text-left p-4 text-slate-400 font-medium">Status</th>
                <th className="text-left p-4 text-slate-400 font-medium">Priority</th>
                <th className="text-left p-4 text-slate-400 font-medium">Category</th>
                <th className="text-left p-4 text-slate-400 font-medium">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const wallNum = task.title?.match(/(\d+)/)?.[1] || '?';
                return (
                  <tr 
                    key={task.id}
                    onClick={() => { setEditingTask(task); setShowCreateTask(true); }}
                    className="border-b border-slate-700/50 hover:bg-slate-800/50 cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          'bg-red-500'
                        }`}>
                          {wallNum}
                        </div>
                        <span className="text-white font-medium">Wall {wallNum}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={`${
                        task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {task.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                    </td>
                    <td className="p-4 text-slate-400">{task.category}</td>
                    <td className="p-4 text-slate-400">{task.assigned_to || '-'}</td>
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

      {/* Punch Item Review Dialog */}
      <PunchItemReview
        punchItem={reviewingPunch}
        open={!!reviewingPunch}
        onOpenChange={(open) => !open && setReviewingPunch(null)}
      />
    </div>
  );
}