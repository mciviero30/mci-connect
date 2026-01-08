import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { usePersistentState } from '@/components/field/hooks/usePersistentState';
import { FIELD_STABLE_QUERY_CONFIG, updateFieldQueryData } from '@/components/field/config/fieldQueryConfig';
import { FIELD_QUERY_KEYS } from '@/components/field/fieldQueryKeys';
import { useFieldLifecycle } from '@/components/field/hooks/useFieldLifecycle';
import { useUnsavedChanges } from '@/components/field/hooks/useUnsavedChanges';
import { fieldPersistence } from '@/components/field/services/FieldStatePersistence';
import { saveOfflineData } from '@/components/field/FieldOfflineManager.jsx';
import { createPageUrl } from '@/utils';

export function useFieldProjectState(jobId) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Persistent state with auto-save
  const [activePanel, setActivePanel] = usePersistentState(
    `field_panel_${jobId}`,
    'overview',
    { expiryHours: 48 }
  );
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  // Stable job ID reference
  const stableJobId = useRef(jobId);
  useEffect(() => {
    stableJobId.current = jobId;
  }, [jobId]);

  // Comprehensive mobile lifecycle protection
  useFieldLifecycle({ jobId, queryClient });
  
  // Unsaved changes protection
  useUnsavedChanges(jobId);

  // Security check: verify user has access to this job
  const { data: currentUser } = useQuery({
    queryKey: FIELD_QUERY_KEYS.USER(jobId),
    queryFn: () => base44.auth.me(),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: userAssignments = [] } = useQuery({
    queryKey: FIELD_QUERY_KEYS.ASSIGNMENTS(jobId),
    queryFn: () => base44.entities.JobAssignment.filter({ 
      employee_email: currentUser.email,
      job_id: jobId 
    }),
    enabled: !!currentUser?.email && !!jobId && (currentUser?.role === 'customer' || currentUser?.role === 'field_worker'),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const hasAccess = !currentUser || currentUser.role === 'admin' || 
                     currentUser.position === 'CEO' || 
                     currentUser.position === 'manager' ||
                     (currentUser.role !== 'customer' && currentUser.role !== 'field_worker') ||
                     userAssignments.length > 0;

  // Clean up expired data on mount
  useEffect(() => {
    if (jobId) {
      fieldPersistence.cleanExpired().catch(console.error);
    }
  }, [jobId]);

  // Restore scroll position on mount and panel change
  useEffect(() => {
    if (!jobId) return;
    
    const key = `field_scroll_${jobId}_${activePanel}`;
    
    const timer = setTimeout(() => {
      const savedScroll = sessionStorage.getItem(key);
      if (savedScroll) {
        requestAnimationFrame(() => {
          const mainContent = document.querySelector('[data-field-main]');
          if (mainContent) {
            mainContent.scrollTop = parseInt(savedScroll, 10);
          }
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [jobId, activePanel]);

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    if (!jobId) return;
    
    // Find element without querySelector - use ref instead
    const timer = setTimeout(() => {
      const mainContent = document.querySelector('[data-field-main]');
      if (!mainContent) return;

      let scrollTimeout;
      const handleScroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          try {
            const key = `field_scroll_${jobId}_${activePanel}`;
            sessionStorage.setItem(key, mainContent.scrollTop.toString());
          } catch (error) {
            console.error('Failed to save scroll:', error);
          }
        }, 100);
      };

      mainContent.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        clearTimeout(scrollTimeout);
        mainContent.removeEventListener('scroll', handleScroll);
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [jobId, activePanel]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Swipe gestures for panel navigation (mobile only)
  useEffect(() => {
    if (!isMobile) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const panelOrder = ['overview', 'tasks', 'photos', 'activity', 'plans'];

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      touchEndX = e.touches[0].clientX;
      touchEndY = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        const currentIndex = panelOrder.indexOf(activePanel);
        
        if (deltaX > 0 && currentIndex > 0) {
          setActivePanel(panelOrder[currentIndex - 1]);
        } else if (deltaX < 0 && currentIndex < panelOrder.length - 1) {
          setActivePanel(panelOrder[currentIndex + 1]);
        }
      }
    };

    // Delay querySelector to ensure DOM is ready
    const timer = setTimeout(() => {
      const mainContent = document.querySelector('[data-field-main]');
      if (mainContent) {
        mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainContent.addEventListener('touchmove', handleTouchMove, { passive: true });
        mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      const mainContent = document.querySelector('[data-field-main]');
      if (mainContent) {
        mainContent.removeEventListener('touchstart', handleTouchStart);
        mainContent.removeEventListener('touchmove', handleTouchMove);
        mainContent.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [isMobile, activePanel, setActivePanel]);

  // Global keyboard shortcut for quick search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Data fetching
  const { data: job, isLoading } = useQuery({
    queryKey: FIELD_QUERY_KEYS.JOB(jobId),
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0] || null;
    },
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: FIELD_QUERY_KEYS.TASKS(jobId),
    queryFn: async () => {
      const data = await base44.entities.Task.filter({ job_id: jobId }, '-created_date');
      saveOfflineData('tasks', data);
      return data;
    },
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: plans = [] } = useQuery({
    queryKey: FIELD_QUERY_KEYS.PLANS(jobId),
    queryFn: async () => {
      const data = await base44.entities.Plan.filter({ job_id: jobId }, 'order');
      saveOfflineData('plans', data);
      return data;
    },
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: members = [] } = useQuery({
    queryKey: FIELD_QUERY_KEYS.MEMBERS(jobId),
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId }),
    enabled: !!jobId,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  // Event handlers
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  const handleFABClick = useCallback(() => {
    if (activePanel === 'tasks') {
      setShowCreateTask(true);
    } else if (activePanel === 'photos') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.capture = 'environment';
      fileInput.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.Photo.create({
              job_id: jobId,
              photo_url: file_url,
              uploaded_by: currentUser?.email,
              uploaded_by_name: currentUser?.full_name,
            });
            updateFieldQueryData(queryClient, jobId, 'PHOTOS', (old) => old);
          } catch (error) {
            console.error('Photo upload failed:', error);
          }
        }
      };
      fileInput.click();
    } else if (activePanel === 'activity') {
      navigate(`${createPageUrl('CrearIncidente')}?job_id=${jobId}`);
    }
  }, [activePanel, jobId, currentUser, queryClient, navigate]);

  const handleActionComplete = useCallback(() => {
    updateFieldQueryData(queryClient, jobId, 'TASKS', (old) => old);
    updateFieldQueryData(queryClient, jobId, 'PHOTOS', (old) => old);
    updateFieldQueryData(queryClient, jobId, 'CHAT', (old) => old);
    queryClient.invalidateQueries({ queryKey: ['field-voice-notes', jobId], exact: true });
  }, [queryClient, jobId]);

  return {
    // State
    activePanel,
    setActivePanel,
    isMobile,
    showQuickSearch,
    setShowQuickSearch,
    showDailyReport,
    setShowDailyReport,
    showCreateTask,
    setShowCreateTask,
    stableJobId,
    
    // Data
    job,
    tasks,
    plans,
    members,
    currentUser,
    hasAccess,
    isLoading,
    
    // Handlers
    handleBack,
    handleFABClick,
    handleActionComplete,
    
    // Utils
    queryClient,
  };
}