import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, CheckCircle2, Clock, Award } from 'lucide-react';
import SkillForm from './SkillForm';
import SkillBadge, { PROFICIENCY_LABELS } from './SkillBadge';
import { useToast } from '@/components/ui/toast';

export default function MySkillsPanel({ userEmail, userName, readonly = false }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['employeeSkills', userEmail],
    queryFn: () => base44.entities.EmployeeSkill.filter({ employee_email: userEmail }),
    enabled: !!userEmail,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeSkill.create({
      ...data,
      employee_email: userEmail,
      employee_name: userName,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeSkills'] });
      toast.success('Skill added successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmployeeSkill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeSkills'] });
      toast.success('Skill updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeSkill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeSkills'] });
      toast.success('Skill removed');
    },
  });

  const handleSubmit = (data) => {
    if (editingSkill) {
      updateMutation.mutate({ id: editingSkill.id, data });
      setEditingSkill(null);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (skill) => {
    setEditingSkill(skill);
    setShowForm(true);
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    const cat = skill.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const validatedCount = skills.filter(s => s.validated).length;
  const totalCount = skills.length;

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-slate-100 dark:bg-slate-800 rounded-xl" />;
  }

  return (
    <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Skills & Expertise
          </CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {validatedCount}/{totalCount} skills validated by manager
          </p>
        </div>
        {!readonly && (
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Skill
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No skills added yet</p>
            {!readonly && (
              <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add your first skill
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSkills).map(([category, categorySkills]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">
                  {category.replace('_', ' ')}
                </h4>
                <div className="space-y-2">
                  {categorySkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg group"
                    >
                      <div className="flex items-center gap-3">
                        <SkillBadge skill={skill} />
                        {skill.years_experience && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {skill.years_experience} yrs
                          </span>
                        )}
                      </div>
                      {!readonly && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleEdit(skill)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => deleteMutation.mutate(skill.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <SkillForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingSkill(null);
        }}
        onSubmit={handleSubmit}
        existingSkill={editingSkill}
      />
    </Card>
  );
}