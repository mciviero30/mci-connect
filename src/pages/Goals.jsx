import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Filter, TrendingUp } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import GoalForm from '../components/goals/GoalForm';
import GoalCardMemoized from '../components/goals/GoalCardMemoized';
import GoalProgressChart from '../components/goals/GoalProgressChart';
import { useToast } from '@/components/ui/toast';
import { GoalCardSkeleton, StatsCardSkeleton } from '../components/shared/SkeletonLoader';

export default function Goals() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const isAdmin = user.role === 'admin';
      
      if (isAdmin) {
        return await base44.entities.Goal.list('-created_date', 100);
      } else {
        return await base44.entities.Goal.filter({
          owner_email: user.email
        }, '-created_date');
      }
    },
    enabled: !!user?.email,
    staleTime: 600000, // 10 minutes
    cacheTime: 900000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    staleTime: 900000, // 15 minutes
    cacheTime: 1800000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Goal.create({
      ...data,
      owner_email: user.email,
      owner_name: user.full_name,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      setShowForm(false);
      toast.success('Goal created successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      setEditingGoal(null);
      setShowForm(false);
      toast.success('Goal updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Goal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      toast.success('Goal deleted successfully');
    },
  });

  const handleSubmit = (data) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const { filteredGoals, stats, completionRate } = useMemo(() => {
    const filtered = goals.filter(goal => {
      if (filter === 'all') return true;
      if (filter === 'active') return ['not_started', 'on_track', 'at_risk', 'behind'].includes(goal.status);
      if (filter === 'completed') return goal.status === 'completed';
      if (filter === 'personal') return goal.category === 'personal';
      if (filter === 'team') return goal.category === 'team';
      return true;
    });

    const calculatedStats = {
      total: goals.length,
      active: goals.filter(g => ['not_started', 'on_track', 'at_risk', 'behind'].includes(g.status)).length,
      completed: goals.filter(g => g.status === 'completed').length,
      onTrack: goals.filter(g => g.status === 'on_track').length,
      atRisk: goals.filter(g => g.status === 'at_risk').length,
    };

    const rate = goals.length > 0 ? ((calculatedStats.completed / goals.length) * 100).toFixed(1) : 0;

    return { filteredGoals: filtered, stats: calculatedStats, completionRate: rate };
  }, [goals, filter]);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Objetivos y Metas' : 'Goals & Objectives'}
          description={language === 'es' ? 'Gestiona tus OKRs y KPIs' : 'Manage your OKRs and KPIs'}
          icon={Target}
          stats={[
            { label: 'Active', value: stats.active, icon: TrendingUp },
            { label: 'Completed', value: stats.completed },
            { label: 'Completion Rate', value: `${completionRate}%` }
          ]}
          actions={
            <Button onClick={() => { setEditingGoal(null); setShowForm(true); }} className="soft-blue-gradient shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Nueva Meta' : 'New Goal'}
            </Button>
          }
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

        {/* Filters */}
        <Card className="mb-6 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-48 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="all">All Goals</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Goal Form */}
        {showForm && (
          <div className="mb-6">
            <GoalForm
              goal={editingGoal}
              jobs={jobs}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingGoal(null); }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        )}

        {/* Goals Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <GoalCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredGoals.map(goal => (
              <GoalCardMemoized
                key={goal.id}
                goal={goal}
                onEdit={(g) => { setEditingGoal(g); setShowForm(true); }}
                onDelete={(id) => deleteMutation.mutate(id)}
                showActions={true}
              />
            ))}
          </div>
        )}

        {filteredGoals.length === 0 && !isLoading && (
          <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No goals found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}