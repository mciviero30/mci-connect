/**
 * ============================================================================
 * CLIENT FIELD REPORTS VIEW - Solo Lectura
 * ============================================================================
 * 
 * Vista de reportes de campo para clientes en el portal
 * Solo muestra reportes aprobados (client_visible = true)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Calendar, 
  User, 
  Camera, 
  AlertTriangle,
  Shield,
  ListChecks,
  Search,
  Sparkles,
  Video
} from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ClientFieldReportsView({ jobId, language = 'en' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedReportId, setExpandedReportId] = useState(null);

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['client-field-reports', jobId],
    queryFn: () => base44.entities.FieldReport.filter({ 
      job_id: jobId,
      client_visible: true 
    }, '-created_date'),
    enabled: !!jobId
  });

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.search_keywords?.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         report.summary_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.summary_es?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || report.report_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Cargando reportes...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="p-12 text-center">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500 dark:text-slate-400">
          {language === 'es' 
            ? 'No hay reportes de campo disponibles' 
            : 'No field reports available'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={language === 'es' ? 'Buscar reportes...' : 'Search reports...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'es' ? 'Todos' : 'All'}</SelectItem>
            <SelectItem value="daily">{language === 'es' ? 'Diario' : 'Daily'}</SelectItem>
            <SelectItem value="progress">{language === 'es' ? 'Progreso' : 'Progress'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => {
          const summary = language === 'es' ? report.summary_es : report.summary_en;
          const observations = language === 'es' ? report.observations_es : report.observations_en;
          const isExpanded = expandedReportId === report.id;

          return (
            <Card key={report.id} className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md">
              <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={
                    report.report_type === 'daily' ? 'bg-blue-500 text-white' :
                    report.report_type === 'safety' ? 'bg-red-500 text-white' :
                    report.report_type === 'progress' ? 'bg-green-500 text-white' :
                    'bg-amber-500 text-white'
                  }>
                    {report.report_type === 'daily' && (language === 'es' ? 'Diario' : 'Daily')}
                    {report.report_type === 'safety' && (language === 'es' ? 'Seguridad' : 'Safety')}
                    {report.report_type === 'progress' && (language === 'es' ? 'Progreso' : 'Progress')}
                    {report.report_type === 'issue' && (language === 'es' ? 'Problema' : 'Issue')}
                  </Badge>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {format(new Date(report.report_date), 'MMMM dd, yyyy')}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-slate-900 dark:text-white font-medium mb-3 leading-relaxed">
                  {summary}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {report.captured_by_name}
                  </span>
                  {report.media_attachments && report.media_attachments.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      {report.media_attachments.length} {language === 'es' ? 'archivos' : 'files'}
                    </span>
                  )}
                </div>

                {/* Expand Details */}
                {isExpanded && (
                  <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {/* Quality Analysis Section */}
                    {report.quality_score && (
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-yellow-500" />
                          {language === 'es' ? 'Análisis de Calidad' : 'Quality Analysis'}
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                              {language === 'es' ? 'Puntaje' : 'Score'}
                            </p>
                            <p className={`text-2xl font-bold ${
                              report.quality_score >= 7 ? 'text-green-600' :
                              report.quality_score >= 5 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {report.quality_score}/10
                            </p>
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                              {language === 'es' ? 'Estado' : 'Status'}
                            </p>
                            <Badge className={`text-sm ${
                              report.quality_status === 'pass' ? 'bg-green-600 text-white' :
                              report.quality_status === 'needs_rework' ? 'bg-yellow-600 text-white' :
                              'bg-red-600 text-white'
                            }`}>
                              {report.quality_status === 'pass' && (language === 'es' ? 'APROBADO' : 'APPROVED')}
                              {report.quality_status === 'needs_rework' && (language === 'es' ? 'RETRABAJO' : 'REWORK')}
                              {report.quality_status === 'fail' && (language === 'es' ? 'NO APROBADO' : 'FAILED')}
                            </Badge>
                          </div>
                        </div>

                        {/* Defects */}
                        {report.quality_defects && report.quality_defects.length > 0 && (
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                              {language === 'es' ? 'Defectos Identificados' : 'Identified Defects'} ({report.quality_defects.length})
                            </h5>
                            <div className="space-y-2">
                              {report.quality_defects.map((defect, idx) => {
                                const desc = language === 'es' ? defect.description_es : defect.description_en;
                                return (
                                  <div key={idx} className={`p-3 rounded-lg border ${
                                    defect.severity === 'critical' ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-700' :
                                    defect.severity === 'major' ? 'bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-700' :
                                    'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-700'
                                  }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge className={`text-xs ${
                                        defect.severity === 'critical' ? 'bg-red-600' :
                                        defect.severity === 'major' ? 'bg-orange-600' :
                                        'bg-yellow-600'
                                      } text-white`}>
                                        {defect.severity}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">{defect.category}</Badge>
                                    </div>
                                    <p className="text-xs text-slate-900 dark:text-white">{desc}</p>
                                    {defect.location && (
                                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">📍 {defect.location}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Punch List */}
                        {report.punch_list_items && report.punch_list_items.length > 0 && (
                          <div>
                            <h5 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                              {language === 'es' ? 'Elementos Pendientes de Corrección' : 'Punch List Items'} ({report.punch_list_items.length})
                            </h5>
                            <div className="space-y-2">
                              {report.punch_list_items.map((item, idx) => {
                                const title = language === 'es' ? item.title_es : item.title_en;
                                const desc = language === 'es' ? item.description_es : item.description_en;
                                return (
                                  <div key={idx} className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-bold text-slate-900 dark:text-white">{title}</span>
                                      <Badge className={`text-xs ${
                                        item.priority === 'high' ? 'bg-red-600' :
                                        item.priority === 'medium' ? 'bg-yellow-600' :
                                        'bg-blue-600'
                                      } text-white`}>
                                        {item.priority}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-slate-700 dark:text-slate-300">{desc}</p>
                                    {item.estimated_time && (
                                      <p className="text-xs text-slate-500 mt-1">⏱️ {item.estimated_time}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Observations */}
                    {observations && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">
                          {language === 'es' ? 'Observaciones Técnicas' : 'Technical Observations'}
                        </h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {observations}
                        </p>
                      </div>
                    )}

                    {/* AI-Generated Photo Captions */}
                    {report.media_attachments && report.media_attachments.filter(m => m.type === 'photo').length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                          <Camera className="w-4 h-4 text-blue-600" />
                          {language === 'es' ? 'Documentación Fotográfica (Subtítulos IA)' : 'Photo Documentation (AI Captions)'}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {report.media_attachments
                            .filter(m => m.type === 'photo')
                            .map((media, idx) => {
                              const caption = language === 'es' ? media.caption_es : media.caption_en;
                              return (
                                <div key={idx} className="space-y-2">
                                  <img
                                    src={media.url}
                                    alt={caption}
                                    className="w-full h-48 object-cover rounded-lg border-2 border-slate-200 dark:border-slate-600 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                                    onClick={() => window.open(media.url, '_blank')}
                                  />
                                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                      📷 {caption}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Video with Captions */}
                    {report.media_attachments && report.media_attachments.filter(m => m.type === 'video').length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                          <Video className="w-4 h-4 text-purple-600" />
                          {language === 'es' ? 'Videos de Campo (Subtítulos IA)' : 'Field Videos (AI Captions)'}
                        </h4>
                        <div className="space-y-3">
                          {report.media_attachments
                            .filter(m => m.type === 'video')
                            .map((media, idx) => {
                              const caption = language === 'es' ? media.caption_es : media.caption_en;
                              return (
                                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                                  <video
                                    src={media.url}
                                    controls
                                    className="w-full rounded-lg mb-2 border border-slate-300 dark:border-slate-500"
                                  />
                                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                    🎥 {caption}
                                  </p>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}

                    {/* Safety Observations (if any) */}
                    {report.safety_risks && report.safety_risks.length > 0 && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                        <h4 className="font-bold text-red-900 dark:text-red-400 mb-2 text-sm flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          {language === 'es' ? 'Observaciones de Seguridad' : 'Safety Observations'} ({report.safety_risks.length})
                        </h4>
                        <div className="space-y-2">
                          {report.safety_risks.map((risk, idx) => {
                            const desc = language === 'es' ? risk.description_es : risk.description_en;
                            return (
                              <div key={idx} className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                                <Badge className={`text-xs mb-1 ${
                                  risk.severity === 'critical' ? 'bg-red-600' :
                                  risk.severity === 'high' ? 'bg-orange-600' :
                                  risk.severity === 'medium' ? 'bg-yellow-600' :
                                  'bg-blue-600'
                                } text-white`}>
                                  {risk.severity}
                                </Badge>
                                <p className="text-xs text-slate-900 dark:text-white">{desc}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Toggle Expansion */}
                <button
                  onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-3"
                >
                  {isExpanded 
                    ? (language === 'es' ? 'Ver menos' : 'Show less')
                    : (language === 'es' ? 'Ver más detalles' : 'Show more details')}
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}