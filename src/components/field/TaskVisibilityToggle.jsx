import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function TaskVisibilityToggle({ task, compact = false }) {
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Check if user has permission to toggle visibility
  const canToggleVisibility = () => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase();
    const position = currentUser.position?.toLowerCase() || '';
    
    return (
      role === 'admin' ||
      role === 'ceo' ||
      role === 'manager' ||
      position.includes('manager') ||
      position.includes('foreman') ||
      position.includes('supervisor')
    );
  };

  if (!canToggleVisibility()) {
    return null; // Hide toggle for technicians and non-authorized users
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, visible }) => base44.entities.Task.update(id, { visible_to_client: visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['work-units'] });
    },
  });

  const isVisible = task.visible_to_client;

  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleMutation.mutate({ id: task.id, visible: !isVisible });
        }}
        className={`p-1.5 rounded-lg transition-colors ${
          isVisible 
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' 
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
        }`}
        title={isVisible ? 'Visible to client' : 'Hidden from client'}
      >
        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <Button
      onClick={() => toggleMutation.mutate({ id: task.id, visible: !isVisible })}
      disabled={toggleMutation.isPending}
      variant="outline"
      size="sm"
      className={`${
        isVisible 
          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-400' 
          : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
      }`}
    >
      {isVisible ? (
        <>
          <Eye className="w-4 h-4 mr-2" />
          Client Visible
        </>
      ) : (
        <>
          <EyeOff className="w-4 h-4 mr-2" />
          Internal Only
        </>
      )}
    </Button>
  );
}