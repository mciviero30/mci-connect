import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Save } from 'lucide-react';

const SKILL_CATEGORIES = [
  { value: 'technical', label: 'Technical' },
  { value: 'safety', label: 'Safety' },
  { value: 'equipment', label: 'Equipment Operation' },
  { value: 'software', label: 'Software' },
  { value: 'management', label: 'Management' },
  { value: 'communication', label: 'Communication' },
  { value: 'trade', label: 'Trade/Craft' },
  { value: 'other', label: 'Other' },
];

const PROFICIENCY_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'Basic understanding, needs guidance' },
  { value: 'intermediate', label: 'Intermediate', description: 'Can work independently on standard tasks' },
  { value: 'advanced', label: 'Advanced', description: 'Deep expertise, can mentor others' },
  { value: 'expert', label: 'Expert', description: 'Industry-leading knowledge' },
];

export default function SkillForm({ open, onOpenChange, onSubmit, existingSkill = null }) {
  const [formData, setFormData] = useState(existingSkill || {
    skill_name: '',
    category: 'technical',
    proficiency_level: 'intermediate',
    years_experience: '',
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      years_experience: formData.years_experience ? parseFloat(formData.years_experience) : null,
    });
    onOpenChange(false);
    setFormData({
      skill_name: '',
      category: 'technical',
      proficiency_level: 'intermediate',
      years_experience: '',
      notes: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#282828]">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            {existingSkill ? 'Edit Skill' : 'Add New Skill'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-700 dark:text-slate-300">Skill Name *</Label>
            <Input
              value={formData.skill_name}
              onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
              placeholder="e.g., Electrical Wiring, OSHA Certification"
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-700 dark:text-slate-300">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-700 dark:text-slate-300">Years Experience</Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.years_experience}
                onChange={(e) => setFormData({ ...formData, years_experience: e.target.value })}
                placeholder="e.g., 3"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-300">Proficiency Level *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PROFICIENCY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, proficiency_level: level.value })}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    formData.proficiency_level === level.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-slate-900 dark:text-white text-sm">{level.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{level.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-300">Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional details about this skill..."
              className="mt-1"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              {existingSkill ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {existingSkill ? 'Save Changes' : 'Add Skill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { SKILL_CATEGORIES, PROFICIENCY_LEVELS };