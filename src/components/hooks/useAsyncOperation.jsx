import { useState, useCallback } from 'react';
import { handleError } from '../utils/errorHandler';
import { useToast } from '@/components/ui/toast';

/**
 * Hook para manejar operaciones asíncronas con loading, error y success states
 */
export function useAsyncOperation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const execute = useCallback(async (
    asyncFn,
    {
      onSuccess,
      onError,
      successMessage,
      errorMessage,
      showToast = true,
      context = {}
    } = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      
      if (showToast && successMessage) {
        toast.success(successMessage);
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      const appError = handleError(err, context);
      setError(appError);
      
      if (showToast) {
        toast.error(errorMessage || appError.message);
      }
      
      if (onError) {
        onError(appError);
      }
      
      throw appError;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    reset
  };
}