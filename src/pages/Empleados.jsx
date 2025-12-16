import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Edit,
  Building2,
  MoreVertical,
  Eye,
  Trash2,
  RotateCcw,
  UserPlus,
  Clock,
  CheckCircle2,
  UserX,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const formatName = (user) => {
  if (user.full_name && !user.full_name.includes('@')) return user.full_name;
  if (user.first_name || user.last_name) {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim();
  }
  if (user.email) {
    return user.email.split('@')[0].split('.').map(p => 
      p.charAt(0).toUpperCase() + p.slice(1)
    ).join(' ');
  }
  return 'Unknown';
};

const EmployeeCard = ({ employee, onEdit, onViewProfile, onDelete, onInvite, onRestore }) => {
  const displayName = formatName(employee);
  const status = employee.employment_status || 'active';

  const statusConfig = {
    invited: { label: 'Invited', color: 'bg-blue-100 text-blue-800', icon: Mail },
    pending_registration: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    active: { label: 'Active', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
    inactive: { label: 'Inactive', color: 'bg-gray-100 text-gray-800', icon: UserX },
    deleted: { label: 'Deleted', color: 'bg-red-100 text-red-800', icon: Trash2 }
  };

  const config = statusConfig[status] || statusConfig.active;
  const Icon = config.icon;
  const isDeleted = status === 'deleted';

  return (
    <Card className={`hover:shadow-lg transition-all ${isDeleted ? 'opacity-60 bg-red-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {employee.profile_photo_url ? (
            <img
              src={employee.profile_photo_url}
              alt={displayName}
              className={`w-12 h-12 rounded-full object-cover ${isDeleted ? 'grayscale' : ''}`}
            />
          ) : (
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
              isDeleted ? 'bg-gray-400' : 'bg-gradient-to-br from-blue-500 to-blue-600'
            }`}>
              {displayName[0]?.toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold text-sm truncate ${isDeleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {displayName}
              </h3>
              <Badge className={`${config.color} text-xs flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {config.label}
              </Badge>
            </div>
            
            {employee.position && (
              <p className="text-xs text-gray-600 truncate">{employee.position}</p>
            )}
            
            {employee.team_name && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 className="w-3 h-3 text-purple-600" />
                <span className="text-xs text-purple-600">{employee.team_name}</span>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isDeleted && (
                <>
                  <DropdownMenuItem onClick={onViewProfile}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {status === 'invited' && (
                    <DropdownMenuItem onClick={onInvite}>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Resend Invitation
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {isDeleted && (
                <DropdownMenuItem onClick={onRestore} className="text-green-600">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail className="w-3 h-3" />
            <span className="truncate">{employee.email}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const EmployeeFormDialog = ({ employee, open, onClose }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    email: employee?.email || '',
    position: employee?.position || '',
    phone: employee?.phone || '',
    department: employee?.department || '',
    team_id: employee?.team_id || '',
    hourly_rate: employee?.hourly_rate || '',
    address: employee?.address || '',
    ssn_tax_id: employee?.ssn_tax_id || '',
    dob: employee?.dob || '',
    tshirt_size: employee?.tshirt_size || '',
    hire_date: employee?.hire_date || ''
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
    initialData: []
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const fullName = `${data.first_name} ${data.last_name}`.trim();
      const selectedTeam = teams.find(t => t.id === data.team_id);
      
      const payload = {
        ...data,
        full_name: fullName,
        team_name: selectedTeam?.name || '',
        employment_status: employee ? employee.employment_status : 'invited',
        hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : null
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          <DialogDescription>
            {employee ? 'Update employee information' : 'Add a new employee. They will receive an invitation email.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>First Name *</Label>
            <Input
              value={formData.first_name}
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
              required
            />
          </div>
          <div>
            <Label>Last Name *</Label>
            <Input
              value={formData.last_name}
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
              required
            />
          </div>
          <div className="col-span-2">
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
            <Label>Position</Label>
            <select
              value={formData.position}
              onChange={(e) => setFormData({...formData, position: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
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
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Select Department</option>
              <option value="operations">Operations</option>
              <option value="administration">Administration</option>
              <option value="field">Field</option>
              <option value="HR">HR</option>
            </select>
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div>
            <Label>Team</Label>
            <select
              value={formData.team_id}
              onChange={(e) => setFormData({...formData, team_id: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">No Team</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Hourly Rate ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.hourly_rate}
              onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
            />
          </div>
          <div>
            <Label>T-Shirt Size</Label>
            <select
              value={formData.tshirt_size}
              onChange={(e) => setFormData({...formData, tshirt_size: e.target.value})}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">Select Size</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="XXXL">XXXL</option>
            </select>
          </div>
          <div className="col-span-2">
            <Label>Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div>
            <Label>SSN/Tax ID</Label>
            <Input
              value={formData.ssn_tax_id}
              onChange={(e) => setFormData({...formData, ssn_tax_id: e.target.value})}
            />
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({...formData, dob: e.target.value})}
            />
          </div>
          <div>
            <Label>Hire Date</Label>
            <Input
              type="date"
              value={formData.hire_date}
              onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={!formData.first_name || !formData.last_name || !formData.email || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function Empleados() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [showDialog, setShowDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: []
  });

  const inviteMutation = useMutation({
    mutationFn: async (employee) => {
      await base44.functions.invoke('sendInvitationEmail', {
        to: employee.email,
        fullName: formatName(employee),
        language: 'en'
      });

      await navigator.clipboard.writeText(employee.email);
      window.open('https://app.base44.com/dashboard', '_blank');

      await base44.entities.User.update(employee.id, {
        employment_status: 'invited'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      alert('✅ Email sent! Now invite from Dashboard → "Invite User"');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.User.update(id, { employment_status: 'deleted' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      alert('✅ Employee deleted. Access blocked.');
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (id) => base44.entities.User.update(id, { employment_status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      alert('✅ Employee restored. Access granted.');
    }
  });

  const filterEmployees = (list) => {
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(e => 
      formatName(e).toLowerCase().includes(term) ||
      e.email?.toLowerCase().includes(term) ||
      e.position?.toLowerCase().includes(term)
    );
  };

  const activeEmployees = filterEmployees(
    employees.filter(e => ['active', 'inactive'].includes(e.employment_status || 'active'))
  );

  const invitedEmployees = filterEmployees(
    employees.filter(e => ['invited', 'pending_registration'].includes(e.employment_status))
  );

  const deletedEmployees = filterEmployees(
    employees.filter(e => e.employment_status === 'deleted')
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl">
                <Users className="w-7 h-7 text-white" />
              </div>
              Employee Management
            </h1>
            <p className="text-gray-600 mt-2 ml-[60px]">Manage your team members</p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                try {
                  const response = await base44.functions.invoke('exportEmployeesToPDF');
                  const blob = new Blob([response.data], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `employees_${new Date().toISOString().split('T')[0]}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  a.remove();
                } catch (error) {
                  alert('Error: ' + error.message);
                }
              }}
              variant="outline"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            
            <Button onClick={() => { setEditingEmployee(null); setShowDialog(true); }}>
              <Plus className="w-5 h-5 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">
              <Users className="w-4 h-4 mr-2" />
              Active ({activeEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="invited">
              <Clock className="w-4 h-4 mr-2" />
              Invited ({invitedEmployees.length})
            </TabsTrigger>
            <TabsTrigger value="deleted">
              <Trash2 className="w-4 h-4 mr-2" />
              Deleted ({deletedEmployees.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEmployees.map(emp => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onEdit={() => { setEditingEmployee(emp); setShowDialog(true); }}
                  onViewProfile={() => window.location.href = createPageUrl(`EmployeeProfile?id=${emp.id}`)}
                  onDelete={() => {
                    if (confirm(`Delete ${formatName(emp)}? This will block their access.`)) {
                      deleteMutation.mutate(emp.id);
                    }
                  }}
                />
              ))}
            </div>
            {activeEmployees.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No active employees</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="invited" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invitedEmployees.map(emp => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onEdit={() => { setEditingEmployee(emp); setShowDialog(true); }}
                  onViewProfile={() => window.location.href = createPageUrl(`EmployeeProfile?id=${emp.id}`)}
                  onInvite={() => inviteMutation.mutate(emp)}
                  onDelete={() => {
                    if (confirm(`Delete ${formatName(emp)}?`)) {
                      deleteMutation.mutate(emp.id);
                    }
                  }}
                />
              ))}
            </div>
            {invitedEmployees.length === 0 && (
              <div className="text-center py-16">
                <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">All employees are active</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="deleted" className="mt-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deletedEmployees.map(emp => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onRestore={() => {
                    if (confirm(`Restore ${formatName(emp)}?`)) {
                      restoreMutation.mutate(emp.id);
                    }
                  }}
                />
              ))}
            </div>
            {deletedEmployees.length === 0 && (
              <div className="text-center py-16">
                <CheckCircle2 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No deleted employees</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {showDialog && (
          <EmployeeFormDialog
            employee={editingEmployee}
            open={showDialog}
            onClose={() => { setShowDialog(false); setEditingEmployee(null); }}
          />
        )}
      </div>
    </div>
  );
}