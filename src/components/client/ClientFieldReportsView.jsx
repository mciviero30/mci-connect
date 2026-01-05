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
                  <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    {/* Quality Details (if available) */}
                    {report.quality_defects && report.quality_defects.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">
                          {language === 'es' ? 'Defectos Identificados' : 'Identified Defects'}
                        </h4>
                        <div className="space-y-2">
                          {report.quality_defects.map((defect, idx) => {
                            const desc = language === 'es' ? defect.description_es : defect.description_en;
                            return (
                              <div key={idx} className={`p-3 rounded-lg border ${
                                defect.severity === 'critical' ? 'bg-red-50 border-red-200' :
                                defect.severity === 'major' ? 'bg-orange-50 border-orange-200' :
                                'bg-yellow-50 border-yellow-200'
                              }`}>
                                <Badge className={`text-xs mb-1 ${
                                  defect.severity === 'critical' ? 'bg-red-600' :
                                  defect.severity === 'major' ? 'bg-orange-600' :
                                  'bg-yellow-600'
                                } text-white`}>
                                  {defect.category}
                                </Badge>
                                <p className="text-xs text-slate-900">{desc}</p>
                                {defect.location && (
                                  <p className="text-xs text-slate-600 mt-1">📍 {defect.location}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Observations */}
                    {observations && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm">
                          {language === 'es' ? 'Observaciones' : 'Observations'}
                        </h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {observations}
                        </p>
                      </div>
                    )}

                    {/* Photos with Captions */}
                    {report.media_attachments && report.media_attachments.filter(m => m.type === 'photo').length > 0 && (
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">
                          {language === 'es' ? 'Documentación Fotográfica' : 'Photo Documentation'}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {report.media_attachments
                            .filter(m => m.type === 'photo')
                            .map((media, idx) => {
                              const caption = language === 'es' ? media.caption_es : media.caption_en;
                              return (
                                <div key={idx} className="space-y-2">
                                  <img
                                    src={media.url}
                                    alt={caption}
                                    className="w-full h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm"
                                  />
                                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {caption}
                                  </p>
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