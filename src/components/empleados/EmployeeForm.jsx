import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { ROLES } from "@/components/core/roleRules";
import { useToast } from "@/components/ui/toast";
import { POSITION_OPTIONS, DEPARTMENT_OPTIONS } from "@/components/utils/employeeFieldDefinitions";

const formatPhone = (value) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)})${cleaned.slice(3)}`;
  return `(${cleaned.slice(0, 3)})${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

const detectStateFromAddress = (address) => {
  if (!address) return null;
  const upperAddress = address.toUpperCase();
  
  // Check for state abbreviations or full names
  if (upperAddress.includes('GA') || upperAddress.includes('GEORGIA')) return 'GA';
  if (upperAddress.includes('FL') || upperAddress.includes('FLORIDA')) return 'FL';
  if (upperAddress.includes('NC') || upperAddress.includes('NORTH CAROLINA')) return 'NC';
  
  return null;
};

const getTeamIdByState = (state, teams) => {
  if (!state || !teams.length) return '';
  
  const stateMap = {
    'GA': 'Georgia',
    'FL': 'Florida',
    'NC': 'North Carolina'
  };
  
  const stateName = stateMap[state];
  const team = teams.find(t => t.state === stateName);
  return team?.id || '';
};

export default function EmployeeForm({ employee, onClose, isPending = false }) {
  const queryClient = useQueryClient();
  const { toast } = useToast(); // I1 FIX: Add toast for consistency
  
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: [],
  });

  // 🚫 EMPLOYEE SSOT: EmployeeDirectory is canonical source
  // DO NOT USE User.list() or User.filter() for employee lists
  // C2 FIX: Filter by position on server-side, not loading all employees
  const { data: managers } = useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      // Query for managers only (position = 'CEO'|'manager'|'supervisor' AND status = 'active')
      const managers = await base44.entities.EmployeeDirectory.filter({
        status: 'active'
      }, 'full_name', 100);
      
      // Client-side filter for position (small set after server filter)
      const validManagers = managers.filter(d => {
        if (!d.user_id) {
          return false;
        }
        return ['CEO', 'manager', 'supervisor'].includes(d.position);
      });
      
      return validManagers;
    },
    initialData: [],
  });

  // Parse employee name correctly
  const getInitialNames = () => {
    if (employee) {
      // Priorizar first_name y last_name si existen
      if (employee.first_name || employee.last_name) {
        return {
          first_name: employee.first_name || '',
          last_name: employee.last_name || ''
        };
      }
      // Si solo existe full_name, dividirlo
      if (employee.full_name) {
        const parts = employee.full_name.split(' ');
        return {
          first_name: parts[0] || '',
          last_name: parts.slice(1).join(' ') || ''
        };
      }
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
    hourly_rate: employee?.hourly_rate || 0,
    emergency_contact_name: employee?.emergency_contact_name || '',
    emergency_contact_phone: employee?.emergency_contact_phone || '',
    emergency_contact_relationship: employee?.emergency_contact_relationship || '',
    status: isPending ? (employee?.status || 'pending') : undefined
  });

  // Auto-detect team when address changes
  useEffect(() => {
    if (formData.address && teams.length > 0) {
      const detectedState = detectStateFromAddress(formData.address);
      if (detectedState) {
        const autoTeamId = getTeamIdByState(detectedState, teams);
        if (autoTeamId && !formData.team_id) {
          setFormData(prev => ({ ...prev, team_id: autoTeamId }));
        }
      }
    }
  }, [formData.address, teams]);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const selectedTeam = teams.find(t => t.id === data.team_id);
      const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
      
      if (!fullName) {
        throw new Error('First name and last name are required');
      }
      
      if (isPending && !data.email) {
        throw new Error('Email is required for pending employees');
      }
      
      const dataWithTeam = {
        ...data,
        team_name: selectedTeam?.team_name || '',
        full_name: fullName
      };

      if (isPending) {
        if (employee) {
          return base44.entities.PendingEmployee.update(employee.id, dataWithTeam);
        }
        return base44.entities.PendingEmployee.create(dataWithTeam);
      } else {
        return base44.auth.updateMe(dataWithTeam);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: isPending ? ['pendingEmployees'] : ['currentUser'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: '✅ Employee information updated successfully',
        variant: 'success'
      });
      onClose();
    },
    onError: (error) => {
      console.error('Save employee error:', error);
      toast({
        title: '❌ Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PendingEmployee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingEmployees'] });
      onClose();
      toast({
        title: '✅ Employee deleted successfully',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: '❌ Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${formData.first_name} ${formData.last_name}?\n\nThis action cannot be undone.`)) {
      deleteMutation.mutate(employee.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-2">
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
          <Label className="text-slate-900 font-medium">Email {isPending && '*'}</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            required={isPending}
          />
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
          <Label className="text-slate-900 font-medium">Position (Role)</Label>
          <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })}>
            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {POSITION_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Department</Label>
          <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {DEPARTMENT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
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
            placeholder="Include state (GA, FL, NC) for auto team assignment"
          />
          {formData.address && detectStateFromAddress(formData.address) && (
            <p className="text-xs text-cyan-400 mt-1">
              ✓ Detected: {detectStateFromAddress(formData.address)} - Team will be auto-assigned
            </p>
          )}
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Team *</Label>
          <Select value={formData.team_id} onValueChange={(value) => setFormData({ ...formData, team_id: value })}>
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
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Direct Manager</Label>
          <Input
            value={formData.direct_manager_name}
            onChange={(e) => setFormData({ ...formData, direct_manager_name: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            autoCapitalizeInput={true}
            placeholder="e.g., Marzio Civiero"
          />
        </div>

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

        <div>
          <Label className="text-slate-900 font-medium">Hourly Rate ($) *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={formData.hourly_rate || ''}
            onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            placeholder="20.00"
          />
        </div>

        <div className="md:col-span-2 border-t border-slate-200 pt-6 mt-6">
          <h4 className="text-sm font-semibold text-slate-900 mb-4">Emergency Contact</h4>
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Contact Name</Label>
          <Input
            value={formData.emergency_contact_name}
            onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            placeholder="e.g., John Doe"
            autoCapitalizeInput={true}
          />
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Contact Phone</Label>
          <Input
            value={formData.emergency_contact_phone}
            onChange={(e) => setFormData({ ...formData, emergency_contact_phone: formatPhone(e.target.value) })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            placeholder="(000)000-0000"
            maxLength={13}
          />
        </div>

        <div>
          <Label className="text-slate-900 font-medium">Relationship</Label>
          <Input
            value={formData.emergency_contact_relationship}
            onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
            className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-500"
            placeholder="e.g., Spouse, Parent, Sibling"
            autoCapitalizeInput={true}
          />
        </div>
      </div>

      <div className="flex justify-between gap-3 mt-6 pt-4 border-t border-slate-200">
        {employee && isPending && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleDelete}
            className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        )}
        
        <div className="flex gap-3 ml-auto">
          <Button type="button" variant="outline" onClick={onClose} className="bg-[#1e293b] border-[#1e293b] text-white hover:bg-slate-800">
            Cancel
          </Button>
          <Button type="submit" className="bg-[#06b6d4] hover:bg-[#0891b2] text-white" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : employee ? 'Update' : 'Add'} Employee
          </Button>
        </div>
      </div>
    </form>
  );
}