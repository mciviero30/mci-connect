import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, TrendingUp } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function GoalProgressUpdater({ goal, open, onClose }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const [formData, setFormData] = useState({
    new_value: goal?.current_value || 0,
    notes: '',
    achievements: '',
    challenges: ''
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (data) => {
      const newStatus = data.new_value >= goal.target_value ? 'completed' : 
                        data.new_value >= goal.target_value * 0.7 ? 'on_track' : 
                        data.new_value >= goal.target_value * 0.4 ? 'at_risk' : 'behind';
      
      // Create progress log
      await base44.entities.GoalProgress.create({
        goal_id: goal.id,
        updated_by_email: user.email,
        updated_by_name: user.full_name,
        previous_value: goal.current_value,
        new_value: data.new_value,
        status: newStatus,
        notes: data.notes,
        achievements: data.achievements,
        challenges: data.challenges
      });

      // Update goal
      await base44.entities.Goal.update(goal.id, {
        current_value: data.new_value,
        status: newStatus,
        completed_date: data.new_value >= goal.target_value ? new Date().toISOString().split('T')[0] : null
      });

      // Create notifications for status changes
      if (newStatus !== goal.status) {
        const statusMessages = {
          completed: `🎉 Goal completed: "${goal.title}"`,
          at_risk: `⚠️ Goal at risk: "${goal.title}"`,
          behind: `🚨 Goal behind schedule: "${goal.title}"`,
          on_track: `✅ Goal back on track: "${goal.title}"`
        };

        if (goal.owner_email !== user.email) {
          await base44.entities.Notification.create({
            user_email: goal.owner_email,
            type: 'goal_status_change',
            title: 'Goal Status Updated',
            message: statusMessages[newStatus] || `Goal status changed to ${newStatus}`,
            link: null,
            is_read: false
          });
        }

        // Notify collaborators
        if (goal.collaborators && goal.collaborators.length > 0) {
          for (const collab of goal.collaborators) {
            if (collab !== user.email) {
              await base44.entities.Notification.create({
                user_email: collab,
                type: 'goal_status_change',
                title: 'Team Goal Updated',
                message: `${user.full_name} updated: ${statusMessages[newStatus]}`,
                link: null,
                is_read: false
              });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goals']);
      queryClient.invalidateQueries(['goalProgress']);
      toast.success('Progress updated successfully');
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProgressMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">Update Progress: {goal?.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-900 dark:text-white">
              New Value * (Target: {goal?.target_value} {goal?.unit})
            </Label>
            <Input
              type="number"
              step="0.01"
              value={formData.new_value}
              onChange={(e) => setFormData({ ...formData, new_value: parseFloat(e.target.value) })}
              required
              className="bg-white dark:bg-[#282828]"
            />
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">What did you achieve?</Label>
            <Textarea
              value={formData.achievements}
              onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
              placeholder="Describe your achievements..."
              className="bg-white dark:bg-[#282828]"
            />
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">Challenges faced</Label>
            <Textarea
              value={formData.challenges}
              onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
              placeholder="Any challenges or blockers..."
              className="bg-white dark:bg-[#282828]"
            />
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">Additional notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="General notes..."
              className="bg-white dark:bg-[#282828]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateProgressMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateProgressMutation.isPending ? 'Updating...' : 'Update Progress'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}