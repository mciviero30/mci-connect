import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useActivityLog(jobId) {
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: (data) => base44.entities.FieldActivityLog.create({
      job_id: jobId,
      ...data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-activity-log', jobId] });
    },
  });

  const logActivity = async (entityType, entityId, action, description, userEmail, userName, metadata = {}) => {
    try {
      await logMutation.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        action,
        description,
        user_email: userEmail,
        user_name: userName,
        metadata,
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  return { logActivity };
}