import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Search, FileText, Mail, UserX } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/i18n/LanguageContext";
import ModernEmployeeCard from "@/components/empleados/ModernEmployeeCard";
import OnboardingDetailsModal from "@/components/empleados/OnboardingDetailsModal";



const EmployeeFormDialog = ({ employee, onClose }) => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
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
      
      const fullName = firstName && lastName 
        ? `${firstName} ${lastName}`.trim()
        : data.full_name || data.email.split('@')[0];

      const payload = {
        ...data,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null,
        employment_status: employee ? employee.employment_status : 'invited',
        role: employee?.role || 'user'
      };

      if (employee) {
        await base44.entities.User.update(employee.id, payload);
      } else {
        await base44.entities.User.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    }
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: []
  });

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>First Name</Label>
          <Input value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
        </div>
        <div>
          <Label>Last Name</Label>
          <Input value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Position</Label>
          <select 
            value={formData.position} 
            onChange={(e) => setFormData({...formData, position: e.target.value})}
            className="w-full p-2 border rounded-md"
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
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select Department</option>
            <option value="operations">Operations</option>
            <option value="administration">Administration</option>
            <option value="field">Field</option>
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
              team_name: selectedTeam?.name || ''
            });
          }}
          className="w-full p-2 border rounded-md"
        >
          <option value="">Select Team</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>{team.name}</option>
          ))}
        </select>
      </div>

      <div>
        <Label>Address</Label>
        <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Date of Birth</Label>
          <Input type="date" value={formData.dob} onChange={(e) => setFormData({...formData, dob: e.target.value})} />
        </div>
        <div>
          <Label>SSN/Tax ID</Label>
          <Input value={formData.ssn_tax_id} onChange={(e) => setFormData({...formData, ssn_tax_id: e.target.value})} />
        </div>
        <div>
          <Label>T-Shirt Size</Label>
          <select 
            value={formData.tshirt_size} 
            onChange={(e) => setFormData({...formData, tshirt_size: e.target.value})}
            className="w-full p-2 border rounded-md"
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
      </div>

      <div>
        <Label>Hourly Rate ($)</Label>
        <Input type="number" step="0.01" value={formData.hourly_rate} onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})} />
      </div>

      <div className="flex gap-2 justify-end pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => mutation.mutate(formData)} disabled={mutation.isPending}>
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

  // Lazy load employees with pagination
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('-created_date'),
    staleTime: 30000,
    select: (data) => data // Full data, we'll paginate in UI
  });

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
    const progressMap = {};
    
    employees.forEach(emp => {
      const empForms = onboardingForms.filter(f => f.employee_email === emp.email && f.status === 'completed');
      const completed = empForms.length;
      const total = 3; // 3 mandatory forms
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

  const activeEmployees = filterEmployees(employees.filter(e => e.employment_status === 'active' || !e.employment_status));
  const invitedEmployees = filterEmployees(employees.filter(e => e.employment_status === 'invited'));
  const deletedEmployees = filterEmployees(employees.filter(e => e.employment_status === 'deleted'));

  // Paginate current tab employees
  const paginateEmployees = (empList) => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return empList.slice(start, end);
  };

  const handleViewOnboarding = (employee) => {
    setSelectedEmployee(employee);
    setShowOnboardingModal(true);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#F1F5F9] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-2xl shadow-md">
                  <Users className="w-7 h-7 text-white" />
                </div>
                Employee Management
              </h1>
              <p className="text-slate-600 mt-2 ml-[60px]">Manage your team members</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  const response = await base44.functions.invoke('exportEmployeesToPDF');
                  const blob = new Blob([response.data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `employees_${new Date().toISOString().split('T')[0]}.pdf`;
                  a.click();
                }}
                variant="outline"
              >
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              
              <Button onClick={() => { setEditingEmployee(null); setShowDialog(true); }} className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
                <Plus className="w-5 h-5 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>
        </div>

        <Card className="mb-6 shadow-lg">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12"
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-md border">
            <TabsTrigger value="active">
              <Users className="w-4 h-4 mr-2" />
              Active ({activeEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="invited">
              <Mail className="w-4 h-4 mr-2" />
              Invited ({invitedEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="deleted">
              <UserX className="w-4 h-4 mr-2" />
              Deleted ({deletedEmployees.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-slate-600">
                  Page {page} of {Math.ceil(activeEmployees.length / ITEMS_PER_PAGE)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(Math.ceil(activeEmployees.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={page >= Math.ceil(activeEmployees.length / ITEMS_PER_PAGE)}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invited">
            <Alert className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800">
                ℹ️ Invited employees need to accept invitation from Dashboard to activate their account.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginateEmployees(invitedEmployees).map(employee => (
                <ModernEmployeeCard
                  key={employee.id}
                  employee={employee}
                  onboardingProgress={employeeProgress[employee.id]}
                  onViewDetails={handleViewOnboarding}
                />
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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            </DialogHeader>
            <EmployeeFormDialog employee={editingEmployee} onClose={() => { setShowDialog(false); setEditingEmployee(null); }} />
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