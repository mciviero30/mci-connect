import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Plus, Edit, Trash2, Users, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/shared/PageHeader';

const permissionSections = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    permissions: [
      { key: 'view', label: 'View Dashboard' },
      { key: 'view_all_stats', label: 'View All Statistics' }
    ]
  },
  {
    key: 'jobs',
    label: 'Projects & Jobs',
    permissions: [
      { key: 'view', label: 'View Jobs' },
      { key: 'create', label: 'Create Jobs' },
      { key: 'edit', label: 'Edit Jobs' },
      { key: 'delete', label: 'Delete Jobs' },
      { key: 'view_all', label: 'View All Jobs' },
      { key: 'view_financials', label: 'View Financial Data' }
    ]
  },
  {
    key: 'field',
    label: 'MCI Field',
    permissions: [
      { key: 'view', label: 'Access Field App' },
      { key: 'edit', label: 'Edit Projects' },
      { key: 'upload_photos', label: 'Upload Photos' },
      { key: 'manage_tasks', label: 'Manage Tasks' }
    ]
  },
  {
    key: 'employees',
    label: 'Employees',
    permissions: [
      { key: 'view', label: 'View Employees' },
      { key: 'create', label: 'Create Employees' },
      { key: 'edit', label: 'Edit Employees' },
      { key: 'delete', label: 'Delete Employees' },
      { key: 'view_salary', label: 'View Salary Information' }
    ]
  },
  {
    key: 'finance',
    label: 'Finance',
    permissions: [
      { key: 'view_accounting', label: 'View Accounting' },
      { key: 'edit_accounting', label: 'Edit Accounting' },
      { key: 'view_quotes', label: 'View Quotes' },
      { key: 'create_quotes', label: 'Create Quotes' },
      { key: 'edit_quotes', label: 'Edit Quotes' },
      { key: 'delete_quotes', label: 'Delete Quotes' },
      { key: 'view_invoices', label: 'View Invoices' },
      { key: 'create_invoices', label: 'Create Invoices' },
      { key: 'edit_invoices', label: 'Edit Invoices' },
      { key: 'delete_invoices', label: 'Delete Invoices' },
      { key: 'approve_expenses', label: 'Approve Expenses' }
    ]
  },
  {
    key: 'time_tracking',
    label: 'Time Tracking',
    permissions: [
      { key: 'view_own', label: 'View Own Hours' },
      { key: 'view_all', label: 'View All Hours' },
      { key: 'approve', label: 'Approve Hours' },
      { key: 'edit_own', label: 'Edit Own Hours' },
      { key: 'edit_all', label: 'Edit All Hours' }
    ]
  },
  {
    key: 'payroll',
    label: 'Payroll',
    permissions: [
      { key: 'view_own', label: 'View Own Payroll' },
      { key: 'view_all', label: 'View All Payroll' },
      { key: 'manage', label: 'Manage Payroll' }
    ]
  },
  {
    key: 'documents',
    label: 'Documents',
    permissions: [
      { key: 'view', label: 'View Documents' },
      { key: 'upload', label: 'Upload Documents' },
      { key: 'delete', label: 'Delete Documents' }
    ]
  },
  {
    key: 'customers',
    label: 'Customers',
    permissions: [
      { key: 'view', label: 'View Customers' },
      { key: 'create', label: 'Create Customers' },
      { key: 'edit', label: 'Edit Customers' },
      { key: 'delete', label: 'Delete Customers' }
    ]
  },
  {
    key: 'reports',
    label: 'Reports',
    permissions: [
      { key: 'view_basic', label: 'View Basic Reports' },
      { key: 'view_financial', label: 'View Financial Reports' },
      { key: 'export', label: 'Export Reports' }
    ]
  },
  {
    key: 'settings',
    label: 'Settings',
    permissions: [
      { key: 'view', label: 'View Settings' },
      { key: 'manage_roles', label: 'Manage Roles' },
      { key: 'manage_company', label: 'Manage Company Settings' }
    ]
  }
];

function RoleDialog({ role, onClose }) {
  const [formData, setFormData] = useState(role || {
    name: '',
    description: '',
    permissions: {},
    active: true
  });
  const queryClient = useQueryClient();
  const toast = useToast();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success(role ? 'Role updated' : 'Role created');
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.update(role.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success('Role updated');
      onClose();
    }
  });

  const handlePermissionToggle = (section, permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [section]: {
          ...(prev.permissions?.[section] || {}),
          [permission]: !(prev.permissions?.[section]?.[permission])
        }
      }
    }));
  };

  const handleSubmit = () => {
    if (role) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{role ? 'Edit Role' : 'Create New Role'}</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6 py-4">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Role Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Project Manager, Finance Admin"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this role can do..."
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Permissions</h3>
          {permissionSections.map(section => (
            <Card key={section.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{section.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {section.permissions.map(perm => (
                    <div key={perm.key} className="flex items-center justify-between">
                      <label className="text-sm">{perm.label}</label>
                      <Switch
                        checked={formData.permissions?.[section.key]?.[perm.key] || false}
                        onCheckedChange={() => handlePermissionToggle(section.key, perm.key)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!formData.name}>
            {role ? 'Update' : 'Create'} Role
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

export default function RoleManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    enabled: !!user,
    queryFn: () => base44.entities.Role.list()
  });

  const { data: usersWithRoles = [] } = useQuery({
    queryKey: ['users-with-custom-roles'],
    enabled: !!user,
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.custom_role_id);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success('Role deleted');
    }
  });

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Lock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">Access denied</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <PageHeader
        title="Role Management"
        description="Create and manage custom roles with granular permissions"
        icon={Shield}
      />

      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setSelectedRole(null); setDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            {dialogOpen && <RoleDialog role={selectedRole} onClose={() => setDialogOpen(false)} />}
          </Dialog>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => {
            const assignedUsers = usersWithRoles.filter(u => u.custom_role_id === role.id);
            return (
              <Card key={role.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        {role.name}
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-1">{role.description}</p>
                    </div>
                    {role.is_system_role && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">System</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                    <Users className="w-4 h-4" />
                    <span>{assignedUsers.length} users assigned</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedRole(role);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    {!role.is_system_role && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this role?')) {
                            deleteMutation.mutate(role.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}