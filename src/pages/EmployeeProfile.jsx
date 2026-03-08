import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Phone, MapPin, Calendar, Building2, Award, Clock, AlertCircle, Edit2, ArrowLeft } from "lucide-react";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { useNavigate } from "react-router-dom";

export default function EmployeeProfile() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const employeeIdParam = searchParams.get("id");

  const { data: user } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
  });

  // Use param ID if provided, otherwise use current user ID
  const targetUserId = employeeIdParam || user?.id;

  // Fetch target user data if viewing another employee
  const { data: targetUser } = useQuery({
    queryKey: ["user", employeeIdParam],
    queryFn: () => {
      if (!employeeIdParam) return null;
      return base44.entities.User.filter({ id: employeeIdParam }, "", 1)
        .then(results => results[0] || null);
    },
    enabled: !!employeeIdParam,
    staleTime: Infinity,
  });

  const { data: employeeProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["employeeProfile", targetUserId],
    queryFn: () => {
      if (!targetUserId) return null;
      return base44.entities.EmployeeProfile.filter({ user_id: targetUserId }, "", 1)
        .then(results => results[0] || null);
    },
    enabled: !!targetUserId,
    staleTime: Infinity,
  });

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const displayName = user?.full_name || "Employee";
  const displayEmail = user?.email || "N/A";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{displayName}</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Employee Profile</p>
        </div>
      </div>

      {/* Warning if no profile */}
      {!employeeProfile && (
        <Card className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Employee Profile Not Found
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                Your employee profile is being set up. Contact HR to complete your profile setup.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {employeeProfile ? (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="w-4 h-4" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Full Name</p>
                    <p className="font-medium">{employeeProfile.full_name || displayName}</p>
                  </div>
                  {employeeProfile.date_of_birth && (
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Date of Birth</p>
                      <p className="font-medium">
                        {new Date(employeeProfile.date_of_birth).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="w-4 h-4" />
                    Department
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Department</p>
                    <p className="font-medium">{employeeProfile.department || "Not assigned"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Position</p>
                    <p className="font-medium">{employeeProfile.position || "Not specified"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-4 h-4" />
                  Employment Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Status</p>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-100">
                    {employeeProfile.employment_status || "Active"}
                  </span>
                </div>
                {employeeProfile.hire_date && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Hire Date</p>
                    <p className="font-medium">
                      {new Date(employeeProfile.hire_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Work Email</p>
                  <p className="font-medium">{displayEmail}</p>
                </div>
                {employeeProfile.personal_email && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Personal Email</p>
                    <p className="font-medium">{employeeProfile.personal_email}</p>
                  </div>
                )}
                {employeeProfile.phone && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Phone</p>
                    <p className="font-medium">{employeeProfile.phone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {employeeProfile.address_line_1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{employeeProfile.address_line_1}</p>
                  {employeeProfile.address_line_2 && <p>{employeeProfile.address_line_2}</p>}
                  <p>
                    {employeeProfile.city && `${employeeProfile.city}, `}
                    {employeeProfile.state} {employeeProfile.zip}
                  </p>
                </CardContent>
              </Card>
            )}

            {employeeProfile.emergency_contact_name && (
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Name</p>
                    <p className="font-medium">{employeeProfile.emergency_contact_name}</p>
                  </div>
                  {employeeProfile.emergency_contact_phone && (
                    <div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Phone</p>
                      <p className="font-medium">{employeeProfile.emergency_contact_phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Employment Tab */}
          <TabsContent value="employment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Employment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Employment Type</p>
                  <p className="font-medium capitalize">
                    {employeeProfile.employment_type?.replace(/_/g, " ") || "Not specified"}
                  </p>
                </div>
                {employeeProfile.employee_code && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Employee Code</p>
                    <p className="font-medium">{employeeProfile.employee_code}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  Certifications & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">I-9 Completed</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    employeeProfile.i9_completed
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-100"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-100"
                  }`}>
                    {employeeProfile.i9_completed ? "✓ Yes" : "Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Background Check</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    employeeProfile.background_check_completed
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-100"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-100"
                  }`}>
                    {employeeProfile.background_check_completed ? "✓ Yes" : "Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Drug Test</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    employeeProfile.drug_test_completed
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-100"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-100"
                  }`}>
                    {employeeProfile.drug_test_completed ? "✓ Yes" : "Pending"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">OSHA Certified</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    employeeProfile.osha_certified
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-100"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-100"
                  }`}>
                    {employeeProfile.osha_certified ? "✓ Yes" : "No"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compensation Tab */}
          <TabsContent value="compensation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compensation Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Pay Type</p>
                  <p className="font-medium capitalize">
                    {employeeProfile.pay_type?.replace(/_/g, " ") || "Not specified"}
                  </p>
                </div>
                {employeeProfile.hourly_rate && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Hourly Rate</p>
                    <p className="font-medium text-lg">
                      ${employeeProfile.hourly_rate.toFixed(2)}/hr
                    </p>
                  </div>
                )}
                {employeeProfile.salary_annual && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Annual Salary</p>
                    <p className="font-medium text-lg">
                      ${employeeProfile.salary_annual.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Overtime Eligible</p>
                  <p className="font-medium">
                    {employeeProfile.overtime_eligible ? "Yes" : "No"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600 dark:text-slate-400 text-center">
              No employee profile data available. Contact your administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}