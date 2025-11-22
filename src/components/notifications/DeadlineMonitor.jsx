import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays } from 'date-fns';

export default function DeadlineMonitor({ userEmail }) {
  const { data: goals = [] } = useQuery({
    queryKey: ['userGoalsForDeadlines', userEmail],
    queryFn: () => base44.entities.Goal.filter({ owner_email: userEmail }),
    enabled: !!userEmail,
    staleTime: 3600000, // 1 hour
  });

  useEffect(() => {
    if (!goals.length) return;

    const checkDeadlines = async () => {
      const now = new Date();
      
      for (const goal of goals) {
        if (goal.status === 'completed' || !goal.target_date) continue;

        const daysUntilDeadline = differenceInDays(new Date(goal.target_date), now);

        // Check if we should notify (7 days, 3 days, 1 day)
        if ([7, 3, 1].includes(daysUntilDeadline)) {
          // Check if notification already sent today
          const today = new Date().toISOString().split('T')[0];
          const existingNotifs = await base44.entities.Notification.filter({
            user_email: userEmail,
            type: 'goal_deadline',
            created_date: today
          });

          const alreadyNotified = existingNotifs.some(n => 
            n.message.includes(goal.id)
          );

          if (!alreadyNotified) {
            await base44.entities.Notification.create({
              user_email: userEmail,
              type: 'goal_deadline',
              title: daysUntilDeadline === 1 ? '🔥 Goal Due Tomorrow' : `⏰ Goal Due in ${daysUntilDeadline} Days`,
              message: `"${goal.title}" - ${goal.current_value}/${goal.target_value} ${goal.unit} completed`,
              metadata: { goal_id: goal.id, days_remaining: daysUntilDeadline },
              link: null,
              is_read: false
            });
          }
        }
      }
    };

    checkDeadlines();
    
    // Check every hour
    const interval = setInterval(checkDeadlines, 3600000);
    return () => clearInterval(interval);
  }, [goals, userEmail]);

  return null;
}