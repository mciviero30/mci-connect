import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Briefcase, Calendar, MapPin, Camera } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { getDisplayName } from "@/components/utils/nameHelpers";
import PhoneInput from "@/components/shared/PhoneInput";
import PhotoAvatarManager from "../components/avatar/PhotoAvatarManager";

export default function MyProfile() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [formData, setFormData] = useState({
    phone: user?.phone || '',
    address: user?.address || '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setEditing(false);
      alert('✅ Perfil actualizado exitosamente');
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3B9FF3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  const currentImage = user.preferred_profile_image === 'avatar' && user.avatar_image_url
    ? user.avatar_image_url
    : user.profile_photo_url;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mi Perfil</h1>
          <p className="text-slate-600">Gestiona tu información personal</p>
        </div>

        {/* Profile Picture - Clickable */}
        <Card className="mb-6 border-slate-200 bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Camera className="w-5 h-5 text-[#3B9FF3]" />
              Foto de Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={() => setShowPhotoManager(true)}
                className="group relative cursor-pointer transition-transform hover:scale-105"
              >
                {currentImage ? (
                  <img
                    src={currentImage}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg group-hover:border-blue-400 transition-all"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#3B9FF3] to-blue-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                    <span className="text-white font-bold text-5xl">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                  <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
              
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-2">Click en la foto para cambiarla</p>
                <Button
                  onClick={() => setShowPhotoManager(true)}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Gestionar Foto y Avatar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="border-slate-200 bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <User className="w-5 h-5 text-[#3B9FF3]" />
                {t('information')}
              </CardTitle>
              <Button
                onClick={() => editing ? handleSave() : setEditing(true)}
                disabled={updateProfileMutation.isPending}
                className="bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white"
              >
                {updateProfileMutation.isPending ? t('saving') : editing ? t('save') : t('edit')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-slate-700">{t('fullName')}</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <User className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-900 font-medium">{getDisplayName(user)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">{t('email')}</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Mail className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-900">{user.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">{t('phone')}</Label>
                {editing ? (
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                    className="bg-white"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <Phone className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-900">{user.phone || 'No registrado'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700">{t('position')}</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Briefcase className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-900">{user.position || 'No asignado'}</span>
                </div>
              </div>

              {user.hire_date && (
                <div className="space-y-2">
                  <Label className="text-slate-700">{t('hireDate')}</Label>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <Calendar className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-900">{format(new Date(user.hire_date), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              )}

              {user.team_name && (
                <div className="space-y-2">
                  <Label className="text-slate-700">Equipo</Label>
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-900">{user.team_name}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700">{t('address')}</Label>
                {editing ? (
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ingresa tu dirección"
                    className="bg-white"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-900">{user.address || 'No registrada'}</span>
                  </div>
                )}
              </div>
            </div>

            {editing && (
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      phone: user?.phone || '',
                      address: user?.address || '',
                    });
                  }}
                  className="border-slate-300"
                >
                  {t('cancel')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <PhotoAvatarManager
          open={showPhotoManager}
          onOpenChange={setShowPhotoManager}
        />
      </div>
    </div>
  );
}