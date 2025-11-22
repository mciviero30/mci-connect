import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit, Trash2, TrendingUp, Calendar, Target } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import GoalProgressChart from './GoalProgressChart';

const statusColors = {
  not_started: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  on_track: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  at_risk: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  behind: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
};

const priorityColors = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700'
};

export default function GoalCard({ goal, onEdit, onDelete, showActions = false }) {
  const [showChart, setShowChart] = useState(false);
  
  const progressPercentage = goal.target_value > 0 
    ? Math.min(((goal.current_value || 0) / goal.target_value) * 100, 100) 
    : 0;

  const daysRemaining = goal.target_date 
    ? differenceInDays(new Date(goal.target_date), new Date())
    : null;

  return (
    <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-slate-900 dark:text-white">{goal.title}</CardTitle>
              <Badge className={statusColors[goal.status]}>
                {goal.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">{goal.description}</p>
          </div>
          {showActions && (
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => onEdit(goal)}>
                <Edit className="w-4 h-4 text-blue-600" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(goal.id)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progress</span>
            <span className="text-sm font-bold text-blue-600">{progressPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-500">{goal.current_value} / {goal.target_value} {goal.unit}</span>
          </div>
        </div>

        {/* Key Results */}
        {goal.key_results && goal.key_results.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Key Results</p>
            <div className="space-y-2">
              {goal.key_results.map((kr, index) => {
                const krProgress = kr.target > 0 ? ((kr.current / kr.target) * 100) : 0;
                return (
                  <div key={index} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{kr.title}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{krProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={krProgress} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <Badge className={priorityColors[goal.priority]}>
            {goal.priority} priority
          </Badge>
          <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
            {goal.goal_type.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
            {goal.category}
          </Badge>
          {daysRemaining !== null && (
            <Badge variant="outline" className={daysRemaining < 7 ? 'text-red-600 border-red-300' : 'text-slate-600'}>
              <Calendar className="w-3 h-3 mr-1" />
              {daysRemaining > 0 ? `${daysRemaining}d left` : 'Overdue'}
            </Badge>
          )}
          {goal.linked_job_name && (
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              <Target className="w-3 h-3 mr-1" />
              {goal.linked_job_name}
            </Badge>
          )}
        </div>

        {/* Chart Toggle */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowChart(!showChart)}
          className="w-full"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          {showChart ? 'Hide' : 'Show'} Progress Chart
        </Button>

        {showChart && <GoalProgressChart goalId={goal.id} />}
      </CardContent>
    </Card>
  );
}