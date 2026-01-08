import React, { useEffect } from 'react';
import { ThemeProvider } from '@/components/themes/ThemeProvider';
import { FieldOfflineProvider } from '@/components/field/FieldOfflineManager.jsx';
import { FieldContextProvider } from '@/components/field/FieldContextProvider.jsx';
import FieldErrorBoundary from '@/components/field/FieldErrorBoundary';
import { useFieldProjectState } from '@/components/field/FieldProjectState.jsx';
import FieldProjectView from '@/components/field/FieldProjectView.jsx';
import { useUI } from '@/components/contexts/FieldModeContext';
import FieldLifecycleValidator from '@/components/field/FieldLifecycleValidator';

export default function FieldProject() {
  const { setIsFieldMode } = useUI();
  
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
      <div data-field-mode="true" className="dark">
        <ThemeProvider appType="field">
          <FieldOfflineProvider jobId={state.stableJobId.current}>
            <FieldContextProvider jobId={state.stableJobId.current}>
              <FieldProjectView 
                {...state}
                jobId={jobId}
              />
              {/* Dev-only lifecycle monitor */}
              <FieldLifecycleValidator jobId={jobId} />
            </FieldContextProvider>
          </FieldOfflineProvider>
        </ThemeProvider>
      </div>
    </FieldErrorBoundary>
  );
}