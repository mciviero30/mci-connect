import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useErrorHandler } from "@/components/shared/UnifiedErrorHandler";
import { useSubscription } from "@/components/hooks/useMemoryLeakPrevention";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Search, Shield, FileText, Upload, CheckSquare, Square, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/components/i18n/LanguageContext";
import ModernEmployeeCard from "@/components/empleados/ModernEmployeeCard";
import ImportEmployeesDialog from "@/components/empleados/ImportEmployeesDialog";
import OnboardingDetailsModal from "@/components/empleados/OnboardingDetailsModal";
import EditEmployeeForm from "@/components/empleados/EditEmployeeForm";
import { useToast } from "@/components/ui/toast";
import { createPageUrl } from "@/utils";

const EmployeeFormDialog = ({ employee, onClose, currentUser }) => {
   const { t } = useLanguage();
   const queryClient = useQueryClient();
   const toast = useToast();
   const { handleError } = useErrorHandler();
   const [formData, setFormData] = useState({});

   const mutation = useMutation({
     mutationFn: async (data) => {
       const firstName = data.first_name?.charAt(0).toUpperCase() + data.first_name?.slice(1).toLowerCase() || '';
       const lastName = data.last_name?.charAt(0).toUpperCase() + data.last_name?.slice(1).toLowerCase() || '';
       const fullName = firstName && lastName ? `${firstName} ${lastName}`.trim() : '';

       if (employee?.id) {
         // UPDATE: User + EmployeeProfile
         if (!data.hire_date) {
           throw new Error('hire_date is required');
         }

         const userPayload = { full_name: fullName };
         await base44.entities.User.update(employee.id, userPayload);

         const profilePayload = {
           first_name: firstName,
           last_name: lastName,
           hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : 25,
           phone: data.phone || null,
           address: data.address || null,
           t_shirt_size: data.tshirt_size || null,
           hire_date: data.hire_date,
           employment_type: data.employment_type || 'W2',
           employment_status: data.employment_status || 'active'
         };
         return await base44.entities.EmployeeProfile.update(employee.profile_id, profilePayload);
       } else {
         // CREATE: FORBIDDEN - EmployeeProfile only via syncInvitationOnRegister
         throw new Error('Employee must be invited before profile creation. Create an EmployeeInvitation first.');
       }
     },
     onSuccess: async () => {
       await queryClient.invalidateQueries({ queryKey: ['employees'] });
       toast.success(employee ? 'Employee updated!' : 'Employee created!');
       onClose();
     },
     onError: (error) => {
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
            if (!employee?.id && !formData.hire_date) {
              alert('hire_date is required');
              return;
            }
            mutation.mutate(formData);
          }} 
          disabled={mutation.isPending || (!employee?.id && !formData.hire_date)}
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [page, setPage] = useState(1);
  const [selectedPending, setSelectedPending] = useState(new Set());
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

  // SSOT: EmployeeProfile only (1:1 with User via user_id, no admin)
  const { data: employees = [], isLoading, refetch: refetchEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const [profiles, users] = await Promise.all([
          base44.entities.EmployeeProfile.list('-created_date'),
          base44.entities.User.list()
        ]);

        return profiles
          .filter(p => p.user_id)
          .map(p => {
            const user = users.find(u => u.id === p.user_id);
            if (user?.email === 'mciviero30@gmail.com') return null;
            return {
              id: p.user_id,
              profile_id: p.id,
              email: user?.email || '',
              full_name: user?.full_name || `${p.first_name} ${p.last_name}`.trim(),
              first_name: p.first_name,
              last_name: p.last_name,
              position: p.position,
              phone: p.phone || '',
              employment_status: p.employment_status,
              role: user?.role || 'user',
              hourly_rate: p.hourly_rate || null
            };
          })
          .filter(Boolean)
          .sort((a, b) => (a.full_name || '').toLowerCase().localeCompare((b.full_name || '').toLowerCase()));
      } catch (err) {
        console.error('employees query failed:', err);
        return [];
      }
    },
    staleTime: 30000
  });

  // EmployeeInvitation bridge query (pre-registration)
  const { data: invitations = [] } = useQuery({
    queryKey: ['employeeInvitations'],
    queryFn: async () => {
      try {
        return await base44.entities.EmployeeInvitation.list('-invited_date');
      } catch (err) {
        console.error('invitations query failed:', err);
        return [];
      }
    },
    staleTime: 30000
  });

  const { data: onboardingForms = [] } = useQuery({
    queryKey: ['onboardingForms'],
    queryFn: async () => {
      try {
        return await base44.entities.OnboardingForm.list();
      } catch (err) {
        console.error('onboardingForms query failed:', err);
        return [];
      }
    },
    staleTime: 60000,
    enabled: employees.length > 0,
    initialData: []
  });

  // Onboarding progress by user_id only (no email fallback)
  const employeeProgress = useMemo(() => {
    if (!employees.length || !onboardingForms.length) return {};
    
    const progressMap = {};
    employees.forEach(emp => {
      const empForms = onboardingForms.filter(f => f.user_id === emp.id && f.status === 'completed');
      const completed = empForms.length;
      const total = 4;
      progressMap[emp.id] = { percentage: Math.round((completed / total) * 100), completed, total, forms: empForms };
    });
    
    return progressMap;
  }, [employees, onboardingForms]);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Invite from EmployeeInvitation (send email, mark as pending)
  const inviteSingle = async (invitation) => {
    if (!invitation.email) throw new Error('Email required to invite');

    const fullName = `${invitation.first_name} ${invitation.last_name}`.trim();
    await base44.functions.invoke('sendInvitationEmail', { 
      to: invitation.email, 
      fullName, 
      language 
    });

    // Update invitation: status stays pending, track last send
    await base44.entities.EmployeeInvitation.update(invitation.id, {
      status: 'pending',
      last_sent_date: new Date().toISOString()
    });
  };

  const inviteMutation = useMutation({
    mutationFn: (employee) => inviteSingle(employee),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Invitation sent!');
    },
    onError: (error) => {
      handleError(error, 'Invitation sent');
    }
  });

  const bulkInviteMutation = useMutation({
    mutationFn: async () => {
      const toInvite = invitations.filter(e => selectedPending.has(e.id));
      let sent = 0;
      for (const inv of toInvite) {
        try { await inviteSingle(inv); sent++; } catch (_) {}
      }
      return sent;
    },
    onSuccess: async (sent) => {
      setSelectedPending(new Set());
      await queryClient.invalidateQueries({ queryKey: ['employeeInvitations'] });
      toast.success(`${sent} invitation(s) sent!`);
    },
    onError: (error) => handleError(error, 'Bulk invite'),
  });

  const OWNER_EMAIL = 'marzio.civiero@mci-us.com';
  const INVISIBLE_EMAIL = 'mciviero30@gmail.com'; // Invisible employee - has full access but not listed
  
  // Filtered lists by employment_status (clean, no duplication logic)
  const { activeEmployees, inactiveEmployees, onLeaveEmployees, terminatedEmployees } = useMemo(() => {
    const filterEmployees = (empList) => {
      if (!searchTerm) return empList;
      const term = searchTerm.toLowerCase();
      return empList.filter(emp => 
        emp.full_name?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term)
      );
    };

    return {
      activeEmployees: filterEmployees(employees.filter(e => e.employment_status === 'active')),
      inactiveEmployees: filterEmployees(employees.filter(e => e.employment_status === 'inactive')),
      onLeaveEmployees: filterEmployees(employees.filter(e => e.employment_status === 'on_leave')),
      terminatedEmployees: filterEmployees(employees.filter(e => e.employment_status === 'terminated'))
    };
  }, [employees, searchTerm]);

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
            
            <div className="flex-shrink-0 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(true)}
                className="h-10 border-green-300 text-green-700 hover:bg-green-50 px-3"
              >
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Import Excel</span>
              </Button>
              <Button 
                onClick={() => { setEditingEmployee(null); setShowDialog(true); }} 
                className="h-10 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md px-4"
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
               <TabsTrigger value="invitations" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                 Invitations ({invitations.length})
               </TabsTrigger>
               <TabsTrigger value="active" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                 Active ({activeEmployees.length})
               </TabsTrigger>
               <TabsTrigger value="inactive" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                 Inactive ({inactiveEmployees.length})
               </TabsTrigger>
               <TabsTrigger value="on_leave" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                 On Leave ({onLeaveEmployees.length})
               </TabsTrigger>
               <TabsTrigger value="terminated" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                 Terminated ({terminatedEmployees.length})
               </TabsTrigger>
             </TabsList>
            </div>

          {/* INVITATIONS TAB (EmployeeInvitation bridge) */}
           <TabsContent value="invitations">
             <Card className="mb-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
               <CardContent className="p-4">
                 <p className="text-sm text-amber-800 dark:text-amber-200">
                   📧 Pre-registration invitations. Send email or delete as needed.
                 </p>
               </CardContent>
             </Card>

             {invitations.length === 0 ? (
               <Card className="p-8 text-center">
                 <p className="text-slate-500">No pending invitations.</p>
               </Card>
             ) : (
               <>
                 <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                   <div className="flex items-center gap-3">
                     <button
                       onClick={() => {
                         if (selectedPending.size === invitations.length) {
                           setSelectedPending(new Set());
                         } else {
                           setSelectedPending(new Set(invitations.map(i => i.id)));
                         }
                       }}
                       className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                     >
                       {selectedPending.size === invitations.length && invitations.length > 0
                         ? <CheckSquare className="w-5 h-5 text-blue-600" />
                         : <Square className="w-5 h-5" />
                       }
                       {selectedPending.size > 0 ? `${selectedPending.size} selected` : 'Select all'}
                     </button>
                   </div>

                   {selectedPending.size > 0 && (
                     <Button
                       className="bg-blue-600 hover:bg-blue-700 text-white"
                       onClick={() => bulkInviteMutation.mutate()}
                       disabled={bulkInviteMutation.isPending}
                     >
                       {bulkInviteMutation.isPending ? 'Sending...' : `Send Selected (${selectedPending.size})`}
                     </Button>
                   )}
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                   {invitations.map(inv => {
                     const isSelected = selectedPending.has(inv.id);
                     return (
                       <div
                         key={inv.id}
                         className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200'}`}
                         onClick={() => {
                           setSelectedPending(prev => {
                             const next = new Set(prev);
                             isSelected ? next.delete(inv.id) : next.add(inv.id);
                             return next;
                           });
                         }}
                       >
                         {isSelected && (
                           <div className="absolute top-2 right-2 z-10">
                             <CheckSquare className="w-5 h-5 text-blue-600" />
                           </div>
                         )}
                         <div className="text-sm">
                           <p className="font-semibold text-slate-900">{inv.first_name} {inv.last_name}</p>
                           <p className="text-xs text-slate-500">{inv.email}</p>
                           {inv.position && <p className="text-xs text-slate-600 mt-1">{inv.position}</p>}
                           <p className="text-xs text-slate-400 mt-2">Status: <span className="font-medium capitalize">{inv.status}</span></p>
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </>
             )}
           </TabsContent>

          {/* ACTIVE TAB */}
          <TabsContent value="active">
            <EmployeeGrid employees={activeEmployees} />
          </TabsContent>

          {/* INACTIVE TAB */}
          <TabsContent value="inactive">
            <EmployeeGrid employees={inactiveEmployees} />
          </TabsContent>

          {/* ON LEAVE TAB */}
          <TabsContent value="on_leave">
            <EmployeeGrid employees={onLeaveEmployees} />
          </TabsContent>

          {/* TERMINATED TAB */}
          <TabsContent value="terminated">
            <EmployeeGrid employees={terminatedEmployees} />
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

        <ImportEmployeesDialog open={showImportDialog} onClose={() => setShowImportDialog(false)} />

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