import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Smartphone, Clock, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import PageHeader from '../components/shared/PageHeader';
import { useToast } from '@/components/ui/toast';
import PushNotificationManager from '../components/notifications/PushNotificationManager';

const NOTIFICATION_TYPES = [
  { id: 'project_invitation', label: 'Project Invitations', icon: '📋' },
  { id: 'task_assigned', label: 'Task Assignments', icon: '✅' },
  { id: 'task_status', label: 'Status Changes', icon: '🔄' },
  { id: 'task_deadline', label: 'Deadlines & Due Dates', icon: '⏰' },
  { id: 'access_request', label: 'Access Requests', icon: '🔐' },
  { id: 'mentions', label: 'Mentions', icon: '💬' },
  { id: 'file_uploads', label: 'File Uploads', icon: '📎' },
  { id: 'milestone', label: 'Milestones', icon: '🎯' },
  { id: 'system_alerts', label: 'System Alerts', icon: '🚨' }
];

export default function NotificationSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['notificationSettings', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const results = await base44.entities.NotificationSettings.filter({
        user_email: user.email
      });
      
      if (results.length > 0) {
        return results[0];
      }
      
      // Create default settings if none exist
      return base44.entities.NotificationSettings.create({
        user_email: user.email,
        project_invitation_in_app: true,
        project_invitation_email: true,
        project_invitation_push: true,
        task_assigned_in_app: true,
        task_assigned_email: true,
        task_assigned_push: true,
        task_status_in_app: true,
        task_status_email: false,
        task_status_push: true,
        task_deadline_in_app: true,
        task_deadline_email: true,
        task_deadline_push: true,
        access_request_in_app: true,
        access_request_email: true,
        access_request_push: true,
        mentions_in_app: true,
        mentions_email: true,
        mentions_push: true,
        file_uploads_in_app: true,
        file_uploads_email: false,
        file_uploads_push: false,
        milestone_in_app: true,
        milestone_email: true,
        milestone_push: true,
        system_alerts_in_app: true,
        system_alerts_email: true,
        system_alerts_push: true,
        digest_frequency: 'realtime',
        quiet_hours_enabled: false
      });
    },
    enabled: !!user?.email
  });

  const [localSettings, setLocalSettings] = useState(null);

  React.useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: (updatedSettings) => 
      base44.entities.NotificationSettings.update(settings.id, updatedSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      toast.success('✅ Settings saved successfully');
      setHasChanges(false);
    },
    onError: () => {
      toast.error('❌ Failed to save settings');
    }
  });

  const handleToggle = (field, value) => {
    setLocalSettings({ ...localSettings, [field]: value });
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate(localSettings);
  };

  if (isLoading || !localSettings) {
    return (
      <div className="p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-[#3B9FF3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Notification Settings"
          description="Manage how you receive notifications"
          icon={Bell}
          actions={
            hasChanges && (
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-[#3B9FF3] to-blue-600 text-white shadow-lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )
          }
        />

        <div className="space-y-6">
          {/* Push Notifications */}
          <PushNotificationManager user={user} />

          {/* Notification Channels */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified for each type of event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Headers */}
                <div className="grid grid-cols-4 gap-4 pb-3 border-b border-slate-200">
                  <div className="col-span-1">
                    <p className="text-sm font-semibold text-slate-700">Event Type</p>
                  </div>
                  <div className="text-center">
                    <Bell className="w-4 h-4 mx-auto text-[#3B9FF3] mb-1" />
                    <p className="text-xs font-medium text-slate-600">In-App</p>
                  </div>
                  <div className="text-center">
                    <Mail className="w-4 h-4 mx-auto text-[#3B9FF3] mb-1" />
                    <p className="text-xs font-medium text-slate-600">Email</p>
                  </div>
                  <div className="text-center">
                    <Smartphone className="w-4 h-4 mx-auto text-[#3B9FF3] mb-1" />
                    <p className="text-xs font-medium text-slate-600">Push</p>
                  </div>
                </div>

                {/* Notification Types */}
                {NOTIFICATION_TYPES.map((type) => (
                  <div key={type.id} className="grid grid-cols-4 gap-4 items-center py-2 hover:bg-slate-50 rounded-lg transition-colors">
                    <div className="col-span-1 flex items-center gap-2">
                      <span className="text-xl">{type.icon}</span>
                      <Label className="text-sm text-slate-900 font-medium cursor-pointer">
                        {type.label}
                      </Label>
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={localSettings[`${type.id}_in_app`]}
                        onCheckedChange={(checked) => handleToggle(`${type.id}_in_app`, checked)}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={localSettings[`${type.id}_email`]}
                        onCheckedChange={(checked) => handleToggle(`${type.id}_email`, checked)}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={localSettings[`${type.id}_push`]}
                        onCheckedChange={(checked) => handleToggle(`${type.id}_push`, checked)}
                        disabled={!localSettings.push_enabled}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#3B9FF3]" />
                Quiet Hours
              </CardTitle>
              <CardDescription>
                Pause notifications during specific hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-slate-900 font-medium">Enable Quiet Hours</Label>
                <Switch
                  checked={localSettings.quiet_hours_enabled}
                  onCheckedChange={(checked) => handleToggle('quiet_hours_enabled', checked)}
                />
              </div>

              {localSettings.quiet_hours_enabled && (
                <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                  <div>
                    <Label className="text-slate-700 mb-2 block">Start Time</Label>
                    <Input
                      type="time"
                      value={localSettings.quiet_hours_start || '22:00'}
                      onChange={(e) => handleToggle('quiet_hours_start', e.target.value)}
                      className="bg-white border-slate-300"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700 mb-2 block">End Time</Label>
                    <Input
                      type="time"
                      value={localSettings.quiet_hours_end || '08:00'}
                      onChange={(e) => handleToggle('quiet_hours_end', e.target.value)}
                      className="bg-white border-slate-300"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Digest Frequency */}
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900">Digest Frequency</CardTitle>
              <CardDescription>
                How often to receive notification summaries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={localSettings.digest_frequency}
                onValueChange={(value) => handleToggle('digest_frequency', value)}
              >
                <SelectTrigger className="bg-white border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="realtime">Real-time (instant)</SelectItem>
                  <SelectItem value="daily">Daily digest</SelectItem>
                  <SelectItem value="weekly">Weekly digest</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}