import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  User, Mail, Phone, MapPin, Calendar, Building2,
  Award, Clock, AlertCircle, ArrowLeft, DollarSign, Shield, Pencil, Save, X
} from "lucide-react";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { isAdmin as checkIsAdmin } from '@/components/permissions/permissionHelpers';

// Convert ALL CAPS or any case to proper Title Case
function toTitleCase(str) {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function InfoRow({ label, value, fallback = "Not specified" }) {
  return (
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="font-medium text-slate-900 dark:text-slate-100">{value || fallback}</p>
    </div>
  );
}

function StatusBadge({ value, trueLabel = "✓ Yes", falseLabel = "Pending" }) {
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded ${
      value
        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-100"
        : "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
    }`}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

export default function EmployeeProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const employeeIdParam = searchParams.get("id");

  const { data: currentUser } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
  });

  const isAdmin = checkIsAdmin(currentUser);
  const isAdminUser = isAdmin;

  // Fetch the target user if viewing another employee
  const { data: targetUser } = useQuery({
    queryKey: ["user-profile", employeeIdParam],
    queryFn: () =>
      base44.entities.User.filter({ id: employeeIdParam }, "", 1).then(r => r[0] || null),
    enabled: !!employeeIdParam,
    staleTime: Infinity,
  });

  const effectiveUser = employeeIdParam ? targetUser : currentUser;
  const targetUserId = effectiveUser?.id;

  // Fetch EmployeeProfile by user_id
  const { data: profile, isLoading } = useQuery({
    queryKey: ["employeeProfile", targetUserId],
    queryFn: () =>
      base44.entities.EmployeeProfile.filter({ user_id: targetUserId }, "", 1).then(r => r[0] || null),
    enabled: !!targetUserId,
    staleTime: Infinity,
  });

  // Fetch EmployeeInvitation by email as data fallback (for employees who registered before the sync fix)
  const { data: invitation } = useQuery({
    queryKey: ["employeeInvitation-profile", effectiveUser?.email],
    queryFn: () =>
      base44.entities.EmployeeInvitation.filter({ email: effectiveUser.email }, "", 1).then(r => r[0] || null),
    enabled: !!effectiveUser?.email && isAdmin,
    staleTime: Infinity,
  });

  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});

  const openEdit = () => {
    setEditForm({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      department: profile?.department || invitation?.department || '',
      position: profile?.position || invitation?.position || '',
      phone: profile?.phone || invitation?.phone || '',
      address_line_1: profile?.address_line_1 || invitation?.address || '',
      date_of_birth: profile?.date_of_birth || invitation?.dob || '',
      hourly_rate: profile?.hourly_rate || invitation?.hourly_rate || '',
      team_name: profile?.team_name || invitation?.team_name || '',
      hire_date: profile?.hire_date || '',
      employment_type: profile?.employment_type || 'full_time',
      personal_email: profile?.personal_email || '',
      emergency_contact_name: profile?.emergency_contact_name || '',
      emergency_contact_phone: profile?.emergency_contact_phone || '',
    });
    setEditOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // UPDATE via CENTRAL SYNC - syncs to EmployeeProfile + User + EmployeeDirectory + denormalized fields
      const response = await base44.asServiceRole.functions.invoke('updateEmployeeDataCentral', {
        profile_id: profile.id,
        user_id: targetUserId,
        updates: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          position: data.position,
          department: data.department,
          team_name: data.team_name,
          hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null
        }
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Sync failed');
      }
      
      return response;
    },
    onSuccess: () => {
      // Invalidate ALL related queries - refreshes everywhere
      queryClient.invalidateQueries({ queryKey: ["employeeProfile", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["employee-directory"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile", targetUserId] });
      queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
      setEditOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Merge profile + invitation as fallback for missing fields
  const dept       = profile?.department    || invitation?.department;
  const position   = profile?.position      || invitation?.position;
  const phone      = profile?.phone         || invitation?.phone;
  const address    = profile?.address_line_1 || invitation?.address;
  const dob        = profile?.date_of_birth  || invitation?.dob;
  const hourlyRate = profile?.hourly_rate    || invitation?.hourly_rate;
  const teamName   = profile?.team_name      || invitation?.team_name;

  // Normalize name to Title Case
  const rawName = profile?.full_name
    || (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : null)
    || effectiveUser?.full_name
    || "Employee";
  const displayName = toTitleCase(rawName);
  const displayEmail = effectiveUser?.email || "N/A";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {employeeIdParam && (
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mt-1 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{displayName}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Employee Profile</p>
          </div>
        </div>
        {isAdmin && profile && (
          <Button onClick={openEdit} className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white flex-shrink-0">
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit Employee — {displayName}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {[
              { key: 'first_name', label: 'First Name' },
              { key: 'last_name', label: 'Last Name' },
              { key: 'department', label: 'Department' },
              { key: 'position', label: 'Position' },
              { key: 'phone', label: 'Phone' },
              { key: 'personal_email', label: 'Personal Email' },
              { key: 'address_line_1', label: 'Address' },
              { key: 'team_name', label: 'Team Name' },
              { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
              { key: 'hire_date', label: 'Hire Date', type: 'date' },
              { key: 'hourly_rate', label: 'Hourly Rate ($)', type: 'number' },
              { key: 'emergency_contact_name', label: 'Emergency Contact Name' },
              { key: 'emergency_contact_phone', label: 'Emergency Contact Phone' },
            ].map(({ key, label, type = 'text' }) => (
              <div key={key}>
                <Label className="text-slate-700 dark:text-slate-300 font-medium text-sm">{label}</Label>
                <Input
                  type={type}
                  value={editForm[key] || ''}
                  onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate(editForm)}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Warning: no profile record */}
      {!profile && (
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Employee profile is being set up. Contact HR to complete the profile.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Invitation data notice for admin */}
      {profile && invitation && (
        !profile.department || !profile.phone || !profile.hourly_rate
      ) && isAdmin && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-4 flex items-start gap-3">
            <Shield className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Some fields are being pulled from the original invitation. To make them permanent, edit this employee's profile from the Employees page.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className={`grid ${isAdminUser ? 'grid-cols-4' : 'grid-cols-3'} w-full`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          {isAdminUser && <TabsTrigger value="compensation">Compensation</TabsTrigger>}
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4 text-blue-500" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Full Name" value={displayName} />
                {dob && (
                  <InfoRow
                    label="Date of Birth"
                    value={new Date(dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Department & Role
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Department" value={toTitleCase(dept)} fallback="Not assigned" />
                <InfoRow label="Position" value={toTitleCase(position)} />
                {teamName && <InfoRow label="Team" value={toTitleCase(teamName)} />}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-blue-500" />
                Employment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                  profile?.employment_status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-100'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                }`}>
                  {profile?.employment_status || "Active"}
                </span>
              </div>
              {profile?.hire_date && (
                <InfoRow
                  label="Hire Date"
                  value={new Date(profile.hire_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                />
              )}
              {profile?.employee_code && (
                <InfoRow label="Employee Code" value={profile.employee_code} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTACT */}
        <TabsContent value="contact" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow label="Work Email" value={displayEmail} />
              {profile?.personal_email && (
                <InfoRow label="Personal Email" value={profile.personal_email} />
              )}
              {phone && <InfoRow label="Phone" value={phone} />}
            </CardContent>
          </Card>

          {address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="font-medium text-slate-900 dark:text-slate-100">{address}</p>
                {profile?.address_line_2 && <p className="text-slate-700 dark:text-slate-300">{profile.address_line_2}</p>}
                {(profile?.city || profile?.state || profile?.zip) && (
                  <p className="text-slate-700 dark:text-slate-300">
                    {profile?.city && `${profile.city}, `}
                    {profile?.state} {profile?.zip}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {profile?.emergency_contact_name && (
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Name" value={profile.emergency_contact_name} />
                {profile.emergency_contact_phone && (
                  <InfoRow label="Phone" value={profile.emergency_contact_phone} />
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* EMPLOYMENT */}
        <TabsContent value="employment" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                label="Employment Type"
                value={profile?.employment_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              />
              {profile?.employee_code && (
                <InfoRow label="Employee Code" value={profile.employee_code} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-500" />
                Certifications & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "I-9 Completed", value: profile?.i9_completed },
                { label: "Background Check", value: profile?.background_check_completed },
                { label: "Drug Test", value: profile?.drug_test_completed },
                { label: "OSHA Certified", value: profile?.osha_certified, falseLabel: "No" },
              ].map(({ label, value, falseLabel }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                  <StatusBadge value={value} falseLabel={falseLabel || "Pending"} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMPENSATION */}
        <TabsContent value="compensation" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-500" />
                Compensation Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow
                label="Pay Type"
                value={profile?.pay_type?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              />
              {hourlyRate && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Hourly Rate</p>
                  <p className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                    ${Number(hourlyRate).toFixed(2)}/hr
                  </p>
                </div>
              )}
              {profile?.salary_annual && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Annual Salary</p>
                  <p className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                    ${Number(profile.salary_annual).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
              <InfoRow
                label="Overtime Eligible"
                value={profile?.overtime_eligible ? "Yes" : "No"}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}