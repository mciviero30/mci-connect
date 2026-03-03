import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Users, Send, Briefcase, DollarSign, ShieldAlert, Shirt, Calendar, Pencil, Save, X, Lock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";

const Row = ({ icon: Icon, label, value }) => {
  if (!value) return (
    <div className="flex items-start gap-2.5 text-sm text-slate-400 dark:text-slate-500 italic">
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-xs block">{label}</span>
        <span>Not provided</span>
      </div>
    </div>
  );
  return (
    <div className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
      <div>
        <span className="text-xs text-slate-400 block">{label}</span>
        <span>{value}</span>
      </div>
    </div>
  );
};

export default function InvitationDetailView({ invitation, onClose, onInvite, isInviting }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
  });

  const canViewSensitive = ['admin', 'ceo', 'hr'].includes((currentUser?.role || '').toLowerCase()) ||
    (currentUser?.position || '').toLowerCase() === 'hr';
  const [form, setForm] = useState({
    first_name: invitation.first_name || '',
    last_name: invitation.last_name || '',
    phone: invitation.phone || '',
    address: invitation.address || '',
    position: invitation.position || '',
    department: invitation.department || '',
    team_name: invitation.team_name || '',
    hourly_rate: invitation.hourly_rate || '',
    tshirt_size: invitation.tshirt_size || '',
    dob: invitation.dob || '',
    ssn_tax_id: invitation.ssn_tax_id || '',
    role: invitation.role || 'user',
  });

  const fullName = `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim() || invitation.email;
  const initials = (invitation.first_name?.[0] || invitation.email?.[0] || '?').toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.EmployeeInvitation.update(invitation.id, {
      ...form,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
    });
    await queryClient.invalidateQueries({ queryKey: ['employeeInvitations'] });
    toast.success('Invitation updated!');
    setSaving(false);
    setEditing(false);
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  if (editing) {
    return (
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">First Name</Label><Input value={form.first_name} onChange={f('first_name')} /></div>
          <div><Label className="text-xs">Last Name</Label><Input value={form.last_name} onChange={f('last_name')} /></div>
          <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={f('phone')} /></div>
          <div><Label className="text-xs">Hourly Rate ($)</Label><Input type="number" value={form.hourly_rate} onChange={f('hourly_rate')} /></div>
          <div className="col-span-2"><Label className="text-xs">Address</Label><Input value={form.address} onChange={f('address')} /></div>
          <div><Label className="text-xs">Position</Label>
            <select value={form.position} onChange={f('position')} className="w-full h-10 px-3 border rounded-md text-sm bg-white dark:bg-slate-800">
              <option value="">Select</option>
              <option value="CEO">CEO</option>
              <option value="manager">Manager</option>
              <option value="supervisor">Supervisor</option>
              <option value="foreman">Foreman</option>
              <option value="technician">Technician</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>
          <div><Label className="text-xs">Department</Label>
            <select value={form.department} onChange={f('department')} className="w-full h-10 px-3 border rounded-md text-sm bg-white dark:bg-slate-800">
              <option value="">Select</option>
              <option value="executive">Executive</option>
              <option value="management">Management</option>
              <option value="operations">Operations</option>
              <option value="administration">Administration</option>
              <option value="field">Field Technician</option>
              <option value="foreman">Foreman</option>
              <option value="HR">HR</option>
            </select>
          </div>
          <div><Label className="text-xs">T-Shirt Size</Label>
            <select value={form.tshirt_size} onChange={f('tshirt_size')} className="w-full h-10 px-3 border rounded-md text-sm bg-white dark:bg-slate-800">
              <option value="">Select</option>
              {['S','M','L','XL','XXL','XXXL'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><Label className="text-xs">Role</Label>
            <select value={form.role} onChange={f('role')} className="w-full h-10 px-3 border rounded-md text-sm bg-white dark:bg-slate-800">
              <option value="user">User</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div><Label className="text-xs">Date of Birth</Label><Input type="date" value={form.dob} onChange={f('dob')} /></div>
          <div><Label className="text-xs">SSN / Tax ID</Label><Input value={form.ssn_tax_id} onChange={f('ssn_tax_id')} placeholder="XXX-XX-XXXX" /></div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}><X className="w-4 h-4 mr-1" />Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Avatar + Name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md flex-shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{fullName}</h2>
            <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs mt-1 capitalize">
              {invitation.status || 'Pending'}
            </Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      </div>

      {/* Contact */}
      <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</p>
        <Row icon={Mail} label="Email" value={invitation.email} />
        <Row icon={Phone} label="Phone" value={invitation.phone} />
        <Row icon={MapPin} label="Address" value={invitation.address} />
      </div>

      {/* Employment */}
      <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employment</p>
        <Row icon={Briefcase} label="Position" value={invitation.position} />
        <Row icon={Users} label="Department" value={invitation.department} />
        <Row icon={MapPin} label="Team" value={invitation.team_name} />
        <Row icon={DollarSign} label="Hourly Rate" value={invitation.hourly_rate ? `$${invitation.hourly_rate}/hr` : null} />
        <Row icon={Shirt} label="T-Shirt Size" value={invitation.tshirt_size} />
        <Row icon={Users} label="System Role" value={invitation.role} />
      </div>

      {/* Sensitive */}
      <div className="space-y-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> Sensitive Information
        </p>
        <Row icon={Calendar} label="Date of Birth" value={invitation.dob} />
        <Row icon={ShieldAlert} label="SSN / Tax ID" value={invitation.ssn_tax_id} />
      </div>

      {invitation.last_sent_date && (
        <p className="text-xs text-slate-400 px-1">
          Last sent: {new Date(invitation.last_sent_date).toLocaleDateString()}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button
          onClick={() => { onInvite(); onClose(); }}
          disabled={isInviting}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Send className="w-4 h-4" />
          {isInviting ? 'Sending...' : 'Send Invitation'}
        </Button>
      </div>
    </div>
  );
}