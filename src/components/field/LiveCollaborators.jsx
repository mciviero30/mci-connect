import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function LiveCollaborators({ planId, jobId }) {
  const [viewers, setViewers] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: projectMembers = [] } = useQuery({
    queryKey: ['project-members', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId }),
    enabled: !!jobId,
  });

  // Simulate live presence (in real app, would use websockets)
  useEffect(() => {
    if (!user || !planId) return;

    // Update current user's presence
    const updatePresence = async () => {
      try {
        // In a real implementation, this would update a presence system
        // For now, we'll simulate with random viewers from project members
        const activeMembers = projectMembers
          .filter(m => m.user_email !== user.email)
          .slice(0, Math.floor(Math.random() * 3));
        
        setViewers(activeMembers.map(m => ({
          email: m.user_email,
          name: m.user_name || m.user_email?.split('@')[0],
          avatar: null,
          viewing: planId,
        })));
      } catch (err) {
        console.error('Presence update failed:', err);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // Update every 30s

    return () => clearInterval(interval);
  }, [user, planId, projectMembers]);

  if (viewers.length === 0) return null;

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
    'bg-pink-500', 'bg-orange-500', 'bg-teal-500'
  ];

  return (
    <TooltipProvider>
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-full px-3 py-1.5 shadow-lg border border-slate-200 dark:border-slate-700">
          <Eye className="w-4 h-4 text-green-500 animate-pulse" />
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            {viewers.length} viewing
          </span>
        </div>
        
        <div className="flex -space-x-2">
          {viewers.slice(0, 4).map((viewer, idx) => (
            <Tooltip key={viewer.email}>
              <TooltipTrigger>
                <div 
                  className={`w-8 h-8 rounded-full ${colors[idx % colors.length]} flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-slate-800 shadow-md`}
                >
                  {getInitials(viewer.name)}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{viewer.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {viewers.length > 4 && (
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-slate-800">
              +{viewers.length - 4}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}