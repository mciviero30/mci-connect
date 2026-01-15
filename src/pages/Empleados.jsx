import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Search, FileText, Mail, UserX, Shield, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/i18n/LanguageContext";
import ModernEmployeeCard from "@/components/empleados/ModernEmployeeCard";
import PendingInvitationCard from "@/components/empleados/PendingInvitationCard";
import OnboardingDetailsModal from "@/components/empleados/OnboardingDetailsModal";
import { useToast } from "@/components/ui/toast";
import { canViewSensitiveData } from "@/components/utils/employeeSecurity";
import { createPageUrl } from "@/utils";



// Helper: Sync to EmployeeDirectory
const syncToEmployeeDirectory = async (email, userData) => {
  try {
    const allDirectory = await base44.entities.EmployeeDirectory.list();
    const existing = allDirectory.find(d => 
      d.employee_email?.toLowerCase() === email.toLowerCase()
    );

    const directoryData = {
      employee_email: email,
      full_name: userData.full_name || '',
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      position: userData.position || '',
      department: userData.department || '',
      phone: userData.phone || '',
      team_id: userData.team_id || '',
      team_name: userData.team_name || '',
      profile_photo_url: userData.profile_photo_url || '',
      status: userData.employment_status === 'active' ? 'active' : 'inactive',
      sync_source: 'user_direct',
      last_synced_at: new Date().toISOString()
    };

    if (existing) {
      await base44.entities.EmployeeDirectory.update(existing.id, directoryData);
    } else {
      await base44.entities.EmployeeDirectory.create(directoryData);
    }
  } catch (error) {
    console.error('Failed to sync to EmployeeDirectory:', error);
  }
};

// Helper: Create directory entry for new pending employee
const createEmployeeDirectoryEntry = async (employeeData, status = 'pending') => {
  try {
    const allDirectory = await base44.entities.EmployeeDirectory.list();
    const existing = allDirectory.find(d => 
      d.employee_email?.toLowerCase() === employeeData.email.toLowerCase()
    );

    const directoryData = {
      employee_email: employeeData.email,
      full_name: employeeData.full_name || '',
      first_name: employeeData.first_name || '',
      last_name: employeeData.last_name || '',
      position: employeeData.position || '',
      department: employeeData.department || '',
      phone: employeeData.phone || '',
      team_id: employeeData.team_id || '',
      team_name: employeeData.team_name || '',
      status: status,
      sync_source: 'pending_employee',
      last_synced_at: new Date().toISOString()
    };

    if (existing) {
      await base44.entities.EmployeeDirectory.update(existing.id, directoryData);
    } else {
      await base44.entities.EmployeeDirectory.create(directoryData);
    }
  } catch (error) {
    console.error('Failed to create EmployeeDirectory entry:', error);
  }
};

const EmployeeFormDialog = ({ employee, onClose, currentUser }) => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const canViewSensitive = canViewSensitiveData(currentUser);
  
  const [formData, setFormData] = useState({
    email: employee?.email || '',
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    full_name: employee?.full_name || '',
    phone: employee?.phone || '',
    position: employee?.position || '',
    department: employee?.department || '',
    team_id: employee?.team_id || '',
    team_name: employee?.team_name || '',
    address: employee?.address || '',
    dob: employee?.dob || '',
    ssn_tax_id: employee?.ssn_tax_id || '',
    tshirt_size: employee?.tshirt_size || '',
    hourly_rate: employee?.hourly_rate || '',
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      // Capitalize first and last names
      const firstName = data.first_name ? 
        data.first_name.charAt(0).toUpperCase() + data.first_name.slice(1).toLowerCase() : '';
      const lastName = data.last_name ? 
        data.last_name.charAt(0).toUpperCase() + data.last_name.slice(1).toLowerCase() : '';
      
      // Build full_name ONLY from real name data (never from email-local-part)
      const fullName = firstName && lastName 
        ? `${firstName} ${lastName}`.trim()
        : (employee?.full_name && !employee.full_name.includes('@')) 
          ? employee.full_name  // Preserve existing good name
          : '';

      const payload = {
        ...data,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
      };

      if (employee) {
        // Update existing User
        const result = await base44.entities.User.update(employee.id, payload);
        
        // Sync to EmployeeDirectory
        await syncToEmployeeDirectory(employee.email, {
          ...payload,
          employment_status: employee.employment_status,
          profile_photo_url: employee.profile_photo_url || employee.avatar_image_url
        });
        
        return result;
      } else {
        // Create as PendingEmployee
        const newPending = await base44.entities.PendingEmployee.create({
          ...payload,
          status: 'pending'
        });
        
        // Create EmployeeDirectory entry for pending
        await createEmployeeDirectoryEntry({
          email: data.email,
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          position: data.position,
          department: data.department,
          phone: data.phone,
          team_id: data.team_id,
          team_name: data.team_name
        }, 'pending');
        
        return newPending;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['employees'] });
      await queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      // Force immediate refetch
      await queryClient.refetchQueries({ queryKey: ['pendingEmployees'] });
      toast({
        title: employee ? 'Employee updated!' : 'Employee created! Check "Pending" tab to invite them.',
        variant: 'success'
      });
      onClose();
    },
    onError: (error) => {
      console.error('Error saving employee:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not save employee',
        variant: 'destructive'
      });
    }
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: [],
    staleTime: 60000
  });

  React.useEffect(() => {
    console.log('Teams loaded:', teams);
    console.log('Teams count:', teams.length);
    teams.forEach((team, idx) => {
      console.log(`Team ${idx}:`, { id: team.id, name: team.name });
    });
  }, [teams]);

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Email *</Label>
          <Input 
            type="email" 
            value={formData.email} 
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            disabled={!!employee}
            required
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>First Name</Label>
          <Input value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
        </div>
        <div>
          <Label>Last Name</Label>
          <Input value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Position</Label>
          <select 
            value={formData.position} 
            onChange={(e) => setFormData({...formData, position: e.target.value})}
            className="w-full h-10 px-3 py-2 border rounded-md bg-white dark:bg-slate-800"
          >
            <option value="">Select Position</option>
            <option value="CEO">CEO</option>
            <option value="manager">Manager</option>
            <option value="supervisor">Supervisor</option>
            <option value="foreman">Foreman</option>
            <option value="technician">Technician</option>
            <option value="administrator">Administrator</option>
          </select>
        </div>
        <div>
          <Label>Department</Label>
          <select 
            value={formData.department} 
            onChange={(e) => setFormData({...formData, department: e.target.value})}
            className="w-full h-10 px-3 py-2 border rounded-md bg-white dark:bg-slate-800"
          >
            <option value="">Select Department</option>
            <option value="executive">Executive</option>
            <option value="management">Management</option>
            <option value="operations">Operations</option>
            <option value="administration">Administration</option>
            <option value="field">Field Technician</option>
            <option value="foreman">Foreman</option>
            <option value="HR">HR</option>
            <option value="IT">IT</option>
            <option value="sales">Sales</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>
      </div>

      <div>
        <Label>Team</Label>
        <select 
          value={formData.team_id} 
          onChange={(e) => {
            const selectedTeam = teams.find(t => t.id === e.target.value);
            setFormData({
              ...formData, 
              team_id: e.target.value,
              team_name: selectedTeam?.team_name || ''
            });
          }}
          className="w-full min-h-[44px] px-3 py-2 border rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          style={{ color: '#0f172a' }}
        >
          <option value="" style={{ color: '#0f172a' }}>Select Team</option>
          {teamsLoading && <option disabled style={{ color: '#64748b' }}>Loading teams...</option>}
          {!teamsLoading && teams.length === 0 && <option disabled style={{ color: '#64748b' }}>No teams available</option>}
          {teams.filter(team => team?.team_name).map(team => (
            <option key={team.id} value={team.id} style={{ color: '#0f172a' }}>{team.team_name}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Address</Label>
        <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
      </div>

      {canViewSensitive && (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>Date of Birth</Label>
            <Input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
          </div>
          <div>
            <Label>SSN/Tax ID</Label>
            <Input value={formData.ssn_tax_id} onChange={(e) => setFormData({...formData, ssn_tax_id: e.target.value})} placeholder="XXX-XX-XXXX" />
          </div>
        </div>
      )}
      {!canViewSensitive && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-800 text-sm">
            🔒 DOB and SSN fields require CEO/Admin/Administrator permissions
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label>T-Shirt Size</Label>
        <select 
          value={formData.tshirt_size} 
          onChange={(e) => setFormData({...formData, tshirt_size: e.target.value})}
          className="w-full h-10 px-3 py-2 border rounded-md bg-white dark:bg-slate-800"
        >
          <option value="">Select</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
          <option value="XXXL">XXXL</option>
        </select>
      </div>

      <div>
        <Label>Hourly Rate ($)</Label>
        <Input type="number" step="0.01" value={formData.hourly_rate} onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})} />
      </div>

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
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });
  
  // GUARD: Only Admin and CEO can access Employee Management
  const userRole = (currentUser?.role || 'employee').toLowerCase();
  const hasFullAccess = userRole === 'admin' || userRole === 'ceo';

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

  // Lazy load employees with pagination
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const { data: employees = [], isLoading, refetch: refetchEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('-created_date'),
    staleTime: 30000,
    select: (data) => data // Full data, we'll paginate in UI
  });

  const { data: pendingEmployees = [], refetch: refetchPending } = useQuery({
    queryKey: ['pendingEmployees'],
    queryFn: async () => {
      const result = await base44.entities.PendingEmployee.list('-created_date');
      console.log('🔍 PendingEmployees fetched:', result.length, 'employees');
      
      // Auto-cleanup: Delete pending employees that are already active
      const activeEmails = employees.map(e => e.email?.toLowerCase()).filter(Boolean);
      const toDelete = result.filter(p => 
        p.email && activeEmails.includes(p.email.toLowerCase())
      );
      
      if (toDelete.length > 0) {
        console.log('🧹 Auto-cleaning', toDelete.length, 'pending employees that are already active');
        for (const pending of toDelete) {
          try {
            await base44.entities.PendingEmployee.delete(pending.id);
            console.log('✅ Cleaned up:', pending.email);
          } catch (err) {
            console.error('Error cleaning pending:', pending.email, err);
          }
        }
        // Refetch after cleanup
        const cleanedResult = await base44.entities.PendingEmployee.list('-created_date');
        return cleanedResult;
      }
      
      return result;
    },
    staleTime: 5000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    initialData: [],
    enabled: employees.length > 0
  });

  // Debug log whenever pendingEmployees changes
  React.useEffect(() => {
    console.log('📊 PendingEmployees state updated:', pendingEmployees.length, 'employees');
  }, [pendingEmployees]);

  // Listen for profile updates
  React.useEffect(() => {
    const handleProfileUpdate = () => {
      refetchEmployees();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [refetchEmployees]);

  // Lazy load onboarding forms for progress calculation
  const { data: onboardingForms = [] } = useQuery({
    queryKey: ['onboardingForms'],
    queryFn: () => base44.entities.OnboardingForm.list(),
    staleTime: 60000,
    enabled: employees.length > 0,
    initialData: []
  });

  // Calculate onboarding progress for each employee (memoized)
  const employeeProgress = useMemo(() => {
    if (!employees.length || !onboardingForms.length) return {};
    
    const progressMap = {};
    
    employees.forEach(emp => {
      const empForms = onboardingForms.filter(f => f.employee_email === emp.email && f.status === 'completed');
      const completed = empForms.length;
      const total = 4; // 4 mandatory steps (safety, rules, paperwork, profile review)
      const percentage = Math.round((completed / total) * 100);
      
      progressMap[emp.id] = {
        percentage,
        completed,
        total,
        forms: empForms
      };
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

      await navigator.clipboard.writeText(employee.email);
      window.open('https://app.base44.com/dashboard', '_blank');
    },
    onSuccess: () => {
      alert(language === 'es' 
        ? '✅ Email enviado. Ahora invita desde Dashboard → "Invite User"'
        : '✅ Email sent. Now invite from Dashboard → "Invite User"'
      );
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (employeeId) => base44.entities.User.update(employeeId, { employment_status: 'deleted' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] })
  });

  const restoreMutation = useMutation({
    mutationFn: (employeeId) => base44.entities.User.update(employeeId, { employment_status: 'active' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] })
  });

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

  // Admin/CEO see ALL employees. Regular users don't see owner.
  const OWNER_EMAIL = 'marzio.civiero@mci-us.com';
  const excludeOwner = (list) => hasFullAccess ? list : list.filter(e => e.email !== OWNER_EMAIL);

  const activeEmployees = filterEmployees(excludeOwner(employees.filter(e => 
    e.employment_status === 'active' || 
    e.employment_status === 'pending_registration' ||
    !e.employment_status // Users with no status
  )));
  
  // Debug pending employees filtering - NO FILTER for owner, allow CEO to be invited
  const rawPending = pendingEmployees.filter(e => 
    (e.status === 'pending' || !e.status)
  );
  console.log('🔎 Raw pending after owner filter:', rawPending.length);
  
  const pendingList = filterEmployees(rawPending.map(pe => ({ 
    ...pe, 
    entity_name: 'PendingEmployee'
  })));
  
  console.log('✅ Final pendingList:', pendingList.length, 'employees');
  
  // Invited tab: Users with employment_status='invited' + PendingEmployees with status='invited' - NO FILTER for owner
  const invitedUsers = filterEmployees(excludeOwner(employees.filter(e => e.employment_status === 'invited')));
  const invitedPending = filterEmployees(pendingEmployees.filter(e => 
    e.status === 'invited'
  ).map(pe => ({ 
    ...pe, 
    entity_name: 'PendingEmployee'
  })));
  const invitedEmployees = [...invitedUsers, ...invitedPending];
  const archivedEmployees = filterEmployees(excludeOwner(employees.filter(e => e.employment_status === 'archived')));
  const deletedEmployees = filterEmployees(excludeOwner(employees.filter(e => e.employment_status === 'deleted')));

  // Paginate current tab employees
  const paginateEmployees = (empList) => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return empList.slice(start, end);
  };

  const handleViewOnboarding = (employee) => {
    // Only show modal if employee has progress data (active employees)
    if (employeeProgress[employee.id]) {
      setSelectedEmployee(employee);
      setShowOnboardingModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 md:p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-xl sm:rounded-2xl shadow-md">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </div>
                <span className="hidden sm:inline">Employee Management</span>
                <span className="sm:hidden">Employees</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 text-xs sm:text-sm ml-0 sm:ml-[48px] md:ml-[60px]">Manage your team members</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-h-[44px] px-3">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem 
                    onClick={() => {
                      const csv = `email,first_name,last_name,phone,position,department,team_name,address,dob,ssn_tax_id,tshirt_size,hourly_rate
            john.doe@example.com,John,Doe,(555)123-4567,technician,field,Team Alpha,123 Main St,1990-01-15,123-45-6789,L,25.50
            jane.smith@example.com,Jane,Smith,(555)987-6543,supervisor,operations,Team Beta,456 Oak Ave,1985-03-22,987-65-4321,M,35.00`;

                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'employee_template.csv';
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.csv';

                      input.onchange = async (e) => {
                        const file = e.target.files?.[0];

                        if (!file) {
                          alert('No file selected');
                          return;
                        }

                        try {
                          alert(`⏳ Uploading ${file.name}...`);

                          const uploadRes = await base44.integrations.Core.UploadFile({ file });

                          alert('⏳ Processing employees (30-60 seconds)...');
                          const response = await base44.functions.invoke('importEmployeesFromXLSX', { 
                            file_url: uploadRes.file_url 
                          });

                          const result = response?.data || response;

                          await queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
                          await queryClient.refetchQueries({ queryKey: ['pendingEmployees'] });

                          const created = result?.created || 0;
                          const errors = result?.errors?.length || 0;

                          if (errors > 0) {
                            alert(`⚠️ Imported ${created} employees with ${errors} errors.`);
                          } else {
                            alert(`✅ Imported ${created} employees!`);
                            setActiveTab('pending');
                          }

                        } catch (err) {
                          alert(`❌ Error: ${err?.message || 'Unknown error'}`);
                        }
                      };

                      document.body.appendChild(input);
                      input.click();
                      setTimeout(() => input.remove(), 1000);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Import CSV
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={async () => {
                      const response = await base44.functions.invoke('exportEmployeesToPDF');
                      const blob = new Blob([response.data], { type: 'application/pdf' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `employees_${new Date().toISOString().split('T')[0]}.pdf`;
                      a.click();
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={async () => {
                      if (!confirm('⚠️ This will delete ALL pending and invited employees. Continue?')) return;
                      try {
                        await base44.functions.invoke('cleanupPendingEmployees');
                        await queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
                        alert('✅ All pending/invited employees deleted');
                      } catch (err) {
                        alert('❌ Error: ' + err.message);
                      }
                    }}
                    className="text-red-600"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Cleanup All Pending
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button 
                onClick={() => { setEditingEmployee(null); setShowDialog(true); }} 
                className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md min-h-[44px] text-xs sm:text-sm px-3 sm:px-4 flex-1 sm:flex-none"
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <TabsList className="bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 inline-flex min-w-max sm:min-w-0">
                <TabsTrigger value="active" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Active</span> ({activeEmployees.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Pending</span> ({pendingEmployees.length})
                </TabsTrigger>
                <TabsTrigger value="invited" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Invited</span> ({invitedEmployees.length})
                </TabsTrigger>
                <TabsTrigger value="archived" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                  <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Archived</span> ({archivedEmployees.length})
                </TabsTrigger>
                <TabsTrigger value="deleted" className="text-xs sm:text-sm px-3 sm:px-4 min-h-[44px]">
                  <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Deleted</span> ({deletedEmployees.length})
                </TabsTrigger>
              </TabsList>
            </div>

          <TabsContent value="active">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {paginateEmployees(activeEmployees).map(employee => (
                <ModernEmployeeCard
                  key={employee.id}
                  employee={employee}
                  onboardingProgress={employeeProgress[employee.id]}
                  onViewDetails={handleViewOnboarding}
                />
              ))}
            </div>

            {/* Pagination */}
            {activeEmployees.length > ITEMS_PER_PAGE && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-6 sm:mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-full sm:w-auto min-h-[44px] text-sm"
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  Page {page} of {Math.ceil(activeEmployees.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(Math.ceil(activeEmployees.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={page >= Math.ceil(activeEmployees.length / ITEMS_PER_PAGE)}
                  className="w-full sm:w-auto min-h-[44px] text-sm"
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            <Alert className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800">
                ℹ️ Pending employees need to be invited to join the system.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginateEmployees(pendingList).map(employee => (
                <PendingInvitationCard
                  key={employee.id}
                  employee={employee}
                />
              ))}
            </div>

            {pendingList.length > ITEMS_PER_PAGE && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 mt-6 sm:mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-full sm:w-auto min-h-[44px] text-sm"
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  Page {page} of {Math.ceil(pendingList.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(Math.ceil(pendingList.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={page >= Math.ceil(pendingList.length / ITEMS_PER_PAGE)}
                  className="w-full sm:w-auto min-h-[44px] text-sm"
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invited">
           <Alert className="mb-4 bg-blue-50 border-blue-200">
             <AlertDescription className="text-blue-800">
               ℹ️ Invited employees need to accept invitation from Dashboard to activate their account.
             </AlertDescription>
           </Alert>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {paginateEmployees(invitedEmployees).map(employee => (
               employee.entity_name === 'PendingEmployee' ? (
                 <PendingInvitationCard
                   key={employee.id}
                   employee={employee}
                 />
               ) : (
                 <ModernEmployeeCard
                   key={employee.id}
                   employee={employee}
                   onboardingProgress={employeeProgress[employee.id]}
                   onViewDetails={handleViewOnboarding}
                 />
               )
             ))}
           </div>

            {invitedEmployees.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-slate-600">
                  Page {page} of {Math.ceil(invitedEmployees.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(Math.ceil(invitedEmployees.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={page >= Math.ceil(invitedEmployees.length / ITEMS_PER_PAGE)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="archived">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginateEmployees(archivedEmployees).map(employee => (
                <ModernEmployeeCard
                  key={employee.id}
                  employee={employee}
                  onboardingProgress={employeeProgress[employee.id]}
                  onViewDetails={handleViewOnboarding}
                />
              ))}
            </div>

            {archivedEmployees.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-slate-600">
                  Page {page} of {Math.ceil(archivedEmployees.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(Math.ceil(archivedEmployees.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={page >= Math.ceil(archivedEmployees.length / ITEMS_PER_PAGE)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deleted">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginateEmployees(deletedEmployees).map(employee => (
                <ModernEmployeeCard
                  key={employee.id}
                  employee={employee}
                  onboardingProgress={employeeProgress[employee.id]}
                  onViewDetails={handleViewOnboarding}
                />
              ))}
            </div>

            {deletedEmployees.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-slate-600">
                  Page {page} of {Math.ceil(deletedEmployees.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(Math.ceil(deletedEmployees.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={page >= Math.ceil(deletedEmployees.length / ITEMS_PER_PAGE)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <EmployeeFormDialog employee={editingEmployee} currentUser={currentUser} onClose={() => { setShowDialog(false); setEditingEmployee(null); }} />
          </DialogContent>
        </Dialog>

        {/* Onboarding Details Modal */}
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