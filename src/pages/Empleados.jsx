import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Calendar,
  UserPlus,
  Trash2,
  Check,
  Clock,
  Archive,
  UserX,
  RotateCcw,
  ChevronRight,
  Edit,
  Building2,
  Loader2,
  MoreVertical,
  Eye,
  Sparkles,
  CheckCircle2,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubcontractorInviteForm from "../components/subcontractors/SubcontractorInviteForm";
import ActiveEmployeeForm from "../components/empleados/ActiveEmployeeForm";
import AIPerformanceAnalyzer from "../components/empleados/AIPerformanceAnalyzer";
import W9StatusBadge from "../components/subcontractors/W9StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";

export default function Empleados() {
  const { t, language } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [showAIInsights, setShowAIInsights] = useState(false);
  const [selectedEmployeeForAI, setSelectedEmployeeForAI] = useState(null);
  
  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    staleTime: Infinity
  });
  
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        return await base44.entities.User.list('full_name');
      } catch (error) {
        console.error('Error loading employees:', error);
        return [];
      }
    },
    staleTime: 60000,
    retry: 1
  });

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: [],
  });

  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 500),
    enabled: showAIInsights,
    initialData: []
  });

  const { data: allJobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 200),
    enabled: showAIInsights,
    initialData: []
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date', 200),
    enabled: showAIInsights,
    initialData: []
  });

  const { data: allRecognitions = [] } = useQuery({
    queryKey: ['recognitions'],
    queryFn: () => base44.entities.Recognition.list('-date'),
    enabled: showAIInsights,
    initialData: []
  });

  const { data: allCertifications = [] } = useQuery({
    queryKey: ['certifications'],
    queryFn: () => base44.entities.Certification.list('-created_date'),
    enabled: showAIInsights,
    initialData: []
  });

  const { data: allDrivingLogs = [] } = useQuery({
    queryKey: ['drivingLogs'],
    queryFn: () => base44.entities.DrivingLog.list('-date', 200),
    enabled: showAIInsights,
    initialData: []
  });

  const handleEditActive = (employee) => {
    setEditingEmployee(employee);
    setShowDialog(true);
  };

  const handleCloseForm = () => {
    setShowDialog(false);
    setEditingEmployee(null);
  };

  const handleViewAIInsights = (employee) => {
    setSelectedEmployeeForAI(employee);
    setShowAIInsights(true);
  };

  const getDisplayName = (employee) => {
    if (employee.first_name || employee.last_name) {
      const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
      if (fullName) return fullName;
    }
    
    if (employee.full_name && !employee.full_name.includes('@') && !employee.full_name.includes('.')) {
      return employee.full_name;
    }
    
    if (employee.email) {
      const emailName = employee.email.split('@')[0];
      return emailName
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
    
    return t('unknownEmployee');
  };

  const needsNameConfiguration = (employee) => {
    return !employee.first_name || !employee.last_name;
  };

  const searchFilteredEmployees = employees.filter(emp =>
    getDisplayName(emp).toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeEmployees = searchFilteredEmployees.filter(emp => 
    emp.employment_status === 'ACTIVO'
  );

  const pendingW9Employees = searchFilteredEmployees.filter(emp => 
    emp.employment_status === 'PENDIENTE_ONBOARDING'
  );

  const archivedEmployees = searchFilteredEmployees.filter(emp => 
    emp.employment_status === 'ARCHIVADO'
  );

  const terminatedEmployees = searchFilteredEmployees.filter(emp => 
    emp.employment_status === 'TERMINADO'
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">{t('employeeManagement')}</h1>
              <p className="text-slate-300 mt-1">{t('manageYourTeamMembers')}</p>
            </div>
            <Button 
              onClick={() => { setEditingEmployee(null); setShowDialog(true); }} 
              className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('inviteSubcontractor')}
            </Button>
          </div>

          {pendingW9Employees.length > 0 && (
            <Alert className="mb-6 bg-yellow-500/10 border-yellow-500/30">
              <AlertDescription className="text-yellow-400">
                ⚠️ {pendingW9Employees.length} {t('requiresW9Review')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Card className="bg-slate-800/50 backdrop-blur-sm shadow-xl border-slate-700 mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
              <Input
                placeholder={t('searchEmployees')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="active" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              {t('ACTIVO')} ({activeEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="pending_w9" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              {t('requiresW9Review')} ({pendingW9Employees.length})
              {pendingW9Employees.length > 0 && (
                <Badge className="ml-2 bg-yellow-500 text-black text-xs">{pendingW9Employees.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              {t('ARCHIVADO')} ({archivedEmployees.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeEmployees.map((employee) => {
                const displayName = getDisplayName(employee);
                const needsConfig = needsNameConfiguration(employee);
                
                return (
                  <Card key={employee.id} className="bg-slate-800/50 backdrop-blur-sm border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        {employee.profile_photo_url ? (
                          <img
                            src={employee.profile_photo_url}
                            alt={displayName}
                            className="w-16 h-16 rounded-full object-cover border-2 border-[#3B9FF3]/30"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">
                            {displayName[0]?.toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white truncate">{displayName}</h3>
                            {needsConfig && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                ⚠️
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-blue-300 truncate">{employee.position || t('noPosition')}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {employee.department && (
                              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                {employee.department}
                              </Badge>
                            )}
                            {employee.team_name && (
                              <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                                <Building2 className="w-3 h-3 mr-1" />
                                {employee.team_name}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-slate-700/50 text-slate-400 hover:text-white">
                              <MoreVertical className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-900 border-slate-800">
                            <DropdownMenuItem asChild>
                              <Link to={createPageUrl(`EmployeeProfile?id=${employee.id}`)} className="flex items-center cursor-pointer text-white hover:bg-slate-800">
                                <ChevronRight className="w-4 h-4 mr-2" />
                                {t('viewProfile')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditActive(employee)} className="text-white hover:bg-slate-800">
                              <Edit className="w-4 h-4 mr-2" />
                              {t('editEmployee')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {needsConfig && (
                        <Alert className="mb-3 bg-yellow-500/10 border-yellow-500/30">
                          <AlertDescription className="text-yellow-400 text-xs">
                            ⚠️ {t('nameNeedsConfigurationInstruction')}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="w-3 h-3" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Link to={createPageUrl(`EmployeeProfile?id=${employee.id}`)}>
                          <Button variant="outline" size="sm" className="bg-slate-700/50 hover:bg-slate-700 border-slate-600 text-slate-300">
                            <Eye className="w-4 h-4 mr-2" />
                            {t('viewProfile')}
                          </Button>
                        </Link>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAIInsights(employee)}
                          className="bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI Insights
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {activeEmployees.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">{t('noActiveEmployeesFound')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending_w9">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingW9Employees.map((employee) => {
                const displayName = getDisplayName(employee);
                
                return (
                  <Card key={employee.id} className="bg-slate-800/50 backdrop-blur-sm border-slate-700 shadow-lg hover:shadow-xl transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        {employee.profile_photo_url ? (
                          <img
                            src={employee.profile_photo_url}
                            alt={displayName}
                            className="w-16 h-16 rounded-full object-cover border-2 border-yellow-500/30"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                            {displayName[0]?.toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white truncate">{displayName}</h3>
                          <p className="text-sm text-yellow-300 truncate">{employee.position || t('noPosition')}</p>
                          <div className="mt-2">
                            <W9StatusBadge user={employee} />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm mb-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      </div>

                      <Alert className="bg-yellow-500/10 border-yellow-500/30 mb-4">
                        <AlertDescription className="text-yellow-400 text-xs">
                          <FileText className="w-4 h-4 inline mr-1" />
                          {employee.onboarding_link ? t('onboardingLinkSent') : t('onboardingPending')}
                        </AlertDescription>
                      </Alert>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditActive(employee)}
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-slate-700/50 hover:bg-slate-700 border-slate-600 text-slate-300"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t('view')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {pendingW9Employees.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <p className="text-slate-400">{t('allW9Completed')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {archivedEmployees.map((employee) => {
                const displayName = getDisplayName(employee);
                
                return (
                  <Card key={employee.id} className="bg-slate-800/50 backdrop-blur-sm border-slate-700 shadow-lg opacity-70">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        {employee.profile_photo_url ? (
                          <img
                            src={employee.profile_photo_url}
                            alt={displayName}
                            className="w-16 h-16 rounded-full object-cover border-2 border-slate-600 grayscale"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-white font-bold text-xl">
                            {displayName[0]?.toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-400 truncate">{displayName}</h3>
                          <p className="text-sm text-slate-500 truncate">{employee.position || t('noPosition')}</p>
                          <Badge className="mt-2 bg-slate-700 text-slate-400 border-slate-600">
                            <Archive className="w-3 h-3 mr-1" />
                            {t('ARCHIVADO')}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                      </div>

                      {employee.pause_reason && (
                        <Alert className="mt-4 bg-slate-700/50 border-slate-600">
                          <AlertDescription className="text-slate-400 text-xs">
                            {employee.pause_reason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {archivedEmployees.length === 0 && (
              <div className="text-center py-12">
                <Archive className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">{t('noArchivedEmployees')}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showDialog && !editingEmployee} onOpenChange={handleCloseForm}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {t('inviteSubcontractor')}
              </DialogTitle>
            </DialogHeader>
            <SubcontractorInviteForm onClose={handleCloseForm} />
          </DialogContent>
        </Dialog>

        <Dialog open={showDialog && !!editingEmployee} onOpenChange={handleCloseForm}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {t('editEmployee')}
              </DialogTitle>
            </DialogHeader>
            <ActiveEmployeeForm
              employee={editingEmployee}
              onClose={handleCloseForm}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showAIInsights} onOpenChange={setShowAIInsights}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                AI Performance Insights - {selectedEmployeeForAI && getDisplayName(selectedEmployeeForAI)}
              </DialogTitle>
            </DialogHeader>
            
            {selectedEmployeeForAI && (
              <div className="py-4">
                <AIPerformanceAnalyzer
                  employee={selectedEmployeeForAI}
                  timeEntries={allTimeEntries.filter(e => e.employee_email === selectedEmployeeForAI.email)}
                  jobs={allJobs}
                  expenses={allExpenses.filter(e => e.employee_email === selectedEmployeeForAI.email)}
                  drivingLogs={allDrivingLogs.filter(l => l.employee_email === selectedEmployeeForAI.email)}
                  certifications={allCertifications.filter(c => c.employee_email === selectedEmployeeForAI.email)}
                  recognitions={allRecognitions.filter(r => r.employee_email === selectedEmployeeForAI.email)}
                  allEmployees={employees}
                  showFullAnalysis={true}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <Toaster />
    </div>
  );
}