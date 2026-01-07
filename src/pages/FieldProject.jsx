import React, { useEffect } from 'react';
import { ThemeProvider } from '@/components/themes/ThemeProvider';
import { FieldOfflineProvider } from '@/components/field/FieldOfflineManager.jsx';
import { FieldContextProvider } from '@/components/field/FieldContextProvider.jsx';
import FieldErrorBoundary from '@/components/field/FieldErrorBoundary';
import { useFieldProjectState } from '@/components/field/FieldProjectState.jsx';
import FieldProjectView from '@/components/field/FieldProjectView.jsx';
import { useFieldMode } from '@/components/contexts/FieldModeContext';

export default function FieldProject() {
  const { setIsFieldMode } = useFieldMode();
  
  // Extract jobId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');
  
  // All hooks live in this custom hook
  const state = useFieldProjectState(jobId);

  // CRITICAL: Set Field Mode on mount, clear on unmount
  useEffect(() => {
    setIsFieldMode(true);
    
    return () => {
      setIsFieldMode(false);
    };
  }, [setIsFieldMode]);

  return (
    <FieldErrorBoundary>
      <ThemeProvider appType="field">
        <FieldOfflineProvider jobId={state.stableJobId.current}>
          <FieldContextProvider jobId={state.stableJobId.current}>
            <FieldProjectView 
              {...state}
              jobId={jobId}
            />
          </FieldContextProvider>
        </FieldOfflineProvider>
      </ThemeProvider>
    </FieldErrorBoundary>
  );
}