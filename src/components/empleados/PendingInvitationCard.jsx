import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Clock, Send, User, Calendar, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function PendingInvitationCard({ employee, onResend, isResending }) {
  const daysSinceInvited = employee.invited_date 
    ? differenceInDays(new Date(), new Date(employee.invited_date))
    : 0;

  const getUrgencyColor = () => {
    if (daysSinceInvited > 7) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (daysSinceInvited > 3) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  const getFullName = () => {
    if (employee.full_name) return employee.full_name;
    if (employee.first_name && employee.last_name) return `${employee.first_name} ${employee.last_name}`;
    if (employee.first_name) return employee.first_name;
    if (employee.last_name) return employee.last_name;
    return 'Unknown Employee';
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-cyan-500/30 transition-all shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20">
              {getFullName()[0]?.toUpperCase()}
            </div>
            
            <div>
              <h3 className="font-bold text-white text-lg">{getFullName()}</h3>
              <p className="text-cyan-400 text-sm">{employee.position || 'No position'}</p>
              {employee.team_name && (
                <Badge className="mt-1 bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                  {employee.team_name}
                </Badge>
              )}
            </div>
          </div>

          <Badge className={getUrgencyColor()}>
            <Clock className="w-3 h-3 mr-1" />
            {daysSinceInvited}d ago
          </Badge>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Mail className="w-4 h-4 text-slate-500" />
            <span className="truncate">{employee.email}</span>
          </div>
          
          {employee.phone && (
            <div className="flex items-center gap-2 text-slate-300">
              <User className="w-4 h-4 text-slate-500" />
              <span>{employee.phone}</span>
            </div>
          )}
          
          {employee.invited_date && (
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Invited: {format(new Date(employee.invited_date), 'MMM dd, yyyy HH:mm')}</span>
            </div>
          )}
        </div>

        {daysSinceInvited > 7 && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400">
              <strong>Action Required:</strong> Invitation sent over a week ago. Employee may need assistance or a reminder.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => onResend(employee)}
            disabled={isResending}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {isResending ? 'Resending...' : 'Resend Invitation'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}