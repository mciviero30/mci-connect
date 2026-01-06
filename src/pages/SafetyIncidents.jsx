import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/i18n/LanguageContext';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { 
  Shield, Plus, Search, AlertTriangle, 
  CheckCircle, Clock, Eye, MapPin,
  Calendar, User, TrendingUp
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function SafetyIncidentsPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['safetyIncidents'],
    queryFn: () => base44.entities.SafetyIncident.list('-created_date', 100),
  });

  const severityConfig = {
    low: { label: 'Low', color: 'bg-blue-100 text-blue-800', icon: Shield },
    medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
    high: { label: 'High', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
    critical: { label: 'Critical', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  };

  const statusConfig = {
    open: { label: 'Open', color: 'bg-red-100 text-red-800' },
    investigating: { label: 'Investigating', color: 'bg-yellow-100 text-yellow-800' },
    action_required: { label: 'Action Required', color: 'bg-orange-100 text-orange-800' },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
    closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  };

  const typeConfig = {
    injury: 'Lesión',
    near_miss: 'Casi Accidente',
    property_damage: 'Daño a Propiedad',
    equipment_failure: 'Falla de Equipo',
    safety_violation: 'Violación de Seguridad',
    environmental: 'Ambiental',
    other: 'Otro',
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.job_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.incident_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const stats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    resolved: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <PageHeader
        title="Safety Incidents"
        description="Gestión de incidentes de seguridad"
        icon={Shield}
        actions={
          <Link to={createPageUrl('CrearIncidente')}>
            <Button className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white shadow-lg hover:shadow-xl">
              <Plus className="w-4 h-4 mr-2" />
              Reportar Incidente
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-white dark:bg-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-white dark:bg-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Abiertos</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.open}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Críticos</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.critical}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Resueltos</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.resolved}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6 bg-white dark:bg-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por job, número o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'low', 'medium', 'high', 'critical'].map((severity) => (
              <Button
                key={severity}
                variant={severityFilter === severity ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSeverityFilter(severity)}
              >
                {severity === 'all' ? 'Todos' : severityConfig[severity]?.label || severity}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Incidents List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">Cargando...</p>
          </Card>
        ) : filteredIncidents.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-600 dark:text-slate-400">No hay incidentes reportados</p>
          </Card>
        ) : (
          filteredIncidents.map((incident) => {
            const SeverityIcon = severityConfig[incident.severity]?.icon || AlertTriangle;
            return (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6 bg-white dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${
                          incident.severity === 'critical' ? 'bg-red-500' :
                          incident.severity === 'high' ? 'bg-orange-500' :
                          incident.severity === 'medium' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`}>
                          <SeverityIcon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              {incident.incident_number}
                            </h3>
                            <Badge className={severityConfig[incident.severity]?.color}>
                              {severityConfig[incident.severity]?.label}
                            </Badge>
                            <Badge className={statusConfig[incident.status]?.color}>
                              {statusConfig[incident.status]?.label}
                            </Badge>
                            {incident.osha_reportable && (
                              <Badge className="bg-purple-100 text-purple-800">OSHA</Badge>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-[#507DB4] dark:text-[#6B9DD8] mb-2">
                            {typeConfig[incident.incident_type]}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            {incident.description}
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-400">Job:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {incident.job_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-400">Fecha:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {new Date(incident.incident_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="text-slate-600 dark:text-slate-400">Reportado por:</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {incident.reported_by_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link to={createPageUrl(`VerIncidente?id=${incident.id}`)}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalles
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}