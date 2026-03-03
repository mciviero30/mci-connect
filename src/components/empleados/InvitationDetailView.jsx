import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, MapPin, Users, Send, Briefcase, DollarSign } from "lucide-react";

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
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs mt-1">
            Pending Invitation
          </Badge>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
        {invitation.email && (
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{invitation.email}</span>
          </div>
        )}
        {invitation.phone && (
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{invitation.phone}</span>
          </div>
        )}
        {invitation.position && (
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{invitation.position}</span>
          </div>
        )}
        {invitation.department && (
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="capitalize">{invitation.department}</span>
          </div>
        )}
        {invitation.team_name && (
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{invitation.team_name}</span>
          </div>
        )}
        {invitation.hourly_rate && (
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <DollarSign className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>${invitation.hourly_rate}/hr</span>
          </div>
        )}
        {invitation.address && (
          <div className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{invitation.address}</span>
          </div>
        )}
        {invitation.last_sent_date && (
          <p className="text-xs text-slate-400 pt-1">
            Last sent: {new Date(invitation.last_sent_date).toLocaleDateString()}
          </p>
        )}
      </div>

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