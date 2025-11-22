import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Calendar, 
  TrendingUp, 
  Edit, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Plus
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';

const statusConfig = {
  not_started: { label: 'Not Started', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  on_track: { label: 'On Track', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  at_risk: { label: 'At Risk', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  behind: { label: 'Behind', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
};

export default function GoalCard({ goal, onEdit, showActions = true }) {
  const queryClient = useQueryClient();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateData, setUpdateData] = useState({
    progress_value: goal.current_value || 0,
    status_update: '',
    achievements: '',
    blockers: '',
    next_steps: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
  });

  const progressPercentage = goal.target_value > 0 
    ? (goal.current_value / goal.target_value) * 100 
    : 0;

  const daysRemaining = differenceInDays(new Date(goal.target_date), new Date());
  const isOverdue = daysRemaining < 0;

  const updateProgressMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.GoalProgress.create({
        goal_id: goal.id,
        recorded_by_email: user.email,
        recorded_by_name: user.full_name,
        progress_value: parseFloat(data.progress_value),
        progress_percentage: (parseFloat(data.progress_value) / goal.target_value) * 100,
        status_update: data.status_update,
        achievements: data.achievements,
        blockers: data.blockers,
        next_steps: data.next_steps
      });

      await base44.entities.Goal.update(goal.id, {
        current_value: parseFloat(data.progress_value)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['myGoals']);
      setShowUpdateDialog(false);
      setUpdateData({
        progress_value: 0,
        status_update: '',
        achievements: '',
        blockers: '',
        next_steps: ''
      });
    }
  });

  const handleUpdateProgress = () => {
    updateProgressMutation.mutate(updateData);
  };

  return (
    <>
      <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {goal.goal_type}
                </Badge>
                <Badge className={statusConfig[goal.status]?.color}>
                  {statusConfig[goal.status]?.label}
                </Badge>
              </div>
              <CardTitle className="text-slate-900 dark:text-white text-lg">
                {goal.title}
              </CardTitle>
            </div>
            {showActions && onEdit && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onEdit}
                className="border-slate-300 dark:border-slate-600"
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progress</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {progressPercentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex items-center justify-between mt-2 text-xs text-slate-600 dark:text-slate-400">
              <span>{goal.current_value} {goal.unit}</span>
              <span>Target: {goal.target_value} {goal.unit}</span>
            </div>
          </div>

          {/* Description */}
          {goal.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {goal.description}
            </p>
          )}

          {/* Key Results for OKRs */}
          {goal.goal_type === 'OKR' && goal.key_results && goal.key_results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Key Results:</p>
              {goal.key_results.map((kr, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  {kr.completed ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="flex-1 text-slate-600 dark:text-slate-400">{kr.title}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {kr.current}/{kr.target}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Timeline */}
          <div className="flex items-center gap-4 text-sm pt-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
            </div>
            {daysRemaining >= 0 ? (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4" />
                <span>{daysRemaining} days left</span>
              </div>
            ) : (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Overdue by {Math.abs(daysRemaining)} days
              </Badge>
            )}
          </div>

          {/* Actions */}
          {showActions && goal.owner_email === user?.email && goal.status !== 'completed' && (
            <Button 
              onClick={() => setShowUpdateDialog(true)} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Update Progress
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Update Progress Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#282828]">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Update Progress: {goal.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-900 dark:text-white">Current Value</Label>
              <Input
                type="number"
                value={updateData.progress_value}
                onChange={(e) => setUpdateData({ ...updateData, progress_value: e.target.value })}
                placeholder={`Enter value (target: ${goal.target_value} ${goal.unit})`}
                className="bg-white dark:bg-[#282828]"
              />
            </div>

            <div>
              <Label className="text-slate-900 dark:text-white">Status Update</Label>
              <Textarea
                value={updateData.status_update}
                onChange={(e) => setUpdateData({ ...updateData, status_update: e.target.value })}
                placeholder="Brief status update..."
                className="bg-white dark:bg-[#282828]"
              />
            </div>

            <div>
              <Label className="text-slate-900 dark:text-white">Achievements</Label>
              <Textarea
                value={updateData.achievements}
                onChange={(e) => setUpdateData({ ...updateData, achievements: e.target.value })}
                placeholder="What was accomplished?"
                className="bg-white dark:bg-[#282828]"
              />
            </div>

            <div>
              <Label className="text-slate-900 dark:text-white">Blockers</Label>
              <Textarea
                value={updateData.blockers}
                onChange={(e) => setUpdateData({ ...updateData, blockers: e.target.value })}
                placeholder="Any blockers or challenges?"
                className="bg-white dark:bg-[#282828]"
              />
            </div>

            <div>
              <Label className="text-slate-900 dark:text-white">Next Steps</Label>
              <Textarea
                value={updateData.next_steps}
                onChange={(e) => setUpdateData({ ...updateData, next_steps: e.target.value })}
                placeholder="What are the next steps?"
                className="bg-white dark:bg-[#282828]"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateProgress}
                disabled={updateProgressMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {updateProgressMutation.isPending ? 'Saving...' : 'Save Progress'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}