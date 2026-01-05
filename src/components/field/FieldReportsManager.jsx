/**
 * ============================================================================
 * FIELD REPORTS MANAGER - Vista para Managers
 * ============================================================================
 * 
 * Lista, filtra y gestiona reportes de campo
 * - Búsqueda por keywords
 * - Filtro por tipo, urgencia, proyecto
 * - Aprobación para Client Portal
 * - Generación de tareas desde reportes
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  EyeOff,
  FileText,
  Calendar,
  User,
  Filter,
  Download,
  ListChecks,
  Shield,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useToast } from '@/components/ui/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FieldReportsManager({ jobId = null, language = 'en' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['field-reports', jobId],
    queryFn: () => jobId 
      ? base44.entities.FieldReport.filter({ job_id: jobId }, '-created_date')
      : base44.entities.FieldReport.list('-created_date', 100),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ reportId, visible }) => 
      base44.entities.FieldReport.update(reportId, { 
        client_visible: visible,
        reviewed_by_manager: true,
        reviewed_by: base44.auth.me().then(u => u.email),
        reviewed_at: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-reports'] });
      toast.success(language === 'es' ? 'Visibilidad actualizada' : 'Visibility updated');
    }
  });

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.search_keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         report.summary_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.summary_es?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || report.report_type === typeFilter;
    const matchesUrgency = urgencyFilter === 'all' || 
                          (urgencyFilter === 'urgent' && report.is_urgent) ||
                          (urgencyFilter === 'normal' && !report.is_urgent);
    
    const matchesTab = activeTab === 'all' ||
                      (activeTab === 'urgent' && report.is_urgent) ||
                      (activeTab === 'unreviewed' && !report.reviewed_by_manager);
    
    return matchesSearch && matchesType && matchesUrgency && matchesTab;
  });

  // Stats
  const stats = {
    total: reports.length,
    urgent: reports.filter(r => r.is_urgent).length,
    unreviewed: reports.filter(r => !r.reviewed_by_manager).length,
    visible: reports.filter(r => r.client_visible).length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            Reportes de Campo IA
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Procesamiento automático bilingüe • Listo para clientes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-700 to-red-800 border-red-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-200">Urgentes</p>
                <p className="text-2xl font-bold text-white">{stats.urgent}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-700 to-amber-800 border-amber-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-200">Sin Revisar</p>
                <p className="text-2xl font-bold text-white">{stats.unreviewed}</p>
              </div>
              <Eye className="w-8 h-8 text-amber-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-700 to-green-800 border-green-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-200">Visibles</p>
                <p className="text-2xl font-bold text-white">{stats.visible}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
          <TabsTrigger value="urgent">Urgentes ({stats.urgent})</TabsTrigger>
          <TabsTrigger value="unreviewed">Sin Revisar ({stats.unreviewed})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por keywords, materiales, observaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Tipos</SelectItem>
            <SelectItem value="daily">Diario</SelectItem>
            <SelectItem value="safety">Seguridad</SelectItem>
            <SelectItem value="progress">Progreso</SelectItem>
            <SelectItem value="issue">Problema</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No se encontraron reportes</p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <ReportCard 
              key={report.id} 
              report={report} 
              language={language}
              onToggleVisibility={(visible) => toggleVisibilityMutation.mutate({ reportId: report.id, visible })}
              onViewDetails={() => setSelectedReport(report)}
            />
          ))
        )}
      </div>

      {/* Report Details Dialog */}
      {selectedReport && (
        <ReportDetailsDialog
          report={selectedReport}
          language={language}
          open={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          onToggleVisibility={(visible) => {
            toggleVisibilityMutation.mutate({ reportId: selectedReport.id, visible });
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
}

function ReportCard({ report, language, onToggleVisibility, onViewDetails }) {
  const summary = language === 'es' ? report.summary_es : report.summary_en;
  
  const typeLabels = {
    daily: { en: 'Daily Report', es: 'Reporte Diario', color: 'bg-blue-600' },
    safety: { en: 'Safety Report', es: 'Reporte de Seguridad', color: 'bg-red-600' },
    progress: { en: 'Progress Update', es: 'Actualización de Progreso', color: 'bg-green-600' },
    issue: { en: 'Issue Report', es: 'Reporte de Problema', color: 'bg-amber-600' }
  };

  const typeInfo = typeLabels[report.report_type] || typeLabels.daily;

  return (
    <Card className={`border-l-4 transition-all hover:shadow-xl ${
      report.is_urgent 
        ? 'border-l-red-500 bg-gradient-to-r from-red-900/20 to-slate-800' 
        : 'border-l-slate-600 bg-gradient-to-br from-slate-800 to-slate-900'
    } border-slate-700`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className={`${typeInfo.color} text-white text-xs px-3 py-1`}>
                {language === 'es' ? typeInfo.es : typeInfo.en}
              </Badge>
              {report.is_urgent && (
                <Badge className="bg-red-500 text-white text-xs px-3 py-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  URGENTE
                </Badge>
              )}
              {!report.reviewed_by_manager && (
                <Badge className="bg-amber-500 text-white text-xs px-3 py-1">
                  Sin Revisar
                </Badge>
              )}
              {report.client_visible && (
                <Badge className="bg-green-600 text-white text-xs px-3 py-1">
                  <Eye className="w-3 h-3 mr-1" />
                  Visible para Cliente
                </Badge>
              )}
            </div>

            {/* Summary */}
            <p className="text-white font-medium mb-3 leading-relaxed">
              {summary}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {report.captured_by_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(report.created_date), 'dd MMM yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Camera className="w-3 h-3" />
                {report.media_attachments?.length || 0} archivos
              </span>
              {report.actionable_tasks?.length > 0 && (
                <span className="flex items-center gap-1">
                  <ListChecks className="w-3 h-3" />
                  {report.actionable_tasks.length} tareas
                </span>
              )}
            </div>

            {/* Safety Risks Preview */}
            {report.safety_risks && report.safety_risks.length > 0 && (
              <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                <p className="text-xs font-bold text-red-400 mb-1">
                  <Shield className="w-3 h-3 inline mr-1" />
                  {report.safety_risks.length} riesgo{report.safety_risks.length > 1 ? 's' : ''} de seguridad
                </p>
                <p className="text-xs text-red-300">
                  {language === 'es' 
                    ? report.safety_risks[0].description_es 
                    : report.safety_risks[0].description_en}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onViewDetails}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Ver Detalles
            </Button>
            <Button
              size="sm"
              onClick={() => onToggleVisibility(!report.client_visible)}
              className={report.client_visible 
                ? 'bg-slate-600 hover:bg-slate-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'}
            >
              {report.client_visible ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" />
                  Ocultar
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Mostrar
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportDetailsDialog({ report, language, open, onClose, onToggleVisibility }) {
  const summary = language === 'es' ? report.summary_es : report.summary_en;
  const observations = language === 'es' ? report.observations_es : report.observations_en;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" />
            Detalles del Reporte
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={
              report.report_type === 'daily' ? 'bg-blue-600 text-white' :
              report.report_type === 'safety' ? 'bg-red-600 text-white' :
              report.report_type === 'progress' ? 'bg-green-600 text-white' :
              'bg-amber-600 text-white'
            }>
              {report.report_type}
            </Badge>
            {report.is_urgent && (
              <Badge className="bg-red-500 text-white">
                <AlertTriangle className="w-3 h-3 mr-1" />
                URGENTE
              </Badge>
            )}
            <Badge className={report.client_visible ? 'bg-green-600' : 'bg-slate-600'}>
              {report.client_visible ? 'Visible para Cliente' : 'Solo Interno'}
            </Badge>
          </div>

          {/* Summary */}
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-2">Resumen Técnico</h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{summary}</p>
          </div>

          {/* Observations */}
          {observations && (
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Observaciones Detalladas</h3>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{observations}</p>
            </div>
          )}

          {/* Safety Risks */}
          {report.safety_risks && report.safety_risks.length > 0 && (
            <div>
              <h3 className="font-bold text-red-900 dark:text-red-400 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Riesgos de Seguridad ({report.safety_risks.length})
              </h3>
              <div className="space-y-3">
                {report.safety_risks.map((risk, idx) => {
                  const desc = language === 'es' ? risk.description_es : risk.description_en;
                  const severityColors = {
                    low: 'border-blue-300 bg-blue-50',
                    medium: 'border-yellow-300 bg-yellow-50',
                    high: 'border-orange-300 bg-orange-50',
                    critical: 'border-red-300 bg-red-50'
                  };
                  
                  return (
                    <div key={idx} className={`p-4 rounded-lg border-2 ${severityColors[risk.severity]}`}>
                      <Badge className={`mb-2 ${
                        risk.severity === 'critical' ? 'bg-red-600' :
                        risk.severity === 'high' ? 'bg-orange-600' :
                        risk.severity === 'medium' ? 'bg-yellow-600' :
                        'bg-blue-600'
                      } text-white text-xs`}>
                        {risk.severity.toUpperCase()}
                      </Badge>
                      <p className="text-sm text-slate-900">{desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Materials */}
          {report.material_requirements && report.material_requirements.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">Materiales Requeridos</h3>
              <div className="flex flex-wrap gap-2">
                {report.material_requirements.map((material, idx) => (
                  <Badge key={idx} variant="outline" className="text-sm">
                    {material}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actionable Tasks */}
          {report.actionable_tasks && report.actionable_tasks.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <ListChecks className="w-5 h-5" />
                Tareas Accionables ({report.actionable_tasks.length})
              </h3>
              <div className="space-y-2">
                {report.actionable_tasks.map((task, idx) => {
                  const title = language === 'es' ? task.title_es : task.title_en;
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          task.priority === 'critical' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} />
                        <span className="text-sm text-slate-900 dark:text-white">{title}</span>
                      </div>
                      <Badge className="text-xs">{task.category}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Media Gallery */}
          {report.media_attachments && report.media_attachments.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-3">Archivos Multimedia</h3>
              <div className="grid grid-cols-3 gap-3">
                {report.media_attachments.map((media, idx) => {
                  const caption = language === 'es' ? media.caption_es : media.caption_en;
                  return (
                    <div key={idx} className="relative group">
                      {media.type === 'photo' && (
                        <img
                          src={media.url}
                          alt={caption}
                          className="w-full h-32 object-cover rounded-lg border border-slate-300 dark:border-slate-600"
                        />
                      )}
                      {media.type === 'video' && (
                        <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                          <Video className="w-8 h-8 text-slate-500" />
                        </div>
                      )}
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {caption}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t dark:border-slate-700">
            <Button
              onClick={() => onToggleVisibility(!report.client_visible)}
              className={report.client_visible 
                ? 'flex-1 bg-slate-600 hover:bg-slate-700 text-white' 
                : 'flex-1 bg-green-600 hover:bg-green-700 text-white'}
            >
              {report.client_visible ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Ocultar de Cliente
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Mostrar a Cliente
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}