import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, GraduationCap, FolderOpen, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import LiveAuditsTab from "@/components/compliance/LiveAuditsTab";
import WorkforceVaultTab from "@/components/compliance/WorkforceVaultTab";
import TrainingVaultTab from "@/components/compliance/TrainingVaultTab";
import DocumentControlTab from "@/components/compliance/DocumentControlTab";

export default function ComplianceHub() {
  const [activeTab, setActiveTab] = useState("audits");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'CEO' || user?.position === 'administrator';

  // Get compliance statistics
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-compliance'],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ status: 'active' }, 'full_name'),
    enabled: isAdmin,
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: allCertifications = [] } = useQuery({
    queryKey: ['all-certifications'],
    queryFn: () => base44.entities.Certification.list(),
    enabled: isAdmin,
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: onboardingForms = [] } = useQuery({
    queryKey: ['all-onboarding'],
    queryFn: () => base44.entities.OnboardingForm.list(),
    enabled: isAdmin,
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Calculate compliance metrics
  const activeEmployees = employees; // Already filtered to active in query
  const employeesWithOnboarding = [...new Set(onboardingForms.filter(f => f.status === 'completed').map(f => f.employee_email))];
  const onboardingCompliance = activeEmployees.length > 0 ? (employeesWithOnboarding.length / activeEmployees.length * 100).toFixed(0) : 0;

  const now = new Date();
  const expiringSoon = allCertifications.filter(cert => {
    if (!cert.expiration_date) return false;
    const expDate = new Date(cert.expiration_date);
    const daysUntilExpiry = (expDate - now) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }).length;

  const expired = allCertifications.filter(cert => {
    if (!cert.expiration_date) return false;
    return new Date(cert.expiration_date) < now;
  }).length;

  const stats = [
    { label: 'Onboarding Complete', value: `${onboardingCompliance}%`, icon: Shield },
    { label: 'Expiring Soon', value: expiringSoon, icon: AlertTriangle },
    { label: 'Expired Certs', value: expired, icon: AlertTriangle }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-red-950 p-6">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="MCI Compliance & Safety Hub"
          description="Centralized control for legal compliance, safety audits, workforce readiness, and training management"
          icon={Shield}
          stats={isAdmin ? stats : undefined}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4 bg-white dark:bg-slate-800 shadow-lg rounded-2xl p-2">
            <TabsTrigger 
              value="audits" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-xl transition-all"
            >
              <Shield className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Live Audits</span>
              <span className="sm:hidden">Audits</span>
            </TabsTrigger>
            <TabsTrigger 
              value="vault" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-xl transition-all"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">The Vault</span>
              <span className="sm:hidden">Vault</span>
            </TabsTrigger>
            <TabsTrigger 
              value="training" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white rounded-xl transition-all"
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Training</span>
              <span className="sm:hidden">Learn</span>
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-xl transition-all"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audits" className="mt-6">
            <LiveAuditsTab isAdmin={isAdmin} user={user} />
          </TabsContent>

          <TabsContent value="vault" className="mt-6">
            <WorkforceVaultTab isAdmin={isAdmin} user={user} />
          </TabsContent>

          <TabsContent value="training" className="mt-6">
            <TrainingVaultTab isAdmin={isAdmin} user={user} />
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <DocumentControlTab isAdmin={isAdmin} user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}