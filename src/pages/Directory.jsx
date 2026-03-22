import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search, AlertCircle } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from '@/components/i18n/LanguageContext';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';
import ModernEmployeeCard from "@/components/empleados/ModernEmployeeCard";

export default function Directory() {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useLanguage();

  const { data: user } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 300000
  });
  
  // Fetch Users to get profile photos and role info
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
    staleTime: 60000,
    enabled: !!user,
  });

  // Fetch EmployeeProfiles to get full employee data
  const { data: employeeProfiles = [], isLoading } = useQuery({
    queryKey: ['employeeProfiles'],
    queryFn: () => base44.entities.EmployeeProfile.filter({ 
      employment_status: 'active',
      is_active: true 
    }),
    staleTime: 30000,
    enabled: !!user,
  });

  // Fetch Teams for team name resolution
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    staleTime: 120000,
    enabled: !!user,
  });

  // PERFORMANCE: Memoize employees transformation (same format as Empleados page)
  const employees = useMemo(() => 
    employeeProfiles
      .filter(p => p.user_id)
      .map(p => {
        const userRecord = allUsers.find(u => u.id === p.user_id);
        const resolvedTeamName = p.team_name || 
          (p.team_id ? teams.find(t => t.id === p.team_id)?.team_name : '') || '';
        
        return {
          id: p.user_id,
          profile_id: p.id,
          email: userRecord?.email || '',
          full_name: userRecord?.full_name || `${p.first_name} ${p.last_name}`.trim(),
          first_name: p.first_name,
          last_name: p.last_name,
          position: p.position,
          department: p.department || '',
          phone: p.phone || '',
          team_id: p.team_id || '',
          team_name: resolvedTeamName,
          employment_status: p.employment_status,
          role: userRecord?.role || 'user',
          profile_photo_url: userRecord?.profile_photo_url || null
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.full_name || '').toLowerCase().localeCompare((b.full_name || '').toLowerCase())),
    [employeeProfiles, allUsers, teams]
  );

  // PERFORMANCE: Memoize filtered employees
  const filteredEmployees = useMemo(() => 
    employees.filter(emp => {
      const searchLower = searchTerm.toLowerCase();
      return (
        emp.full_name?.toLowerCase().includes(searchLower) ||
        emp.first_name?.toLowerCase().includes(searchLower) ||
        emp.last_name?.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower) ||
        emp.phone?.toLowerCase().includes(searchLower) ||
        emp.position?.toLowerCase().includes(searchLower) ||
        emp.team_name?.toLowerCase().includes(searchLower)
      );
    }),
    [employees, searchTerm]
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0 p-4 md:p-8">
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#3B9FF3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={t('directory')}
          description={t('employeeDirectory')}
          icon={Users}
        />

        {employees.length === 0 && !isLoading && (
          <Alert className="mb-6 bg-blue-100 border-blue-300">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-700 flex items-center gap-2">
             <Users className="w-4 h-4" />
             Directory is empty. Admin needs to sync employees to directory.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500"/>
            <Input 
              placeholder="Search by name, email, phone, or position..."
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-12 h-12 bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#3B9FF3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading employees...</p>
          </div>
        ) : filteredEmployees.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => (
              <ModernEmployeeCard
                key={emp.id}
                employee={emp}
                showInviteButton={false}
                onboardingProgress={null}
                isReadOnly={true}
              />
            ))}
          </div>
        ) : (
          <Card className="bg-white dark:bg-[#282828] shadow-xl border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchTerm ? 'No employees found matching your search' : 'No employees in directory'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}