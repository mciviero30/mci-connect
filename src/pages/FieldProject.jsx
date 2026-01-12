import React, { useEffect } from 'react';
import { ThemeProvider } from '@/components/themes/ThemeProvider';
import { FieldOfflineProvider } from '@/components/field/FieldOfflineManager.jsx';
import { FieldContextProvider } from '@/components/field/FieldContextProvider.jsx';
import FieldErrorBoundary from '@/components/field/FieldErrorBoundary';
import { useFieldProjectState } from '@/components/field/FieldProjectState.jsx';
import FieldProjectView from '@/components/field/FieldProjectView.jsx';
import { useUI } from '@/components/contexts/FieldModeContext';
import FieldLifecycleValidator from '@/components/field/FieldLifecycleValidator';
import FieldDataLossValidator from '@/components/field/FieldDataLossValidator';
import FieldPerformanceMonitor from '@/components/field/performance/FieldPerformanceMonitor';
import FieldStressTest from '@/components/field/performance/FieldStressTest';
import OfflineSyncValidator from '@/components/field/offline/OfflineSyncValidator';
import { useFieldDebugMode } from '@/components/field/hooks/useFieldDebugMode';
import { DebugUI } from '@/components/policies/UIVisibilityWrapper';

export default function FieldProject() {
  // HOOKS BEFORE ANY LOGIC
  const { setIsFieldMode } = useUI();
  
  // Extract jobId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');
  
  // All hooks live in this custom hook
  const state = useFieldProjectState(jobId);
  
  // Debug mode detection
  const isDebugMode = useFieldDebugMode(state.currentUser);

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
              {/* Debug-only monitoring & validation - UI Policy Enforced */}
              <DebugUI>
                <FieldPerformanceMonitor componentName="FieldProject" />
                <FieldLifecycleValidator jobId={jobId} />
                <FieldDataLossValidator jobId={jobId} />
                <OfflineSyncValidator />
                <FieldStressTest jobId={jobId} />
              </DebugUI>
            </FieldContextProvider>
          </FieldOfflineProvider>
        </ThemeProvider>
      </div>
    </FieldErrorBoundary>
  );
}