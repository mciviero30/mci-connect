import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Calendar,
  Target,
  Lightbulb,
  Loader2,
  ChevronDown,
  ChevronUp,
  Users,
  Briefcase
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { startOfMonth, endOfMonth, subMonths, format, addMonths } from 'date-fns';

const COLORS = ['#3B9FF3', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export default function AIBudgetForecaster({ 
  expenses = [],
  jobs = [],
  employees = [],
  dateRange,
  showFullAnalysis = true
}) {
  const { t, language } = useLanguage();
  const [forecast, setForecast] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(showFullAnalysis);
  const [selectedPeriod, setSelectedPeriod] = useState('3months');

  const analyzeBudget = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Calculate historical metrics
      const now = new Date();
      const last3Months = subMonths(now, 3);
      const last6Months = subMonths(now, 6);
      
      const recentExpenses = expenses.filter(e => new Date(e.date) >= last3Months && e.status === 'approved');
      const historicalExpenses = expenses.filter(e => new Date(e.date) >= last6Months && e.status === 'approved');
      
      // Validate we have enough data
      if (recentExpenses.length === 0) {
        setError(language === 'es' 
          ? 'No hay suficientes datos de gastos para generar un pronóstico'
          : 'Not enough expense data to generate a forecast');
        setIsAnalyzing(false);
        return;
      }
      
      // Calculate spending by category (top 3 only to reduce prompt size)
      const categorySpendingMap = {};
      recentExpenses.forEach(exp => {
        categorySpendingMap[exp.category] = (categorySpendingMap[exp.category] || 0) + exp.amount;
      });
      const topCategories = Object.entries(categorySpendingMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // Reduced from 5 to 3
      
      // Calculate monthly spending trend (last 3 months only)
      const monthlySpendingMap = {};
      recentExpenses.forEach(exp => {
        const month = format(new Date(exp.date), 'MMM');
        monthlySpendingMap[month] = (monthlySpendingMap[month] || 0) + exp.amount;
      });
      const monthlyTrend = Object.entries(monthlySpendingMap)
        .slice(-3)
        .map(([month, amount]) => `${month}: $${amount.toFixed(0)}`);
      
      // Calculate totals
      const totalRecent = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
      const avgMonthly = totalRecent / 3;
      const activeJobs = jobs.filter(j => j.status === 'active').length;

      // SIMPLIFIED PROMPT - Much shorter to avoid network errors
      const prompt = language === 'es'
        ? `Analiza y proyecta el presupuesto basado en estos datos:

RESUMEN:
- Gasto promedio mensual: $${avgMonthly.toFixed(0)}
- Empleados activos: ${employees.length}
- Trabajos activos: ${activeJobs}

TOP 3 CATEGORÍAS:
${topCategories.map(([cat, amt]) => `${cat}: $${amt.toFixed(0)}`).join(', ')}

TENDENCIA (3 meses): ${monthlyTrend.join(' → ')}

Responde en JSON con proyecciones, riesgos y recomendaciones.`
        : `Analyze and forecast budget based on:

SUMMARY:
- Avg monthly spend: $${avgMonthly.toFixed(0)}
- Active employees: ${employees.length}
- Active jobs: ${activeJobs}

TOP 3 CATEGORIES:
${topCategories.map(([cat, amt]) => `${cat}: $${amt.toFixed(0)}`).join(', ')}

TREND (3mo): ${monthlyTrend.join(' → ')}

Respond in JSON with projections, risks, and recommendations.`;

      // SIMPLIFIED JSON SCHEMA - Reduced complexity
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            forecast_projections: {
              type: "object",
              properties: {
                one_month: { type: "number" },
                three_months: { type: "number" },
                six_months: { type: "number" }
              }
            },
            overspending_risks: {
              type: "array",
              maxItems: 2, // Reduced from 3
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  severity: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            cost_optimization_recommendations: {
              type: "array",
              maxItems: 2, // Reduced from 3
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  recommendation: { type: "string" },
                  potential_savings: { type: "number" }
                }
              }
            },
            budget_alerts: {
              type: "array",
              maxItems: 1, // Reduced from 2
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string" }
                }
              }
            }
          },
          required: ["forecast_projections"]
        }
      });

      // Store full metrics for charts
      const fullCategorySpending = {};
      recentExpenses.forEach(exp => {
        fullCategorySpending[exp.category] = (fullCategorySpending[exp.category] || 0) + exp.amount;
      });

      const fullMonthlySpending = {};
      historicalExpenses.forEach(exp => {
        const month = format(new Date(exp.date), 'yyyy-MM');
        fullMonthlySpending[month] = (fullMonthlySpending[month] || 0) + exp.amount;
      });

      setForecast({
        ...response,
        metrics: {
          totalRecent,
          dailyVelocity: totalRecent / 90,
          categorySpending: fullCategorySpending,
          monthlySpending: fullMonthlySpending
        }
      });
    } catch (error) {
      console.error('AI Budget Forecasting error:', error);
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('Network') || errorMessage.includes('timeout')) {
        setError(language === 'es'
          ? '⚠️ Error de conexión. Por favor verifica tu conexión a internet e intenta nuevamente.'
          : '⚠️ Network error. Please check your internet connection and try again.');
      } else {
        setError(language === 'es'
          ? `Error al generar pronóstico: ${errorMessage}`
          : `Error generating forecast: ${errorMessage}`
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (showFullAnalysis && expenses.length > 0 && !forecast && !error) {
      analyzeBudget();
    }
  }, [expenses, showFullAnalysis, forecast, error]);

  if (expenses.length === 0) {
    return (
      <Card className="border-slate-200 bg-white shadow-lg">
        <CardContent className="p-12 text-center">
          <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600">
            {language === 'es' 
              ? 'No hay suficientes datos de gastos para generar un pronóstico'
              : 'Not enough expense data to generate a forecast'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
      case 'critical':
        return 'from-red-500 to-orange-500';
      case 'medium':
      case 'warning':
        return 'from-amber-500 to-yellow-500';
      case 'low':
      case 'info':
        return 'from-blue-500 to-cyan-500';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const categoryChartData = forecast?.metrics.categorySpending 
    ? Object.entries(forecast.metrics.categorySpending).map(([name, value]) => ({ name, value }))
    : [];

  const monthlyTrendData = forecast?.metrics.monthlySpending
    ? Object.entries(forecast.metrics.monthlySpending)
        .sort()
        .map(([month, amount]) => ({ month, amount }))
    : [];

  return (
    <Card className="border-slate-200 bg-white shadow-lg">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Sparkles className="w-5 h-5 text-purple-500" />
            {language === 'es' ? 'Pronóstico Presupuestario AI' : 'AI Budget Forecast'}
          </CardTitle>
          {!showFullAnalysis && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-purple-600 hover:text-purple-700"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {error ? (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
            <Button
              onClick={analyzeBudget}
              variant="outline"
              className="mt-4 border-red-200 text-red-700 hover:bg-red-50"
            >
              {language === 'es' ? 'Reintentar' : 'Retry'}
            </Button>
          </Alert>
        ) : !forecast && !isAnalyzing ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">
              {language === 'es' 
                ? 'Genera pronósticos presupuestarios inteligentes basados en datos históricos' 
                : 'Generate intelligent budget forecasts based on historical data'}
            </p>
            <Button
              onClick={analyzeBudget}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Analizar Presupuesto' : 'Analyze Budget'}
            </Button>
          </div>
        ) : isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
            <p className="text-slate-600">
              {language === 'es' ? 'Analizando datos financieros...' : 'Analyzing financial data...'}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {language === 'es' ? 'Esto puede tomar unos segundos' : 'This may take a few seconds'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {showDetails && forecast && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6"
              >
                {/* Budget Alerts */}
                {forecast.budget_alerts?.length > 0 && (
                  <div className="space-y-3">
                    {forecast.budget_alerts.map((alert, idx) => (
                      <Alert key={idx} className={`bg-gradient-to-r ${getSeverityColor(alert.priority)} bg-opacity-10 border-2`}>
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                            alert.priority === 'critical' ? 'text-red-600' :
                            alert.priority === 'warning' ? 'text-amber-600' :
                            'text-blue-600'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-slate-900">{alert.title}</p>
                              <Badge className={`bg-gradient-to-r ${getSeverityColor(alert.priority)} text-white text-xs`}>
                                {alert.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700">{alert.description}</p>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Forecast Projections */}
                {forecast.forecast_projections && (
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-900 font-medium">
                            {language === 'es' ? 'Próximo Mes' : 'Next Month'}
                          </span>
                        </div>
                        <p className="text-3xl font-bold text-blue-900">
                          ${forecast.forecast_projections.one_month?.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-purple-900 font-medium">
                            {language === 'es' ? 'Próximos 3 Meses' : 'Next 3 Months'}
                          </span>
                        </div>
                        <p className="text-3xl font-bold text-purple-900">
                          ${forecast.forecast_projections.three_months?.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span className="text-sm text-amber-900 font-medium">
                            {language === 'es' ? 'Próximos 6 Meses' : 'Next 6 Months'}
                          </span>
                        </div>
                        <p className="text-3xl font-bold text-amber-900">
                          ${forecast.forecast_projections.six_months?.toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Current Metrics */}
                <div className="grid md:grid-cols-4 gap-4">
                  <Card className="bg-white border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-slate-600">
                          {language === 'es' ? 'Total 3 Meses' : 'Total 3 Months'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">
                        ${forecast.metrics.totalRecent.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="text-xs text-slate-600">
                          {language === 'es' ? 'Velocidad Diaria' : 'Daily Velocity'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">
                        ${forecast.metrics.dailyVelocity.toFixed(2)}/día
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-slate-600">
                          {language === 'es' ? 'Empleados' : 'Employees'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">
                        {employees.length}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-4 h-4 text-amber-500" />
                        <span className="text-xs text-slate-600">
                          {language === 'es' ? 'Trabajos Activos' : 'Active Jobs'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">
                        {jobs.filter(j => j.status === 'active').length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Category Spending */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader className="border-b border-slate-200">
                      <CardTitle className="text-sm text-slate-900">
                        {language === 'es' ? 'Gasto por Categoría' : 'Spending by Category'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={categoryChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {categoryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Monthly Trend */}
                  <Card className="bg-white border-slate-200">
                    <CardHeader className="border-b border-slate-200">
                      <CardTitle className="text-sm text-slate-900">
                        {language === 'es' ? 'Tendencia Mensual' : 'Monthly Trend'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={monthlyTrendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                          <Line type="monotone" dataKey="amount" stroke="#3B9FF3" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Overspending Risks */}
                {forecast.overspending_risks?.length > 0 && (
                  <Card className="bg-red-50 border-red-200">
                    <CardHeader className="border-b border-red-200">
                      <CardTitle className="flex items-center gap-2 text-red-900">
                        <AlertTriangle className="w-5 h-5" />
                        {language === 'es' ? 'Riesgos de Sobregasto' : 'Overspending Risks'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {forecast.overspending_risks.map((risk, idx) => (
                          <div key={idx} className="flex gap-3 p-3 bg-white rounded-lg border border-red-200">
                            <Badge className={`${
                              risk.severity === 'high' ? 'bg-red-500' :
                              risk.severity === 'medium' ? 'bg-amber-500' :
                              'bg-blue-500'
                            } text-white`}>
                              {risk.severity}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{risk.category}</p>
                              <p className="text-sm text-slate-700 mt-1">{risk.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cost Optimization Recommendations */}
                {forecast.cost_optimization_recommendations?.length > 0 && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="border-b border-green-200">
                      <CardTitle className="flex items-center gap-2 text-green-900">
                        <Lightbulb className="w-5 h-5" />
                        {language === 'es' ? 'Recomendaciones de Optimización' : 'Cost Optimization Recommendations'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {forecast.cost_optimization_recommendations.map((rec, idx) => (
                          <div key={idx} className="flex gap-3 p-3 bg-white rounded-lg border border-green-200">
                            <Lightbulb className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{rec.area}</p>
                              <p className="text-sm text-slate-700 mt-1">{rec.recommendation}</p>
                              {rec.potential_savings && (
                                <p className="text-sm text-green-600 font-semibold mt-2">
                                  {language === 'es' ? 'Ahorro potencial:' : 'Potential savings:'} ${rec.potential_savings?.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={analyzeBudget}
                  variant="outline"
                  className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                  disabled={isAnalyzing}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Re-analizar' : 'Re-analyze'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </CardContent>
    </Card>
  );
}