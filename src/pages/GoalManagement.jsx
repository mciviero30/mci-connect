import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '../components/shared/PageHeader';
import { Target, Plus, TrendingUp, Users, Briefcase, Filter } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GoalCard from '../components/goals/GoalCard';
import GoalForm from '../components/goals/GoalForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function GoalManagement() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.list('-created_date'),
    staleTime: 60000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    staleTime: 300000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('name'),
    staleTime: 300000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Goal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      setShowForm(false);
      setEditingGoal(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Goal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      setShowForm(false);
      setEditingGoal(null);
    }
  });

  const handleSubmit = (data) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredGoals = goals.filter(g => {
    if (filterType !== 'all' && g.goal_type !== filterType) return false;
    if (filterStatus !== 'all' && g.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: goals.length,
    onTrack: goals.filter(g => g.status === 'on_track').length,
    atRisk: goals.filter(g => g.status === 'at_risk' || g.status === 'behind').length,
    completed: goals.filter(g => g.status === 'completed').length
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Goal Management"
          description="Track and manage organizational goals and objectives"
          icon={Target}
          stats={[
            { label: 'Total Goals', value: stats.total, icon: Target },
            { label: 'On Track', value: stats.onTrack, icon: TrendingUp },
            { label: 'At Risk', value: stats.atRisk, icon: Target },
            { label: 'Completed', value: stats.completed, icon: Target }
          ]}
          actions={
            <Button 
              onClick={() => { setEditingGoal(null); setShowForm(true); }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Goal
            </Button>
          }
        />

        {/* Filters */}
        <Card className="mb-6 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="OKR">OKR</SelectItem>
                  <SelectItem value="KPI">KPI</SelectItem>
                  <SelectItem value="Project">Project</SelectItem>
                  <SelectItem value="Team">Team</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="behind">Behind</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Goals Grid */}
        {isLoading ? (
          <Card className="bg-white dark:bg-[#282828]">
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Loading goals...</p>
            </CardContent>
          </Card>
        ) : filteredGoals.length === 0 ? (
          <Card className="bg-white dark:bg-[#282828]">
            <CardContent className="p-12 text-center">
              <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 mb-4">No goals found</p>
              <Button onClick={() => setShowForm(true)} className="bg-blue-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create First Goal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map(goal => (
              <GoalCard 
                key={goal.id} 
                goal={goal} 
                onEdit={() => { setEditingGoal(goal); setShowForm(true); }}
              />
            ))}
          </div>
        )}

        {/* Goal Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828]">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {editingGoal ? 'Edit Goal' : 'Create New Goal'}
              </DialogTitle>
            </DialogHeader>
            <GoalForm
              goal={editingGoal}
              employees={employees}
              teams={teams}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingGoal(null); }}
              isProcessing={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}