import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Mail, 
  Briefcase, 
  Calendar, 
  MessageSquare, 
  Edit2, 
  Camera,
  Check,
  X,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';

export default function UserProfileModal({ 
  open, 
  onOpenChange, 
  userEmail, 
  currentUserEmail,
  isCurrentUser = false 
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fetch user data
  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['chatUserProfile', userEmail],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: userEmail });
      return users[0] || null;
    },
    enabled: open && !!userEmail,
  });

  // Fetch recent messages from this user
  const { data: recentMessages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['userRecentMessages', userEmail],
    queryFn: async () => {
      const messages = await base44.entities.ChatMessage.filter(
        { sender_email: userEmail },
        '-created_date',
        20
      );
      return messages;
    },
    enabled: open && !!userEmail,
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      if (isCurrentUser) {
        await base44.auth.updateMe(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatUserProfile', userEmail] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });

  const handleStartEdit = () => {
    setEditData({
      position: userData?.position || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateUserMutation.mutate(editData);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.auth.updateMe({ profile_photo_url: file_url });
      queryClient.invalidateQueries({ queryKey: ['chatUserProfile', userEmail] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success('Photo updated');
    } catch (error) {
      toast.error('Failed to upload photo');
    }
    setUploadingPhoto(false);
  };

  const canEdit = isCurrentUser || currentUserEmail === userEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-900 dark:text-white">User Profile</DialogTitle>
        </DialogHeader>

        {loadingUser ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : userData ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <div className="relative">
                {userData.profile_photo_url ? (
                  <img
                    src={userData.profile_photo_url}
                    alt={userData.full_name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-blue-100 dark:border-blue-900"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-[#3B9FF3] to-blue-600 rounded-full flex items-center justify-center border-4 border-blue-100 dark:border-blue-900">
                    <span className="text-white text-2xl font-bold">
                      {userData.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                
                {canEdit && (
                  <label className="absolute bottom-0 right-0 w-7 h-7 bg-[#3B9FF3] rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors shadow-lg">
                    <Camera className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {userData.full_name || 'Unknown User'}
                  </h3>
                  <Badge className={
                    userData.employment_status === 'active' 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                  }>
                    {userData.employment_status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Position</Label>
                      <Input
                        value={editData.position}
                        onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                        placeholder="e.g., Project Manager"
                        className="h-8 text-sm bg-white dark:bg-slate-800"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveEdit} disabled={updateUserMutation.isPending}>
                        <Check className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {userData.position || 'No position set'}
                    </p>
                    {canEdit && (
                      <Button size="sm" variant="ghost" onClick={handleStartEdit} className="mt-2 h-7 text-xs text-[#3B9FF3]">
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit Profile
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-[#3B9FF3]" />
                  <span className="text-slate-600 dark:text-slate-400 truncate">{userData.email}</span>
                </div>
              </Card>
              <Card className="p-3 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-[#3B9FF3]" />
                  <span className="text-slate-600 dark:text-slate-400">
                    Joined {userData.created_date ? format(new Date(userData.created_date), 'MMM yyyy') : 'N/A'}
                  </span>
                </div>
              </Card>
            </div>

            {/* Recent Messages */}
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#3B9FF3]" />
                Recent Messages
              </h4>
              
              <div className="max-h-48 overflow-y-auto space-y-2">
                {loadingMessages ? (
                  <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                    Loading messages...
                  </div>
                ) : recentMessages.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                    No messages yet
                  </div>
                ) : (
                  recentMessages.slice(0, 10).map((msg) => (
                    <div 
                      key={msg.id} 
                      className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700"
                    >
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                        {msg.message_type === 'image' || msg.message_type === 'gif' 
                          ? `[${msg.message_type === 'image' ? 'Image' : 'GIF'}]`
                          : msg.message}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            User not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}