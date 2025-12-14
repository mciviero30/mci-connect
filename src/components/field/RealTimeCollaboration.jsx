import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Eye, MousePointer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function RealTimeCollaboration({ planId, jobId }) {
  const [viewingUsers, setViewingUsers] = useState([]);
  const [cursors, setCursors] = useState({});

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['field-members', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId }),
  });

  // Simulate real-time presence (in production, use WebSockets or Supabase Realtime)
  useEffect(() => {
    if (!currentUser || !planId) return;

    // Broadcast presence
    const broadcastPresence = () => {
      localStorage.setItem(`plan-viewer-${planId}`, JSON.stringify({
        user_email: currentUser.email,
        user_name: currentUser.full_name,
        timestamp: Date.now(),
      }));
    };

    // Check for other viewers
    const checkViewers = () => {
      const viewers = [];
      const now = Date.now();
      
      // Check localStorage for recent viewers (within last 10 seconds)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('plan-viewer-') && key !== `plan-viewer-${planId}`) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && now - data.timestamp < 10000) {
              viewers.push(data);
            }
          } catch (e) {
            // Invalid data, skip
          }
        }
      }

      setViewingUsers(viewers.filter(v => v.user_email !== currentUser.email));
    };

    broadcastPresence();
    const presenceInterval = setInterval(broadcastPresence, 3000);
    const checkInterval = setInterval(checkViewers, 2000);

    return () => {
      clearInterval(presenceInterval);
      clearInterval(checkInterval);
      localStorage.removeItem(`plan-viewer-${planId}`);
    };
  }, [currentUser, planId]);

  if (viewingUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="absolute top-4 right-4 z-50">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#FFB800]" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {viewingUsers.length} viewing
            </span>
          </div>
          <div className="flex items-center gap-2">
            {viewingUsers.slice(0, 5).map((viewer, idx) => (
              <Tooltip key={viewer.user_email}>
                <TooltipTrigger asChild>
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs cursor-pointer ring-2 ring-white dark:ring-slate-800"
                    style={{ 
                      backgroundColor: `hsl(${idx * 60}, 70%, 50%)`,
                      marginLeft: idx > 0 ? '-8px' : '0'
                    }}
                  >
                    {viewer.user_name?.[0]?.toUpperCase() || '?'}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{viewer.user_name}</p>
                  <p className="text-xs text-slate-400">{viewer.user_email}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {viewingUsers.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-white text-xs font-semibold -ml-2">
                +{viewingUsers.length - 5}
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}