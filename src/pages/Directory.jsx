import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search, Phone, Mail, AlertCircle } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDisplayName, capitalizeName } from "@/components/utils/nameHelpers";
import { Link } from 'react-router-dom';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function Directory() {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useLanguage();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Use EmployeeDirectory as primary source (safe, public data)
  const { data: directoryEntries = [], isLoading: directoryLoading } = useQuery({
    queryKey: ['employeeDirectory'],
    queryFn: () => base44.entities.EmployeeDirectory.filter({ status: 'active' }),
    staleTime: 30000,
    enabled: !!user,
  });

  // Fallback to User entity if directory is empty
  const { data: usersBackup = [], isLoading: usersLoading } = useQuery({
    queryKey: ['employees-backup'],
    queryFn: () => base44.entities.User.filter({ employment_status: 'active' }),
    enabled: !!user && directoryEntries.length === 0 && !directoryLoading,
    staleTime: 30000,
  });

  const employees = directoryEntries.length > 0 
    ? directoryEntries.map(d => ({
        id: d.id,
        email: d.employee_email,
        full_name: d.full_name,
        first_name: d.first_name,
        last_name: d.last_name,
        position: d.position,
        department: d.department,
        phone: d.phone,
        team_name: d.team_name,
        profile_photo_url: d.profile_photo_url
      }))
    : usersBackup;

  const isLoading = directoryLoading || usersLoading;

  const filteredEmployees = employees.filter(emp =>
    getDisplayName(emp)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#3B9FF3] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('directory')}
          description={t('employeeDirectory')}
          icon={Users}
        />

        {employees.length === 0 && !isLoading && (
          <Alert className="mb-6 bg-blue-100 border-blue-300">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-700">
              📱 Directory is empty. Admin needs to sync employees to directory.
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((emp) => {
              const isCurrentUser = emp.email === user?.email;
              
              return (
                <Link key={emp.id} to={`/employee-profile?id=${emp.id}`}>
                  <Card className={`group hover:shadow-xl transition-all duration-300 ${
                    isCurrentUser ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {emp.profile_photo_url ? (
                          <img 
                            src={emp.profile_photo_url} 
                            alt={getDisplayName(emp)}
                            className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 group-hover:border-blue-400 transition-colors"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="text-white font-bold text-xl">
                              {getDisplayName(emp)?.[0]?.toUpperCase()}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">
                              {getDisplayName(emp)}
                            </h3>
                            {isCurrentUser && (
                              <Badge className="bg-blue-500 text-white text-xs">You</Badge>
                            )}
                          </div>
                          
                          {emp.position && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{capitalizeName(emp.position)}</p>
                          )}
                          
                          {emp.department && (
                            <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 mb-2">
                              {capitalizeName(emp.department)}
                            </Badge>
                          )}
                          
                          <div className="space-y-1 mt-2">
                            {emp.phone && (
                              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <Phone className="w-3 h-3" />
                                <span>{emp.phone}</span>
                              </div>
                            )}
                            {emp.email && (
                              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <Mail className="w-3 h-3" />
                                <span className="truncate">{emp.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
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