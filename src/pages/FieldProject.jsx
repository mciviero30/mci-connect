import React from 'react';
import { ThemeProvider } from '@/components/themes/ThemeProvider';
import { FieldOfflineProvider } from '@/components/field/FieldOfflineManager.jsx';
import { FieldContextProvider } from '@/components/field/FieldContextProvider.jsx';
import FieldErrorBoundary from '@/components/field/FieldErrorBoundary';
import { useFieldProjectState } from '@/components/field/FieldProjectState.jsx';
import FieldProjectView from '@/components/field/FieldProjectView.jsx';

export default function FieldProject() {
  // Extract jobId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');
  
  // All hooks live in this custom hook
  const state = useFieldProjectState(jobId);

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