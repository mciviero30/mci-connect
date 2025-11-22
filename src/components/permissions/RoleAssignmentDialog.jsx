import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { Shield, Check } from 'lucide-react';

export default function RoleAssignmentDialog({ employee, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedRoleId, setSelectedRoleId] = useState(employee?.custom_role_id || '');

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    initialData: []
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }) => {
      return await base44.auth.updateMe({ custom_role_id: roleId || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      queryClient.invalidateQueries(['employees']);
      toast.success('Role assigned successfully');
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to assign role')
  });

  const handleAssign = () => {
    if (!employee) return;
    assignRoleMutation.mutate({ 
      userId: employee.id, 
      roleId: selectedRoleId 
    });
  };

  const activeRoles = roles.filter(r => r.is_active);
  const currentRole = roles.find(r => r.id === employee?.custom_role_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">
            Assign Role to {employee?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentRole && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Current Role: {currentRole.name}
                </span>
              </div>
            </div>
          )}

          <div>
            <Label className="text-slate-700 dark:text-slate-300">Select Role</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                <SelectItem value={null} className="text-slate-900 dark:text-white">
                  No Custom Role (Default Permissions)
                </SelectItem>
                {activeRoles.map(role => (
                  <SelectItem key={role.id} value={role.id} className="text-slate-900 dark:text-white">
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRoleId && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {roles.find(r => r.id === selectedRoleId)?.description || 'No description'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} className="bg-blue-600 hover:bg-blue-700">
            <Check className="w-4 h-4 mr-2" />
            Assign Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}