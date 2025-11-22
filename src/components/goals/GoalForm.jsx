import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, X, Plus, Trash2 } from 'lucide-react';

export default function GoalForm({ goal, jobs, onSubmit, onCancel, isLoading }) {
  const [formData, setFormData] = useState(goal || {
    title: '',
    description: '',
    goal_type: 'okr',
    category: 'personal',
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
    current_value: 0,
    target_value: 100,
    unit: 'percentage',
    status: 'not_started',
    priority: 'medium',
    key_results: [],
    linked_job_id: '',
    notes: ''
  });

  const handleAddKeyResult = () => {
    setFormData({
      ...formData,
      key_results: [
        ...(formData.key_results || []),
        { title: '', current: 0, target: 100, unit: 'percentage' }
      ]
    });
  };

  const handleRemoveKeyResult = (index) => {
    const newKeyResults = [...formData.key_results];
    newKeyResults.splice(index, 1);
    setFormData({ ...formData, key_results: newKeyResults });
  };

  const handleKeyResultChange = (index, field, value) => {
    const newKeyResults = [...formData.key_results];
    newKeyResults[index][field] = value;
    setFormData({ ...formData, key_results: newKeyResults });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const job = jobs?.find(j => j.id === formData.linked_job_id);
    onSubmit({
      ...formData,
      linked_job_name: job?.name || null
    });
  };

  return (
    <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white">
          {goal ? 'Edit Goal' : 'Create New Goal'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-900 dark:text-white">Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Goal title"
                required
                className="bg-white dark:bg-[#282828]"
              />
            </div>
            <div>
              <Label className="text-slate-900 dark:text-white">Type</Label>
              <Select value={formData.goal_type} onValueChange={(v) => setFormData({ ...formData, goal_type: v })}>
                <SelectTrigger className="bg-white dark:bg-[#282828]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="okr">OKR</SelectItem>
                  <SelectItem value="kpi">KPI</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="objective">Objective</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description"
              className="bg-white dark:bg-[#282828]"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-900 dark:text-white">Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="bg-white dark:bg-[#282828]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-900 dark:text-white">Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
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
              <Label className="text-slate-900 dark:text-white">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="bg-white dark:bg-[#282828]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="behind">Behind</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-900 dark:text-white">Start Date *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
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
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-900 dark:text-white">Current Value</Label>
              <Input
                type="number"
                value={formData.current_value}
                onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) })}
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
                placeholder="percentage, hours, $"
                className="bg-white dark:bg-[#282828]"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-900 dark:text-white">Link to Job (Optional)</Label>
            <Select value={formData.linked_job_id} onValueChange={(v) => setFormData({ ...formData, linked_job_id: v })}>
              <SelectTrigger className="bg-white dark:bg-[#282828]">
                <SelectValue placeholder="Select job" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#282828]">
                {jobs?.map(job => (
                  <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Key Results */}
          {formData.goal_type === 'okr' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-slate-900 dark:text-white">Key Results</Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddKeyResult}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Key Result
                </Button>
              </div>
              <div className="space-y-2">
                {formData.key_results?.map((kr, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input
                        value={kr.title}
                        onChange={(e) => handleKeyResultChange(index, 'title', e.target.value)}
                        placeholder="Key result title"
                        className="bg-white dark:bg-[#282828]"
                      />
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        value={kr.target}
                        onChange={(e) => handleKeyResultChange(index, 'target', parseFloat(e.target.value))}
                        placeholder="Target"
                        className="bg-white dark:bg-[#282828]"
                      />
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveKeyResult(index)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Goal'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}