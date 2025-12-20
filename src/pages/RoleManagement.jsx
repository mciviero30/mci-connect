import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import PageHeader from '../components/shared/PageHeader';
import { Shield, Plus, Edit, Trash2, Users, Lock, Check, X } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';

const MODULE_LABELS = {
  dashboard: 'Dashboard',
  finance: 'Finance',
  hr: 'Human Resources',
  projects: 'Projects',
  time_tracking: 'Time Tracking',
  expenses: 'Expenses',
  reports: 'Reports',
  settings: 'Settings'
};

const PERMISSION_LABELS = {
  view: 'View',
  edit: 'Edit',
  view_all: 'View All Data',
  view_team_only: 'View Team Only',
  view_assigned_only: 'View Assigned Only',
  view_own_only: 'View Own Only',
  approve_expenses: 'Approve Expenses',
  manage_invoices: 'Manage Invoices',
  manage_quotes: 'Manage Quotes',
  view_reports: 'View Reports',
  manage_employees: 'Manage Employees',
  approve_time_off: 'Approve Time Off',
  view_payroll: 'View Payroll',
  manage_performance: 'Manage Performance',
  manage_jobs: 'Manage Jobs',
  assign_employees: 'Assign Employees',
  view_financials: 'View Financials',
  approve_hours: 'Approve Hours',
  submit: 'Submit',
  approve: 'Approve',
  view_financial: 'View Financial Reports',
  view_analytics: 'View Analytics Reports',
  view_hr: 'View HR Reports',
  export: 'Export Data',
  edit_company: 'Edit Company Settings',
  manage_roles: 'Manage Roles',
  manage_integrations: 'Manage Integrations'
};

const DEFAULT_PERMISSIONS = {
  dashboard: { view: true, edit: false },
  finance: { view: false, edit: false, view_all: false, view_team_only: false, approve_expenses: false, manage_invoices: false, manage_quotes: false, view_reports: false },
  hr: { view: false, edit: false, view_all: false, view_team_only: false, manage_employees: false, approve_time_off: false, view_payroll: false, manage_performance: false },
  projects: { view: false, edit: false, view_all: false, view_assigned_only: false, manage_jobs: false, assign_employees: false, view_financials: false },
  time_tracking: { view: false, edit: false, view_all: false, view_own_only: true, approve_hours: false },
  expenses: { view: false, submit: true, view_all: false, view_own_only: true, approve: false },
  reports: { view: false, view_financial: false, view_analytics: false, view_hr: false, export: false },
  settings: { view: false, edit_company: false, manage_roles: false, manage_integrations: false }
};

export default function RoleManagement() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: DEFAULT_PERMISSIONS
  });

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success('Role created successfully');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to create role')
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success('Role updated successfully');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Failed to update role')
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success('Role deleted successfully');
    },
    onError: () => toast.error('Failed to delete role')
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', permissions: DEFAULT_PERMISSIONS });
    setEditingRole(null);
  };

  const handleOpenDialog = (role = null) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handlePermissionChange = (module, permission, value) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [permission]: value
        }
      }
    }));
  };

  const handleDelete = (role) => {
    if (role.is_system_role) {
      toast.error('Cannot delete system roles');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      deleteRoleMutation.mutate(role.id);
    }
  };

  const getUsersWithRole = (roleId) => {
    return users.filter(u => u.custom_role_id === roleId).length;
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F1F5F9] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Role Management"
          description="Create and manage custom roles with granular permissions"
          icon={Shield}
          actions={
            <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              New Role
            </Button>
          }
        />

        {/* Roles List */}
        <div className="grid gap-4">
          {roles.map(role => {
            const userCount = getUsersWithRole(role.id);
            
            return (
              <Card key={role.id} className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-lg shadow-md">
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{role.name}</h3>
                          {role.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">{role.description}</p>
                          )}
                        </div>
                        {role.is_system_role && (
                          <Badge className="bg-blue-50/60 text-[#507DB4] border border-blue-200/40 px-2 py-0.5 rounded-full text-xs font-semibold">
                            System Role
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Users className="w-4 h-4" />
                          <span>{userCount} {userCount === 1 ? 'user' : 'users'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <Lock className="w-4 h-4" />
                          <span>
                            {Object.values(role.permissions || {}).reduce((sum, module) => 
                              sum + Object.values(module).filter(Boolean).length, 0
                            )} permissions
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleOpenDialog(role)}
                        className="border-slate-300 dark:border-slate-600"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!role.is_system_role && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(role)}
                          className="border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Role Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Role Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Financial Supervisor"
                    className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-700 dark:text-slate-300">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the role and its responsibilities"
                    className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Permissions</h3>
                
                <div className="space-y-4">
                  {Object.entries(formData.permissions).map(([module, perms]) => (
                    <Card key={module} className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                          {MODULE_LABELS[module]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(perms).map(([permission, enabled]) => (
                            <div key={permission} className="flex items-center justify-between">
                              <Label className="text-sm text-slate-700 dark:text-slate-300">
                                {PERMISSION_LABELS[permission]}
                              </Label>
                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) => handlePermissionChange(module, permission, checked)}
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
                {editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}