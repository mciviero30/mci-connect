import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Bell, BellOff, Calendar, Plane, MessageSquare, 
  CheckCircle, DollarSign, Users, AlertTriangle,
  Trash2, Check, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/shared/PageHeader';

const categoryIcons = {
  calendar: Calendar,
  travel: Plane,
  chat: MessageSquare,
  approvals: CheckCircle,
  finance: DollarSign,
  hr: Users,
  system: AlertTriangle
};

const categoryColors = {
  calendar: 'bg-blue-100 text-blue-800',
  travel: 'bg-purple-100 text-purple-800',
  chat: 'bg-green-100 text-green-800',
  approvals: 'bg-amber-100 text-amber-800',
  finance: 'bg-emerald-100 text-emerald-800',
  hr: 'bg-pink-100 text-pink-800',
  system: 'bg-red-100 text-red-800'
};

const priorityColors = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-500',
  high: 'border-l-orange-500',
  urgent: 'border-l-red-600'
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const notifs = await base44.entities.Notification.filter(
        { recipient_email: user.email },
        '-created_date',
        100
      );
      return notifs;
    },
    enabled: !!user?.email,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notifId) => {
      await base44.entities.Notification.update(notifId, {
        is_read: true,
        read_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifs.map(n => 
          base44.entities.Notification.update(n.id, {
            is_read: true,
            read_date: new Date().toISOString()
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteNotifMutation = useMutation({
    mutationFn: async (notifId) => {
      await base44.entities.Notification.delete(notifId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteAllReadMutation = useMutation({
    mutationFn: async () => {
      const readNotifs = notifications.filter(n => n.is_read);
      await Promise.all(readNotifs.map(n => base44.entities.Notification.delete(n.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.category === selectedCategory);
    }
    
    if (showUnreadOnly) {
      filtered = filtered.filter(n => !n.is_read);
    }
    
    return filtered;
  }, [notifications, selectedCategory, showUnreadOnly]);

  const categoryCounts = useMemo(() => {
    const counts = {
      all: notifications.filter(n => !n.is_read).length,
      calendar: notifications.filter(n => n.category === 'calendar' && !n.is_read).length,
      travel: notifications.filter(n => n.category === 'travel' && !n.is_read).length,
      chat: notifications.filter(n => n.category === 'chat' && !n.is_read).length,
      approvals: notifications.filter(n => n.category === 'approvals' && !n.is_read).length,
      finance: notifications.filter(n => n.category === 'finance' && !n.is_read).length,
      hr: notifications.filter(n => n.category === 'hr' && !n.is_read).length,
      system: notifications.filter(n => n.category === 'system' && !n.is_read).length
    };
    return counts;
  }, [notifications]);

  const handleNotificationClick = (notif) => {
    // Mark as read
    if (!notif.is_read) {
      markAsReadMutation.mutate(notif.id);
    }
    
    // Navigate to the action URL
    if (notif.action_url) {
      // Extract page name from URL (handles both formats: /PageName and #!/PageName)
      const pageName = notif.action_url.replace('#!/', '').replace('/', '');
      navigate(createPageUrl(pageName));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <PageHeader title="Notificaciones" icon={Bell} />
          <div className="mt-6 text-center text-gray-500">Cargando notificaciones...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title="Centro de Notificaciones"
          description="Todas tus notificaciones organizadas en un solo lugar"
          icon={Bell}
          badge={categoryCounts.all > 0 ? `${categoryCounts.all} sin leer` : 'Al día'}
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showUnreadOnly ? 'Todas' : 'Sin leer'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={categoryCounts.all === 0}
              >
                <Check className="w-4 h-4 mr-2" />
                Marcar todas leídas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteAllReadMutation.mutate()}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar leídas
              </Button>
            </div>
          }
        />

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mt-6">
          <TabsList className="grid grid-cols-8 w-full">
            <TabsTrigger value="all" className="relative">
              Todas
              {categoryCounts.all > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{categoryCounts.all}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="relative">
              <Calendar className="w-4 h-4 mr-1" />
              Calendario
              {categoryCounts.calendar > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{categoryCounts.calendar}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="travel" className="relative">
              <Plane className="w-4 h-4 mr-1" />
              Viajes
              {categoryCounts.travel > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{categoryCounts.travel}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="chat" className="relative">
              <MessageSquare className="w-4 h-4 mr-1" />
              Chat
              {categoryCounts.chat > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{categoryCounts.chat}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approvals" className="relative">
              <CheckCircle className="w-4 h-4 mr-1" />
              Aprobaciones
              {categoryCounts.approvals > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{categoryCounts.approvals}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="finance" className="relative">
              <DollarSign className="w-4 h-4 mr-1" />
              Finanzas
              {categoryCounts.finance > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{categoryCounts.finance}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="hr" className="relative">
              <Users className="w-4 h-4 mr-1" />
              HR
              {categoryCounts.hr > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{categoryCounts.hr}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="system" className="relative">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Sistema
              {categoryCounts.system > 0 && (
                <Badge className="ml-2 bg-red-500 text-white">{categoryCounts.system}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BellOff className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">
                    {showUnreadOnly ? 'No tienes notificaciones sin leer' : 'No hay notificaciones'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notif) => {
                  const Icon = categoryIcons[notif.category] || Bell;
                  
                  return (
                    <Card
                      key={notif.id}
                      className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${priorityColors[notif.priority]} ${
                        notif.is_read ? 'bg-white opacity-60' : 'bg-blue-50'
                      }`}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-lg ${categoryColors[notif.category]}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">{notif.title}</h3>
                                {!notif.is_read && (
                                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                )}
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">{notif.message}</p>
                              
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{format(new Date(notif.created_date), 'MMM dd, yyyy • h:mm a')}</span>
                                <Badge variant="outline" className="text-xs">
                                  {notif.category}
                                </Badge>
                                {notif.priority === 'urgent' && (
                                  <Badge className="bg-red-500 text-white">Urgente</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {!notif.is_read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsReadMutation.mutate(notif.id);
                                }}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotifMutation.mutate(notif.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}