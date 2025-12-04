import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Mail, Smartphone, Clock, Save, MessageSquare, Users, AtSign, UserPlus, BellOff, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '../components/shared/PageHeader';
import { useToast } from '@/components/ui/toast';
import PushNotificationManager from '../components/notifications/PushNotificationManager';
import { format, addMinutes, addHours, addDays, isPast } from 'date-fns';

const NOTIFICATION_TYPES = [
  { id: 'project_invitation', label: 'Project Invitations', icon: '📋' },
  { id: 'task_assigned', label: 'Task Assignments', icon: '✅', critical: true },
  { id: 'task_status', label: 'Status Changes', icon: '🔄' },
  { id: 'task_deadline', label: 'Deadlines & Due Dates', icon: '⏰', critical: true },
  { id: 'access_request', label: 'Access Requests', icon: '🔐' },
  { id: 'mentions', label: 'Mentions', icon: '💬' },
  { id: 'file_uploads', label: 'File Uploads', icon: '📎' },
  { id: 'milestone', label: 'Milestones', icon: '🎯' },
  { id: 'system_alerts', label: 'System Alerts', icon: '🚨', critical: true },
  { id: 'quote_approved', label: 'Quote Approvals', icon: '✅', critical: true },
  { id: 'quote_rejected', label: 'Quote Rejections', icon: '❌' },
  { id: 'urgent_job', label: 'Urgent Job Updates', icon: '🚨', critical: true },
  { id: 'expense_approved', label: 'Expense Approvals', icon: '💰' },
  { id: 'timesheet_approved', label: 'Timesheet Approvals', icon: '⏰' },
];

const CHAT_NOTIFICATION_TYPES = [
  { id: 'chat_mention', label: 'Chat Mentions', description: 'When someone @mentions you', icon: AtSign, color: 'text-blue-500' },
  { id: 'group_invite', label: 'Group Invites', description: 'When invited to a group chat', icon: UserPlus, color: 'text-purple-500' },
  { id: 'direct_message', label: 'Direct Messages', description: 'Private messages from others', icon: MessageSquare, color: 'text-green-500' },
  { id: 'group_message', label: 'Group Messages', description: 'Messages in group chats', icon: Users, color: 'text-amber-500' }
];

const SNOOZE_OPTIONS = [
  { value: '30m', label: '30 minutes', minutes: 30 },
  { value: '1h', label: '1 hour', minutes: 60 },
  { value: '2h', label: '2 hours', minutes: 120 },
  { value: '4h', label: '4 hours', minutes: 240 },
  { value: '8h', label: '8 hours', minutes: 480 },
  { value: '24h', label: '24 hours', minutes: 1440 },
  { value: 'tomorrow', label: 'Until tomorrow 9 AM', minutes: null },
  { value: 'custom', label: 'Custom...', minutes: null }
];

export default function NotificationSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showCustomSnooze, setShowCustomSnooze] = useState(false);
  const [customSnoozeDate, setCustomSnoozeDate] = useState('');
  const [customSnoozeTime, setCustomSnoozeTime] = useState('');

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
        quiet_hours_enabled: false,
        chat_mention_in_app: true,
        chat_mention_email: true,
        chat_mention_push: true,
        chat_mention_badge: true,
        group_invite_in_app: true,
        group_invite_email: true,
        group_invite_push: true,
        group_invite_badge: true,
        direct_message_in_app: true,
        direct_message_email: false,
        direct_message_push: true,
        direct_message_badge: true,
        group_message_in_app: true,
        group_message_email: false,
        group_message_push: false,
        group_message_badge: true,
        snooze_until: null,
        snooze_type: null
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

  const handleSnooze = (option, snoozeType = 'all') => {
    let snoozeUntil;
    
    if (option === 'custom') {
      if (!customSnoozeDate || !customSnoozeTime) {
        toast.error('Please select date and time');
        return;
      }
      snoozeUntil = new Date(`${customSnoozeDate}T${customSnoozeTime}`);
    } else if (option === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      snoozeUntil = tomorrow;
    } else {
      const minutes = SNOOZE_OPTIONS.find(o => o.value === option)?.minutes;
      if (minutes) {
        snoozeUntil = addMinutes(new Date(), minutes);
      }
    }

    if (snoozeUntil) {
      const updated = {
        ...localSettings,
        snooze_until: snoozeUntil.toISOString(),
        snooze_type: snoozeType
      };
      setLocalSettings(updated);
      updateMutation.mutate(updated);
      setShowCustomSnooze(false);
      toast.success(`Notifications snoozed until ${format(snoozeUntil, 'MMM d, h:mm a')}`);
    }
  };

  const handleCancelSnooze = () => {
    const updated = {
      ...localSettings,
      snooze_until: null,
      snooze_type: null
    };
    setLocalSettings(updated);
    updateMutation.mutate(updated);
    toast.success('Snooze cancelled');
  };

  const isCurrentlySnoozed = localSettings?.snooze_until && !isPast(new Date(localSettings.snooze_until));

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
          {/* Snooze Banner */}
          {isCurrentlySnoozed && (
            <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BellOff className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-300">
                        Notifications Snoozed
                      </p>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        {localSettings.snooze_type === 'all' ? 'All notifications' : `${localSettings.snooze_type} notifications`} until {format(new Date(localSettings.snooze_until), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCancelSnooze} className="border-amber-300 text-amber-700 hover:bg-amber-100">
                    Cancel Snooze
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Snooze Notifications */}
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                <BellOff className="w-5 h-5 text-[#3B9FF3]" />
                Snooze Notifications
              </CardTitle>
              <CardDescription>
                Temporarily pause notifications for a period of time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SNOOZE_OPTIONS.filter(o => o.value !== 'custom').map(option => (
                    <Button
                      key={option.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSnooze(option.value)}
                      disabled={isCurrentlySnoozed}
                      className="justify-center"
                    >
                      {option.label}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomSnooze(!showCustomSnooze)}
                    disabled={isCurrentlySnoozed}
                  >
                    Custom...
                  </Button>
                </div>

                {showCustomSnooze && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-slate-700 dark:text-slate-300">Date</Label>
                        <Input
                          type="date"
                          value={customSnoozeDate}
                          onChange={(e) => setCustomSnoozeDate(e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="bg-white dark:bg-slate-700"
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-slate-700 dark:text-slate-300">Time</Label>
                        <Input
                          type="time"
                          value={customSnoozeTime}
                          onChange={(e) => setCustomSnoozeTime(e.target.value)}
                          className="bg-white dark:bg-slate-700"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select defaultValue="all" onValueChange={(v) => handleSnooze('custom', v)}>
                        <SelectTrigger className="bg-white dark:bg-slate-700">
                          <SelectValue placeholder="Snooze type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Notifications</SelectItem>
                          <SelectItem value="push">Push Only</SelectItem>
                          <SelectItem value="email">Email Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <PushNotificationManager user={user} />

          {/* Tabs for notification categories */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4">
              {/* General Notification Channels */}
              <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white">General Notifications</CardTitle>
                  <CardDescription>
                    Choose how you want to be notified for each type of event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Headers */}
                    <div className="grid grid-cols-4 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-1">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Event Type</p>
                      </div>
                      <div className="text-center">
                        <Bell className="w-4 h-4 mx-auto text-[#3B9FF3] mb-1" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">In-App</p>
                      </div>
                      <div className="text-center">
                        <Mail className="w-4 h-4 mx-auto text-[#3B9FF3] mb-1" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</p>
                      </div>
                      <div className="text-center">
                        <Smartphone className="w-4 h-4 mx-auto text-[#3B9FF3] mb-1" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Push</p>
                      </div>
                    </div>

                    {/* Notification Types */}
                    {NOTIFICATION_TYPES.map((type) => (
                      <div key={type.id} className={`grid grid-cols-4 gap-4 items-center py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors ${type.critical ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                        <div className="col-span-1 flex items-center gap-2">
                          <span className="text-xl">{type.icon}</span>
                          <div>
                            <Label className="text-sm text-slate-900 dark:text-white font-medium cursor-pointer">
                              {type.label}
                            </Label>
                            {type.critical && (
                              <Badge className="ml-2 bg-amber-100 text-amber-700 text-[10px] px-1">Critical</Badge>
                            )}
                          </div>
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
            </TabsContent>

            <TabsContent value="chat" className="mt-4">
              {/* Chat Notification Settings */}
              <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#3B9FF3]" />
                    Chat Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure notifications for chat-related activities including badges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Headers */}
                    <div className="grid grid-cols-5 gap-4 pb-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="col-span-1">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Type</p>
                      </div>
                      <div className="text-center">
                        <Bell className="w-4 h-4 mx-auto text-[#3B9FF3] mb-1" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">In-App</p>
                      </div>
                      <div className="text-center">
                        <Mail className="w-4 h-4 mx-auto text-[#3B9FF3] mb-1" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</p>
                      </div>
                      <div className="text-center">
                        <Smartphone className="w-4 h-4 mx-auto text-[#3B9FF3] mb-1" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Push</p>
                      </div>
                      <div className="text-center">
                        <Circle className="w-4 h-4 mx-auto text-red-500 mb-1" />
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Badge</p>
                      </div>
                    </div>

                    {/* Chat Notification Types */}
                    {CHAT_NOTIFICATION_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <div key={type.id} className="grid grid-cols-5 gap-4 items-center py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                          <div className="col-span-1">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-5 h-5 ${type.color}`} />
                              <div>
                                <Label className="text-sm text-slate-900 dark:text-white font-medium cursor-pointer block">
                                  {type.label}
                                </Label>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{type.description}</p>
                              </div>
                            </div>
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
                          <div className="flex justify-center">
                            <Switch
                              checked={localSettings[`${type.id}_badge`]}
                              onCheckedChange={(checked) => handleToggle(`${type.id}_badge`, checked)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Additional Settings */}
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
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
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
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