import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Award, Search, Filter, CheckCircle2, Clock, Users, 
  BarChart3, Grid3X3, List, ChevronRight, Star, Shield
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import MySkillsPanel from '@/components/skills/MySkillsPanel';
import SkillBadge, { PROFICIENCY_COLORS, PROFICIENCY_LABELS } from '@/components/skills/SkillBadge';
import { useToast } from '@/components/ui/toast';

export default function SkillMatrix() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [validationFilter, setValidationFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [validateDialog, setValidateDialog] = useState({ open: false, skill: null });

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const isAdmin = user?.role === 'admin';

  const { data: allSkills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['allEmployeeSkills'],
    queryFn: () => base44.entities.EmployeeSkill.list('-created_date'),
    enabled: isAdmin,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.filter({ employment_status: 'active' }),
    enabled: isAdmin,
  });

  const validateMutation = useMutation({
    mutationFn: ({ skillId, data }) => base44.entities.EmployeeSkill.update(skillId, {
      validated: true,
      validated_by: user.email,
      validated_date: new Date().toISOString(),
      validated_level: data.validated_level,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allEmployeeSkills'] });
      queryClient.invalidateQueries({ queryKey: ['employeeSkills'] });
      toast.success('Skill validated successfully');
      setValidateDialog({ open: false, skill: null });
    },
  });

  // Build skill matrix data
  const matrixData = useMemo(() => {
    if (!isAdmin) return { employees: [], skills: [], matrix: {} };

    // Get unique skills
    const uniqueSkills = [...new Set(allSkills.map(s => s.skill_name))].sort();
    
    // Build matrix
    const matrix = {};
    employees.forEach(emp => {
      matrix[emp.email] = {};
      const empSkills = allSkills.filter(s => s.employee_email === emp.email);
      empSkills.forEach(skill => {
        matrix[emp.email][skill.skill_name] = skill;
      });
    });

    return { employees, skills: uniqueSkills, matrix };
  }, [allSkills, employees, isAdmin]);

  // Filter skills for list view
  const filteredSkills = useMemo(() => {
    return allSkills.filter(skill => {
      const matchesSearch = skill.skill_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           skill.employee_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || skill.category === categoryFilter;
      const matchesValidation = validationFilter === 'all' || 
                               (validationFilter === 'validated' && skill.validated) ||
                               (validationFilter === 'pending' && !skill.validated);
      return matchesSearch && matchesCategory && matchesValidation;
    });
  }, [allSkills, searchTerm, categoryFilter, validationFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = allSkills.length;
    const validated = allSkills.filter(s => s.validated).length;
    const pending = total - validated;
    const uniqueSkills = new Set(allSkills.map(s => s.skill_name)).size;
    const employeesWithSkills = new Set(allSkills.map(s => s.employee_email)).size;
    return { total, validated, pending, uniqueSkills, employeesWithSkills };
  }, [allSkills]);

  const handleValidate = (skill) => {
    setValidateDialog({ 
      open: true, 
      skill,
      validated_level: skill.proficiency_level 
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="My Skills"
            description="Manage your skills and expertise"
            icon={Award}
          />
          <MySkillsPanel userEmail={user?.email} userName={user?.full_name} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Skill Matrix"
          description="View and validate employee skills across the organization"
          icon={Award}
          stats={[
            { label: 'Total Skills', value: stats.total, icon: Star },
            { label: 'Validated', value: stats.validated, icon: CheckCircle2 },
            { label: 'Pending Review', value: stats.pending, icon: Clock },
            { label: 'Employees', value: stats.employeesWithSkills, icon: Users },
          ]}
        />

        <Tabs defaultValue="list" className="mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="matrix" className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Matrix View
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search skills or employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="trade">Trade</SelectItem>
                  <SelectItem value="software">Software</SelectItem>
                </SelectContent>
              </Select>
              <Select value={validationFilter} onValueChange={setValidationFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="validated">Validated</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="list">
            <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
              <CardContent className="p-0">
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredSkills.map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {skill.employee_name?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{skill.employee_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <SkillBadge skill={skill} size="small" />
                            <Badge variant="outline" className="text-xs">
                              {skill.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {skill.years_experience && (
                          <span className="text-sm text-slate-500">{skill.years_experience} yrs exp</span>
                        )}
                        {skill.validated ? (
                          <Badge className="bg-green-100 text-green-700 border-green-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Validated
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleValidate(skill)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Validate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matrix">
            <Card className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 overflow-hidden">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800">
                      <th className="text-left p-4 font-semibold text-slate-900 dark:text-white sticky left-0 bg-slate-50 dark:bg-slate-800 z-10">
                        Employee
                      </th>
                      {matrixData.skills.slice(0, 10).map(skillName => (
                        <th key={skillName} className="p-2 text-center">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 writing-mode-vertical">
                            {skillName}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.employees.map(emp => (
                      <tr key={emp.email} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4 sticky left-0 bg-white dark:bg-[#282828]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">
                                {emp.full_name?.[0]?.toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium text-slate-900 dark:text-white text-sm">
                              {emp.full_name}
                            </span>
                          </div>
                        </td>
                        {matrixData.skills.slice(0, 10).map(skillName => {
                          const skill = matrixData.matrix[emp.email]?.[skillName];
                          if (!skill) {
                            return <td key={skillName} className="p-2 text-center">
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            </td>;
                          }
                          const level = skill.validated_level || skill.proficiency_level;
                          const colors = {
                            beginner: 'bg-slate-200 dark:bg-slate-700',
                            intermediate: 'bg-blue-200 dark:bg-blue-800',
                            advanced: 'bg-purple-200 dark:bg-purple-800',
                            expert: 'bg-amber-200 dark:bg-amber-800',
                          };
                          return (
                            <td key={skillName} className="p-2 text-center">
                              <div className={`w-8 h-8 mx-auto rounded-lg ${colors[level]} flex items-center justify-center`}>
                                {skill.validated && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Validation Dialog */}
        <Dialog open={validateDialog.open} onOpenChange={(open) => setValidateDialog({ open, skill: null })}>
          <DialogContent className="bg-white dark:bg-[#282828]">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">Validate Skill</DialogTitle>
            </DialogHeader>
            {validateDialog.skill && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <p className="font-medium text-slate-900 dark:text-white">{validateDialog.skill.employee_name}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{validateDialog.skill.skill_name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Self-assessed: {PROFICIENCY_LABELS[validateDialog.skill.proficiency_level]}
                  </p>
                </div>

                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Validated Proficiency Level</Label>
                  <Select
                    value={validateDialog.validated_level}
                    onValueChange={(v) => setValidateDialog({ ...validateDialog, validated_level: v })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setValidateDialog({ open: false, skill: null })}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => validateMutation.mutate({
                      skillId: validateDialog.skill.id,
                      data: { validated_level: validateDialog.validated_level }
                    })}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Validate Skill
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}