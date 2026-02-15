import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

/**
 * Unified loading button with consistent styling
 */
export const LoadingButton = ({ 
  isLoading, 
  children, 
  loadingText = 'Loading...', 
  ...props 
}) => {
  return (
    <Button disabled={isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
};