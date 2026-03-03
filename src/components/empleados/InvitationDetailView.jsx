import React, { useState, useEffect } from "react";
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

export default function InvitationDetailView({ invitation, onClose, onInvite, isInviting, onSaved }) {
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

  const { data: teams = [] } = useQuery({
    queryKey: ['teams-list'],
    queryFn: () => base44.entities.Team.list(),
    staleTime: 60000,
  });

  // Local display state — source of truth for detail view
  const [saved, setSaved] = useState(invitation);

  const buildForm = (src) => ({
    first_name: src.first_name || '',
    last_name: src.last_name || '',
    phone: src.phone || '',
    address: src.address || '',
    position: src.position || '',
    department: src.department || '',
    team_id: src.team_id || '',
    team_name: src.team_name || '',
    hourly_rate: src.hourly_rate != null ? String(src.hourly_rate) : '',
    tshirt_size: src.tshirt_size || '',
    dob: src.dob || '',
    ssn_tax_id: src.ssn_tax_id || '',
    role: src.role || 'user',
  });

  const [form, setForm] = useState(() => buildForm(invitation));

  // Sync form when editing mode opens (picks up latest saved data)
  useEffect(() => {
    if (editing) setForm(buildForm(saved));
  }, [editing]);

  const fullName = `${saved.first_name || ''} ${saved.last_name || ''}`.trim() || saved.email;
  const initials = (saved.first_name?.[0] || saved.email?.[0] || '?').toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...form,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
    };
    await base44.entities.EmployeeInvitation.update(invitation.id, payload);
    setSaved(prev => ({ ...prev, ...payload }));
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
          <div className="col-span-2"><Label className="text-xs">Team</Label>
            <select
              value={form.team_id || ''}
              onChange={(e) => {
                const selected = teams.find(t => t.id === e.target.value);
                setForm(prev => ({ ...prev, team_id: e.target.value, team_name: selected?.team_name || '' }));
              }}
              className="w-full h-10 px-3 border rounded-md text-sm bg-white dark:bg-slate-800"
            >
              <option value="">No team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.team_name}</option>)}
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
          {canViewSensitive ? (
            <>
              <div><Label className="text-xs">Date of Birth</Label><Input type="date" value={form.dob} onChange={f('dob')} /></div>
              <div><Label className="text-xs">SSN / Tax ID</Label><Input value={form.ssn_tax_id} onChange={f('ssn_tax_id')} placeholder="XXX-XX-XXXX" /></div>
            </>
          ) : (
            <div className="col-span-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <Lock className="w-4 h-4 flex-shrink-0" />
              DOB and SSN/Tax ID require Admin, CEO, or HR access.
            </div>
          )}
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
        <Row icon={Mail} label="Email" value={saved.email} />
        <Row icon={Phone} label="Phone" value={saved.phone} />
        <Row icon={MapPin} label="Address" value={saved.address} />
      </div>

      {/* Employment */}
      <div className="space-y-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employment</p>
        <Row icon={Briefcase} label="Position" value={saved.position} />
        <Row icon={Users} label="Department" value={saved.department} />
        <Row icon={MapPin} label="Team" value={saved.team_name} />
        <Row icon={DollarSign} label="Hourly Rate" value={saved.hourly_rate ? `$${saved.hourly_rate}/hr` : null} />
        <Row icon={Shirt} label="T-Shirt Size" value={saved.tshirt_size} />
        <Row icon={Users} label="System Role" value={saved.role} />
      </div>

      {/* Sensitive */}
      <div className="space-y-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <p className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5" /> Sensitive Information
        </p>
        {canViewSensitive ? (
          <>
            <Row icon={Calendar} label="Date of Birth" value={saved.dob} />
            <Row icon={ShieldAlert} label="SSN / Tax ID" value={saved.ssn_tax_id} />
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Lock className="w-4 h-4 flex-shrink-0" />
            Restricted — Admin, CEO, or HR access required.
          </div>
        )}
      </div>

      {saved.last_sent_date && (
        <p className="text-xs text-slate-400 px-1">
          Last sent: {new Date(saved.last_sent_date).toLocaleDateString()}
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