import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import PageHeader from '../components/shared/PageHeader';
import { Bell, Mail, Smartphone, Clock, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

export default function NotificationSettings() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [hasChanges, setHasChanges] = useState(false);

  // Obtener usuario actual
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Obtener configuración de notificaciones
  const { data: settings, isLoading } = useQuery({
    queryKey: ['notificationSettings', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      
      const existing = await base44.entities.NotificationSettings.filter({
        user_email: user.email
      });

      if (existing.length > 0) {
        return existing[0];
      }

      // Crear configuración por defecto
      const defaultSettings = {
        user_email: user.email,
        project_invitation_in_app: true,
        project_invitation_email: true,
        task_assigned_in_app: true,
        task_assigned_email: true,
        task_status_in_app: true,
        task_status_email: false,
        task_deadline_in_app: true,
        task_deadline_email: true,
        access_request_in_app: true,
        access_request_email: true,
        mentions_in_app: true,
        mentions_email: true,
        file_uploads_in_app: true,
        file_uploads_email: false,
        milestone_in_app: true,
        milestone_email: true,
        system_alerts_in_app: true,
        system_alerts_email: true,
        digest_frequency: 'realtime',
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00'
      };

      const created = await base44.entities.NotificationSettings.create(defaultSettings);
      return created;
    },
    enabled: !!user?.email
  });

  const [formData, setFormData] = useState(settings || {});

  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Guardar configuración
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return base44.entities.NotificationSettings.update(settings.id, data);
      } else {
        return base44.entities.NotificationSettings.create({
          ...data,
          user_email: user.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      toast.success('Notification settings saved successfully');
      setHasChanges(false);
    },
    onError: () => {
      toast.error('Error saving settings');
    }
  });

  const handleToggle = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleReset = () => {
    setFormData(settings);
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3B9FF3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading settings...</p>
        </div>
      </div>
    );
  }

  const notificationTypes = [
    {
      id: 'project_invitation',
      title: 'Project Invitations',
      description: 'When someone invites you to join a project',
      icon: Bell
    },
    {
      id: 'task_assigned',
      title: 'Task Assignments',
      description: 'When a task is assigned to you',
      icon: Bell
    },
    {
      id: 'task_status',
      title: 'Task Status Changes',
      description: 'When a task status is updated',
      icon: Bell
    },
    {
      id: 'task_deadline',
      title: 'Task Deadlines',
      description: 'Reminders for upcoming or overdue tasks',
      icon: Clock
    },
    {
      id: 'access_request',
      title: 'Access Requests',
      description: 'When someone requests access to a project',
      icon: Bell
    },
    {
      id: 'mentions',
      title: 'Mentions',
      description: 'When someone mentions you in a comment',
      icon: Bell
    },
    {
      id: 'file_uploads',
      title: 'File Uploads',
      description: 'When files are uploaded to your projects',
      icon: Bell
    },
    {
      id: 'milestone',
      title: 'Milestones',
      description: 'When project milestones are completed',
      icon: Bell
    },
    {
      id: 'system_alerts',
      title: 'System Alerts',
      description: 'Important system notifications and updates',
      icon: Bell
    }
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title="Notification Settings"
          description="Manage how and when you receive notifications"
          icon={Bell}
          actions={
            <div className="flex gap-2">
              {hasChanges && (
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saveMutation.isPending}
                className="bg-gradient-to-r from-[#3B9FF3] to-blue-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          }
        />

        <div className="space-y-6">
          {/* Notification Types */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#3B9FF3]" />
                Notification Types
              </CardTitle>
              <CardDescription className="text-slate-400">
                Choose which events you want to be notified about
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center gap-4 pb-3 border-b border-slate-700">
                  <div className="w-48 text-sm font-semibold text-slate-300">Event Type</div>
                  <div className="flex items-center gap-6">
                    <div className="w-20 text-center">
                      <Smartphone className="w-4 h-4 text-[#3B9FF3] mx-auto mb-1" />
                      <span className="text-xs text-slate-400">In-App</span>
                    </div>
                    <div className="w-20 text-center">
                      <Mail className="w-4 h-4 text-[#3B9FF3] mx-auto mb-1" />
                      <span className="text-xs text-slate-400">Email</span>
                    </div>
                  </div>
                </div>

                {notificationTypes.map((type) => (
                  <div key={type.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-700/30 transition-colors">
                    <div className="w-48">
                      <p className="font-medium text-white text-sm">{type.title}</p>
                      <p className="text-xs text-slate-400">{type.description}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="w-20 flex justify-center">
                        <Switch
                          checked={formData[`${type.id}_in_app`]}
                          onCheckedChange={(checked) => handleToggle(`${type.id}_in_app`, checked)}
                        />
                      </div>
                      <div className="w-20 flex justify-center">
                        <Switch
                          checked={formData[`${type.id}_email`]}
                          onCheckedChange={(checked) => handleToggle(`${type.id}_email`, checked)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Preferences */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#3B9FF3]" />
                Delivery Preferences
              </CardTitle>
              <CardDescription className="text-slate-400">
                Control when and how often you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Digest Frequency */}
              <div className="space-y-2">
                <Label className="text-white">Notification Frequency</Label>
                <Select
                  value={formData.digest_frequency}
                  onValueChange={(value) => handleToggle('digest_frequency', value)}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="realtime" className="text-white">Real-time (instant notifications)</SelectItem>
                    <SelectItem value="daily" className="text-white">Daily digest</SelectItem>
                    <SelectItem value="weekly" className="text-white">Weekly digest</SelectItem>
                    <SelectItem value="never" className="text-white">Never (disable all)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  {formData.digest_frequency === 'realtime' && 'Receive notifications immediately as they happen'}
                  {formData.digest_frequency === 'daily' && 'Receive a daily summary of all notifications'}
                  {formData.digest_frequency === 'weekly' && 'Receive a weekly summary of all notifications'}
                  {formData.digest_frequency === 'never' && 'You will not receive any notifications'}
                </p>
              </div>

              {/* Quiet Hours */}
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Quiet Hours</Label>
                    <p className="text-sm text-slate-400">Pause notifications during specific hours</p>
                  </div>
                  <Switch
                    checked={formData.quiet_hours_enabled}
                    onCheckedChange={(checked) => handleToggle('quiet_hours_enabled', checked)}
                  />
                </div>

                {formData.quiet_hours_enabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Start Time</Label>
                      <Input
                        type="time"
                        value={formData.quiet_hours_start}
                        onChange={(e) => handleToggle('quiet_hours_start', e.target.value)}
                        className="bg-slate-900/50 border-slate-600 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">End Time</Label>
                      <Input
                        type="time"
                        value={formData.quiet_hours_end}
                        onChange={(e) => handleToggle('quiet_hours_end', e.target.value)}
                        className="bg-slate-900/50 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}