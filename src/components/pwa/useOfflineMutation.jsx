import { useMutation } from '@tanstack/react-query';
import { useSyncQueue } from './SyncQueueManager';
import { useToast } from '@/components/ui/toast';

/**
 * Hook for offline-capable mutations
 * Automatically queues mutations when offline
 */
export function useOfflineMutation({ 
  mutationFn, 
  entity, 
  operation, 
  onSuccess, 
  onError,
  ...options 
}) {
  const { addToQueue } = useSyncQueue();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (variables) => {
      // Try online mutation first
      if (navigator.onLine) {
        try {
          return await mutationFn(variables);
        } catch (error) {
          // If network error, queue it
          if (error.message.includes('network') || error.message.includes('fetch')) {
            queueMutation(variables);
            throw new Error('QUEUED');
          }
          throw error;
        }
      } else {
        // Offline - queue immediately
        queueMutation(variables);
        throw new Error('QUEUED');
      }
    },
    onSuccess: (data, variables, context) => {
      if (onSuccess) onSuccess(data, variables, context);
    },
    onError: (error, variables, context) => {
      if (error.message === 'QUEUED') {
        toast.info('💾 Cambios guardados. Se sincronizarán cuando haya conexión.');
        return;
      }
      
      if (onError) {
        onError(error, variables, context);
      } else {
        toast.error('Error: ' + error.message);
      }
    },
    ...options
  });

  function queueMutation(variables) {
    addToQueue({
      entity,
      operation,
      data: variables.data || variables,
      id: variables.id
    });
  }
}