import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, Mail, Phone, Briefcase, Calendar, MapPin, Camera, AlertCircle, 
  Clock, UserCircle, FileText, Calendar as CalendarIcon, Receipt, Banknote,
  Edit3, Save, X, Award, Shield, ChevronRight, Sparkles
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { getDisplayName } from "@/components/utils/nameHelpers";
import PhoneInput from "@/components/shared/PhoneInput";
import PhotoAvatarManager from "../components/avatar/PhotoAvatarManager";
import CertificationMonitor from "../components/certifications/CertificationMonitor";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MyProfile() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myCertifications = [] } = useQuery({
    queryKey: ['myCertifications', user?.email],
    queryFn: () => base44.entities.Certification.filter({ employee_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: myRecognitions = [] } = useQuery({
    queryKey: ['myRecognitions', user?.email],
    queryFn: () => base44.entities.Recognition.filter({ employee_email: user.email }, '-created_date', 5),
    enabled: !!user?.email,
    initialData: []
  });

  const { data: myAlerts = [] } = useQuery({
    queryKey: ['myCertificationAlerts', user?.email],
    queryFn: () => base44.entities.CertificationAlert.filter({ 
      employee_email: user.email,
      acknowledged: false 
    }),
    enabled: !!user?.email,
    initialData: []
  });

  const [formData, setFormData] = useState({
    phone: user?.phone || '',
    address: user?.address || '',
    emergency_contact_name: user?.emergency_contact_name || '',
    emergency_contact_phone: user?.emergency_contact_phone || '',
    emergency_contact_relationship: user?.emergency_contact_relationship || '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setEditing(false);
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId) => 
      base44.entities.CertificationAlert.update(alertId, { acknowledged: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myCertificationAlerts'] });
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#181818]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  const expiringSoon = myCertifications.filter(c => {
    if (!c.expiration_date || c.status === 'expired') return false;
    const daysUntilExpiry = differenceInDays(new Date(c.expiration_date), new Date());
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  });

  const expired = myCertifications.filter(c => c.status === 'expired');

  const currentImage = user.preferred_profile_image === 'avatar' && user.avatar_image_url
    ? user.avatar_image_url
    : user.profile_photo_url || user.avatar_image_url;

  const totalPoints = myRecognitions.reduce((sum, r) => sum + (r.points || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#181818]">
      <CertificationMonitor userEmail={user.email} />

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-900 dark:via-blue-800 dark:to-indigo-900">
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-24">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
              <p className="text-blue-200 text-sm">Gestiona tu información personal</p>
            </div>
            {!editing ? (
              <Button
                onClick={() => setEditing(true)}
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      phone: user?.phone || '',
                      address: user?.address || '',
                      emergency_contact_name: user?.emergency_contact_name || '',
                      emergency_contact_phone: user?.emergency_contact_phone || '',
                      emergency_contact_relationship: user?.emergency_contact_relationship || '',
                    });
                  }}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending}
                  className="bg-white text-blue-700 hover:bg-blue-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-16">
        {/* Profile Card */}
        <Card className="bg-white dark:bg-[#282828] shadow-xl border-0 mb-6 overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              {/* Left - Photo Section */}
              <div className="md:w-72 p-6 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-[#282828] border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setShowPhotoManager(true)}
                  className="group relative mb-4"
                >
                  {currentImage ? (
                    <img
                      src={currentImage}
                      alt="Profile"
                      className="w-28 h-28 rounded-full object-cover ring-4 ring-white dark:ring-slate-700 shadow-lg group-hover:ring-blue-400 transition-all"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-4 ring-white dark:ring-slate-700 shadow-lg">
                      <span className="text-white font-bold text-4xl">
                        {user.full_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                    <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-700">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </button>
                
                <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center">
                  {getDisplayName(user)}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
                  {user.position || 'Empleado'}
                </p>
                
                {user.team_name && (
                  <Badge className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-0">
                    <MapPin className="w-3 h-3 mr-1" />
                    {user.team_name}
                  </Badge>
                )}

                <Button
                  onClick={() => setShowPhotoManager(true)}
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs"
                >
                  <Camera className="w-3 h-3 mr-1" />
                  Cambiar foto
                </Button>
              </div>

              {/* Right - Stats & Info */}
              <div className="flex-1 p-6">
                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <Award className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalPoints}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Puntos</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                    <Shield className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{myCertifications.length}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Certificaciones</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                    <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{myRecognitions.length}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Reconocimientos</p>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{user.phone || 'No registrado'}</span>
                  </div>
                  {user.hire_date && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Desde {format(new Date(user.hire_date), 'MMM yyyy')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{user.position || 'No asignado'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {(expiringSoon.length > 0 || expired.length > 0 || myAlerts.length > 0) && (
          <div className="space-y-3 mb-6">
            {expired.length > 0 && (
              <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-300">
                  <strong>⚠️ {expired.length} certificación(es) vencida(s)</strong>
                  <span className="text-sm ml-2">- Acción inmediata requerida</span>
                </AlertDescription>
              </Alert>
            )}
            {expiringSoon.length > 0 && (
              <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <Clock className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  <strong>{expiringSoon.length} certificación(es) por vencer</strong>
                  <span className="text-sm ml-2">en los próximos 30 días</span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Personal Info */}
            <Card className="bg-white dark:bg-[#282828] shadow-sm border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  Información Personal
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre</Label>
                    <p className="text-slate-900 dark:text-white font-medium mt-1">{getDisplayName(user)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</Label>
                    <p className="text-slate-900 dark:text-white font-medium mt-1">{user.email}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Teléfono</Label>
                    {editing ? (
                      <PhoneInput
                        value={formData.phone}
                        onChange={(value) => setFormData({ ...formData, phone: value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-slate-900 dark:text-white font-medium mt-1">{user.phone || '—'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Posición</Label>
                    <p className="text-slate-900 dark:text-white font-medium mt-1">{user.position || '—'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dirección</Label>
                    {editing ? (
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Ingresa tu dirección"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-slate-900 dark:text-white font-medium mt-1">{user.address || '—'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="bg-white dark:bg-[#282828] shadow-sm border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-red-500" />
                  Contacto de Emergencia
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nombre</Label>
                    {editing ? (
                      <Input
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                        placeholder="Nombre del contacto"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-slate-900 dark:text-white font-medium mt-1">{user.emergency_contact_name || '—'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Teléfono</Label>
                    {editing ? (
                      <PhoneInput
                        value={formData.emergency_contact_phone}
                        onChange={(value) => setFormData({ ...formData, emergency_contact_phone: value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-slate-900 dark:text-white font-medium mt-1">{user.emergency_contact_phone || '—'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Relación</Label>
                    {editing ? (
                      <Input
                        value={formData.emergency_contact_relationship}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                        placeholder="Ej: Esposo/a, Padre"
                        className="mt-1"
                      />
                    ) : (
                      <p className="text-slate-900 dark:text-white font-medium mt-1">{user.emergency_contact_relationship || '—'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recognitions */}
            {myRecognitions.length > 0 && (
              <Card className="bg-white dark:bg-[#282828] shadow-sm border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    Reconocimientos Recientes
                  </h3>
                  
                  <div className="space-y-3">
                    {myRecognitions.slice(0, 3).map((recognition) => (
                      <div key={recognition.id} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                          <Award className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{recognition.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {format(new Date(recognition.created_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-0">
                          +{recognition.points} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            <Card className="bg-white dark:bg-[#282828] shadow-sm border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">
                  Acciones Rápidas
                </h3>
                
                <div className="space-y-2">
                  <Link to={createPageUrl('TimeOffRequests')}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Solicitar Tiempo</p>
                        <p className="text-xs text-slate-500">Vacaciones o permisos</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </Link>

                  <Link to={createPageUrl('MisGastos')}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <Receipt className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Mis Gastos</p>
                        <p className="text-xs text-slate-500">Subir recibos</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-green-600 transition-colors" />
                    </div>
                  </Link>

                  <Link to={createPageUrl('MyPayroll')}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                        <Banknote className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Mi Nómina</p>
                        <p className="text-xs text-slate-500">Ver historial de pagos</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                    </div>
                  </Link>

                  <Link to={createPageUrl('MisHoras')}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">Mis Horas</p>
                        <p className="text-xs text-slate-500">Registrar tiempo</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Certifications Summary */}
            {myCertifications.length > 0 && (
              <Card className="bg-white dark:bg-[#282828] shadow-sm border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    Certificaciones
                  </h3>
                  
                  <div className="space-y-2">
                    {myCertifications.slice(0, 4).map((cert) => {
                      const isExpired = cert.status === 'expired';
                      const daysLeft = cert.expiration_date 
                        ? differenceInDays(new Date(cert.expiration_date), new Date())
                        : null;
                      
                      return (
                        <div key={cert.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">
                            {cert.certification_name}
                          </span>
                          {isExpired ? (
                            <Badge className="bg-red-100 text-red-700 text-xs">Vencida</Badge>
                          ) : daysLeft !== null && daysLeft <= 30 ? (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">{daysLeft}d</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 text-xs">Activa</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <PhotoAvatarManager
        open={showPhotoManager}
        onOpenChange={setShowPhotoManager}
      />
    </div>
  );
}