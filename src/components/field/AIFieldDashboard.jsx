/**
 * ============================================================================
 * AI FIELD DASHBOARD - Processed Reports View
 * ============================================================================
 * 
 * Display and manage AI-processed field reports
 * Searchable, filterable, bilingual
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  Camera,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { ActivityTypeLabels, SeverityColors, StatusColors } from './AIFieldProcessor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AIFieldDashboard({ jobId, language = 'en' }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['ai-field-reports', jobId],
    queryFn: () => base44.entities.DailyFieldReport.filter({ 
      job_id: jobId,
      report_type: 'ai_field_capture'
    }, '-processed_at'),
    enabled: !!jobId
  });

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.searchable_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.work_completed?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesActivity = activityFilter === 'all' || report.activity_type === activityFilter;
    
    const today = new Date().toISOString().split('T')[0];
    const reportDate = report.report_date;
    const matchesDate = dateFilter === 'all' ||
                       (dateFilter === 'today' && reportDate === today) ||
                       (dateFilter === 'week' && isWithinDays(reportDate, 7)) ||
                       (dateFilter === 'month' && isWithinDays(reportDate, 30));
    
    return matchesSearch && matchesActivity && matchesDate;
  });

  // Stats
  const stats = {
    total: reports.length,
    today: reports.filter(r => r.report_date === new Date().toISOString().split('T')[0]).length,
    issues: reports.reduce((sum, r) => sum + (r.issues_detected?.length || 0), 0),
    avgQuality: reports.length > 0 
      ? Math.round(reports.reduce((sum, r) => sum + (r.quality_score || 0), 0) / reports.length)
      : 0
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            AI Field Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Processed field captures with AI analysis
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Total Reports</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Today</p>
                <p className="text-2xl font-bold text-white">{stats.today}</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Issues Found</p>
                <p className="text-2xl font-bold text-white">{stats.issues}</p>
              </div>
              <AlertTriangle className={`w-8 h-8 ${stats.issues > 0 ? 'text-red-500' : 'text-slate-400'}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Avg Quality</p>
                <p className="text-2xl font-bold text-white">{stats.avgQuality}/10</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white"
          />
        </div>

        <Select value={activityFilter} onValueChange={setActivityFilter}>
          <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="installation">Installation</SelectItem>
            <SelectItem value="inspection">Inspection</SelectItem>
            <SelectItem value="issue">Issues</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No reports found</p>
              <p className="text-sm text-slate-500 mt-2">
                Use AI Field Capture to create your first report
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <ReportCard key={report.id} report={report} language={language} />
          ))
        )}
      </div>
    </div>
  );
}

function ReportCard({ report, language }) {
  const [expanded, setExpanded] = useState(false);
  
  const summary = language === 'es' ? report.summary_es : report.summary_en;
  const activityLabel = ActivityTypeLabels[language][report.activity_type] || report.activity_type;

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 hover:border-orange-500/50 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                {activityLabel}
              </Badge>
              {report.quality_score > 0 && (
                <Badge className="bg-slate-700 text-slate-300 text-xs">
                  Quality: {report.quality_score}/10
                </Badge>
              )}
            </div>
            <p className="text-white font-medium">{summary}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {report.captured_by_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(report.processed_at), 'MMM dd, yyyy HH:mm')}
              </span>
              {report.photo_urls?.length > 0 && (
                <span className="flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  {report.photo_urls.length} photos
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-white"
          >
            {expanded ? 'Show Less' : 'Show More'}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 border-t border-slate-700 pt-4">
          <div>
            <Label className="text-xs text-slate-400">Work Completed</Label>
            <p className="text-sm text-white mt-1">{report.work_completed}</p>
          </div>

          {report.materials_identified?.length > 0 && (
            <div>
              <Label className="text-xs text-slate-400">Materials</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {report.materials_identified.map((material, idx) => (
                  <Badge key={idx} className="bg-blue-900/50 text-blue-300 border-blue-700 text-xs">
                    {material}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {report.issues_detected?.length > 0 && (
            <div>
              <Label className="text-xs text-slate-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Issues Detected ({report.issues_detected.length})
              </Label>
              <div className="space-y-2 mt-2">
                {report.issues_detected.map((issue, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={SeverityColors[issue.severity]}>
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-white mb-2">{issue.description}</p>
                    <p className="text-xs text-green-400">
                      → {issue.recommended_action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.safety_observations?.length > 0 && (
            <div>
              <Label className="text-xs text-slate-400 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Safety Observations
              </Label>
              <ul className="mt-2 space-y-1">
                {report.safety_observations.map((obs, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-yellow-500">•</span>
                    {obs}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.next_steps?.length > 0 && (
            <div>
              <Label className="text-xs text-slate-400">Next Steps</Label>
              <ul className="mt-2 space-y-1">
                {report.next_steps.map((step, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.photo_urls?.length > 0 && (
            <div>
              <Label className="text-xs text-slate-400">Captured Photos ({report.photo_urls.length})</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {report.photo_urls.slice(0, 8).map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Capture ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-lg border border-slate-600"
                  />
                ))}
              </div>
            </div>
          )}

          {report.tags?.length > 0 && (
            <div>
              <Label className="text-xs text-slate-400">Tags</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {report.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs text-slate-300 border-slate-600">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function isWithinDays(dateString, days) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  return diff < days * 24 * 60 * 60 * 1000;
}