import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, User } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function RoleAssignmentDialog({ user, open, onClose }) {
  const [selectedRoleId, setSelectedRoleId] = useState(user?.custom_role_id || '');
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.filter({ active: true })
  });

  const updateMutation = useMutation({
    mutationFn: (roleId) => base44.entities.User.update(user.id, { custom_role_id: roleId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      queryClient.invalidateQueries(['currentUser']);
      toast.success('Role updated');
      onClose();
    }
  });

  const handleSubmit = () => {
    updateMutation.mutate(selectedRoleId);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Assign Role to {user?.full_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Custom Role</label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>No custom role (use default permissions)</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-sm">
            <p className="text-slate-600">
              <strong>Current role:</strong> {user?.role || 'user'}
            </p>
            <p className="text-slate-500 mt-1">
              Custom roles add granular permissions on top of the base role.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Role'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}