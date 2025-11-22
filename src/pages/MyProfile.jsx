import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, Briefcase, Calendar, MapPin, Camera, AlertCircle, Clock, UserCircle, FileText, Calendar as CalendarIcon, Receipt, Banknote } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { getDisplayName } from "@/components/utils/nameHelpers";
import PhoneInput from "@/components/shared/PhoneInput";
import PhotoAvatarManager from "../components/avatar/PhotoAvatarManager";
import CertificationMonitor from "../components/certifications/CertificationMonitor";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function MyProfile() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch user's certifications for alerts
  const { data: myCertifications = [] } = useQuery({
    queryKey: ['myCertifications', user?.email],
    queryFn: () => base44.entities.Certification.filter({ employee_email: user.email }),
    enabled: !!user?.email,
    initialData: []
  });

  // Fetch performance reviews (recognitions)
  const { data: myRecognitions = [] } = useQuery({
    queryKey: ['myRecognitions', user?.email],
    queryFn: () => base44.entities.Recognition.filter({ employee_email: user.email }, '-created_date', 10),
    enabled: !!user?.email,
    initialData: []
  });

  // Fetch certification alerts
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
      alert('✅ Perfil actualizado exitosamente');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3B9FF3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700">{t('loading')}...</p>
        </div>
      </div>
    );
  }

  // Calculate certification stats
  const expiringSoon = myCertifications.filter(c => {
    if (!c.expiration_date || c.status === 'expired') return false;
    const daysUntilExpiry = differenceInDays(new Date(c.expiration_date), new Date());
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  });

  const expired = myCertifications.filter(c => c.status === 'expired');

  const currentImage = user.preferred_profile_image === 'avatar' && user.avatar_image_url
    ? user.avatar_image_url
    : user.profile_photo_url;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* BACKGROUND CERTIFICATION MONITORING */}
      <CertificationMonitor userEmail={user.email} />

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mi Perfil</h1>
          <p className="text-slate-600">Gestiona tu información personal</p>
        </div>

        {/* CERTIFICATION ALERTS */}
        {expiringSoon.length > 0 && (
          <Alert className="mb-6 bg-amber-50 border-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" />
                {expiringSoon.length} certification(s) expiring soon
              </strong>
              <div className="space-y-1 text-sm">
                {expiringSoon.map(cert => {
                  const days = differenceInDays(new Date(cert.expiration_date), new Date());
                  return (
                    <div key={cert.id} className="flex items-center justify-between">
                      <span>• {cert.certification_name}</span>
                      <Badge className="bg-amber-200 text-amber-900">
                        {days} days left
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {expired.length > 0 && (
          <Alert className="mb-6 bg-red-50 border-red-300">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-900">
              <strong className="mb-2 block">
                ⚠️ {expired.length} expired certification(s) - Immediate action required
              </strong>
              <div className="space-y-1 text-sm">
                {expired.map(cert => (
                  <div key={cert.id}>• {cert.certification_name} (expired {format(new Date(cert.expiration_date), 'MMM dd, yyyy')})</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {myAlerts.length > 0 && (
          <Alert className="mb-6 bg-blue-50 border-blue-300">
            <Mail className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <strong>📧 {myAlerts.length} unread certification alert(s)</strong>
                  <p className="text-sm mt-1">Check your email for details</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    myAlerts.forEach(alert => acknowledgeAlertMutation.mutate(alert.id));
                  }}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  Dismiss All
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

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

            {/* Emergency Contact Section */}
            <div className="pt-6 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-[#3B9FF3]" />
                Emergency Contact
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Name</Label>
                  {editing ? (
                    <Input
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      placeholder="Contact name"
                      className="bg-white"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <User className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-900">{user.emergency_contact_name || 'Not set'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">Phone</Label>
                  {editing ? (
                    <PhoneInput
                      value={formData.emergency_contact_phone}
                      onChange={(value) => setFormData({ ...formData, emergency_contact_phone: value })}
                      className="bg-white"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <Phone className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-900">{user.emergency_contact_phone || 'Not set'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">Relationship</Label>
                  {editing ? (
                    <Input
                      value={formData.emergency_contact_relationship}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                      placeholder="e.g., Spouse, Parent"
                      className="bg-white"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <UserCircle className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-900">{user.emergency_contact_relationship || 'Not set'}</span>
                    </div>
                  )}
                </div>
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
                      emergency_contact_name: user?.emergency_contact_name || '',
                      emergency_contact_phone: user?.emergency_contact_phone || '',
                      emergency_contact_relationship: user?.emergency_contact_relationship || '',
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

        {/* Performance Reviews Section */}
        <Card className="border-slate-200 bg-white/90 backdrop-blur-sm shadow-lg mt-6">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <FileText className="w-5 h-5 text-[#3B9FF3]" />
              Recent Performance & Recognition
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {myRecognitions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No performance reviews or recognitions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myRecognitions.map((recognition) => (
                  <div key={recognition.id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            {recognition.recognition_type}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {format(new Date(recognition.created_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                        <p className="text-slate-900 font-medium mb-1">{recognition.title}</p>
                        <p className="text-sm text-slate-600">{recognition.description}</p>
                        {recognition.given_by_name && (
                          <p className="text-xs text-slate-500 mt-2">
                            Given by: {recognition.given_by_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#3B9FF3]">
                          +{recognition.points}
                        </div>
                        <div className="text-xs text-slate-500">points</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {user.last_performance_review_date && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Last formal review: {format(new Date(user.last_performance_review_date), 'MMMM dd, yyyy')}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links to Other Self-Service Features */}
        <Card className="border-slate-200 bg-white/90 backdrop-blur-sm shadow-lg mt-6">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-slate-900">Self-Service Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              <a 
                href="/TimeOffRequests" 
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <CalendarIcon className="w-8 h-8 text-[#3B9FF3] mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-slate-900 mb-1">Request Time Off</h4>
                <p className="text-sm text-slate-600">Submit vacation or leave requests</p>
              </a>

              <a 
                href="/MisGastos" 
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <Receipt className="w-8 h-8 text-[#3B9FF3] mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-slate-900 mb-1">Submit Expenses</h4>
                <p className="text-sm text-slate-600">Upload receipts and expense reports</p>
              </a>

              <a 
                href="/MyPayroll" 
                className="p-4 border-2 border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <Banknote className="w-8 h-8 text-[#3B9FF3] mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-semibold text-slate-900 mb-1">View Payslips</h4>
                <p className="text-sm text-slate-600">Access your payroll history</p>
              </a>
            </div>
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