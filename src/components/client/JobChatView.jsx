import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import UniversalChat from '../chat/UniversalChat';
import { Loader2, MessageSquare } from 'lucide-react';

export default function JobChatView({ jobId, currentUser }) {
  const { data: membership } = useQuery({
    queryKey: ['project-membership', jobId, currentUser?.email],
    queryFn: async () => {
      const members = await base44.entities.ProjectMember.filter({ 
        project_id: jobId,
        user_email: currentUser.email
      });
      return members[0];
    },
    enabled: !!jobId && !!currentUser?.email,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['client-job-employees', jobId],
    queryFn: async () => {
      const members = await base44.entities.ProjectMember.filter({ project_id: jobId });
      const emails = members.map(m => m.user_email);
      const users = await base44.entities.User.list('-created_date', 200);
      return users.filter(u => emails.includes(u.email));
    },
    enabled: !!jobId,
  });

  if (!membership) {
    return (
      <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-500">You don't have access to this project's chat</p>
      </div>
    );
  }

  return (
    <div className="h-full max-h-[600px] bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
      <UniversalChat
        groupId={`client_${jobId}`}
        channelName="Project Chat"
        employees={employees}
        currentUser={currentUser}
        filterQuery={{ project_id: jobId }}
        language="en"
        showSearch={true}
        showExport={false}
        isDark={false}
        className="h-full"
      />
    </div>
  );
}