import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * UNIFIED HOOK FOR WORK UNITS
 * Replaces separate Task, ChecklistTemplate, FormSubmission queries
 */

export function useWorkUnits(jobId, options = {}) {
  const queryClient = useQueryClient();
  const { type = 'all', status = 'all' } = options;

  // Single query for all work units
  const { data: workUnits = [], isLoading, error } = useQuery({
    queryKey: ['work-units', jobId, type],
    queryFn: async () => {
      const filter = { job_id: jobId };
      if (type !== 'all') filter.type = type;
      return base44.entities.WorkUnit.filter(filter, '-created_date');
    },
    enabled: !!jobId,
  });

  // Filtered by status
  const filteredUnits = status === 'all' 
    ? workUnits 
    : workUnits.filter(u => u.status === status);

  // Stats
  const stats = {
    total: workUnits.length,
    pending: workUnits.filter(u => u.status === 'pending').length,
    in_progress: workUnits.filter(u => u.status === 'in_progress').length,
    completed: workUnits.filter(u => u.status === 'completed').length,
    blocked: workUnits.filter(u => u.status === 'blocked').length,
    tasks: workUnits.filter(u => u.type === 'task').length,
    checklists: workUnits.filter(u => u.type === 'checklist').length,
    inspections: workUnits.filter(u => u.type === 'inspection').length,
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkUnit.create({ ...data, job_id: jobId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-units', jobId] }),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkUnit.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-units', jobId] }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkUnit.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-units', jobId] }),
  });

  // Helper: Create task
  const createTask = (data) => createMutation.mutate({ ...data, type: 'task' });

  // Helper: Create checklist
  const createChecklist = (data) => createMutation.mutate({ ...data, type: 'checklist' });

  // Helper: Create inspection
  const createInspection = (data) => createMutation.mutate({ ...data, type: 'inspection' });

  // Helper: Update status
  const updateStatus = (id, status) => updateMutation.mutate({ id, data: { status } });

  // Helper: Toggle checklist item
  const toggleChecklistItem = (workUnitId, itemId, checked, user) => {
    const workUnit = workUnits.find(u => u.id === workUnitId);
    if (!workUnit) return;

    const updatedItems = (workUnit.checklist_items || []).map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            checked, 
            checked_by: checked ? user?.email : null,
            checked_at: checked ? new Date().toISOString() : null
          }
        : item
    );

    // Auto-complete if all items checked
    const allChecked = updatedItems.every(item => item.checked);
    const newStatus = allChecked ? 'completed' : workUnit.status === 'completed' ? 'in_progress' : workUnit.status;

    updateMutation.mutate({
      id: workUnitId,
      data: { 
        checklist_items: updatedItems,
        status: newStatus,
        completed_date: allChecked ? new Date().toISOString() : null,
        completed_by: allChecked ? user?.email : null
      }
    });
  };

  // Helper: Submit form responses
  const submitFormResponses = (workUnitId, responses, user) => {
    updateMutation.mutate({
      id: workUnitId,
      data: {
        form_responses: responses,
        status: 'completed',
        completed_date: new Date().toISOString(),
        completed_by: user?.email
      }
    });
  };

  // Helper: Add comment
  const addComment = (workUnitId, content, user) => {
    const workUnit = workUnits.find(u => u.id === workUnitId);
    if (!workUnit) return;

    const newComment = {
      id: Date.now().toString(),
      author_email: user?.email,
      author_name: user?.full_name,
      content,
      created_at: new Date().toISOString()
    };

    updateMutation.mutate({
      id: workUnitId,
      data: {
        comments: [...(workUnit.comments || []), newComment]
      }
    });
  };

  return {
    // Data
    workUnits: filteredUnits,
    allWorkUnits: workUnits,
    stats,
    isLoading,
    error,
    
    // Mutations
    createMutation,
    updateMutation,
    deleteMutation,
    
    // Helpers
    createTask,
    createChecklist,
    createInspection,
    updateStatus,
    toggleChecklistItem,
    submitFormResponses,
    addComment,
    
    // Refetch
    refetch: () => queryClient.invalidateQueries({ queryKey: ['work-units', jobId] }),
  };
}

// Compatibility: Get tasks only
export function useTasks(jobId) {
  return useWorkUnits(jobId, { type: 'task' });
}

// Compatibility: Get checklists only
export function useChecklists(jobId) {
  return useWorkUnits(jobId, { type: 'checklist' });
}

// Compatibility: Get inspections only
export function useInspections(jobId) {
  return useWorkUnits(jobId, { type: 'inspection' });
}