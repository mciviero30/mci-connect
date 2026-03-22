import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search, Phone, Mail, AlertCircle, MapPin, Briefcase } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLanguage } from '@/components/i18n/LanguageContext';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';

export default function Directory() {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useLanguage();

  const { data: user } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 300000
  });
  
  // SSOT: EmployeeDirectory is the ONLY source for employee listings
  const { data: directoryEntries = [], isLoading } = useQuery({
    queryKey: ['employeeDirectory'],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ status: 'active' }),
    staleTime: 30000,
    enabled: !!user,
  });

  // PERFORMANCE: Memoize employees transformation
  const employees = useMemo(() => 
    directoryEntries.map(d => {
      // ENSURE full_name is always present (first_name + last_name)
      const fullName = d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim();
      return {
        id: d.user_id || d.id,
        email: d.employee_email,
        full_name: fullName,
        first_name: d.first_name,
        last_name: d.last_name,
        position: d.position,
        department: d.department,
        phone: d.phone,
        team_name: d.team_name,
        profile_photo_url: d.profile_photo_url
      };
    }),
    [directoryEntries]
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
          <div className="space-y-4">
            {filteredEmployees.map((emp) => {
              const isCurrentUser = emp.email === user?.email;
              const displayName = emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.email || 'Unknown';
              const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
              
              return (
                <Card 
                  key={emp.id} 
                  className={`shadow-sm transition-all ${
                    isCurrentUser 
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700' 
                      : 'bg-white dark:bg-[#282828] border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {emp.profile_photo_url ? (
                        <img 
                          src={emp.profile_photo_url} 
                          alt={displayName}
                          className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-white font-bold text-lg">
                            {initials}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight mb-0.5">
                            {displayName}
                          </h3>
                          {isCurrentUser && (
                            <Badge className="bg-blue-500 text-white text-xs">Tú</Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1.5">
                          {emp.position && (
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{emp.position}</span>
                            </div>
                          )}
                          
                          {emp.team_name && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                              <Badge variant="outline" className="text-xs text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700 font-semibold">
                                {emp.team_name}
                              </Badge>
                            </div>
                          )}
                          
                          {emp.department && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">{emp.department}</span>
                            </div>
                          )}
                          
                          {emp.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <a href={`tel:${emp.phone}`} className="text-sm text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors">
                                {emp.phone}
                              </a>
                            </div>
                          )}
                          
                          {emp.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                              <a href={`mailto:${emp.email}`} className="text-sm text-slate-700 dark:text-slate-300 hover:text-blue-600 transition-colors truncate">
                                {emp.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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