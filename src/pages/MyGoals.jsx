import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/shared/PageHeader';
import { Target, TrendingUp, Calendar } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import GoalCard from '../components/goals/GoalCard';
import GoalProgressChart from '../components/goals/GoalProgressChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { differenceInDays } from 'date-fns';

export default function MyGoals() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
  });

  const { data: myGoals = [], isLoading } = useQuery({
    queryKey: ['myGoals', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Goal.filter({ owner_email: user.email }, '-created_date');
    },
    enabled: !!user?.email,
    staleTime: 60000,
  });

  const { data: teamGoals = [] } = useQuery({
    queryKey: ['teamGoals', user?.team_id],
    queryFn: async () => {
      if (!user?.team_id) return [];
      return await base44.entities.Goal.filter({ team_id: user.team_id }, '-created_date');
    },
    enabled: !!user?.team_id,
    staleTime: 60000,
  });

  const activeGoals = myGoals.filter(g => 
    g.status !== 'completed' && g.status !== 'cancelled'
  );

  const completedGoals = myGoals.filter(g => g.status === 'completed');

  const overallProgress = myGoals.length > 0
    ? myGoals.reduce((sum, g) => sum + ((g.current_value / g.target_value) * 100 || 0), 0) / myGoals.length
    : 0;

  const goalsAtRisk = myGoals.filter(g => {
    if (g.status === 'completed') return false;
    const daysRemaining = differenceInDays(new Date(g.target_date), new Date());
    const progress = (g.current_value / g.target_value) * 100;
    return daysRemaining < 7 && progress < 80;
  });

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="My Goals & Objectives"
          description="Track your personal and team goals"
          icon={Target}
          stats={[
            { label: 'Active Goals', value: activeGoals.length, icon: Target },
            { label: 'Completed', value: completedGoals.length, icon: TrendingUp },
            { label: 'At Risk', value: goalsAtRisk.length, icon: Calendar }
          ]}
        />

        {/* Overall Progress */}
        <Card className="mb-6 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Overall Progress</h3>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {overallProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={overallProgress} className="h-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {activeGoals.length} active goals • {completedGoals.length} completed
            </p>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="my-goals" className="space-y-6">
          <TabsList className="bg-white dark:bg-[#282828] border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="my-goals">My Goals</TabsTrigger>
            <TabsTrigger value="team-goals">Team Goals</TabsTrigger>
            <TabsTrigger value="progress">Progress Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="my-goals" className="space-y-6">
            {isLoading ? (
              <Card className="bg-white dark:bg-[#282828]">
                <CardContent className="p-12 text-center">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">Loading goals...</p>
                </CardContent>
              </Card>
            ) : myGoals.length === 0 ? (
              <Card className="bg-white dark:bg-[#282828]">
                <CardContent className="p-12 text-center">
                  <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No goals assigned yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {myGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} showActions={true} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="team-goals" className="space-y-6">
            {teamGoals.length === 0 ? (
              <Card className="bg-white dark:bg-[#282828]">
                <CardContent className="p-12 text-center">
                  <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No team goals</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {teamGoals.map(goal => (
                  <GoalCard key={goal.id} goal={goal} showActions={false} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress">
            <GoalProgressChart goals={myGoals} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}