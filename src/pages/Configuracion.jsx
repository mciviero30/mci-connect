import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  User,
  Building2,
  Bell,
  Shield,
  Save,
  Upload,
  Users,
  DollarSign,
  HardDrive,
  Loader2,
  AlertTriangle,
  Receipt,
  Clock,
  Briefcase,
  Calendar as CalendarIcon,
  CalendarClock,
  Info,
  Camera,
  Sun,
  Moon
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";
import NotificationSettings from "@/components/notifications/NotificationSettings";
import CameraCapture from "@/components/shared/CameraCapture";
import AccountDeletionFlow from "@/components/settings/AccountDeletionFlow";
import SystemHealthDashboard from "@/components/admin/SystemHealthDashboard";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Configuracion() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: companySettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const settings = await base44.entities.CompanySettings.list();
      return settings[0] || {};
    },
    initialData: {}
  });

  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    profile_photo_url: user?.profile_photo_url || ''
  });

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const [settings, setSettings] = useState({
    company_name: '',
    company_logo_url: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    website: '',
    default_hourly_rate: 25,
    default_per_diem_amount: 50,
    default_vacation_accrual_rate: 1.5,
    notifications_email_fallback_enabled: true,
    notifications_email_subject_prefix: 'MCI Connect Alert'
  });

  // NEW: Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    enabled: true,
    expense_approved: true,
    expense_rejected: true,
    timesheet_approved: true,
    timesheet_rejected: true,
    job_assigned: true,
    job_deadline: true,
    company_announcements: true,
    sync_complete: true,
    sync_failed: true,
    schedule_changes: true,
    time_off_approved: true,
    time_off_rejected: true,
    urgent_only: false
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        address: user.address || '',
        profile_photo_url: user.profile_photo_url || ''
      });

      // Load notification preferences
      if (user.notification_preferences) {
        setNotificationPrefs(prev => ({ ...prev, ...user.notification_preferences }));
      }
    }
  }, [user]);

  useEffect(() => {
    if (companySettings && Object.keys(companySettings).length > 0) {
      setSettings({
        company_name: companySettings.company_name || '',
        company_logo_url: companySettings.company_logo_url || '',
        address_line_1: companySettings.address_line_1 || '',
        address_line_2: companySettings.address_line_2 || '',
        city: companySettings.city || '',
        state: companySettings.state || '',
        zip: companySettings.zip || '',
        phone: companySettings.phone || '',
        email: companySettings.email || '',
        website: companySettings.website || '',
        default_hourly_rate: companySettings.default_hourly_rate || 25,
        default_per_diem_amount: companySettings.default_per_diem_amount || 50,
        default_vacation_accrual_rate: companySettings.default_vacation_accrual_rate || 1.5,
        notifications_email_fallback_enabled: companySettings.notifications_email_fallback_enabled !== false,
        notifications_email_subject_prefix: companySettings.notifications_email_subject_prefix || 'MCI Connect Alert'
      });
    }
  }, [companySettings]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: async (updatedUser) => {
      // Direct cache update - NO INVALIDATION
      queryClient.setQueryData(['currentUser'], updatedUser);

      // Notify other tabs/windows and apps
      localStorage.setItem('profile_updated', Date.now().toString());
      localStorage.setItem('profile_timestamp', new Date().toISOString());
      window.dispatchEvent(new Event('profileUpdated'));

      toast({
        title: "✅ Success!",
        description: language === 'es' ? 'Perfil actualizado exitosamente.' : 'Profile updated successfully!',
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: language === 'es' ? `Error al actualizar perfil: ${error.message}` : `Error updating profile: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data) => {
      if (companySettings.id) {
        return await base44.entities.CompanySettings.update(companySettings.id, data);
      } else {
        return await base44.entities.CompanySettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
      toast({
        title: "✅ Success!",
        description: language === 'es' ? 'Configuración guardada exitosamente.' : 'Settings saved successfully!',
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: language === 'es' ? `Error al guardar configuración: ${error.message}` : `Error saving settings: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // NEW: Notification preferences mutation
  const updateNotificationPrefsMutation = useMutation({
    mutationFn: async (prefs) => {
      return await base44.auth.updateMe({ notification_preferences: prefs });
    },
    onSuccess: async (updatedUser) => {
      // Direct cache update - NO INVALIDATION
      queryClient.setQueryData(['currentUser'], updatedUser);
      toast({
        title: "✅ Success!",
        description: language === 'es' ? 'Preferencias de notificaciones guardadas.' : 'Notification preferences saved!',
      });
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: language === 'es' ? `Error al guardar preferencias: ${error.message}` : `Error saving preferences: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // NEW: Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: "✅ Success!",
          description: language === 'es' ? 'Notificaciones habilitadas exitosamente.' : 'Notifications enabled successfully!',
        });
        setNotificationPrefs(prev => ({ ...prev, enabled: true }));
      } else {
        toast({
          title: "⚠️ Warning",
          description: language === 'es' ? 'Permisos de notificación denegados.' : 'Notification permission denied.',
          variant: "destructive",
        });
        setNotificationPrefs(prev => ({ ...prev, enabled: false }));
      }
    }
  };

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileForm({ ...profileForm, profile_photo_url: file_url });
      // Update profile photo and set it as preferred if no preference exists
      const updatedUser = await base44.auth.updateMe({ 
        profile_photo_url: file_url,
        preferred_profile_image: user?.preferred_profile_image || 'photo'
      });
      // Direct cache update - NO INVALIDATION
      queryClient.setQueryData(['currentUser'], updatedUser);

      // Notify other tabs/windows and apps
      localStorage.setItem('profile_updated', Date.now().toString());
      localStorage.setItem('profile_timestamp', new Date().toISOString());
      window.dispatchEvent(new Event('profileUpdated'));

      toast({
        title: "✅ Success!",
        description: language === 'es' ? 'Foto de perfil actualizada.' : 'Profile photo updated!',
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: language === 'es' ? `Error al subir foto: ${error.message}` : `Error uploading photo: ${error.message}`,
        variant: "destructive",
      });
    }
    setUploading(false);
  };

  const handleCameraCapture = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileForm({ ...profileForm, profile_photo_url: file_url });
      const updatedUser = await base44.auth.updateMe({ 
        profile_photo_url: file_url,
        preferred_profile_image: user?.preferred_profile_image || 'photo'
      });
      // Direct cache update - NO INVALIDATION
      queryClient.setQueryData(['currentUser'], updatedUser);

      // Notify other tabs/windows and apps
      localStorage.setItem('profile_updated', Date.now().toString());
      localStorage.setItem('profile_timestamp', new Date().toISOString());
      window.dispatchEvent(new Event('profileUpdated'));

      toast({
        title: "✅ Success!",
        description: language === 'es' ? 'Foto capturada y actualizada.' : 'Photo captured and updated!',
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: language === 'es' ? `Error al subir foto: ${error.message}` : `Error uploading photo: ${error.message}`,
        variant: "destructive",
      });
    }
    setUploading(false);
  };

  const handleCompanyLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSettings({ ...settings, company_logo_url: file_url });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: language === 'es' ? `Error al subir logo: ${error.message}` : `Error uploading logo: ${error.message}`,
        variant: "destructive",
      });
    }
    setUploading(false);
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handleSaveNotificationPrefs = () => {
    updateNotificationPrefsMutation.mutate(notificationPrefs);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'ceo';
  const canEditProfile = user?.role === 'admin' || user?.role === 'ceo';
  const browserSupportsNotifications = 'Notification' in window;
  const notificationPermission = browserSupportsNotifications ? Notification.permission : 'default';

  return (
    <div className="overflow-hidden pb-safe p-4 md:p-8 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-full px-4 md:max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] rounded-2xl shadow-md">
              <Settings className="w-7 h-7 md:w-8 md:h-8 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A8A] dark:text-white">
              {language === 'es' ? 'Configuración' : 'Settings'}
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base ml-16">
            {language === 'es' ? 'Configura tu empresa y preferencias' : 'Configure your company and preferences'}
          </p>
        </div>

        <Tabs defaultValue={isAdmin ? "company" : "profile"} className="space-y-6">
          <TabsList className="w-full h-auto grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-2 rounded-2xl shadow-sm">
            <TabsTrigger value="company" className="w-full justify-center flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all rounded-xl text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs px-2 py-2">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="truncate">{language === 'es' ? 'Empresa' : 'Company'}</span>
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="defaults" className="w-full justify-center flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all rounded-xl text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs px-2 py-2">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="truncate">{language === 'es' ? 'Nómina y Beneficios' : 'Payroll & Benefits'}</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="w-full justify-center flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all rounded-xl text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs px-2 py-2">
                  <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="truncate">{language === 'es' ? 'Notif. Admin' : 'Notif. Admin'}</span>
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="profile" className="w-full justify-center flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all rounded-xl text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs px-2 py-2">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="truncate">{language === 'es' ? 'Mi Perfil' : 'My Profile'}</span>
            </TabsTrigger>
            <TabsTrigger value="my-notifications" className="w-full justify-center flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all rounded-xl text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs px-2 py-2">
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="truncate">{language === 'es' ? 'Mis Notif.' : 'My Notif.'}</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="system" className="w-full justify-center flex items-center gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all rounded-xl text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs px-2 py-2">
                <HardDrive className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="truncate">{language === 'es' ? 'Sistema' : 'System'}</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="company" className="pt-4">
            <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Building2 className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                  {language === 'es' ? 'Información de la Empresa' : 'Company Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-6 mb-6">
                  {settings.company_logo_url ? (
                    <img
                      src={settings.company_logo_url}
                      alt="Company Logo"
                      className="w-24 h-24 rounded-lg object-cover border-2 border-slate-300"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-[#3B9FF3] to-[#2A8FE3] rounded-lg flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-white" />
                    </div>
                  )}
                  {isAdmin && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCompanyLogoUpload}
                        disabled={uploading}
                        className="hidden"
                        id="company-logo-upload"
                      />
                      <Button
                        onClick={() => document.getElementById('company-logo-upload').click()}
                        disabled={uploading}
                        className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A]/90 hover:to-[#3B82F6]/90 text-white shadow-md"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? (language === 'es' ? 'Subiendo...' : 'Uploading...') : (language === 'es' ? 'Subir Logo' : 'Upload Logo')}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Nombre de la Empresa' : 'Company Name'}</Label>
                    <Input
                      value={settings.company_name}
                      onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                      disabled={!isAdmin}
                      className={!isAdmin ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Dirección Línea 1' : 'Address Line 1'}</Label>
                    <Input
                      value={settings.address_line_1}
                      onChange={(e) => setSettings({...settings, address_line_1: e.target.value})}
                      disabled={!isAdmin}
                      className={!isAdmin ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Ciudad' : 'City'}</Label>
                    <Input
                      value={settings.city}
                      onChange={(e) => setSettings({...settings, city: e.target.value})}
                      disabled={!isAdmin}
                      className={!isAdmin ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Estado' : 'State'}</Label>
                    <Input
                      value={settings.state}
                      onChange={(e) => setSettings({...settings, state: e.target.value})}
                      disabled={!isAdmin}
                      className={!isAdmin ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Teléfono' : 'Phone'}</Label>
                    <Input
                      value={settings.phone}
                      onChange={(e) => setSettings({...settings, phone: e.target.value})}
                      disabled={!isAdmin}
                      className={!isAdmin ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Email' : 'Email'}</Label>
                    <Input
                      value={settings.email}
                      onChange={(e) => setSettings({...settings, email: e.target.value})}
                      disabled={!isAdmin}
                      className={!isAdmin ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={updateSettingsMutation.isPending}
                      className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-md"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateSettingsMutation.isPending
                        ? (language === 'es' ? 'Guardando...' : 'Saving...')
                        : (language === 'es' ? 'Guardar Cambios' : 'Save Changes')
                      }
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="defaults" className="pt-4">
              <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <DollarSign className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                    {language === 'es' ? 'Configuración de Nómina y Beneficios' : 'Payroll & Benefits Settings'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <TooltipProvider>
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
                            {language === 'es' ? 'Tarifa Por Hora Predeterminada' : 'Default Hourly Rate'}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">
                                  {language === 'es' 
                                    ? 'Tarifa estándar global utilizada para todos los cálculos de nómina y análisis de trabajos' 
                                    : 'Global company standard used for all payroll calculations and job analysis'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <div className="relative mt-2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.50"
                              value={settings.default_hourly_rate}
                              onChange={(e) => setSettings({...settings, default_hourly_rate: parseFloat(e.target.value)})}
                              disabled={!isAdmin}
                              className={!isAdmin ? "pl-7 bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "pl-7 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
                            {language === 'es' ? 'Monto Per Diem Predeterminado' : 'Default Per Diem Amount'}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-slate-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs max-w-xs">
                                  {language === 'es' 
                                    ? 'Monto diario estándar para gastos de manutención en trabajos fuera de la oficina' 
                                    : 'Standard daily allowance for meals and expenses on out-of-office jobs'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <div className="relative mt-2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="5"
                              value={settings.default_per_diem_amount}
                              onChange={(e) => setSettings({...settings, default_per_diem_amount: parseFloat(e.target.value)})}
                              disabled={!isAdmin}
                              className={!isAdmin ? "pl-7 bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "pl-7 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
                          {language === 'es' ? 'Tasa de Acumulación de Vacaciones' : 'Vacation Accrual Rate'}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">
                                {language === 'es' 
                                  ? 'Días de vacaciones que acumula cada empleado por mes trabajado' 
                                  : 'Vacation days earned by employees per month of service'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            value={settings.default_vacation_accrual_rate}
                            onChange={(e) => setSettings({...settings, default_vacation_accrual_rate: parseFloat(e.target.value)})}
                            disabled={!isAdmin}
                            className={!isAdmin ? "w-32 bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "w-32 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}
                          />
                          <span className="text-slate-700 dark:text-slate-300">
                            {language === 'es' ? 'días por mes' : 'days per month'}
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex justify-end pt-4">
                          <Button
                            onClick={handleSaveSettings}
                            disabled={updateSettingsMutation.isPending}
                            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-md"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {updateSettingsMutation.isPending
                              ? (language === 'es' ? 'Guardando...' : 'Saving...')
                              : (language === 'es' ? 'Guardar Cambios' : 'Save Changes')
                            }
                          </Button>
                        </div>
                      )}
                    </div>
                  </TooltipProvider>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="notifications" className="pt-4">
              <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <Bell className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                    {language === 'es' ? 'Configuración de Notificaciones (Admin)' : 'Admin Notification Settings'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <input
                        type="checkbox"
                        id="email_fallback"
                        checked={settings.notifications_email_fallback_enabled}
                        onChange={(e) => setSettings({...settings, notifications_email_fallback_enabled: e.target.checked})}
                        className="w-5 h-5 mt-1 accent-[#3B9FF3]"
                      />
                      <div className="flex-1">
                        <Label htmlFor="email_fallback" className="text-slate-900 font-semibold cursor-pointer">
                          {language === 'es' ? 'Habilitar Email Fallback' : 'Enable Email Fallback'}
                        </Label>
                        <p className="text-sm text-slate-600 mt-1">
                          {language === 'es'
                            ? 'Enviar alertas urgentes por email si las notificaciones push fallan'
                            : 'Send urgent alerts via email if push notifications fail'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-700 font-semibold">
                        {language === 'es' ? 'Prefijo del Asunto de Email' : 'Email Subject Prefix'}
                      </Label>
                      <Input
                        value={settings.notifications_email_subject_prefix}
                        onChange={(e) => setSettings({...settings, notifications_email_subject_prefix: e.target.value})}
                        className="mt-2 bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleSaveSettings}
                        disabled={updateSettingsMutation.isPending}
                        className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSettingsMutation.isPending
                          ? (language === 'es' ? 'Guardando...' : 'Saving...')
                          : (language === 'es' ? 'Guardar Cambios' : 'Save Changes')
                        }
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="profile" className="pt-4">
            <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <User className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
                  {language === 'es' ? 'Mi Perfil' : 'My Profile'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center gap-6 mb-6">
                  {profileForm.profile_photo_url ? (
                    <img
                      src={profileForm.profile_photo_url}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-2 border-slate-300 dark:border-slate-600"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-[#3B9FF3] to-[#2A8FE3] rounded-full flex items-center justify-center text-white font-bold text-3xl">
                      {user?.full_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoUpload}
                      disabled={uploading}
                      className="hidden"
                      id="profile-photo-upload"
                    />
                    <Button
                      onClick={() => setShowCamera(true)}
                      disabled={uploading}
                      className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-md"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Tomar Foto' : 'Take Photo'}
                    </Button>
                    <Button
                      onClick={() => document.getElementById('profile-photo-upload').click()}
                      disabled={uploading}
                      variant="outline"
                      className="border-slate-300 dark:border-slate-600"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? (language === 'es' ? 'Subiendo...' : 'Uploading...') : (language === 'es' ? 'Subir Archivo' : 'Upload File')}
                    </Button>
                  </div>
                </div>

                {!canEditProfile && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg mb-4">
                    <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {language === 'es' 
                        ? 'Tu información personal es administrada por RRHH. Contacta a tu administrador para realizar cambios.' 
                        : 'Your personal information is managed by HR. Contact your administrator to make changes.'}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Nombre Completo' : 'Full Name'}</Label>
                    <Input
                      value={profileForm.full_name}
                      onChange={(e) => canEditProfile && setProfileForm({...profileForm, full_name: e.target.value})}
                      disabled={!canEditProfile}
                      className={!canEditProfile ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "bg-slate-50 border-slate-200"}
                      autoCapitalizeInput={true}
                    />
                  </div>

                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Email' : 'Email'}</Label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">{language === 'es' ? 'Teléfono' : 'Phone'}</Label>
                    <Input
                      value={profileForm.phone}
                      onChange={(e) => canEditProfile && setProfileForm({...profileForm, phone: e.target.value})}
                      disabled={!canEditProfile}
                      className={!canEditProfile ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed text-slate-600 dark:text-slate-400" : "bg-slate-50 border-slate-200"}
                    />
                  </div>

                  {/* I6 - Dark Mode Toggle */}
                  <div className="space-y-2 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                      {language === 'es' ? 'Tema de Apariencia' : 'Appearance Theme'}
                    </Label>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        {theme === 'dark' ? (
                          <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        ) : (
                          <Sun className="w-5 h-5 text-slate-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {theme === 'dark' ? (language === 'es' ? 'Modo Oscuro' : 'Dark Mode') : (language === 'es' ? 'Modo Claro' : 'Light Mode')}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {language === 'es' ? 'Cambia entre tema claro y oscuro' : 'Switch between light and dark theme'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={theme === 'dark'}
                        onCheckedChange={(checked) => {
                          const newTheme = checked ? 'dark' : 'light';
                          setTheme(newTheme);
                          if (newTheme === 'dark') {
                            document.documentElement.classList.add('dark');
                          } else {
                            document.documentElement.classList.remove('dark');
                          }
                          localStorage.setItem('theme', newTheme);
                        }}
                      />
                    </div>
                  </div>

                  {canEditProfile && (
                    <Button
                      onClick={() => updateProfileMutation.mutate(profileForm)}
                      disabled={updateProfileMutation.isPending}
                      className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-md w-full mt-6 min-h-[48px]"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? (language === 'es' ? 'Guardando...' : 'Saving...') : (language === 'es' ? 'Guardar Cambios' : 'Save Changes')}
                    </Button>
                  )}

                  {/* Mandatory account deletion flow */}
                  <AccountDeletionFlow user={user} language={language} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-notifications" className="pt-4">
            <NotificationSettings user={user} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="system" className="pt-4">
              <SystemHealthDashboard language={language} />
            </TabsContent>
          )}
        </Tabs>

        <CameraCapture 
          isOpen={showCamera} 
          onClose={() => setShowCamera(false)} 
          onCapture={handleCameraCapture}
          language={language}
        />
      </div>
    </div>
  );
}

// Helper component for notification toggles
function NotificationToggle({ label, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between py-2">
      <Label className="text-slate-700 cursor-pointer" htmlFor={label}>
        {label}
      </Label>
      <Switch
        id={label}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-[#3B9FF3]"
      />
    </div>
  );
}

function SystemMaintenanceTools() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [fileAudit, setFileAudit] = useState(null);
  const [scanning, setScanning] = useState(false);

  const { data: loginAttempts = [] } = useQuery({
    queryKey: ['loginAttempts'],
    queryFn: () => base44.entities.LoginAttempt.filter({ success: false }, '-attempt_date', 50),
    initialData: []
  });

  const scanFiles = async () => {
    setScanning(true);
    try {
      const [expenses, jobFiles, employeeDocuments, aiDocuments] = await Promise.all([
        base44.entities.Expense.list(),
        base44.entities.JobFile.list(),
        base44.entities.EmployeeDocument.list(),
        base44.entities.AIDocument.list()
      ]);

      const totalFiles =
        expenses.filter(e => e.receipt_url).length +
        jobFiles.length +
        employeeDocuments.length +
        aiDocuments.filter(d => d.file_url).length;

      setFileAudit({
        totalFiles,
        estimatedSizeMB: (totalFiles * 0.5).toFixed(2),
        lastRun: new Date().toISOString(),
        breakdown: {
          receipts: expenses.filter(e => e.receipt_url).length,
          jobFiles: jobFiles.length,
          employeeDocuments: employeeDocuments.length,
          aiDocuments: aiDocuments.filter(d => d.file_url).length
        }
      });
    } catch (error) {
      toast({
        title: "Error",
        description: language === 'es' ? 'Error al escanear archivos' : 'Error scanning files',
        variant: "destructive",
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <HardDrive className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
            {language === 'es' ? 'Auditoría de Archivos' : 'File Audit'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Button
            onClick={scanFiles}
            disabled={scanning}
            className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A]/90 hover:to-[#3B82F6]/90 text-white shadow-md mb-4"
          >
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <HardDrive className="w-4 h-4 mr-2" />}
            {scanning ? (language === 'es' ? 'Escaneando...' : 'Scanning...') : (language === 'es' ? 'Escanear Archivos' : 'Scan Files')}
          </Button>

          {fileAudit && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 font-semibold">{language === 'es' ? 'Total de Archivos' : 'Total Files'}</p>
                  <p className="text-3xl font-bold text-blue-900">{fileAudit.totalFiles}</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-900 font-semibold">{language === 'es' ? 'Espacio Estimado' : 'Estimated Space'}</p>
                  <p className="text-3xl font-bold text-purple-900">{fileAudit.estimatedSizeMB} MB</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded-2xl">
        <CardHeader className="border-b border-slate-200 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Shield className="w-5 h-5 text-[#3B9FF3] dark:text-blue-400" />
            {language === 'es' ? 'Intentos de Login Fallidos' : 'Failed Login Attempts'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {loginAttempts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {language === 'es' ? 'No hay intentos fallidos' : 'No failed attempts'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'es' ? 'Email' : 'Email'}</TableHead>
                  <TableHead>{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginAttempts.map((attempt, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{attempt.email_attempted}</TableCell>
                    <TableCell>{format(new Date(attempt.attempt_date), 'MMM dd, yyyy HH:mm')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}