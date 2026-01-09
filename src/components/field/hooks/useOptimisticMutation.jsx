import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * OPTIMISTIC MUTATION HOOK
 * Feedback instantáneo (<100ms) + estado optimista
 * 
 * Usuario percibe latencia = 0ms
 * Acción aparece inmediatamente aunque sea offline/async
 */
export const useOptimisticMutation = ({
  mutationFn,
  queryKey,
  optimisticUpdate,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    
    // OPTIMISTIC UPDATE - Instantáneo
    onMutate: async (variables) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update cache
      if (optimisticUpdate) {
        queryClient.setQueryData(queryKey, (old) => optimisticUpdate(old, variables));
      }

      // Immediate visual feedback
      toast.success(successMessage || 'Saved offline', { 
        duration: 2000,
        className: 'bg-green-600 text-white',
      });

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(10);

      return { previousData };
    },

    // On error: rollback
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      
      toast.error(errorMessage || 'Failed to save', { duration: 3000 });
      
      onError?.(err, variables, context);
    },

    // On success: refetch for server truth
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
      onSuccess?.(data, variables, context);
    },
  });
};