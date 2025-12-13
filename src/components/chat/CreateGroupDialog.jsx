import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Users, Trash2 } from 'lucide-react';

const AVATAR_COLORS = [
  { value: 'blue', class: 'from-blue-500 to-blue-600' },
  { value: 'purple', class: 'from-purple-500 to-purple-600' },
  { value: 'green', class: 'from-green-500 to-green-600' },
  { value: 'orange', class: 'from-orange-500 to-orange-600' },
  { value: 'pink', class: 'from-pink-500 to-pink-600' },
  { value: 'teal', class: 'from-teal-500 to-teal-600' }
];

export default function CreateGroupDialog({ open, onOpenChange, employees = [], currentUser, onCreateGroup, onDeleteGroup, editingGroup = null }) {
  const [groupName, setGroupName] = useState(editingGroup?.group_name || '');
  const [description, setDescription] = useState(editingGroup?.description || '');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [avatarColor, setAvatarColor] = useState(editingGroup?.avatar_color || 'blue');
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user can delete (admin, CEO, HR, manager)
  const canDelete = currentUser?.role === 'admin' || 
                    currentUser?.position === 'CEO' || 
                    currentUser?.department === 'HR' || 
                    currentUser?.position === 'manager';

  // Initialize selected members when editing
  React.useEffect(() => {
    if (editingGroup) {
      setGroupName(editingGroup.group_name || '');
      setDescription(editingGroup.description || '');
      setAvatarColor(editingGroup.avatar_color || 'blue');
      const groupMembers = employees.filter(emp => 
        editingGroup.members?.includes(emp.email) && emp.email !== currentUser?.email
      );
      setSelectedMembers(groupMembers);
    } else {
      setGroupName('');
      setDescription('');
      setSelectedMembers([]);
      setAvatarColor('blue');
      setSearchTerm('');
    }
  }, [editingGroup, employees, currentUser]);

  const toggleMember = (employee) => {
    if (selectedMembers.find(m => m.email === employee.email)) {
      setSelectedMembers(selectedMembers.filter(m => m.email !== employee.email));
    } else {
      setSelectedMembers([...selectedMembers, employee]);
    }
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      alert('Group name is required');
      return;
    }
    if (selectedMembers.length === 0) {
      alert('Select at least one member');
      return;
    }

    const memberEmails = [...selectedMembers.map(m => m.email), currentUser.email];
    const memberNames = [...selectedMembers.map(m => m.full_name), currentUser.full_name];

    const groupData = {
      group_name: groupName.trim(),
      description: description.trim(),
      created_by_email: currentUser.email,
      created_by_name: currentUser.full_name,
      members: memberEmails,
      member_names: memberNames,
      avatar_color: avatarColor,
      is_active: true
    };

    if (editingGroup) {
      onCreateGroup({ ...groupData, id: editingGroup.id });
    } else {
      onCreateGroup(groupData);
    }

    // Reset form
    setGroupName('');
    setDescription('');
    setSelectedMembers([]);
    setAvatarColor('blue');
    setSearchTerm('');
  };

  const handleDelete = () => {
    if (!editingGroup || !canDelete) return;
    if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      onDeleteGroup(editingGroup.id);
      onOpenChange(false);
    }
  };

  const filteredEmployees = employees
    .filter(emp => emp.email !== currentUser?.email)
    .filter(emp => 
      emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">Create Group Chat</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-700 dark:text-slate-300">Group Name *</Label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Project Team, Marketing Crew"
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-300">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this group for?"
              className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white h-20"
            />
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-300 mb-2 block">Avatar Color</Label>
            <div className="flex gap-2">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setAvatarColor(color.value)}
                  className={`w-10 h-10 bg-gradient-to-br ${color.class} rounded-full ${
                    avatarColor === color.value ? 'ring-4 ring-blue-400 dark:ring-blue-500' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-300">
              Selected Members ({selectedMembers.length})
            </Label>
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedMembers.map(member => (
                  <Badge key={member.email} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 pr-1">
                    {member.full_name}
                    <button
                      onClick={() => toggleMember(member)}
                      className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-slate-700 dark:text-slate-300">Add Members *</Label>
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
            />
            <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
              {filteredEmployees.map(emp => {
                const isSelected = selectedMembers.find(m => m.email === emp.email);
                return (
                  <button
                    key={emp.email}
                    onClick={() => toggleMember(emp)}
                    className={`w-full p-2 rounded-lg text-left flex items-center gap-3 transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {emp.full_name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{emp.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{emp.position}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <div>
            {editingGroup && canDelete && (
              <Button 
                variant="outline" 
                onClick={handleDelete}
                className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!groupName.trim() || selectedMembers.length === 0}
              className="bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              {editingGroup ? 'Update Group' : 'Create Group'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}