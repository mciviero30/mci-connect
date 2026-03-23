import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User, Mail, Phone, Briefcase, Calendar, MapPin, Camera, AlertCircle,
  Clock, UserCircle, FileText, Receipt, Banknote, Edit3, Save, X,
  Award, Shield, ChevronRight, Sparkles, Lock, Shirt, DollarSign,
  Upload, Download, Trash2, CheckCircle, AlertTriangle, Star, Heart,
  Home, Building2, Users
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, differenceInDays, differenceInMonths } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { getDisplayName } from "@/components/utils/nameHelpers";
import PhotoAvatarManager from "../components/avatar/PhotoAvatarManager";
import CertificationMonitor from "../components/certifications/CertificationMonitor";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { buildUserQuery } from "@/components/utils/userResolution";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { formatPhoneNumber } from "@/components/utils/phoneFormatter";

export default function MyProfile() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const { data: user } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
  });

  const { data: myCertifications = [] } = useQuery({
    queryKey: ['myCertifications', user?.id],
    queryFn: () => {
      const query = buildUserQuery(user, 'user_id', 'employee_email');
      return base44.entities.Certification.filter(query);
    },
    enabled: !!user,
    initialData: []
  });

  const { data: myRecognitions = [] } = useQuery({
    queryKey: ['myRecognitions', user?.id],
    queryFn: () => {
      const query = buildUserQuery(user, 'employee_user_id', 'employee_email');
      return base44.entities.Recognition.filter(query, '-created_date', 10);
    },
    enabled: !!user,
    initialData: []
  });

  const { data: myDocuments = [] } = useQuery({
    queryKey: ['myEmployeeDocuments', user?.id],
    queryFn: () => base44.entities.EmployeeDocument.filter({ employee_email: user?.email }, '-created_date', 50),
    enabled: !!user?.email,
    initialData: []
  });

  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    tshirt_size: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: ''
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        phone: user.phone || '',
        address: user.address || '',
        tshirt_size: user.tshirt_size || '',
        emergency_contact_name: user.emergency_contact_name || '',
        emergency_contact_phone: user.emergency_contact_phone || '',
        emergency_contact_relationship: user.emergency_contact_relationship || ''
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, updatedUser);
      setEditing(false);
    },
  });

  const uploadDocMutation = useMutation({
    mutationFn: async (file) => {
      setUploadingDoc(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.EmployeeDocument.create({
        employee_email: user.email,
        document_name: file.name,
        document_url: file_url,
        document_type: 'personal',
        uploaded_by: user.email,
        status: 'pending_review'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEmployeeDocuments'] });
      setUploadingDoc(false);
    },
    onError: () => setUploadingDoc(false)
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => base44.entities.EmployeeDocument.delete(docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['myEmployeeDocuments'] })
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentImage = user.preferred_profile_image === 'avatar' && user.avatar_image_url
    ? user.avatar_image_url
    : user.profile_photo_url || user.avatar_image_url;

  const totalPoints = myRecognitions.reduce((sum, r) => sum + (r.points || 0), 0);
  const activeCerts = myCertifications.filter(c => c.status === 'active').length;
  const expiredCerts = myCertifications.filter(c => c.status === 'expired').length;
  const monthsWorked = user.hire_date ? differenceInMonths(new Date(), new Date(user.hire_date)) : 0;

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadDocMutation.mutate(file);
    e.target.value = '';
  };

  const getDocIcon = (name = '') => {
    if (name.toLowerCase().includes('pdf')) return '📄';
    if (name.toLowerCase().match(/\.(jpg|jpeg|png)/)) return '🖼️';
    return '📎';
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-20">
      <CertificationMonitor userEmail={user.email} />

      {/* ─── Hero Banner ─── */}
      <div className="relative bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#7C3AED] overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <div className="relative px-4 pt-6 pb-20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">MCI Connect</p>
              <h1 className="text-2xl font-bold text-white">My Profile</h1>
            </div>
            {!editing ? (
              <Button onClick={() => setEditing(true)} size="sm"
                className="bg-white/15 border border-white/30 text-white hover:bg-white/25 backdrop-blur-sm">
                <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => { setEditing(false); }} size="sm"
                  className="bg-white/15 border border-white/30 text-white hover:bg-white/25">
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={() => updateProfileMutation.mutate(formData)} size="sm"
                  disabled={updateProfileMutation.isPending}
                  className="bg-white text-blue-700 hover:bg-blue-50 font-semibold">
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {updateProfileMutation.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Profile Card (overlapping hero) ─── */}
      <div className="px-3 -mt-14 relative z-10">
        <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-0 overflow-hidden mb-3">
          <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <button onClick={() => setShowPhotoManager(true)} className="group relative flex-shrink-0">
                {currentImage ? (
                  <img src={currentImage} alt="Profile"
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-lg" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-white shadow-lg">
                    <span className="text-white font-bold text-3xl">
                      {getDisplayName(user)?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-white shadow">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </button>

              {/* Name & Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{getDisplayName(user)}</h2>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{user.position || 'Employee'}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {user.department && (
                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-2 py-0">
                      <Building2 className="w-2.5 h-2.5 mr-1" />{user.department}
                    </Badge>
                  )}
                  {user.team_name && (
                    <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-2 py-0">
                      <Users className="w-2.5 h-2.5 mr-1" />{user.team_name}
                    </Badge>
                  )}
                  <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px] px-2 py-0">
                    <CheckCircle className="w-2.5 h-2.5 mr-1" />Active
                  </Badge>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="text-center p-2.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30">
                <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-base font-bold text-blue-700">{monthsWorked}</p>
                <p className="text-[9px] text-blue-600 font-medium">Months</p>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30">
                <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <p className="text-base font-bold text-amber-700">{totalPoints}</p>
                <p className="text-[9px] text-amber-600 font-medium">Points</p>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30">
                <Shield className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-base font-bold text-green-700">{activeCerts}</p>
                <p className="text-[9px] text-green-600 font-medium">Certs</p>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30">
                <FileText className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                <p className="text-base font-bold text-purple-700">{myDocuments.length}</p>
                <p className="text-[9px] text-purple-600 font-medium">Docs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-3 rounded-xl bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 p-1 h-auto">
            <TabsTrigger value="info" className="text-[10px] font-semibold py-2 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <User className="w-3 h-3 mr-1" />Info
            </TabsTrigger>
            <TabsTrigger value="docs" className="text-[10px] font-semibold py-2 rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <FileText className="w-3 h-3 mr-1" />Docs
            </TabsTrigger>
            <TabsTrigger value="certs" className="text-[10px] font-semibold py-2 rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <Shield className="w-3 h-3 mr-1" />Certs
            </TabsTrigger>
            <TabsTrigger value="kudos" className="text-[10px] font-semibold py-2 rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Award className="w-3 h-3 mr-1" />Kudos
            </TabsTrigger>
          </TabsList>

          {/* ── INFO TAB ── */}
          <TabsContent value="info" className="space-y-3 mt-0">
            {/* Personal Info */}
            <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-0">
              <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-t-2xl" />
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <InfoRow label="Full Name" value={getDisplayName(user)} locked />
                  <InfoRow label="Email" value={user.email} locked />
                  <InfoRow
                    label="Phone"
                    value={formatPhoneNumber(user.phone)}
                    editing={editing}
                    editNode={
                      <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="000-000-0000" className="h-8 text-sm" />
                    }
                  />
                  <InfoRow
                    label="Address"
                    value={user.address}
                    editing={editing}
                    editNode={
                      <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Street, City, State ZIP" className="h-8 text-sm" />
                    }
                  />
                  <InfoRow
                    label="T-Shirt Size"
                    value={user.tshirt_size}
                    editing={editing}
                    editNode={
                      <Select value={formData.tshirt_size} onValueChange={v => setFormData({ ...formData, tshirt_size: v })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          {['XS','S','M','L','XL','XXL','XXXL'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Employment Info */}
            <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-0">
              <div className="h-1 bg-gradient-to-r from-purple-500 to-pink-400 rounded-t-2xl" />
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  Employment Details
                </h3>
                <div className="space-y-3">
                  <InfoRow label="Department" value={user.department} locked />
                  <InfoRow label="Position" value={user.position} locked />
                  <InfoRow label="Team" value={user.team_name} locked />
                  <InfoRow label="Hire Date" value={user.hire_date ? format(new Date(user.hire_date), 'MMMM dd, yyyy') : null} locked />
                  <InfoRow label="Employment Type" value={user.employment_type?.replace('_', ' ')} locked />
                  {user.hourly_rate && <InfoRow label="Hourly Rate" value={`$${user.hourly_rate?.toFixed(2)}/hr`} locked />}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-0">
              <div className="h-1 bg-gradient-to-r from-red-400 to-orange-400 rounded-t-2xl" />
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                    <Heart className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  Emergency Contact
                  {editing && <Badge className="ml-auto bg-green-100 text-green-700 text-[9px]">Editable</Badge>}
                </h3>
                <div className="space-y-3">
                  <InfoRow label="Contact Name" value={user.emergency_contact_name} editing={editing}
                    editNode={<Input value={formData.emergency_contact_name} onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })} placeholder="Full name" className="h-8 text-sm" />} />
                  <InfoRow label="Contact Phone" value={formatPhoneNumber(user.emergency_contact_phone)} editing={editing}
                    editNode={<Input value={formData.emergency_contact_phone} onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })} placeholder="000-000-0000" className="h-8 text-sm" />} />
                  <InfoRow label="Relationship" value={user.emergency_contact_relationship} editing={editing}
                    editNode={<Input value={formData.emergency_contact_relationship} onChange={e => setFormData({ ...formData, emergency_contact_relationship: e.target.value })} placeholder="e.g. Spouse, Parent" className="h-8 text-sm" />} />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-0">
              <div className="h-1 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-t-2xl" />
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-900 dark:text-white mb-3 text-sm">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { to: 'TimeOffRequests', icon: Calendar, label: 'Time Off', color: 'blue' },
                    { to: 'MisGastos', icon: Receipt, label: 'My Expenses', color: 'green' },
                    { to: 'MyPayroll', icon: Banknote, label: 'My Payroll', color: 'purple' },
                    { to: 'MisHoras', icon: Clock, label: 'My Hours', color: 'amber' },
                  ].map(({ to, icon: Icon, label, color }) => (
                    <Link key={to} to={createPageUrl(to)}>
                      <div className={`flex items-center gap-2 p-2.5 rounded-xl bg-${color}-50 dark:bg-${color}-900/20 hover:bg-${color}-100 transition-colors border border-${color}-100`}>
                        <Icon className={`w-4 h-4 text-${color}-600`} />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                        <ChevronRight className="w-3 h-3 text-slate-400 ml-auto" />
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DOCUMENTS TAB ── */}
          <TabsContent value="docs" className="mt-0">
            <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-0">
              <div className="h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-t-2xl" />
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    My Documents
                  </h3>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors">
                      {uploadingDoc ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3 h-3" />}
                      Upload
                    </div>
                  </label>
                </div>

                <p className="text-xs text-slate-500 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                  📎 Upload your personal documents: ID, certifications, agreements, etc. Files are submitted for admin review.
                </p>

                {myDocuments.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <FileText className="w-7 h-7 text-purple-300" />
                    </div>
                    <p className="text-sm text-slate-500">No documents uploaded yet</p>
                    <p className="text-xs text-slate-400 mt-1">Upload your ID, certifications, and more</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                          {getDocIcon(doc.document_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{doc.document_name}</p>
                          <p className="text-[10px] text-slate-500">{doc.created_date ? format(new Date(doc.created_date), 'MMM dd, yyyy') : ''}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {doc.status === 'approved' && <Badge className="bg-green-100 text-green-700 text-[9px] px-1.5">✓</Badge>}
                          {doc.status === 'pending_review' && <Badge className="bg-amber-100 text-amber-700 text-[9px] px-1.5">Pending</Badge>}
                          {doc.document_url && (
                            <a href={doc.document_url} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors">
                              <Download className="w-3 h-3 text-blue-600" />
                            </a>
                          )}
                          <button onClick={() => deleteDocMutation.mutate(doc.id)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CERTIFICATIONS TAB ── */}
          <TabsContent value="certs" className="mt-0">
            <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-0">
              <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-400 rounded-t-2xl" />
              <CardContent className="p-4">
                <h3 className="font-bold text-slate-900 dark:text-white mb-1 text-sm flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                    <Shield className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  Certifications & Compliance
                </h3>

                <div className="flex gap-2 mb-4 mt-2">
                  <div className="flex-1 text-center p-2 rounded-xl bg-green-50 border border-green-100">
                    <p className="text-lg font-bold text-green-700">{activeCerts}</p>
                    <p className="text-[10px] text-green-600">Active</p>
                  </div>
                  <div className="flex-1 text-center p-2 rounded-xl bg-red-50 border border-red-100">
                    <p className="text-lg font-bold text-red-600">{expiredCerts}</p>
                    <p className="text-[10px] text-red-500">Expired</p>
                  </div>
                  <div className="flex-1 text-center p-2 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-lg font-bold text-blue-700">{myCertifications.length}</p>
                    <p className="text-[10px] text-blue-600">Total</p>
                  </div>
                </div>

                {myCertifications.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Shield className="w-7 h-7 text-green-200" />
                    </div>
                    <p className="text-sm text-slate-500">No certifications on file</p>
                    <p className="text-xs text-slate-400 mt-1">Contact admin to add your certifications</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myCertifications.map((cert) => {
                      const isExpired = cert.status === 'expired';
                      const daysLeft = cert.expiration_date ? differenceInDays(new Date(cert.expiration_date), new Date()) : null;
                      const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

                      return (
                        <div key={cert.id} className={`p-3 rounded-xl border ${isExpired ? 'bg-red-50 border-red-200' : isExpiringSoon ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isExpired ? 'bg-red-100' : isExpiringSoon ? 'bg-amber-100' : 'bg-green-100'}`}>
                                {isExpired ? <AlertCircle className="w-4 h-4 text-red-600" /> : isExpiringSoon ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <CheckCircle className="w-4 h-4 text-green-600" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{cert.certification_name}</p>
                                {cert.expiration_date && (
                                  <p className="text-[10px] text-slate-500">
                                    Expires: {format(new Date(cert.expiration_date), 'MMM dd, yyyy')}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              {isExpired && <Badge className="bg-red-100 text-red-700 text-[9px]">Expired</Badge>}
                              {isExpiringSoon && !isExpired && <Badge className="bg-amber-100 text-amber-700 text-[9px]">{daysLeft}d left</Badge>}
                              {!isExpired && !isExpiringSoon && <Badge className="bg-green-100 text-green-700 text-[9px]">✓ Active</Badge>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── KUDOS TAB ── */}
          <TabsContent value="kudos" className="mt-0">
            <Card className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-0">
              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-t-2xl" />
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    Recognitions & Kudos
                  </h3>
                  <div className="bg-amber-100 text-amber-700 font-bold text-sm px-3 py-1 rounded-full">
                    ⭐ {totalPoints} pts
                  </div>
                </div>

                {myRecognitions.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Award className="w-7 h-7 text-amber-200" />
                    </div>
                    <p className="text-sm text-slate-500">No recognitions yet</p>
                    <p className="text-xs text-slate-400 mt-1">Keep up the great work!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myRecognitions.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                          🏆
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{r.title}</p>
                          {r.message && <p className="text-[10px] text-slate-500 truncate">{r.message}</p>}
                          <p className="text-[10px] text-slate-400">{r.created_date ? format(new Date(r.created_date), 'MMM dd, yyyy') : ''}</p>
                        </div>
                        <Badge className="bg-amber-200 text-amber-800 font-bold text-xs px-2 flex-shrink-0">+{r.points}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <PhotoAvatarManager open={showPhotoManager} onOpenChange={setShowPhotoManager} />
    </div>
  );
}

// ─── Helper component ───
function InfoRow({ label, value, locked, editing, editNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div className="flex items-center gap-1 min-w-[100px]">
        {locked && <Lock className="w-2.5 h-2.5 text-slate-300" />}
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex-1 text-right">
        {editing && editNode ? editNode : (
          <span className="text-xs font-medium text-slate-900 dark:text-white">{value || '—'}</span>
        )}
      </div>
    </div>
  );
}