import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Shield, TrendingUp, Bell, Users, Clock, AlertTriangle, DollarSign, CheckCircle } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import PageHeader from "@/components/shared/PageHeader";
import { startOfMonth, endOfMonth } from "date-fns";
import { AdminOnlyUI } from "@/components/policies/UIVisibilityWrapper";

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Fallback team locations (used only if no active jobs have coordinates)
const fallbackTeamLocations = [
  { name: 'Atlanta', coordinates: [33.7490, -84.3880], color: '#1E6FE8' },
  { name: 'Charlotte', coordinates: [35.2271, -80.8431], color: '#00C48C' },
  { name: 'Orlando', coordinates: [28.5383, -81.3792], color: '#F59E0B' }
];

// Custom team marker icon
const createTeamIcon = (color) => {
  return L.divIcon({
    className: 'custom-team-marker',
    html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

export default function ExecutiveControlTower() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Real-time active employees (clocked in today)
  const { data: activeTimeEntries = [] } = useQuery({
    queryKey: ['active-time-entries'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const entries = await base44.entities.TimeEntry.filter({ date: today });
      return entries.filter(e => e.check_in && !e.check_out); // Currently working
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 30000
  });

  // EMPLOYEE SSOT: Use EmployeeDirectory instead of User.list()
  const { data: employees = [] } = useQuery({
    queryKey: ['all-employees'],
    queryFn: async () => {
      const directory = await base44.entities.EmployeeDirectory.filter({ status: 'active' });
      return directory.map(d => ({
        id: d.user_id,
        email: d.employee_email,
        full_name: d.full_name,
        employment_status: 'active'
      }));
    },
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['all-certifications'],
    queryFn: () => base44.entities.Certification.list(),
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: onboardingForms = [] } = useQuery({
    queryKey: ['all-onboarding-forms'],
    queryFn: () => base44.entities.OnboardingForm.list(),
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Financial data
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions-month'],
    queryFn: () => base44.entities.Transaction.list(),
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-month'],
    queryFn: () => base44.entities.Invoice.list(),
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-month'],
    queryFn: () => base44.entities.Expense.list(),
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Dynamic team locations from active jobs with coordinates
  const { data: activeJobs = [] } = useQuery({
    queryKey: ['active-jobs-coords'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const teamLocations = useMemo(() => {
    const jobsWithCoords = activeJobs.filter(j => j.latitude && j.longitude);
    if (jobsWithCoords.length === 0) return fallbackTeamLocations;
    const colors = ['#1E6FE8', '#00C48C', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return jobsWithCoords.map((j, i) => ({
      name: j.name,
      coordinates: [j.latitude, j.longitude],
      color: colors[i % colors.length]
    }));
  }, [activeJobs]);

  // Needs attention items
  const { data: pendingExpenses = [] } = useQuery({
    queryKey: ['pending-expenses'],
    queryFn: () => base44.entities.Expense.filter({ status: 'pending' }),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: incidentReports = [] } = useQuery({
    queryKey: ['incident-reports'],
    queryFn: () => base44.entities.FormSubmission.filter({ template_name: 'Incident Report' }),
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Calculate compliance metrics
  const activeEmployees = employees.filter(e => e.employment_status === 'active');
  const employeesWithOnboarding = [...new Set(onboardingForms.filter(f => f.status === 'completed').map(f => f.employee_email))];
  const onboardingCompliance = activeEmployees.length > 0 ? (employeesWithOnboarding.length / activeEmployees.length * 100).toFixed(0) : 0;

  const now = new Date();
  const validCerts = certifications.filter(cert => {
    if (!cert.expiration_date) return true;
    return new Date(cert.expiration_date) > now;
  });

  const employeesWithValidCerts = [...new Set(validCerts.map(c => c.employee_email))];
  const certCompliance = activeEmployees.length > 0 ? (employeesWithValidCerts.length / activeEmployees.length * 100).toFixed(0) : 0;

  const overallCompliance = ((parseFloat(onboardingCompliance) + parseFloat(certCompliance)) / 2).toFixed(0);

  // Financial calculations
  const monthTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= currentMonthStart && tDate <= currentMonthEnd;
  });

  const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const monthExpensesTrans = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const monthBalance = monthIncome - monthExpensesTrans;

  const expiredCerts = certifications.filter(cert => {
    if (!cert.expiration_date) return false;
    return new Date(cert.expiration_date) < now;
  });

  const needsAttention = [
    ...expiredCerts.map(c => ({ type: 'cert', text: `${c.employee_name}: ${c.certification_type} expired`, priority: 'high' })),
    ...pendingExpenses.map(e => ({ type: 'expense', text: `Pending expense: $${e.amount} from ${e.employee_name}`, priority: 'medium' })),
    ...incidentReports.map(i => ({ type: 'incident', text: `Incident report: ${i.responses?.title || 'Untitled'}`, priority: 'high' }))
  ];

  return (
    <AdminOnlyUI fallback={
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Shield className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Admin Access Required</h2>
          <p className="text-slate-600 dark:text-slate-400">This page is only accessible to administrators.</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] p-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Executive Control Tower"
            description="Real-time overview for CEO and administrators"
            icon={Shield}
          />

        {/* Top Row - Key Metrics */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-2xl shadow-md">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{activeTimeEntries.length}</span>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Workers</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Clocked in now</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-2xl shadow-md">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{overallCompliance}%</span>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Compliance Rate</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Onboarding + Certs</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-2xl shadow-md">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">${(monthBalance / 1000).toFixed(1)}k</span>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Monthly Balance</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Income - Expenses</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-2xl shadow-md">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{needsAttention.length}</span>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Needs Attention</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Action items</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Labor Map */}
          <Card className="lg:col-span-2 bg-white dark:bg-slate-800 shadow-2xl">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <MapPin className="w-5 h-5 text-[#507DB4]" />
                Labor Map - Real-Time GPS
              </CardTitle>
              <p className="text-sm text-slate-600 dark:text-slate-400">Live location of clocked-in staff</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[500px] w-full">
                <MapContainer
                  center={activeTimeEntries.length > 0 ? [33.7490, -84.3880] : [39.8283, -98.5795]} // Atlanta or US center
                  zoom={activeTimeEntries.length > 0 ? 10 : 4} // Zoom out to show US when no workers
                  style={{ height: '100%', width: '100%' }}
                  className="rounded-b-xl"
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  
                  {/* Team location markers */}
                  {teamLocations.map((team, idx) => (
                    <Marker
                      key={`team-${idx}`}
                      position={team.coordinates}
                      icon={createTeamIcon(team.color)}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold">{team.name} Office</p>
                          <p className="text-xs text-slate-600">Team Base Location</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  
                  {/* Active workers markers */}
                  {activeTimeEntries.map((entry) => {
                    if (!entry.check_in_latitude || !entry.check_in_longitude) return null;
                    
                    return (
                      <Marker
                        key={entry.id}
                        position={[entry.check_in_latitude, entry.check_in_longitude]}
                      >
                        <Popup>
                          <div className="text-sm">
                            <p className="font-bold">{entry.employee_name}</p>
                            <p className="text-xs text-slate-600">{entry.job_name || 'No job assigned'}</p>
                            <p className="text-xs text-blue-600">Checked in: {entry.check_in}</p>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </MapContainer>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Compliance & Alerts */}
          <div className="space-y-6">
            {/* Compliance Meter */}
            <Card className="bg-white dark:bg-slate-800 shadow-2xl">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Shield className="w-5 h-5 text-[#507DB4]" />
                  Compliance Meter
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Overall Compliance */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Overall</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{overallCompliance}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          overallCompliance >= 90 ? 'bg-gradient-to-r from-[#00C48C] to-[#00A875]' :
                          overallCompliance >= 70 ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706]' :
                          'bg-gradient-to-r from-[#EF4444] to-[#DC2626]'
                        }`}
                        style={{ width: `${overallCompliance}%` }}
                      />
                    </div>
                  </div>

                  {/* Onboarding */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Onboarding Complete</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{onboardingCompliance}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="h-full bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] rounded-full transition-all"
                        style={{ width: `${onboardingCompliance}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {employeesWithOnboarding.length} of {activeEmployees.length} employees
                    </p>
                  </div>

                  {/* Certifications */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Valid Certifications</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">{certCompliance}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className="h-full bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] rounded-full transition-all"
                        style={{ width: `${certCompliance}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {employeesWithValidCerts.length} of {activeEmployees.length} employees
                    </p>
                  </div>

                  {/* Expired Certs Alert */}
                  {expiredCerts.length > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-900 dark:text-red-200">
                          {expiredCerts.length} Expired Certifications
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Financial Pulse */}
            <Card className="bg-white dark:bg-slate-800 shadow-2xl">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <TrendingUp className="w-5 h-5 text-[#507DB4]" />
                  Financial Pulse
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-xs text-green-700 dark:text-green-300 mb-1">Income</p>
                    <p className="text-xl font-bold text-green-900 dark:text-green-100">
                      ${(monthIncome / 1000).toFixed(1)}k
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-xs text-red-700 dark:text-red-300 mb-1">Expenses</p>
                    <p className="text-xl font-bold text-red-900 dark:text-red-100">
                      ${(monthExpensesTrans / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border-2 ${
                  monthBalance >= 0 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                    : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                }`}>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Net Balance</p>
                  <p className={`text-3xl font-bold ${monthBalance >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    ${monthBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">Pending Invoices</p>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {invoices.filter(i => i.status !== 'paid').length} invoices
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Needs Attention */}
            <Card className="bg-white dark:bg-slate-800 shadow-2xl">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <Bell className="w-5 h-5 text-[#507DB4]" />
                  Needs Attention ({needsAttention.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 max-h-[400px] overflow-y-auto">
                {needsAttention.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">All Clear!</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">No action items at this time</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {needsAttention.map((item, index) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg border ${
                          item.priority === 'high' 
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            item.priority === 'high' ? 'text-red-600' : 'text-yellow-600'
                          }`} />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{item.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Active Workers List */}
        {activeTimeEntries.length > 0 && (
          <Card className="bg-white dark:bg-slate-800 shadow-2xl">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Clock className="w-5 h-5 text-[#507DB4]" />
                Active Workers Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTimeEntries.map((entry) => (
                  <div key={entry.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center text-white font-bold shadow-md">
                        {entry.employee_name?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{entry.employee_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{entry.job_name || 'No job'}</p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>In: {entry.check_in}</span>
                      </div>
                      {entry.check_in_latitude && entry.check_in_longitude && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">
                            {entry.check_in_latitude.toFixed(4)}, {entry.check_in_longitude.toFixed(4)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </AdminOnlyUI>
  );
}