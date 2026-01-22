import React, { useState, useMemo, useCallback, memo } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Filter, LayoutGrid, List, Search, User, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CreateTaskDialog from './CreateTaskDialog.jsx';
import TaskDetailPanel from './TaskDetailPanel.jsx';
import { useWorkUnits } from './hooks/useWorkUnits';
import TaskVisibilityToggle from './TaskVisibilityToggle.jsx';
import PunchItemReview from './PunchItemReview.jsx';
import FiltersBottomSheet from './FiltersBottomSheet.jsx';
import { canEditTasks } from './rolePermissions';
import { FIELD_STABLE_QUERY_CONFIG, updateFieldQueryData } from './config/fieldQueryConfig';
import { FIELD_QUERY_KEYS } from './fieldQueryKeys';
import { useRenderOptimization } from './performance/useRenderOptimization';
import { haptic } from '@/components/feedback/HapticFeedback';
import { microToast } from '@/components/feedback/MicroToast';
import { useDoubleSubmitPrevention } from '@/components/validation/useDoubleSubmitPrevention';
import { toast } from 'sonner';

// Memoized TaskCard to prevent re-renders
const TaskCard = memo(({ task, onClick, onDragStart, isClientPunch }) => {
const wallNum = task.title?.match(/(\d+)/)?.[1] || '?';
const isSyncing = task._syncing;
const isOptimistic = task._optimistic;

const priorityColors = {
  urgent: 'bg-red-500 text-white border-red-300',
  high: 'bg-orange-600 text-white border-orange-300',
  medium: 'bg-amber-500 text-black border-amber-300',
  low: 'bg-slate-600 text-white border-slate-400',
};

return (
  <div
    draggable
    onDragStart={onDragStart}
    onClick={onClick}
    className={`border-4 rounded-2xl p-5 cursor-pointer transition-all touch-manipulation min-h-[80px] ${
      isClientPunch
        ? 'bg-purple-900/60 border-purple-400 active:border-purple-300 shadow-lg shadow-purple-500/20'
        : isSyncing || isOptimistic
        ? 'bg-slate-800/60 border-slate-600 border-dashed shadow-lg opacity-80'
        : 'bg-slate-800 border-slate-600 active:border-[#FFB800] shadow-lg'
    } ${!isSyncing && !isOptimistic ? 'active:scale-[0.96] active:shadow-2xl' : ''}`}
    style={{ WebkitTapHighlightColor: 'transparent' }}
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
            {isClientPunch && (
              <Badge className="bg-purple-500 text-white text-xs px-2 py-1 font-bold border-2 border-purple-300">
                CLIENT
              </Badge>
            )}
            {(isSyncing || isOptimistic) && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40 text-[9px] px-1.5 py-0.5 font-bold animate-pulse">
                SYNCING
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
});
TaskCard.displayName = 'TaskCard';

export default function FieldTasksView({ jobId, tasks: legacyTasks, plans, currentUser }) {
  useRenderOptimization('FieldTasksView');
  // Use new unified hook, fall back to legacy tasks if provided
  const { workUnits, updateMutation: workUnitUpdate } = useWorkUnits(jobId, { type: 'task' });
  // ONLY use backend tasks - never demo/mock data in production
  const tasks = legacyTasks?.length > 0 ? legacyTasks : workUnits;
  
  // Debug mode: allow demo tasks only for admins with ?debug=true
  const isDebugMode = import.meta.env.DEV && currentUser?.role === 'admin' && new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('debug') === 'true';
  const showEmptyState = tasks.length === 0;
  const [view, setView] = useState('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [reviewingPunch, setReviewingPunch] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const { data: queryUser } = useQuery({
    queryKey: FIELD_QUERY_KEYS.USER(jobId),
    queryFn: () => base44.auth.me(),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  // Use prop currentUser or fetched queryUser
  const user = currentUser || queryUser;

  const queryClient = useQueryClient();
  
  // Check permissions
  const canEdit = canEditTasks(user);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => {
      return base44.entities.WorkUnit.update(id, data).catch(() => 
        base44.entities.Task.update(id, data)
      );
    },
    
    // OPTIMISTIC UPDATE - Immediate status change
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: FIELD_QUERY_KEYS.TASKS(jobId) });
      
      // Instant visual update
      updateFieldQueryData(queryClient, jobId, 'TASKS', (old) => 
        old ? old.map(t => t.id === id ? {...t, ...data, _syncing: true} : t) : old
      );
      updateFieldQueryData(queryClient, jobId, 'WORK_UNITS', (old) => 
        old ? old.map(t => t.id === id ? {...t, ...data, _syncing: true} : t) : old
      );
      
      // Haptic feedback
      haptic.light();
      
      // Visual confirmation
      microToast.success('Status updated', 1200);
    },
    
    onSuccess: (_, variables) => {
      updateFieldQueryData(queryClient, jobId, 'TASKS', (old) => 
        old ? old.map(t => t.id === variables.id ? {...t, ...variables.data, _syncing: false} : t) : old
      );
      updateFieldQueryData(queryClient, jobId, 'WORK_UNITS', (old) => 
        old ? old.map(t => t.id === variables.id ? {...t, ...variables.data, _syncing: false} : t) : old
      );
    },
  });

  const deleteAllTasksMutation = useMutation({
    mutationFn: async () => {
      // Delete all tasks for this job
      for (const task of tasks) {
        try {
          await base44.entities.WorkUnit.delete(task.id).catch(() => 
            base44.entities.Task.delete(task.id)
          );
        } catch (error) {
          console.error('Error deleting task:', task.id, error);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FIELD_QUERY_KEYS.TASKS(jobId) });
      queryClient.invalidateQueries({ queryKey: FIELD_QUERY_KEYS.WORK_UNITS(jobId) });
      toast.success('All tasks deleted');
    },
    onError: () => {
      toast.error('Failed to delete tasks');
    },
  });

  // Memoized wall number extraction
  const getWallNumber = useCallback((title) => {
    const match = title?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 999999;
  }, []);

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  // Memoized filter and sort - prevents re-computation on every render
  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        const matchesSearch = task.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        const matchesType = taskTypeFilter === 'all' || task.task_type === taskTypeFilter;
        // Match by user_id first, fallback to email
        const matchesUser = !showMyTasks || (
          task.assigned_to_user_id ? task.assigned_to_user_id === user?.id : task.assigned_to === user?.email
        );
        return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesUser;
      })
      .sort((a, b) => getWallNumber(a.title) - getWallNumber(b.title));
  }, [tasks, searchTerm, statusFilter, priorityFilter, taskTypeFilter, showMyTasks, user?.id, user?.email, getWallNumber]);

  const columns = [
    { id: 'pending', label: 'Assigned', color: 'red', emoji: '📋' },
    { id: 'in_progress', label: 'Working', color: 'blue', emoji: '⚙️' },
    { id: 'completed', label: 'Done', color: 'green', emoji: '✅' },
  ];

  // Stable drag handlers
  const handleDragStart = useCallback((e, task) => {
    e.dataTransfer.setData('taskId', task.id);
  }, []);

  const handleDrop = useCallback((e, status) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    // Immediate feedback on drop
    haptic.medium();
    microToast.success('Task moved', 1200);
    
    updateTaskMutation.mutate({ id: taskId, data: { status } });
  }, [updateTaskMutation]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Header - Primary actions removed (moved to bottom rail) */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl shadow-lg w-fit">
          <h1 className="text-2xl font-bold text-black">Tasks</h1>
        </div>
        
        {/* Secondary actions - Filters and view controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input 
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 bg-slate-800 border-2 border-slate-600 text-white placeholder:text-slate-400 w-full sm:w-56 min-h-[52px] rounded-xl text-base font-medium"
            />
          </div>
          
          {canEdit && tasks.length > 0 && (
            <Button
              onClick={() => {
                if (window.confirm(`¿Borrar TODAS las ${tasks.length} tareas de este proyecto? Esta acción no se puede deshacer.`)) {
                  deleteAllTasksMutation.mutate();
                }
              }}
              disabled={deleteAllTasksMutation.isPending}
              variant="outline"
              className="bg-red-900/20 border-2 border-red-500/50 text-red-400 hover:bg-red-900/40 hover:border-red-400 min-h-[52px] rounded-xl font-bold touch-manipulation active:scale-95"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              {deleteAllTasksMutation.isPending ? 'Borrando...' : 'Borrar Todas'}
            </Button>
          )}
          
          {/* Mobile: Single Filter button opens bottom sheet */}
          {isMobile ? (
            <Button
              onClick={() => setShowFilters(true)}
              variant="outline"
              className="bg-slate-800 border-2 border-slate-600 text-white min-h-[52px] rounded-xl font-bold touch-manipulation active:scale-95"
            >
              <Filter className="w-5 h-5 mr-2" />
              Filters
              {(statusFilter !== 'all' || taskTypeFilter !== 'all' || showMyTasks) && (
                <Badge className="ml-2 bg-orange-500 text-white">
                  {[statusFilter !== 'all', taskTypeFilter !== 'all', showMyTasks].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          ) : (
            <>
              <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
                <SelectTrigger className="bg-slate-800 border-2 border-slate-600 text-white min-h-[52px] rounded-xl min-w-[140px] font-semibold">
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
                <SelectTrigger className="bg-slate-800 border-2 border-slate-600 text-white min-h-[52px] rounded-xl min-w-[140px] font-semibold">
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
                className={`min-h-[52px] rounded-xl font-bold touch-manipulation active:scale-95 transition-all ${
                  showMyTasks 
                    ? 'bg-gradient-to-r from-orange-600 to-yellow-500 text-black border-none shadow-lg' 
                    : 'bg-slate-800 border-2 border-slate-600 text-white active:bg-slate-700'
                }`}
              >
                <User className="w-5 h-5 mr-2" />
                My Tasks
              </Button>
            </>
          )}
          
          <div className="flex bg-slate-800 rounded-xl p-1.5 shadow-md border-2 border-slate-700">
            <button
              onClick={() => setView('kanban')}
              className={`min-w-[52px] min-h-[52px] flex items-center justify-center rounded-lg transition-all touch-manipulation active:scale-95 ${view === 'kanban' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 active:bg-slate-700 active:text-white'}`}
            >
              <LayoutGrid className="w-6 h-6" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`min-w-[52px] min-h-[52px] flex items-center justify-center rounded-lg transition-all touch-manipulation active:scale-95 ${view === 'list' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 active:bg-slate-700 active:text-white'}`}
            >
              <List className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State - NO REAL TASKS */}
      {showEmptyState && (
        <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-600 rounded-xl">
          <div className="text-center space-y-4">
            <p className="text-slate-400 text-lg font-medium">No tasks yet</p>
            <p className="text-slate-500 text-sm">Create your first task to get started</p>
            {canEdit && (
              <Button
                onClick={() => setShowCreateTask(true)}
                className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black font-bold rounded-xl min-h-[48px] px-6"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Task
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Kanban View - ONLY REAL TASKS */}
      {!showEmptyState && view === 'kanban' && (
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
                <div className="space-y-2.5 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No {column.label.toLowerCase()} tasks
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const isClientPunch = task.created_by_client && task.task_type === 'punch_item';
                      
                      return (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onDragStart={(e) => handleDragStart(e, task)}
                          onClick={() => {
                            haptic.light();
                            if (isClientPunch) {
                              setReviewingPunch(task);
                            } else {
                              setEditingTask(task);
                              setShowCreateTask(true);
                            }
                          }}
                          isClientPunch={isClientPunch}
                        />
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
      {!showEmptyState && view === 'list' && (
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

      {/* Filters Bottom Sheet - Mobile only */}
      {isMobile && (
        <FiltersBottomSheet
          open={showFilters}
          onOpenChange={setShowFilters}
          filters={{ status: statusFilter, type: taskTypeFilter }}
          onFiltersChange={(newFilters) => {
            setStatusFilter(newFilters.status || 'all');
            setTaskTypeFilter(newFilters.type || 'all');
          }}
          filterOptions={{
            status: [
              { value: 'pending', label: '📋 Assigned' },
              { value: 'in_progress', label: '⚙️ Working' },
              { value: 'completed', label: '✅ Done' }
            ],
            type: [
              { value: 'task', label: '📋 Task' },
              { value: 'checklist', label: '✅ Checklist' },
              { value: 'inspection', label: '🔍 Inspection' }
            ]
          }}
        />
      )}
    </div>
  );
}