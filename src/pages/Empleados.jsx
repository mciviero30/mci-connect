import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useErrorHandler } from "@/components/shared/UnifiedErrorHandler";
import { useSubscription } from "@/components/hooks/useMemoryLeakPrevention";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Search, Shield, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/components/i18n/LanguageContext";
import ModernEmployeeCard from "@/components/empleados/ModernEmployeeCard";
import OnboardingDetailsModal from "@/components/empleados/OnboardingDetailsModal";
import EditEmployeeForm from "@/components/empleados/EditEmployeeForm";
import { useToast } from "@/components/ui/toast";
import { createPageUrl } from "@/utils";

const EmployeeFormDialog = ({ employee, onClose, currentUser }) => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { handleError } = useErrorHandler(); // WF-C1 FIX: moved here (top-level, not inside callback)
  const [formData, setFormData] = useState({});

  const mutation = useMutation({
    mutationFn: async (data) => {
      const firstName = data.first_name?.charAt(0).toUpperCase() + data.first_name?.slice(1).toLowerCase() || '';
      const lastName = data.last_name?.charAt(0).toUpperCase() + data.last_name?.slice(1).toLowerCase() || '';
      const fullName = firstName && lastName ? `${firstName} ${lastName}`.trim() : '';

      const payload = {
        ...data,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : 25,
        role: data.role || 'user',
        employment_status: employee?.id ? employee.employment_status : 'pending_invitation'
      };

      let userRecord;
      if (employee?.id) {
        userRecord = await base44.entities.User.update(employee.id, payload);
      } else {
        userRecord = await base44.entities.User.create(payload);
      }

      // PHASE 4: Lifecycle Hardening - Sync to EmployeeDirectory
      const directoryData = {
        user_id: userRecord.id || employee?.id,
        employee_email: userRecord.email || data.email,
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        position: data.position || '',
        department: data.department || '',
        phone: data.phone || '',
        team_id: data.team_id || '',
        team_name: data.team_name || '',
        status: userRecord.employment_status === 'active' ? 'active' : 'pending',
        sync_source: 'user_direct',
        last_synced_at: new Date().toISOString()
      };

      const existingDirectory = await base44.entities.EmployeeDirectory.list();
      const directoryEntry = existingDirectory.find(d => 
        d.employee_email?.toLowerCase().trim() === (userRecord.email || data.email).toLowerCase().trim()
      );

      if (directoryEntry) {
        await base44.entities.EmployeeDirectory.update(directoryEntry.id, directoryData);
      } else {
        await base44.entities.EmployeeDirectory.create(directoryData);
      }

      return userRecord;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.refetchQueries({ queryKey: ['employees'] });
      toast.success(employee ? 'Employee updated!' : 'Employee created!');
      onClose();
    },
    onError: (error) => {
      const { handleError } = useErrorHandler();
      handleError(error, employee ? 'Employee updated' : 'Employee created');
    }
  });

  return (
    <div className="space-y-4 max-h-[85vh] overflow-y-auto p-4">
      <EditEmployeeForm 
        employee={employee}
        currentUser={currentUser}
        onFormChange={setFormData}
      />

      <div className="flex gap-2 justify-end pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={() => {
            if (!formData.email) {
              alert('Email is required');
              return;
            }
            mutation.mutate(formData);
          }} 
          disabled={mutation.isPending || !formData.email}
        >
          {mutation.isPending ? 'Saving...' : employee ? 'Update' : 'Create Employee'}
        </Button>
      </div>
    </div>
  );
};

export default function Empleados() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    gcTime: Infinity
  });
  
  const userRole = (currentUser?.role || 'employee').toLowerCase();
  const hasFullAccess = userRole === 'admin' || userRole === 'ceo';

  const { handleError } = useErrorHandler();

  if (currentUser && !hasFullAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Employee Management is restricted to administrators only.
            </p>
            <Button 
              onClick={() => window.location.href = createPageUrl('Dashboard')} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // SSOT: EmployeeDirectory is the only source for employee listings
  const { data: employees = [], isLoading, refetch: refetchEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      // Fetch from EmployeeDirectory, then enrich with User data
      const directory = await base44.entities.EmployeeDirectory.list('-created_date');
      
      // PHASE 5: Defensive Logging
      if (import.meta.env?.DEV) {
        const missingUserIds = directory.filter(d => !d.user_id && d.status === 'active');
        if (missingUserIds.length > 0) {
          console.warn('⚠️ SSOT WARNING: Active EmployeeDirectory records missing user_id', {
            count: missingUserIds.length,
            emails: missingUserIds.map(d => d.employee_email)
          });
        }
      }
      
      // Enrich with User entity data (for employment_status, role, etc.)
      const userIds = directory.filter(d => d.user_id).map(d => d.user_id);
      const users = await Promise.all(
        userIds.map(id => base44.entities.User.filter({ id }).catch(() => []))
      );
      const userMap = users.flat().reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
      
      return directory.map(d => {
        const user = userMap[d.user_id];
        
        // PHASE 5: Defensive Logging
        if (import.meta.env?.DEV && !d.user_id && d.status === 'active') {
          console.error('❌ CRITICAL: Active employee missing user_id', { 
            email: d.employee_email,
            full_name: d.full_name 
          });
        }
        
        return {
          id: d.user_id || d.id,
          email: d.employee_email,
          full_name: d.full_name,
          first_name: d.first_name,
          last_name: d.last_name,
          position: d.position,
          department: d.department,
          phone: d.phone,
          team_id: d.team_id,
          team_name: d.team_name,
          profile_photo_url: d.profile_photo_url,
          // User entity data
          employment_status: user?.employment_status || 'active',
          role: user?.role || 'user',
          hourly_rate: user?.hourly_rate,
          onboarding_completed: user?.onboarding_completed,
          invitation_count: user?.invitation_count,
          last_invitation_sent: user?.last_invitation_sent
        };
      });
    },
    staleTime: 30000
  });

  const { data: onboardingForms = [] } = useQuery({
    queryKey: ['onboardingForms'],
    queryFn: () => base44.entities.OnboardingForm.list(),
    staleTime: 60000,
    enabled: employees.length > 0,
    initialData: []
  });

  // Dual-Key Read via userResolution — user_id preferred, email fallback (legacy)
  const employeeProgress = useMemo(() => {
    if (!employees.length || !onboardingForms.length) return {};
    
    const progressMap = {};
    employees.forEach(emp => {
      // Match by user_id first, then fallback to email
      const empForms = onboardingForms.filter(f => {
        if (emp.id && f.user_id) {
          return f.user_id === emp.id && f.status === 'completed';
        }
        // Legacy email fallback
        return f.employee_email === emp.email && f.status === 'completed';
      });
      const completed = empForms.length;
      const total = 4;
      const percentage = Math.round((completed / total) * 100);
      
      progressMap[emp.id] = { percentage, completed, total, forms: empForms };
    });
    
    return progressMap;
  }, [employees, onboardingForms]);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: async (employee) => {
      const fullName = employee.full_name || employee.email.split('@')[0];
      
      await base44.functions.invoke('sendInvitationEmail', {
        to: employee.email,
        fullName,
        language
      });

      await base44.users.inviteUser(employee.email, employee.role || 'user');
      
      await base44.entities.User.update(employee.id, { 
        employment_status: 'invited',
        last_invitation_sent: new Date().toISOString(),
        invitation_count: (employee.invitation_count || 0) + 1
      });

      // PHASE 4: Lifecycle Hardening - Sync status to EmployeeDirectory
      const existingDirectory = await base44.entities.EmployeeDirectory.list();
      const directoryEntry = existingDirectory.find(d => 
        d.employee_email?.toLowerCase().trim() === employee.email.toLowerCase().trim()
      );
      
      if (directoryEntry) {
        await base44.entities.EmployeeDirectory.update(directoryEntry.id, {
          status: 'invited',
          last_synced_at: new Date().toISOString()
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.refetchQueries({ queryKey: ['employees'] });
      toast.success('Invitation sent!');
    },
    onError: (error) => {
      handleError(error, 'Invitation sent');
    }
  });

  const OWNER_EMAIL = 'marzio.civiero@mci-us.com';
  
  // Memoized filtered lists for performance
  const { pendingEmployees, invitedEmployees, activeEmployees, archivedEmployees, deletedEmployees } = useMemo(() => {
    const filterEmployees = (empList) => {
      if (!searchTerm) return empList;
      const term = searchTerm.toLowerCase();
      return empList.filter(emp => 
        emp.full_name?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term) ||
        emp.team_name?.toLowerCase().includes(term)
      );
    };

    const excludeOwner = (list) => hasFullAccess ? list : list.filter(e => e.email !== OWNER_EMAIL);

    return {
      pendingEmployees: filterEmployees(excludeOwner(employees.filter(e => e.employment_status === 'pending_invitation'))),
      invitedEmployees: filterEmployees(excludeOwner(employees.filter(e => e.employment_status === 'invited'))),
      activeEmployees: filterEmployees(excludeOwner(employees.filter(e => e.employment_status === 'active' || !e.employment_status))),
      archivedEmployees: filterEmployees(excludeOwner(employees.filter(e => e.employment_status === 'archived'))),
      deletedEmployees: filterEmployees(excludeOwner(employees.filter(e => e.employment_status === 'deleted')))
    };
  }, [employees, searchTerm, hasFullAccess]);

  const paginateEmployees = (empList) => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return empList.slice(start, start + ITEMS_PER_PAGE);
  };

  const handleViewOnboarding = (employee) => {
    if (employeeProgress[employee.id]) {
      setSelectedEmployee(employee);
      setShowOnboardingModal(true);
    }
  };

  // Reusable pagination component
  const PaginationControls = ({ itemsLength }) => {
    if (itemsLength <= ITEMS_PER_PAGE) return null;
    
    const totalPages = Math.ceil(itemsLength / ITEMS_PER_PAGE);
    
    return (
      <div className="flex justify-center items-center gap-2 mt-6">
        <Button
          variant="outline"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    );
  };

  // Reusable employee grid
  const EmployeeGrid = ({ employees, showInviteButton = false }) => {
    if (employees.length === 0) {
      return (
        <Card className="p-8 text-center">
          <p className="text-slate-500">No employees found</p>
        </Card>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {paginateEmployees(employees).map(employee => (
            <ModernEmployeeCard
              key={employee.id}
              employee={employee}
              onInvite={showInviteButton ? () => inviteMutation.mutate(employee) : undefined}
              isInviting={inviteMutation.isPending}
              showInviteButton={showInviteButton}
              onboardingProgress={employeeProgress[employee.id]}
              onViewDetails={handleViewOnboarding}
            />
          ))}
        </div>
        <PaginationControls itemsLength={employees.length} />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-xl sm:rounded-2xl shadow-md">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                  <span className="hidden sm:inline">Employee Management</span>
                  <span className="sm:hidden">Employees</span>
                </h1>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm ml-0 sm:ml-[48px] md:ml-[60px]">
                Manage your team members
              </p>
            </div>
            
            <div className="flex-shrink-0">
              <Button 
                onClick={() => { setEditingEmployee(null); setShowDialog(true); }} 
                className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md min-h-[44px] text-xs sm:text-sm px-3 sm:px-4"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Employee</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </div>

        <Card className="mb-4 sm:mb-6 shadow-sm sm:shadow-lg bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-3 sm:p-4">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sm:pl-12 min-h-[44px] sm:h-12 text-sm sm:text-base bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setPage(1); }} className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <TabsList className="bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 inline-flex min-w-max sm:min-w-0">
              <TabsTrigger value="active" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                Active ({activeEmployees.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                Pending ({pendingEmployees.length})
              </TabsTrigger>
              <TabsTrigger value="invited" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                Invited ({invitedEmployees.length})
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                Archived ({archivedEmployees.length})
              </TabsTrigger>
              <TabsTrigger value="deleted" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                Deleted ({deletedEmployees.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* PENDING TAB */}
          <TabsContent value="pending">
            <Card className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <CardContent className="p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ℹ️ These employees need to be invited. Click "Invite" to send invitation email.
                </p>
              </CardContent>
            </Card>
            <EmployeeGrid employees={pendingEmployees} showInviteButton={true} />
          </TabsContent>

          {/* INVITED TAB */}
          <TabsContent value="invited">
            <Card className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  ℹ️ Invited employees are waiting to accept invitation and register.
                </p>
              </CardContent>
            </Card>
            <EmployeeGrid employees={invitedEmployees} showInviteButton={true} />
          </TabsContent>

          {/* ACTIVE TAB */}
          <TabsContent value="active">
            <EmployeeGrid employees={activeEmployees} />
          </TabsContent>

          {/* ARCHIVED TAB */}
          <TabsContent value="archived">
            <EmployeeGrid employees={archivedEmployees} />
          </TabsContent>

          {/* DELETED TAB */}
          <TabsContent value="deleted">
            <EmployeeGrid employees={deletedEmployees} />
          </TabsContent>
        </Tabs>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <EmployeeFormDialog 
              employee={editingEmployee} 
              currentUser={currentUser} 
              onClose={() => { setShowDialog(false); setEditingEmployee(null); }} 
            />
          </DialogContent>
        </Dialog>

        <OnboardingDetailsModal
          employee={selectedEmployee}
          tasks={selectedEmployee ? (employeeProgress[selectedEmployee.id]?.tasks || []) : []}
          isOpen={showOnboardingModal}
          onClose={() => {
            setShowOnboardingModal(false);
            setSelectedEmployee(null);
          }}
        />
      </div>
    </div>
  );
}