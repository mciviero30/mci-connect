import { useEffect, useState } from 'react';
import { fieldStorage } from '../services/FieldStorageService';

export function useUnsavedChanges(jobId) {
  const [hasUnsaved, setHasUnsaved] = useState(false);

  useEffect(() => {
    const checkUnsaved = async () => {
      try {
        const count = await fieldStorage.getUnsyncedCount(jobId);
        setHasUnsaved(count > 0);
      } catch {
        setHasUnsaved(false);
      }
    };

    checkUnsaved();
    const interval = setInterval(checkUnsaved, 2000);
    return () => clearInterval(interval);
  }, [jobId]);

  // Warn before unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsaved]);

  return hasUnsaved;
}