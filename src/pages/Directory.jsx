
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Search, Phone, Mail, AlertCircle } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Button } from "@/components/ui/button"; // Button is still used for refresh, but refresh is removed from page header actions. Will remove if not used.
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDisplayName, capitalizeName } from "@/components/utils/nameHelpers";
import { Link } from 'react-router-dom'; // Assuming react-router-dom for Link
import { useTranslation } from 'react-i18next';


export default function Directory() {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();

  const { data: user } = useQuery({ // Renamed currentUser to user as per outline
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Removed local getDisplayName helper function, now imported

  // Get employee directory - accessible by ALL employees
  const { data: employees, isLoading, refetch } = useQuery({
    queryKey: ['employeeDirectory'],
    // Updated queryFn to request specific fields needed for the display and filtering
    queryFn: () => base44.entities.EmployeeDirectory.filter(
      { status: 'active' },
      'first_name',
      'last_name',
      'full_name',
      'email', // Changed from employee_email as per outline's usage
      'phone',
      'position',
      'department',
      'profile_photo_url'
    ),
    initialData: [],
    enabled: !!user, // Using 'user' instead of 'currentUser'
  });

  const filteredEmployees = employees.filter(emp => // Renamed filteredDirectory to filteredEmployees
    getDisplayName(emp)?.toLowerCase().includes(searchTerm.toLowerCase()) || // Use getDisplayName for searching by name
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) || // Changed from emp.employee_email
    emp.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Removed handleEmail and handleCall functions as the dropdown is no longer present in the cards.

  if (!user) { // Using 'user' instead of 'currentUser'
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
          // Removed 'actions' prop and the refresh button
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
        ) : filteredEmployees.length > 0 ? ( // Using filteredEmployees
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEmployees.map((emp) => { // Using filteredEmployees
              const isCurrentUser = emp.email === user?.email; // Using 'user' and 'emp.email'
              
              return (
                <Link key={emp.id} to={`/employee-profile?id=${emp.id}`}> {/* Using template literal directly for `to` prop */}
                  <Card className={`group hover:shadow-xl transition-all duration-300 border-slate-200 ${
                    isCurrentUser ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300' : 'bg-white'
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
                            <h3 className="font-bold text-lg text-slate-900 truncate">
                              {getDisplayName(emp)}
                            </h3>
                            {isCurrentUser && (
                              <Badge className="bg-blue-500 text-white text-xs">You</Badge>
                            )}
                          </div>
                          
                          {emp.position && (
                            <p className="text-sm text-slate-600 mb-2">{capitalizeName(emp.position)}</p>
                          )}
                          
                          {emp.department && (
                            <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 mb-2">
                              {capitalizeName(emp.department)}
                            </Badge>
                          )}
                          
                          <div className="space-y-1 mt-2">
                            {emp.phone && (
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                <Phone className="w-3 h-3" />
                                <span>{emp.phone}</span>
                              </div>
                            )}
                            {emp.email && ( // Changed from emp.employee_email
                              <div className="flex items-center gap-2 text-xs text-slate-600">
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
          <Card className="bg-white shadow-xl border-slate-200">
            <CardContent className="p-12 text-center">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">
                {searchTerm ? 'No employees found matching your search' : 'No employees in directory'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
