import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';

export default function ChatUnreadBadge({ userEmail, userId, groupId }) {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['chat-unread', userId, userEmail, groupId],
    queryFn: async () => {
      if ((!userEmail && !userId) || !groupId) return 0;
      
      // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
      // Get messages from this group that the user hasn't read
      const messages = await base44.entities.ChatMessage.filter({ 
        group_id: groupId 
      }, '-created_date', 100);
      
      // Count unread messages (not from current user, created after last read)
      const unread = messages.filter(msg => {
        // Check if message is from current user (by user_id or email)
        const isOwnMessage = msg.sender_user_id 
          ? msg.sender_user_id === userId 
          : msg.sender_email === userEmail;
        if (isOwnMessage) return false;
        
        // Check if user has read it (by user_id or email)
        const readBy = msg.read_by || [];
        return !readBy.includes(userId) && !readBy.includes(userEmail);
      }).length;
      
      return unread;
    },
    enabled: !!(userEmail || userId) && !!groupId,
    refetchInterval: 3000,
    staleTime: 2000,
  });

  if (unreadCount === 0) return null;

  return (
    <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center">
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}