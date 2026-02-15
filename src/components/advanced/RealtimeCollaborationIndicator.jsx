import React, { useEffect, useState } from 'react';
import { useSubscription } from '@/components/hooks/useMemoryLeakPrevention';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Users, Eye } from 'lucide-react';

/**
 * Real-time Collaboration Indicator
 * Shows who's viewing the same entity
 */

export const RealtimeCollaborationIndicator = ({ entityType, entityId }) => {
  const [viewers, setViewers] = useState([]);

  useSubscription(() => {
    // Subscribe to entity updates
    const unsubscribe = base44.entities[entityType]?.subscribe((event) => {
      if (event.id === entityId && event.type === 'update') {
        // Track who's viewing (implement presence system)
        console.log('Entity updated by:', event.data?.updated_by);
      }
    });

    return unsubscribe;
  }, [entityType, entityId]);

  if (viewers.length === 0) return null;

  return (
    <Badge className="bg-blue-100 text-blue-800 border-blue-300 flex items-center gap-1">
      <Eye className="w-3 h-3" />
      {viewers.length} viewing
    </Badge>
  );
};

/**
 * Real-time Activity Feed
 */
export const RealtimeActivityFeed = ({ entityType, limit = 5 }) => {
  const [activities, setActivities] = useState([]);

  useSubscription(() => {
    const unsubscribe = base44.entities[entityType]?.subscribe((event) => {
      setActivities(prev => [
        {
          type: event.type,
          entity: event.data,
          timestamp: new Date(),
          user: event.data?.updated_by || event.data?.created_by
        },
        ...prev
      ].slice(0, limit));
    });

    return unsubscribe;
  }, [entityType, limit]);

  if (activities.length === 0) return null;

  return (
    <div className="space-y-2">
      {activities.map((activity, idx) => (
        <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className={`w-2 h-2 rounded-full ${
            activity.type === 'create' ? 'bg-green-500' :
            activity.type === 'update' ? 'bg-blue-500' :
            'bg-red-500'
          }`} />
          <span className="font-semibold">{activity.user}</span>
          <span>{activity.type}d</span>
          <span className="text-slate-500">
            {Math.round((new Date() - activity.timestamp) / 1000)}s ago
          </span>
        </div>
      ))}
    </div>
  );
};