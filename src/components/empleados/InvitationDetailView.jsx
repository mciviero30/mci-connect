import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Users, Send, Briefcase, DollarSign, ShieldAlert, Shirt, Calendar } from "lucide-react";

const Row = ({ icon: Icon, label, value }) => {
  if (!value) return null;
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
  const fullName = `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim() || invitation.email;
  const initials = (invitation.first_name?.[0] || invitation.email?.[0] || '?').toUpperCase();

  return (
    <div className="space-y-4">
      {/* Avatar + Name */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md flex-shrink-0">
          {initials}
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{fullName}</h2>
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs mt-1 capitalize">
            {invitation.status || 'Pending'}
          </Badge>
        </div>
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
      {(invitation.dob || invitation.ssn_tax_id) && (
        <div className="space-y-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Sensitive Information
          </p>
          <Row icon={Calendar} label="Date of Birth" value={invitation.dob} />
          <Row icon={ShieldAlert} label="SSN / Tax ID" value={invitation.ssn_tax_id} />
        </div>
      )}

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