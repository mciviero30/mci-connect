import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

export default function GoalForm({ goal, employees, teams, onSubmit, onCancel, isProcessing }) {
  const [formData, setFormData] = useState(goal || {
    title: '',
    description: '',
    goal_type: 'KPI',
    owner_email: '',
    owner_name: '',
    team_id: null,
    team_name: null,
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
    metric_type: 'percentage',
    current_value: 0,
    target_value: 100,
    unit: '',
    status: 'not_started',
    priority: 'medium',
    visibility: 'public',
    linked_job_ids: [],
    key_results: [],
    milestones: [],
    notes: ''
  });

  const [newKeyResult, setNewKeyResult] = useState({ title: '', current: 0, target: 100 });
  const [newMilestone, setNewMilestone] = useState({ title: '', date: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedEmployee = employees.find(emp => emp.email === formData.owner_email);
    if (selectedEmployee) {
      formData.owner_name = selectedEmployee.full_name;
    }
    if (formData.team_id) {
      const selectedTeam = teams.find(t => t.id === formData.team_id);
      if (selectedTeam) formData.team_name = selectedTeam.name;
    }
    onSubmit(formData);
  };

  const addKeyResult = () => {
    if (newKeyResult.title) {
      setFormData({
        ...formData,
        key_results: [...(formData.key_results || []), { ...newKeyResult, completed: false }]
      });
      setNewKeyResult({ title: '', current: 0, target: 100 });
    }
  };

  const addMilestone = () => {
    if (newMilestone.title && newMilestone.date) {
      setFormData({
        ...formData,
        milestones: [...(formData.milestones || []), { ...newMilestone, completed: false }]
      });
      setNewMilestone({ title: '', date: '' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label className="text-slate-900 dark:text-white">Goal Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Increase customer satisfaction"
            required
            className="bg-white dark:bg-[#282828]"
          />
        </div>

        <div className="md:col-span-2">
          <Label className="text-slate-900 dark:text-white">Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Detailed goal description..."
            className="bg-white dark:bg-[#282828]"
          />
        </div>

        <div>
          <Label className="text-slate-900 dark:text-white">Goal Type *</Label>
          <Select value={formData.goal_type} onValueChange={(value) => setFormData({ ...formData, goal_type: value })}>
            <SelectTrigger className="bg-white dark:bg-[#282828]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#282828]">
              <SelectItem value="OKR">OKR (Objective & Key Results)</SelectItem>
              <SelectItem value="KPI">KPI (Key Performance Indicator)</SelectItem>
              <SelectItem value="Project">Project Goal</SelectItem>
              <SelectItem value="Team">Team Goal</SelectItem>
              <SelectItem value="Personal">Personal Goal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-900 dark:text-white">Owner *</Label>
          <Select value={formData.owner_email} onValueChange={(value) => setFormData({ ...formData, owner_email: value })}>
            <SelectTrigger className="bg-white dark:bg-[#282828]">
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#282828]">
              {employees.map(emp => (
                <SelectItem key={emp.email} value={emp.email}>{emp.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.goal_type === 'Team' && (
          <div>
            <Label className="text-slate-900 dark:text-white">Team</Label>
            <Select value={formData.team_id} onValueChange={(value) => setFormData({ ...formData, team_id: value })}>
              <SelectTrigger className="bg-white dark:bg-[#282828]">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#282828]">
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-slate-900 dark:text-white">Start Date</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="bg-white dark:bg-[#282828]"
          />
        </div>

        <div>
          <Label className="text-slate-900 dark:text-white">Target Date *</Label>
          <Input
            type="date"
            value={formData.target_date}
            onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            required
            className="bg-white dark:bg-[#282828]"
          />
        </div>

        <div>
          <Label className="text-slate-900 dark:text-white">Target Value *</Label>
          <Input
            type="number"
            value={formData.target_value}
            onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) })}
            required
            className="bg-white dark:bg-[#282828]"
          />
        </div>

        <div>
          <Label className="text-slate-900 dark:text-white">Unit</Label>
          <Input
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            placeholder="e.g., hours, projects, %"
            className="bg-white dark:bg-[#282828]"
          />
        </div>

        <div>
          <Label className="text-slate-900 dark:text-white">Priority</Label>
          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
            <SelectTrigger className="bg-white dark:bg-[#282828]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#282828]">
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-900 dark:text-white">Visibility</Label>
          <Select value={formData.visibility} onValueChange={(value) => setFormData({ ...formData, visibility: value })}>
            <SelectTrigger className="bg-white dark:bg-[#282828]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#282828]">
              <SelectItem value="public">Public (All can see)</SelectItem>
              <SelectItem value="team">Team Only</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Results for OKRs */}
      {formData.goal_type === 'OKR' && (
        <div className="border-t pt-4">
          <Label className="text-slate-900 dark:text-white mb-3 block">Key Results</Label>
          <div className="space-y-2 mb-3">
            {formData.key_results?.map((kr, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <span className="flex-1 text-sm text-slate-900 dark:text-white">{kr.title}</span>
                <span className="text-sm text-slate-600 dark:text-slate-400">{kr.current}/{kr.target}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setFormData({
                    ...formData,
                    key_results: formData.key_results.filter((_, i) => i !== idx)
                  })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Key result title"
              value={newKeyResult.title}
              onChange={(e) => setNewKeyResult({ ...newKeyResult, title: e.target.value })}
              className="bg-white dark:bg-[#282828]"
            />
            <Input
              type="number"
              placeholder="Target"
              value={newKeyResult.target}
              onChange={(e) => setNewKeyResult({ ...newKeyResult, target: parseFloat(e.target.value) })}
              className="w-24 bg-white dark:bg-[#282828]"
            />
            <Button type="button" onClick={addKeyResult} size="sm">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isProcessing ? 'Saving...' : 'Save Goal'}
        </Button>
      </div>
    </form>
  );
}