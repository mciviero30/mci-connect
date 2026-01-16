import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Target, TrendingUp, AlertCircle } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { useLanguage } from '@/components/i18n/LanguageContext';
import TeamGoalsDashboard from '../components/goals/TeamGoalsDashboard';

export default function TeamGoals() {
  const { t, language } = useLanguage();
  const [selectedTeam, setSelectedTeam] = useState('all');

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    staleTime: 1800000,
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['teamGoals', selectedTeam],
    queryFn: async () => {
      if (selectedTeam === 'all') {
        return await base44.entities.Goal.filter({ category: 'team' }, '-created_date');
      } else {
        return await base44.entities.Goal.filter({ 
          category: 'team', 
          team_id: selectedTeam 
        }, '-created_date');
      }
    },
    staleTime: 600000, // 10 minutes
    cacheTime: 900000,
  });

  const { data: allGoals = [] } = useQuery({
    queryKey: ['allGoalsForStats'],
    queryFn: () => base44.entities.Goal.filter({ category: 'team' }),
    staleTime: 900000, // 15 minutes
    cacheTime: 1800000,
  });

  const stats = {
    total: allGoals.length,
    active: allGoals.filter(g => ['on_track', 'at_risk', 'behind', 'not_started'].includes(g.status)).length,
    onTrack: allGoals.filter(g => g.status === 'on_track').length,
    atRisk: allGoals.filter(g => g.status === 'at_risk').length,
    completed: allGoals.filter(g => g.status === 'completed').length,
  };

  const avgProgress = allGoals.length > 0
    ? allGoals.reduce((sum, g) => {
        const progress = g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0;
        return sum + progress;
      }, 0) / allGoals.length
    : 0;

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={language === 'es' ? 'Objetivos de Equipo' : 'Team Goals'}
          description={language === 'es' ? 'Seguimiento de OKRs y KPIs de equipos' : 'Track team OKRs and KPIs'}
          icon={Users}
          stats={[
            { label: 'Total Goals', value: stats.total, icon: Target },
            { label: 'Active', value: stats.active, icon: TrendingUp },
            { label: 'Avg Progress', value: `${avgProgress.toFixed(0)}%` }
          ]}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">On Track</p>
              <p className="text-2xl font-bold text-green-600">{stats.onTrack}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">At Risk</p>
              <p className="text-2xl font-bold text-amber-600">{stats.atRisk}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Completed</p>
              <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Goals Dashboard */}
        <TeamGoalsDashboard 
          goals={goals} 
          teams={teams}
          selectedTeam={selectedTeam}
          onTeamChange={setSelectedTeam}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}