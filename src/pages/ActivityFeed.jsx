import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/shared/PageHeader';
import { 
  Activity, 
  Users, 
  Briefcase, 
  Award, 
  Megaphone, 
  GraduationCap, 
  Trophy, 
  Cake, 
  PartyPopper,
  TrendingUp,
  Filter
} from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';

const activityIcons = {
  employee_joined: Users,
  employee_promoted: TrendingUp,
  project_completed: Briefcase,
  milestone_achieved: Trophy,
  recognition_given: Award,
  announcement_posted: Megaphone,
  training_completed: GraduationCap,
  certification_earned: Award,
  team_created: Users,
  birthday_celebrated: Cake,
  work_anniversary: PartyPopper
};

const activityColors = {
  employee_joined: 'from-blue-500 to-blue-600',
  employee_promoted: 'from-purple-500 to-purple-600',
  project_completed: 'from-green-500 to-green-600',
  milestone_achieved: 'from-amber-500 to-amber-600',
  recognition_given: 'from-pink-500 to-pink-600',
  announcement_posted: 'from-indigo-500 to-indigo-600',
  training_completed: 'from-cyan-500 to-cyan-600',
  certification_earned: 'from-emerald-500 to-emerald-600',
  team_created: 'from-violet-500 to-violet-600',
  birthday_celebrated: 'from-rose-500 to-rose-600',
  work_anniversary: 'from-orange-500 to-orange-600'
};

export default function ActivityFeed() {
  const { language } = useLanguage();
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
  });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['activityFeed'],
    queryFn: () => base44.entities.ActivityFeed.list('-created_date', 50),
    staleTime: 60000,
  });

  const { data: recognitions = [] } = useQuery({
    queryKey: ['recentRecognitions'],
    queryFn: () => base44.entities.Recognition.list('-created_date', 10),
    staleTime: 60000,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['recentPosts'],
    queryFn: () => base44.entities.Post.list('-created_date', 10),
    staleTime: 60000,
  });

  // Combine activities from different sources
  const combinedActivities = React.useMemo(() => {
    const all = [
      ...activities.map(a => ({ ...a, source: 'activity' })),
      ...recognitions.map(r => ({
        id: `rec-${r.id}`,
        activity_type: 'recognition_given',
        title: r.title,
        description: `${r.given_by_name} recognized ${r.employee_name}`,
        actor_name: r.given_by_name,
        created_date: r.created_date,
        metadata: { points: r.points, type: r.type },
        source: 'recognition'
      })),
      ...posts.map(p => ({
        id: `post-${p.id}`,
        activity_type: 'announcement_posted',
        title: p.title,
        description: p.content,
        actor_name: p.author_name,
        created_date: p.created_date,
        metadata: { priority: p.priority },
        source: 'post'
      }))
    ];

    return all.sort((a, b) => 
      new Date(b.created_date) - new Date(a.created_date)
    );
  }, [activities, recognitions, posts]);

  const filteredActivities = combinedActivities.filter(a => {
    if (typeFilter === 'all') return true;
    return a.activity_type === typeFilter;
  });

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Activity Feed"
          description="Stay updated with company-wide events and team activities"
          icon={Activity}
          stats={[
            { label: 'Recent Activities', value: combinedActivities.length }
          ]}
        />

        {/* Filters */}
        <Card className="mb-6 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-64 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="text-slate-900 dark:text-white">All Activities</SelectItem>
                  <SelectItem value="employee_joined" className="text-slate-900 dark:text-white">New Employees</SelectItem>
                  <SelectItem value="project_completed" className="text-slate-900 dark:text-white">Project Milestones</SelectItem>
                  <SelectItem value="recognition_given" className="text-slate-900 dark:text-white">Recognitions</SelectItem>
                  <SelectItem value="announcement_posted" className="text-slate-900 dark:text-white">Announcements</SelectItem>
                  <SelectItem value="training_completed" className="text-slate-900 dark:text-white">Training</SelectItem>
                  <SelectItem value="certification_earned" className="text-slate-900 dark:text-white">Certifications</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
              <CardContent className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading activities...</p>
              </CardContent>
            </Card>
          ) : filteredActivities.length === 0 ? (
            <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
              <CardContent className="p-12 text-center">
                <Activity className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">No activities yet</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence>
              {filteredActivities.map((activity, index) => {
                const Icon = activityIcons[activity.activity_type] || Activity;
                const colorClass = activityColors[activity.activity_type] || 'from-blue-500 to-blue-600';

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClass} shadow-lg flex-shrink-0`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                  {activity.title}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                  {activity.description}
                                </p>
                              </div>
                              
                              {activity.metadata?.priority && (
                                <Badge className={
                                  activity.metadata.priority === 'urgent' 
                                    ? 'bg-red-500 text-white'
                                    : activity.metadata.priority === 'important'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-blue-500 text-white'
                                }>
                                  {activity.metadata.priority}
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-4 mt-3">
                              {activity.actor_name && (
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                      {activity.actor_name[0]}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {activity.actor_name}
                                  </span>
                                </div>
                              )}

                              <span className="text-xs text-slate-500 dark:text-slate-500">
                                {formatDistanceToNow(new Date(activity.created_date), {
                                  addSuffix: true,
                                  locale: language === 'es' ? es : undefined
                                })}
                              </span>

                              {activity.metadata?.points && (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                                  +{activity.metadata.points} pts
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}