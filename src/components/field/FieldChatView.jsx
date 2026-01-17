import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import UniversalChat from '../chat/UniversalChat';

export default function FieldChatView({ jobId }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['field-employees', jobId],
    queryFn: async () => {
      const members = await base44.entities.ProjectMember.filter({ project_id: jobId });
      const emails = members.map(m => m.user_email);
      const users = await base44.entities.User.list();
      return users.filter(u => emails.includes(u.email));
    },
    enabled: !!jobId,
  });

  return (
    <div className="h-full" data-field-scope="true">
      <UniversalChat
        groupId={`field_${jobId}`}
        channelName="Field Chat"
        employees={employees}
        currentUser={user}
        filterQuery={{ project_id: jobId }}
        language="en"
        showSearch={true}
        showExport={true}
        isDark={true}
        className="h-full"
      />
    </div>
  );
}