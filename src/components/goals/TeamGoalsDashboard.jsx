import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Filter, Target, Users, Calendar, Briefcase, User } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const statusColors = {
  not_started: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  on_track: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  at_risk: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  behind: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function TeamGoalsDashboard({ goals, teams, selectedTeam, onTeamChange, isLoading }) {
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get unique owners and projects
  const uniqueOwners = [...new Set(goals.map(g => g.owner_email))].filter(Boolean);
  const uniqueProjects = [...new Set(goals.map(g => g.linked_job_id))].filter(Boolean);

  // Filter goals
  const filteredGoals = goals.filter(goal => {
    const ownerMatch = ownerFilter === 'all' || goal.owner_email === ownerFilter;
    const projectMatch = projectFilter === 'all' || goal.linked_job_id === projectFilter;
    const statusMatch = statusFilter === 'all' || goal.status === statusFilter;
    return ownerMatch && projectMatch && statusMatch;
  });

  // Group by team
  const goalsGroupedByTeam = filteredGoals.reduce((acc, goal) => {
    const teamKey = goal.team_id || 'no_team';
    if (!acc[teamKey]) {
      acc[teamKey] = {
        teamName: goal.team_name || 'No Team',
        goals: []
      };
    }
    acc[teamKey].goals.push(goal);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <CardContent className="p-12 text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading team goals...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
              <Select value={selectedTeam} onValueChange={onTeamChange}>
                <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="all">All Members</SelectItem>
                  {uniqueOwners.map(email => {
                    const goal = goals.find(g => g.owner_email === email);
                    return (
                      <SelectItem key={email} value={email}>{goal?.owner_name}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="all">All Projects</SelectItem>
                  {uniqueProjects.map(jobId => {
                    const goal = goals.find(g => g.linked_job_id === jobId);
                    return (
                      <SelectItem key={jobId} value={jobId}>{goal?.linked_job_name}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="behind">Behind</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Goals Grid */}
      {Object.entries(goalsGroupedByTeam).map(([teamKey, teamData]) => (
        <Card key={teamKey} className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="w-5 h-5 text-blue-600" />
              {teamData.teamName}
              <Badge variant="outline" className="ml-2">
                {teamData.goals.length} goals
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <AnimatePresence>
              <div className="grid md:grid-cols-2 gap-4">
                {teamData.goals.map((goal, index) => {
                  const progressPercentage = goal.target_value > 0 
                    ? Math.min(((goal.current_value || 0) / goal.target_value) * 100, 100) 
                    : 0;

                  const daysRemaining = goal.target_date 
                    ? differenceInDays(new Date(goal.target_date), new Date())
                    : null;

                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700">
                        <CardContent className="p-4 space-y-3">
                          {/* Header */}
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-bold text-slate-900 dark:text-white">{goal.title}</h4>
                              <Badge className={statusColors[goal.status]}>
                                {goal.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            {goal.description && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                {goal.description}
                              </p>
                            )}
                          </div>

                          {/* Progress */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Progress</span>
                              <span className="text-xs font-bold text-blue-600">{progressPercentage.toFixed(1)}%</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-slate-500">{goal.current_value} / {goal.target_value} {goal.unit}</span>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                            <Badge variant="outline" className="text-xs text-slate-600 dark:text-slate-400">
                              <User className="w-3 h-3 mr-1" />
                              {goal.owner_name}
                            </Badge>
                            {goal.linked_job_name && (
                              <Badge variant="outline" className="text-xs text-blue-600">
                                <Briefcase className="w-3 h-3 mr-1" />
                                {goal.linked_job_name}
                              </Badge>
                            )}
                            {daysRemaining !== null && (
                              <Badge variant="outline" className={`text-xs ${daysRemaining < 7 ? 'text-red-600 border-red-300' : 'text-slate-600'}`}>
                                <Calendar className="w-3 h-3 mr-1" />
                                {daysRemaining > 0 ? `${daysRemaining}d left` : 'Overdue'}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </CardContent>
        </Card>
      ))}

      {filteredGoals.length === 0 && (
        <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No team goals found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}