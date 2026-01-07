import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, Plus, Search, Calendar, User, MapPin } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function IncidentsPanel({ job }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['safety-incidents', job.id],
    queryFn: () => base44.entities.SafetyIncident.filter({ job_id: job.id }, '-created_date'),
  });

  const severityConfig = {
    low: { label: 'Low', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    medium: { label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
    high: { label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
    critical: { label: 'Critical', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  };

  const statusConfig = {
    open: { label: 'Open', color: 'bg-red-500/20 text-red-400' },
    investigating: { label: 'Investigating', color: 'bg-yellow-500/20 text-yellow-400' },
    action_required: { label: 'Action Required', color: 'bg-orange-500/20 text-orange-400' },
    resolved: { label: 'Resolved', color: 'bg-green-500/20 text-green-400' },
    closed: { label: 'Closed', color: 'bg-slate-500/20 text-slate-400' },
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.incident_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-black">Safety Incidents</h1>
        </div>
        <Link to={createPageUrl(`CrearIncidente?job_id=${job.id}`)}>
          <Button className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black border-none shadow-lg min-h-[48px] rounded-xl">
            <Plus className="w-5 h-5 mr-2" />
            Report Incident
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search incidents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'low', 'medium', 'high', 'critical'].map((severity) => (
            <Button
              key={severity}
              variant={severityFilter === severity ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSeverityFilter(severity)}
              className={severityFilter === severity ? 'bg-gradient-to-r from-orange-600 to-yellow-500 text-black' : 'bg-slate-800 border-slate-700 text-white'}
            >
              {severity === 'all' ? 'All' : severityConfig[severity]?.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Incidents List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-2xl p-12 text-center shadow-lg">
          <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No incidents reported</h3>
          <p className="text-slate-400">This is a good thing!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((incident) => (
            <Card key={incident.id} className="p-6 bg-slate-800 border-slate-700 hover:border-orange-500/40 transition-all">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  incident.severity === 'critical' ? 'bg-red-500/20' :
                  incident.severity === 'high' ? 'bg-orange-500/20' :
                  incident.severity === 'medium' ? 'bg-yellow-500/20' :
                  'bg-blue-500/20'
                }`}>
                  <AlertTriangle className={`w-6 h-6 ${
                    incident.severity === 'critical' ? 'text-red-400' :
                    incident.severity === 'high' ? 'text-orange-400' :
                    incident.severity === 'medium' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-white">{incident.incident_number}</h3>
                    <Badge className={severityConfig[incident.severity]?.color}>
                      {severityConfig[incident.severity]?.label}
                    </Badge>
                    <Badge className={statusConfig[incident.status]?.color}>
                      {statusConfig[incident.status]?.label}
                    </Badge>
                  </div>
                  <p className="text-slate-300 mb-3">{incident.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(incident.incident_date), 'MMM dd, yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {incident.reported_by_name}
                    </span>
                    {incident.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {incident.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}