import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, Search, Filter, FileText, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AuditTrail() {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'ceo';

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.list('-created_date', 500);
      return logs;
    },
    enabled: isAdmin,
  });

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.action_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performed_by?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEventType = eventTypeFilter === 'all' || log.event_type === eventTypeFilter;
    
    const matchesDate = !dateFilter || 
      new Date(log.created_date).toISOString().split('T')[0] === dateFilter;

    return matchesSearch && matchesEventType && matchesDate;
  });

  const getEventBadge = (eventType) => {
    const badges = {
      commission_calculated: { color: 'bg-yellow-100 text-yellow-800 border border-yellow-300', label: 'Calculated' },
      commission_approved: { color: 'bg-blue-100 text-blue-800 border border-blue-300', label: 'Approved' },
      commission_paid: { color: 'bg-green-100 text-green-800 border border-green-300', label: 'Paid' },
      commission_invalidated: { color: 'bg-red-100 text-red-800 border border-red-300', label: 'Cancelled' },
      tax_profile_completed: { color: 'bg-indigo-100 text-indigo-800 border border-indigo-300', label: 'Tax Profile' },
      payroll_entry_created: { color: 'bg-purple-100 text-purple-800 border border-purple-300', label: 'Payroll' },
    };
    return badges[eventType] || { color: 'bg-slate-100 text-slate-800 border border-slate-300', label: eventType };
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Only CEOs and Administrators can access the audit trail.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">System Audit Trail</h1>
          <p className="text-slate-600">
            Complete audit history of critical system events (read-only)
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>Event Type</Label>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="commission_calculated">Commission Calculated</SelectItem>
                    <SelectItem value="commission_approved">Commission Approved</SelectItem>
                    <SelectItem value="commission_paid">Commission Paid</SelectItem>
                    <SelectItem value="commission_invalidated">Commission Invalidated</SelectItem>
                    <SelectItem value="tax_profile_completed">Tax Profile Completed</SelectItem>
                    <SelectItem value="payroll_entry_created">Payroll Entry Created</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-600">Total Events</p>
                <p className="text-2xl font-bold text-slate-900">{auditLogs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-600">Filtered Events</p>
                <p className="text-2xl font-bold text-slate-900">{filteredLogs.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-slate-600">Last 24 Hours</p>
                <p className="text-2xl font-bold text-slate-900">
                  {auditLogs.filter(log => {
                    const logDate = new Date(log.created_date);
                    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                    return logDate > oneDayAgo;
                  }).length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No audit logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const badge = getEventBadge(log.event_type);
                  return (
                    <div
                      key={log.id}
                      className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={badge.color}>
                            {badge.label}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(log.created_date).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          ID: {log.entity_id.substring(0, 8)}...
                        </div>
                      </div>
                      <p className="text-sm text-slate-900 mb-2">
                        {log.action_description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>By: {log.performed_by_name || log.performed_by}</span>
                        <span>Entity: {log.entity_type}</span>
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                            View metadata
                          </summary>
                          <pre className="mt-2 text-xs bg-slate-100 p-2 rounded overflow-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Read-Only Notice */}
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Read-Only:</strong> Audit logs are immutable and cannot be edited or deleted.
                They provide a permanent record of critical system actions for compliance and security purposes.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}