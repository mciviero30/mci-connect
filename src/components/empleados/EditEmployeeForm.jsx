import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { canViewSensitiveData } from "@/components/utils/employeeSecurity";
import { POSITION_OPTIONS, DEPARTMENT_OPTIONS } from "@/components/utils/employeeFieldDefinitions";

export default function EditEmployeeForm({ employee, currentUser, onFormChange }) {
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
    role: employee?.role || 'user',
  });

  const canViewSensitive = canViewSensitiveData(currentUser);

  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const allTeams = await base44.entities.Team.list('-created_date', 200);
      return allTeams;
    },
    initialData: [],
    staleTime: 60000
  });

  // Notify parent of form changes
  useEffect(() => {
    onFormChange(formData);
  }, [formData]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  return (
    <div className="space-y-6">
      {/* Personal Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b border-gray-200">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Email *</Label>
            <Input 
              type="email" 
              value={formData.email} 
              onChange={(e) => handleFieldChange('email', e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={(e) => handleFieldChange('phone', e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>First Name</Label>
            <Input value={formData.first_name} onChange={(e) => handleFieldChange('first_name', e.target.value)} />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input value={formData.last_name} onChange={(e) => handleFieldChange('last_name', e.target.value)} />
          </div>
        </div>

        {canViewSensitive && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Date of Birth</Label>
              <Input type="date" value={formData.dob} onChange={(e) => handleFieldChange('dob', e.target.value)} />
            </div>
            <div>
              <Label>SSN/Tax ID</Label>
              <Input value={formData.ssn_tax_id} onChange={(e) => handleFieldChange('ssn_tax_id', e.target.value)} placeholder="XXX-XX-XXXX" />
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
      </div>

      {/* Employment Details Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b border-gray-200">Employment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Position</Label>
            <select 
              value={formData.position || ''} 
              onChange={(e) => handleFieldChange('position', e.target.value)}
              className="w-full h-10 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">Select Position</option>
              {POSITION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>System Role *</Label>
            <select 
              value={formData.role || 'user'}
              onChange={(e) => handleFieldChange('role', e.target.value)}
              className="w-full h-10 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="user">User (Regular Employee)</option>
              <option value="admin">Admin (Full Access)</option>
              <option value="ceo">CEO (Full Access + Setup)</option>
              <option value="manager">Manager (Limited Admin)</option>
              <option value="foreman">Foreman (Field Supervisor)</option>
            </select>
          </div>
        </div>

        <div>
          <Label>Department</Label>
          <select 
            value={formData.department || ''} 
            onChange={(e) => handleFieldChange('department', e.target.value)}
            className="w-full h-10 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">Select Department</option>
            {DEPARTMENT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <Label>Team</Label>
          <select 
            value={formData.team_id} 
            onChange={(e) => {
              const selectedTeam = teams.find(t => t.id === e.target.value);
              handleFieldChange('team_id', e.target.value);
              handleFieldChange('team_name', selectedTeam?.team_name || '');
            }}
            className="w-full min-h-[44px] px-3 py-2 border rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">Select Team</option>
            {teamsLoading && <option disabled>Loading teams...</option>}
            {!teamsLoading && teams.length === 0 && <option disabled>No teams available - Check console</option>}
            {!teamsLoading && teams.map(team => {
              return (
                <option key={team.id} value={team.id}>
                  {team.team_name} - {team.location}
                </option>
              );
            })}
          </select>
          <p className="text-xs text-slate-500 mt-1">Available: {teams.length} teams</p>
        </div>

        <div>
          <Label>Address</Label>
          <Input value={formData.address} onChange={(e) => handleFieldChange('address', e.target.value)} />
        </div>

        <div>
          <Label>T-Shirt Size</Label>
          <select 
            value={formData.tshirt_size} 
            onChange={(e) => handleFieldChange('tshirt_size', e.target.value)}
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
          <Input type="number" step="0.01" value={formData.hourly_rate} onChange={(e) => handleFieldChange('hourly_rate', e.target.value)} />
        </div>
      </div>
    </div>
  );
}