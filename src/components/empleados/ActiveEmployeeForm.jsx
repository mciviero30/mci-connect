import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Trash2 } from "lucide-react";

const formatPhone = (value) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)})${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)})${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

export default function ActiveEmployeeForm({ employee, onClose }) {
  const queryClient = useQueryClient();
  
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: [],
  });

  const { data: managers } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => ['CEO', 'manager', 'supervisor'].includes(u.position));
    },
    initialData: [],
  });

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'] });

  // Query for all employees to check team capacity
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  // Split full_name into first_name and last_name PROPERLY
  const getInitialNames = () => {
    // PRIORITY 1: Use existing first_name and last_name if they exist
    if (employee?.first_name || employee?.last_name) {
      return {
        first_name: employee.first_name || '',
        last_name: employee.last_name || ''
      };
    }
    
    // PRIORITY 2: Parse from full_name if it's not an email
    if (employee?.full_name && !employee.full_name.includes('@') && !employee.full_name.includes('.')) {
      const parts = employee.full_name.split(' ');
      return {
        first_name: parts[0] || '',
        last_name: parts.slice(1).join(' ') || ''
      };
    }
    
    // PRIORITY 3: Extract from email as last resort
    if (employee?.email) {
      const emailName = employee.email.split('@')[0];
      const parts = emailName.split('.');
      return {
        first_name: parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : '',
        last_name: parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') || ''
      };
    }
    
    return { first_name: '', last_name: '' };
  };

  const initialNames = getInitialNames();

  const [formData, setFormData] = useState({
    first_name: initialNames.first_name,
    last_name: initialNames.last_name,
    email: employee?.email || '',
    position: employee?.position || '',
    phone: employee?.phone || '',
    ssn_tax_id: employee?.ssn_tax_id || '',
    address: employee?.address || '',
    direct_manager_name: employee?.direct_manager_name || '',
    dob: employee?.dob || '',
    tshirt_size: employee?.tshirt_size || '',
    department: employee?.department || 'operations',
    team_id: employee?.team_id || '',
    team_name: employee?.team_name || '',
    team_role: employee?.team_role || 'technician_skilled',
    hourly_rate: employee?.hourly_rate || '',
    hire_date: employee?.hire_date || '',
    hourly_rate_overtime: employee?.hourly_rate_overtime || '',
    per_diem_amount: employee?.per_diem_amount || 50,
    pay_frequency: employee?.pay_frequency || 'weekly',
    employment_status: employee?.employment_status || 'active',
  });

  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Check team capacity before assignment
  const [teamCapacityWarning, setTeamCapacityWarning] = useState(null);

  // Auto-calculate overtime rate when hourly rate changes
  useEffect(() => {
    // Only auto-calculate if hourly_rate_overtime is not already set or provided by employee data
    if (formData.hourly_rate && (!employee?.hourly_rate_overtime || employee.hourly_rate_overtime === '')) {
      const normalRate = parseFloat(formData.hourly_rate);
      if (!isNaN(normalRate) && normalRate > 0) {
        const overtimeRate = (normalRate * 1.5).toFixed(2);
        setFormData(prev => ({ ...prev, hourly_rate_overtime: overtimeRate }));
      } else if (normalRate === 0) { // If hourly rate is explicitly 0, set overtime to 0
        setFormData(prev => ({ ...prev, hourly_rate_overtime: '0.00' }));
      }
    }
  }, [formData.hourly_rate, employee?.hourly_rate_overtime]);


  useEffect(() => {
    if (formData.team_id && teams.length > 0 && employees.length > 0) {
      const selectedTeam = teams.find(t => t.id === formData.team_id);
      if (selectedTeam && selectedTeam.maximum_headcount) {
        // Count current team members, excluding the current employee if editing
        const teamMembersCount = employees.filter(emp => 
          (emp.team_id === selectedTeam.id) &&
          (emp.employment_status === 'active') && // Only count active employees
          emp.id !== employee?.id // Exclude current employee if editing
        ).length;

        if (teamMembersCount >= selectedTeam.maximum_headcount) {
          setTeamCapacityWarning({
            teamName: selectedTeam.team_name,
            current: teamMembersCount,
            max: selectedTeam.maximum_headcount
          });
        } else {
          setTeamCapacityWarning(null);
        }
      } else {
        setTeamCapacityWarning(null);
      }
    } else {
      setTeamCapacityWarning(null);
    }
  }, [formData.team_id, teams, employees, employee?.id]);

  // Enhanced update mutation with proper field protection
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const selectedTeam = teams.find(t => t.id === data.team_id);
      const full_name = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      
      if (!full_name) {
        throw new Error('First name and last name are required');
      }
      
      const isCurrentUserAdmin = currentUser?.role === 'admin';
      
      const updateData = {
        first_name: data.first_name,
        last_name: data.last_name,
        full_name,
        phone: data.phone,
        address: data.address,
        dob: data.dob,
        tshirt_size: data.tshirt_size,
        team_id: data.team_id,
        team_name: selectedTeam?.team_name || '',
        team_role: data.team_role,
        department: data.department,
        position: data.position,
        direct_manager_name: data.direct_manager_name,
        
        ...(isCurrentUserAdmin && {
          hourly_rate: data.hourly_rate ? parseFloat(data.hourly_rate) : 25,
          hourly_rate_overtime: data.hourly_rate_overtime ? parseFloat(data.hourly_rate_overtime) : (parseFloat(data.hourly_rate || 25) * 1.5),
          per_diem_amount: data.per_diem_amount ? parseFloat(data.per_diem_amount) : 50,
          pay_frequency: data.pay_frequency,
          hire_date: data.hire_date,
          ssn_tax_id: data.ssn_tax_id,
          employment_status: data.employment_status
        })
      };

      if (currentUser && employee.email === currentUser.email) {
        await base44.auth.updateMe(updateData);
      } else {
        try {
          await base44.entities.User.update(employee.id, updateData);
        } catch (error) {
          console.error('Direct update failed:', error);
          throw new Error('PERMISSION_DENIED');
        }
      }

      const existingDirectory = await base44.entities.EmployeeDirectory.list();
      const directoryEntry = existingDirectory.find(d => d.employee_email === employee.email);
      
      const directoryData = {
        employee_email: employee.email,
        full_name,
        position: data.position || '',
        department: data.department || '',
        phone: data.phone || '',
        profile_photo_url: employee.profile_photo_url || '',
        status: 'active'
      };
      
      if (directoryEntry) {
        await base44.entities.EmployeeDirectory.update(directoryEntry.id, directoryData);
      } else {
        await base44.entities.EmployeeDirectory.create(directoryData);
      }

      return updateData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDirectory'] });
      onClose();
      alert('✅ Employee updated successfully!');
      setTimeout(() => window.location.reload(), 300);
    },
    onError: (error) => {
      console.error('Update employee error:', error);
      if (error.message === 'PERMISSION_DENIED') {
        setShowManualInstructions(true);
      } else {
        alert(`❌ Error: ${error.message}`);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Get all employee data to delete
      const timeEntries = await base44.entities.TimeEntry.filter({ employee_email: employee.email });
      const expenses = await base44.entities.Expense.filter({ employee_email: employee.email });
      const drivingLogs = await base44.entities.DrivingLog.filter({ employee_email: employee.email });
      const assignments = await base44.entities.JobAssignment.filter({ employee_email: employee.email });

      // Delete all associated data
      const deletePromises = [
        ...timeEntries.map(e => base44.entities.TimeEntry.delete(e.id)),
        ...expenses.map(e => base44.entities.Expense.delete(e.id)),
        ...drivingLogs.map(e => base44.entities.DrivingLog.delete(e.id)),
        ...assignments.map(e => base44.entities.JobAssignment.delete(e.id))
      ];
      
      await Promise.all(deletePromises);

      // Mark user as deleted
      try {
        await base44.entities.User.update(employee.id, { 
          employment_status: 'deleted',
          termination_date: new Date().toISOString().split('T')[0],
          termination_reason: 'Deleted by administrator'
        });
      } catch (error) {
        console.error('Could not update User entity directly:', error);
      }

      // Update directory status
      const existingDirectory = await base44.entities.EmployeeDirectory.list();
      const directoryEntry = existingDirectory.find(d => d.employee_email === employee.email);
      if (directoryEntry) {
        await base44.entities.EmployeeDirectory.update(directoryEntry.id, { status: 'inactive' });
      }

      return { email: employee.email, name: employee.full_name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeDirectory'] });
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onClose();
      
      alert(`✅ ${data.name} has been deleted!\n\n✓ All work data deleted\n✓ Marked as deleted\n✓ Access blocked\n\nThe employee will no longer be able to log in.`);
    },
    onError: (error) => {
      alert(`❌ Error deleting employee: ${error.message}`);
    }
  });

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  const handleTeamChange = (value) => {
    setFormData({ ...formData, team_id: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Confirm if team is at capacity
    if (teamCapacityWarning) {
      const confirmed = window.confirm(
        `⚠️ Team ${teamCapacityWarning.teamName} is at full capacity (${teamCapacityWarning.current}/${teamCapacityWarning.max} employees). Do you want to proceed anyway?`
      );
      if (!confirmed) return;
    }

    updateMutation.mutate({
      ...formData,
      employment_status: employee?.employment_status || 'active'
    });
  };

  // Team role options
  const teamRoleOptions = [
    { value: 'team_leader', label: 'Foreman / Team Leader' },
    { value: 'technician_skilled', label: 'Technician (Skilled)' },
    { value: 'technician_assistant', label: 'Technician (Assistant)' },
    { value: 'driver_logistics', label: 'Driver / Logistics' }
  ];

  if (showDeleteConfirm) {
    return (
      <div className="space-y-4 p-4">
        <Alert className="bg-red-500/10 border-red-500/30">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <AlertDescription className="text-red-400">
            <p className="font-bold mb-2">⚠️ Delete Employee</p>
            <p className="text-sm mb-3">
              This will permanently delete <span className="font-bold">{employee.full_name}</span>:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>All time entries</li>
              <li>All expenses</li>
              <li>All driving logs</li>
              <li>All job assignments</li>
              <li>Block access to the app</li>
            </ul>
            <p className="font-bold mt-3 text-yellow-400">This action cannot be undone!</p>
          </AlertDescription>
        </Alert>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
          <p className="text-slate-900 dark:text-white text-sm mb-2">What will happen:</p>
          <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-300 space-y-1 ml-2">
            <li>All employee data will be deleted</li>
            <li>Employment status will be set to "deleted"</li>
            <li>Employee will be blocked from logging in</li>
            <li>Employee will appear in the "Deleted" tab</li>
          </ol>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setShowDeleteConfirm(false)}
            className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Yes, Delete Employee'}
          </Button>
        </div>
      </div>
    );
  }

  if (showManualInstructions) {
    return (
      <div className="space-y-4 p-4">
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <AlertDescription className="text-amber-400">
            <p className="font-bold mb-2">Manual Update Required</p>
            <p className="text-sm mb-3">
              Due to permission restrictions, please update this employee manually through the Dashboard:
            </p>
          </AlertDescription>
        </Alert>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-bold text-slate-900 dark:text-white mb-2">📝 Step-by-step instructions:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Open Dashboard in browser (desktop recommended)</li>
            <li>Go to: <span className="text-cyan-400 font-mono">Data → User</span></li>
            <li>Search for: <span className="text-cyan-400 font-mono">{employee.email}</span></li>
            <li>Click <span className="text-cyan-400">Edit</span></li>
            <li>Update the following fields:</li>
          </ol>
          
          <div className="mt-3 ml-6 p-3 bg-slate-900 rounded border border-slate-700">
            <p className="font-mono text-xs space-y-1">
              {Object.entries(formData).map(([key, value]) => {
                const original = employee[key];
                if (String(value || '') !== String(original || '')) {
                  return (
                    <div key={key} className="text-amber-400">
                      • {key}: <span className="text-white">{value || '(empty)'}</span>
                    </div>
                  );
                }
                return null;
              })}
            </p>
          </div>

          <p className="mt-3">6. Click <span className="text-cyan-400">Save</span></p>
        </div>

        <div className="flex justify-end gap-3">
          <Button 
            onClick={onClose}
            className="bg-gradient-to-r from-cyan-500 to-blue-500"
          >
            Got it, I'll update manually
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
      <Alert className="bg-blue-500/10 border-blue-500/30">
        <AlertDescription className="text-blue-400 text-sm">
          💡 <strong>Note:</strong> If direct update fails, you'll receive instructions to update through Dashboard.
        </AlertDescription>
      </Alert>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-900 font-medium">First Name *</Label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            autoCapitalizeInput={true}
            required
          />
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Last Name *</Label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            autoCapitalizeInput={true}
            required
          />
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Email *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            required
            disabled
          />
          <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Phone</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            placeholder="(000)000-0000"
            maxLength={13}
          />
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Position</Label>
          <Select 
            value={formData.position || ''} 
            onValueChange={(value) => setFormData({ ...formData, position: value })}
          >
            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
              <SelectValue placeholder="Select position">
                {formData.position || "Select position"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="CEO">CEO</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="technician">Technician</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="foreman">Foreman</SelectItem>
              <SelectItem value="administrator">Administrator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Department</Label>
          <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="HR">HR</SelectItem>
              <SelectItem value="field">Field</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="IT">IT</SelectItem>
              <SelectItem value="administration">Administration</SelectItem>
              <SelectItem value="designer">Designer</SelectItem>
              <SelectItem value="PM">PM</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Team *</Label>
          <Select value={formData.team_id} onValueChange={handleTeamChange}>
            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {team.team_name} - {team.location}, {team.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Team capacity warning */}
          {teamCapacityWarning && (
            <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <span>⚠️</span>
              <span>Team at capacity ({teamCapacityWarning.current}/{teamCapacityWarning.max})</span>
            </p>
          )}
        </div>

        {/* Team Role Field */}
        <div>
          <Label className="text-slate-900 font-medium">Team Role *</Label>
          <Select value={formData.team_role} onValueChange={(value) => setFormData({ ...formData, team_role: value })}>
            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
              <SelectValue placeholder="Select team role" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {teamRoleOptions.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400 mt-1">Role in team for task assignments</p>
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Direct Manager</Label>
          <Select value={formData.direct_manager_name} onValueChange={(value) => setFormData({ ...formData, direct_manager_name: value })}>
            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {managers.map(mgr => (
                <SelectItem key={mgr.id} value={mgr.full_name}>
                  {mgr.full_name} - {mgr.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Existing Hourly Rate and Hire Date */}
        <div>
          <Label className="text-slate-900 font-medium">Hourly Rate</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.hourly_rate}
            onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
          />
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Hire Date</Label>
          <Input
            type="date"
            value={formData.hire_date}
            onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
          />
        </div>

        {/* Payroll Section */}
        <div className="md:col-span-2 mt-4 pt-4 border-t border-slate-700">
          <h3 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400 mb-3">Payroll Information</h3>
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Hourly Rate (Normal) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.hourly_rate}
            onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            placeholder="25.00"
            required
          />
          <p className="text-xs text-slate-500 mt-1">Standard hourly rate</p>
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Hourly Rate (Overtime) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.hourly_rate_overtime}
            onChange={(e) => setFormData({ ...formData, hourly_rate_overtime: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            placeholder="37.50"
            required
          />
          <p className="text-xs text-slate-500 mt-1">Typically 1.5x normal rate</p>
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Per Diem Amount *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.per_diem_amount}
            onChange={(e) => setFormData({ ...formData, per_diem_amount: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            placeholder="50.00"
            required
          />
          <p className="text-xs text-slate-500 mt-1">Daily per diem allowance</p>
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Pay Frequency *</Label>
          <Select value={formData.pay_frequency} onValueChange={(value) => setFormData({ ...formData, pay_frequency: value })}>
            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="biweekly">Biweekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Existing SSN, DOB, T-Shirt fields */}
        <div>
          <Label className="text-slate-900 font-medium">SSN/Tax ID</Label>
          <Input
            value={formData.ssn_tax_id}
            onChange={(e) => setFormData({ ...formData, ssn_tax_id: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
          />
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Date of Birth</Label>
          <Input
            type="date"
            value={formData.dob}
            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
          />
        </div>

        <div>
          <Label className="text-slate-900 font-medium">T-Shirt Size</Label>
          <Select value={formData.tshirt_size} onValueChange={(value) => setFormData({ ...formData, tshirt_size: value })}>
            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="XS">XS</SelectItem>
              <SelectItem value="S">S</SelectItem>
              <SelectItem value="M">M</SelectItem>
              <SelectItem value="L">L</SelectItem>
              <SelectItem value="XL">XL</SelectItem>
              <SelectItem value="XXL">XXL</SelectItem>
              <SelectItem value="XXXL">XXXL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <Label className="text-slate-900 font-medium">Address</Label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            autoCapitalizeInput={true}
          />
        </div>
      </div>

      <div className="flex justify-between gap-3 mt-6 pt-4 border-t border-slate-200">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleDelete}
          className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Employee
        </Button>
        
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} className="bg-[#1e293b] border-[#1e293b] text-white hover:bg-slate-800">
            Cancel
          </Button>
          <Button type="submit" className="bg-[#06b6d4] hover:bg-[#0891b2] text-white" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Updating...' : 'Update Employee'}
          </Button>
        </div>
      </div>
    </form>
  );
}