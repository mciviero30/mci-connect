import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  Award,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
  Briefcase,
  Star,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { getDisplayName } from '@/components/utils/nameHelpers';

export default function AIPerformanceAnalyzer({ 
  employee, 
  timeEntries = [], 
  jobs = [],
  expenses = [],
  drivingLogs = [],
  certifications = [],
  recognitions = [],
  showFullAnalysis = false,
  allEmployees = []
}) {
  const { t, language } = useLanguage();
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const analyzePerformance = async () => {
    if (!employee) return;
    
    setIsAnalyzing(true);
    try {
      // Calculate comprehensive metrics
      const approvedHours = timeEntries.filter(e => e.status === 'approved');
      const totalHours = approvedHours.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      const avgHoursPerWeek = totalHours / Math.max(1, Math.ceil(timeEntries.length / 5));
      
      const uniqueJobs = [...new Set(approvedHours.map(e => e.job_id))].length;
      const completedJobs = jobs.filter(j => j.status === 'completed' && 
        approvedHours.some(e => e.job_id === j.id)
      ).length;
      
      const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const approvedExpenses = expenses.filter(e => e.status === 'approved').length;
      const pendingExpenses = expenses.filter(e => e.status === 'pending').length;
      
      const totalMiles = drivingLogs.reduce((sum, l) => sum + (l.miles || 0), 0);
      const totalDrivingHours = drivingLogs.reduce((sum, l) => sum + (l.hours || 0), 0);
      
      const totalPoints = recognitions.reduce((sum, r) => sum + (r.points || 0), 0);
      
      const activeCerts = certifications.filter(c => c.status === 'active').length;
      const expiringCerts = certifications.filter(c => c.status === 'expiring_soon').length;
      
      // Calculate rank among all employees
      const employeeRankData = allEmployees.map(emp => {
        const empEntries = timeEntries.filter(e => e.employee_email === emp.email);
        const empHours = empEntries.reduce((s, entry) => s + (entry.hours_worked || 0), 0);
        return { email: emp.email, hours: empHours };
      }).sort((a, b) => b.hours - a.hours);
      
      const rank = employeeRankData.findIndex(e => e.email === employee.email) + 1;
      const percentile = ((allEmployees.length - rank + 1) / allEmployees.length) * 100;

      // Build AI prompt
      const prompt = language === 'es'
        ? `Analiza el desempeño de este empleado y proporciona insights en español:

Empleado: ${getDisplayName(employee)}
Puesto: ${employee.position || 'No especificado'}
Departamento: ${employee.department || 'No especificado'}
Equipo: ${employee.team_name || 'No asignado'}

MÉTRICAS DE RENDIMIENTO:
- Total de horas trabajadas: ${totalHours.toFixed(1)}h
- Promedio de horas por semana: ${avgHoursPerWeek.toFixed(1)}h
- Trabajos únicos: ${uniqueJobs}
- Trabajos completados: ${completedJobs}
- Total de gastos: $${totalExpenses.toFixed(2)} (${approvedExpenses} aprobados, ${pendingExpenses} pendientes)
- Millas recorridas: ${totalMiles}
- Horas de manejo: ${totalDrivingHours.toFixed(1)}h
- Puntos de reconocimiento: ${totalPoints}
- Certificaciones activas: ${activeCerts}
- Certificaciones por vencer: ${expiringCerts}
- Ranking: #${rank} de ${allEmployees.length} (Top ${percentile.toFixed(0)}%)

DATOS DE TRABAJO RECIENTES:
${approvedHours.slice(0, 10).map(e => `- ${e.job_name}: ${e.hours_worked}h el ${e.date}`).join('\n')}

RECONOCIMIENTOS:
${recognitions.slice(0, 3).map(r => `- ${r.title}: +${r.points} pts`).join('\n')}

Proporciona:
1. Resumen de rendimiento general (strengths)
2. Áreas de oportunidad o preocupaciones (areas_for_improvement)
3. Recomendaciones de capacitación específicas basadas en datos (training_recommendations)
4. Análisis de tendencias (trending up, stable, or down)
5. Comparación con el promedio del equipo

Formato de respuesta en JSON.`
        : `Analyze this employee's performance and provide insights:

Employee: ${getDisplayName(employee)}
Position: ${employee.position || 'Not specified'}
Department: ${employee.department || 'Not specified'}
Team: ${employee.team_name || 'Not assigned'}

PERFORMANCE METRICS:
- Total hours worked: ${totalHours.toFixed(1)}h
- Average hours per week: ${avgHoursPerWeek.toFixed(1)}h
- Unique jobs: ${uniqueJobs}
- Completed jobs: ${completedJobs}
- Total expenses: $${totalExpenses.toFixed(2)} (${approvedExpenses} approved, ${pendingExpenses} pending)
- Miles driven: ${totalMiles}
- Driving hours: ${totalDrivingHours.toFixed(1)}h
- Recognition points: ${totalPoints}
- Active certifications: ${activeCerts}
- Expiring certifications: ${expiringCerts}
- Ranking: #${rank} of ${allEmployees.length} (Top ${percentile.toFixed(0)}%)

RECENT WORK DATA:
${approvedHours.slice(0, 10).map(e => `- ${e.job_name}: ${e.hours_worked}h on ${e.date}`).join('\n')}

RECOGNITIONS:
${recognitions.slice(0, 3).map(r => `- ${r.title}: +${r.points} pts`).join('\n')}

Provide:
1. Overall performance summary (strengths)
2. Areas of opportunity or concerns (areas_for_improvement)
3. Specific training recommendations based on data (training_recommendations)
4. Trend analysis (trending up, stable, or down)
5. Comparison with team average

Response in JSON format.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            performance_summary: {
              type: "object",
              properties: {
                overall_rating: { type: "string", enum: ["excellent", "good", "average", "needs_improvement"] },
                strengths: { type: "array", items: { type: "string" } },
                key_achievements: { type: "array", items: { type: "string" } }
              }
            },
            areas_for_improvement: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  recommendation: { type: "string" }
                }
              }
            },
            training_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  training_topic: { type: "string" },
                  reason: { type: "string" },
                  expected_impact: { type: "string" },
                  priority: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            },
            trend_analysis: {
              type: "object",
              properties: {
                direction: { type: "string", enum: ["up", "stable", "down"] },
                insight: { type: "string" }
              }
            },
            team_comparison: {
              type: "object",
              properties: {
                vs_average: { type: "string", enum: ["above", "at", "below"] },
                insights: { type: "string" }
              }
            }
          }
        }
      });

      setAnalysis({
        ...response,
        metrics: {
          totalHours,
          avgHoursPerWeek,
          uniqueJobs,
          completedJobs,
          totalExpenses,
          totalPoints,
          rank,
          percentile,
          activeCerts,
          expiringCerts
        }
      });
    } catch (error) {
      console.error('AI Performance Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (showFullAnalysis && employee && !analysis && showDetails) {
      analyzePerformance();
    }
  }, [employee, showFullAnalysis, analysis, showDetails]);

  if (!employee) return null;

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'excellent': return 'from-green-500 to-emerald-500';
      case 'good': return 'from-blue-500 to-cyan-500';
      case 'average': return 'from-amber-500 to-yellow-500';
      case 'needs_improvement': return 'from-red-500 to-orange-500';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const getRatingIcon = (rating) => {
    switch (rating) {
      case 'excellent': return '🌟';
      case 'good': return '✅';
      case 'average': return '⚡';
      case 'needs_improvement': return '📈';
      default: return '📊';
    }
  };

  return (
    <Card className="border-slate-200 bg-gradient-to-br from-purple-50 to-blue-50 shadow-lg">
      <CardHeader className="border-b border-slate-200">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between hover:bg-slate-50 transition-colors -m-6 p-6 rounded-t-lg"
        >
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Sparkles className="w-5 h-5 text-purple-500" />
            {language === 'es' ? 'Análisis de Desempeño IA' : 'AI Performance Analysis'}
          </CardTitle>
          {showDetails ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
        </button>
      </CardHeader>
      
      <AnimatePresence>
        {showDetails && (
          <CardContent className="p-6">
            {!analysis && !isAnalyzing ? (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4">
                  {language === 'es' 
                    ? 'Obtén insights inteligentes sobre el desempeño de este empleado' 
                    : 'Get intelligent insights about this employee\'s performance'}
                </p>
                <Button
                  onClick={analyzePerformance}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Analizar Desempeño' : 'Analyze Performance'}
                </Button>
              </div>
            ) : isAnalyzing ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
                <p className="text-slate-600">
                  {language === 'es' ? 'Analizando datos de desempeño...' : 'Analyzing performance data...'}
                </p>
              </div>
            ) : analysis ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
                {/* Key Metrics */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-slate-600">
                        {language === 'es' ? 'Total Horas' : 'Total Hours'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {analysis.metrics.totalHours.toFixed(1)}h
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-slate-600">
                        {language === 'es' ? 'Trabajos' : 'Jobs'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {analysis.metrics.completedJobs}/{analysis.metrics.uniqueJobs}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-slate-600">
                        {language === 'es' ? 'Puntos' : 'Points'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      {analysis.metrics.totalPoints}
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-slate-600">
                        {language === 'es' ? 'Ranking' : 'Rank'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                      #{analysis.metrics.rank}
                    </p>
                    <p className="text-xs text-slate-500">
                      Top {analysis.metrics.percentile.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className={`p-4 bg-gradient-to-r ${getRatingColor(analysis.performance_summary.overall_rating)} rounded-lg text-white`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{getRatingIcon(analysis.performance_summary.overall_rating)}</span>
                    <div>
                      <h3 className="font-bold text-lg capitalize">
                        {language === 'es' 
                          ? analysis.performance_summary.overall_rating === 'excellent' ? 'Excelente'
                            : analysis.performance_summary.overall_rating === 'good' ? 'Bueno'
                            : analysis.performance_summary.overall_rating === 'average' ? 'Promedio'
                            : 'Necesita Mejora'
                          : analysis.performance_summary.overall_rating.replace('_', ' ')}
                      </h3>
                      {analysis.trend_analysis && (
                        <div className="flex items-center gap-2 text-sm opacity-90">
                          {analysis.trend_analysis.direction === 'up' && <TrendingUp className="w-4 h-4" />}
                          {analysis.trend_analysis.direction === 'stable' && <Target className="w-4 h-4" />}
                          {analysis.trend_analysis.direction === 'down' && <TrendingDown className="w-4 h-4" />}
                          <span>{analysis.trend_analysis.insight}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                {analysis.performance_summary.strengths?.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-green-900">
                        {language === 'es' ? 'Fortalezas' : 'Strengths'}
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {analysis.performance_summary.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-green-800">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Achievements */}
                {analysis.performance_summary.key_achievements?.length > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">
                        {language === 'es' ? 'Logros Clave' : 'Key Achievements'}
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {analysis.performance_summary.key_achievements.map((achievement, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                          <span className="text-blue-500">🏆</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {analysis.areas_for_improvement?.length > 0 && (
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <h3 className="font-semibold text-amber-900">
                        {language === 'es' ? 'Áreas de Mejora' : 'Areas for Improvement'}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {analysis.areas_for_improvement.map((area, idx) => (
                        <div key={idx} className="flex gap-3">
                          <Badge className={
                            area.priority === 'high' ? 'bg-red-100 text-red-700 border-red-300' :
                            area.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-300' :
                            'bg-blue-100 text-blue-700 border-blue-300'
                          }>
                            {area.priority}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-900">{area.area}</p>
                            <p className="text-xs text-amber-700 mt-1">{area.recommendation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Training Recommendations */}
                {analysis.training_recommendations?.length > 0 && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-900">
                        {language === 'es' ? 'Recomendaciones de Capacitación' : 'Training Recommendations'}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {analysis.training_recommendations.map((training, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-start gap-2">
                            <Badge className={
                              training.priority === 'high' ? 'bg-purple-600 text-white' :
                              training.priority === 'medium' ? 'bg-purple-500 text-white' :
                              'bg-purple-400 text-white'
                            }>
                              {training.priority}
                            </Badge>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-purple-900">{training.training_topic}</p>
                              <p className="text-xs text-purple-700 mt-1">
                                <strong>{language === 'es' ? 'Razón' : 'Reason'}:</strong> {training.reason}
                              </p>
                              <p className="text-xs text-purple-600 mt-1">
                                <strong>{language === 'es' ? 'Impacto Esperado' : 'Expected Impact'}:</strong> {training.expected_impact}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Comparison */}
                {analysis.team_comparison && (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-slate-600" />
                      <h3 className="font-semibold text-slate-900">
                        {language === 'es' ? 'Comparación con el Equipo' : 'Team Comparison'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        analysis.team_comparison.vs_average === 'above' ? 'bg-green-100 text-green-700 border-green-300' :
                        analysis.team_comparison.vs_average === 'at' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                        'bg-amber-100 text-amber-700 border-amber-300'
                      }>
                        {analysis.team_comparison.vs_average === 'above' 
                          ? (language === 'es' ? 'Por Encima del Promedio' : 'Above Average')
                          : analysis.team_comparison.vs_average === 'at'
                          ? (language === 'es' ? 'En el Promedio' : 'At Average')
                          : (language === 'es' ? 'Por Debajo del Promedio' : 'Below Average')
                        }
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-700">{analysis.team_comparison.insights}</p>
                  </div>
                )}

                <Button
                  onClick={analyzePerformance}
                  variant="outline"
                  className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Re-analizar' : 'Re-analyze'}
                </Button>
              </div>
            ) : null}
          </CardContent>
        )}
      </AnimatePresence>
    </Card>
  );
}