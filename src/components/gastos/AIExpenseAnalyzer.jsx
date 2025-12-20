import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  PieChart,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  Check, // New import
  Brain, // New import
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { Alert, AlertDescription } from '@/components/ui/alert'; // New import

export default function AIExpenseAnalyzer({ expenses, showFullAnalysis = false }) {
  const { t, language } = useLanguage();
  const [insights, setInsights] = useState(null); // Changed from 'analysis' to 'insights'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showInsights, setShowInsights] = useState(showFullAnalysis); // Changed from 'showDetails' to 'showInsights'

  // Calculate AI categorization stats
  const aiStats = {
    total: expenses.length,
    aiCategorized: expenses.filter(e => e.ai_analyzed).length,
    highConfidence: expenses.filter(e => e.ai_analyzed && e.ai_confidence >= 80).length,
    mediumConfidence: expenses.filter(e => e.ai_analyzed && e.ai_confidence >= 60 && e.ai_confidence < 80).length,
    lowConfidence: expenses.filter(e => e.ai_analyzed && e.ai_confidence < 60).length,
    userCorrected: expenses.filter(e => e.user_corrected_ai).length,
    needsReview: expenses.filter(e => e.ai_analyzed && e.ai_confidence < 60 && e.status === 'pending').length
  };

  const aiAccuracy = aiStats.aiCategorized > 0
    ? Math.round((1 - (aiStats.userCorrected / aiStats.aiCategorized)) * 100)
    : 0;

  const analyzeExpenses = async () => {
    if (expenses.length === 0) return;

    setIsAnalyzing(true);
    // Ensure insights section is visible when analysis is triggered
    if (!showInsights) setShowInsights(true);

    try {
      // Build expense summary for analysis
      const expenseData = expenses.map(e => ({
        amount: e.amount,
        category: e.category,
        description: e.description,
        date: e.date,
        payment_method: e.payment_method,
        status: e.status
      }));

      // Calculate totals by category
      const categoryTotals = {};
      expenses.forEach(e => {
        if (!categoryTotals[e.category]) {
          categoryTotals[e.category] = { total: 0, count: 0 };
        }
        categoryTotals[e.category].total += e.amount || 0;
        categoryTotals[e.category].count += 1;
      });

      const totalSpending = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const avgExpense = expenses.length > 0 ? totalSpending / expenses.length : 0;

      const prompt = language === 'es'
        ? `Analiza estos gastos empresariales y proporciona insights en español:

Datos de gastos:
- Total de gastos: ${expenses.length}
- Gasto total: $${totalSpending.toFixed(2)}
- Gasto promedio: $${avgExpense.toFixed(2)}
- Por categoría: ${JSON.stringify(categoryTotals)}

Gastos recientes (últimos 10):
${expenses.slice(0, 10).map(e => `- $${e.amount} - ${e.category} - ${e.description} (${e.date})`).join('\n')}

Proporciona:
1. Identificar posibles duplicados (misma cantidad, fecha cercana, descripción similar)
2. Patrones inusuales o alertas (gastos muy altos, categorías inusuales)
3. Top 3 categorías con mayor gasto
4. 3 recomendaciones específicas para reducir costos
5. Proyección de gasto mensual basado en tendencias actuales

Formato de respuesta en JSON.`
        : `Analyze these business expenses and provide insights:

Expense data:
- Total expenses: ${expenses.length}
- Total spending: $${totalSpending.toFixed(2)}
- Average expense: $${avgExpense.toFixed(2)}
- By category: ${JSON.stringify(categoryTotals)}

Recent expenses (last 10):
${expenses.slice(0, 10).map(e => `- $${e.amount} - ${e.category} - ${e.description} (${e.date})`).join('\n')}

Provide:
1. Identify potential duplicates (same amount, close dates, similar descriptions)
2. Unusual patterns or alerts (very high expenses, unusual categories)
3. Top 3 categories with highest spending
4. 3 specific recommendations to reduce costs
5. Monthly spending projection based on current trends

Response in JSON format.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            potential_duplicates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  amount: { type: "number" },
                  count: { type: "number" }
                }
              }
            },
            unusual_patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern: { type: "string" },
                  severity: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            top_categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  total: { type: "number" },
                  percentage: { type: "number" }
                }
              }
            },
            cost_reduction_tips: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tip: { type: "string" },
                  potential_savings: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            monthly_projection: {
              type: "object",
              properties: {
                estimated_monthly_total: { type: "number" },
                trend: { type: "string" },
                insight: { type: "string" }
              }
            }
          }
        }
      });

      setInsights(response); // Changed from setAnalysis to setInsights
    } catch (error) {
      console.error('AI Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // If showFullAnalysis is true (meaning it should be expanded by default), and we have expenses, and no insights yet, trigger analysis.
    if (showFullAnalysis && expenses.length > 0 && !insights) {
      analyzeExpenses();
    }
    // Also, if insights become available and showFullAnalysis was true, make sure showInsights is true.
    if (showFullAnalysis && insights && !showInsights) {
      setShowInsights(true);
    }
  }, [expenses, showFullAnalysis, insights, showInsights]); // Added showInsights to dependencies

  // If showFullAnalysis is false and no expenses, don't render anything.
  if (!showFullAnalysis && expenses.length === 0) return null;

  return (
    <Card className="bg-white shadow-lg border-slate-200 mb-6">
      <CardHeader
        className="border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setShowInsights(!showInsights)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <div className="p-2 bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] rounded-lg shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {language === 'es' ? 'Análisis AI de Gastos' : 'AI Expense Analysis'}
            <Badge className="bg-blue-50/60 text-[#507DB4] border border-blue-200/40 px-2 py-0.5 rounded-full text-xs font-semibold">
              {language === 'es' ? 'Potenciado por AI' : 'AI-Powered'}
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-3">
            {/* AI Stats Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-slate-600">
                  {aiStats.aiCategorized}/{aiStats.total} {language === 'es' ? 'AI' : 'AI'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-slate-600">{aiAccuracy}% {language === 'es' ? 'precisión' : 'accuracy'}</span>
              </div>
              {aiStats.needsReview > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {aiStats.needsReview} {language === 'es' ? 'revisar' : 'review'}
                </Badge>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900"
            >
              {showInsights ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {showInsights && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="p-6 space-y-6">
              {/* AI Categorization Performance */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  {language === 'es' ? 'Rendimiento de Categorización AI' : 'AI Categorization Performance'}
                </h4>

                <div className="grid md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/40 dark:border-blue-700/30 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-100/50 rounded-lg">
                          <Check className="w-4 h-4 text-[#507DB4]" />
                        </div>
                        <Badge className="bg-blue-50/60 text-[#507DB4] border border-blue-200/40 text-xs">
                          ≥80%
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{aiStats.highConfidence}</div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {language === 'es' ? 'Alta Confianza' : 'High Confidence'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/40 dark:border-blue-700/30 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-100/50 rounded-lg">
                          <TrendingUp className="w-4 h-4 text-[#507DB4]" />
                        </div>
                        <Badge className="bg-blue-50/60 text-[#507DB4] border border-blue-200/40 text-xs">
                          60-79%
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{aiStats.mediumConfidence}</div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {language === 'es' ? 'Confianza Media' : 'Medium Confidence'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/40 dark:border-blue-700/30 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-100/50 rounded-lg">
                          <AlertTriangle className="w-4 h-4 text-[#507DB4]" />
                        </div>
                        <Badge className="bg-blue-50/60 text-[#507DB4] border border-blue-200/40 text-xs">
                          {'<60%'}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{aiStats.lowConfidence}</div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {language === 'es' ? 'Baja Confianza' : 'Low Confidence'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50/40 to-blue-100/30 dark:from-blue-900/10 dark:to-blue-800/10 border border-blue-200/40 dark:border-blue-700/30 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-100/50 rounded-lg">
                          <Brain className="w-4 h-4 text-[#507DB4]" />
                        </div>
                        <Badge className="bg-blue-50/60 text-[#507DB4] border border-blue-200/40 text-xs">
                          {aiAccuracy}%
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{aiStats.userCorrected}</div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {language === 'es' ? 'Corregidos (Aprendiendo)' : 'Corrected (Learning)'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Learning Progress */}
                {aiStats.userCorrected > 0 && (
                  <Alert className="mt-4 bg-purple-50 border-purple-200">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <AlertDescription className="text-purple-700">
                      {language === 'es'
                        ? `🎓 El AI está aprendiendo de ${aiStats.userCorrected} correcciones de usuario para mejorar su precisión.`
                        : `🎓 The AI is learning from ${aiStats.userCorrected} user corrections to improve its accuracy.`}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Review Alert */}
                {aiStats.needsReview > 0 && (
                  <Alert className="mt-4 bg-amber-50 border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <AlertDescription className="text-amber-700">
                      {language === 'es'
                        ? `⚠️ ${aiStats.needsReview} gastos pendientes tienen baja confianza de categorización y necesitan revisión.`
                        : `⚠️ ${aiStats.needsReview} pending expenses have low categorization confidence and need review.`}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {!insights && !isAnalyzing ? (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">
                    {language === 'es'
                      ? 'Obtén insights inteligentes sobre tus gastos'
                      : 'Get intelligent insights about your expenses'}
                  </p>
                  <Button
                    onClick={analyzeExpenses}
                    disabled={expenses.length === 0} // Disable if no expenses
                    className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Analizar Gastos' : 'Analyze Expenses'}
                  </Button>
                </div>
              ) : isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 animate-spin text-[#507DB4] mb-4" />
                  <p className="text-slate-600">
                    {language === 'es' ? 'Analizando patrones y generando insights...' : 'Analyzing patterns and generating insights...'}
                  </p>
                </div>
              ) : (
                insights && ( // Ensure insights exist before rendering these sections
                  <div className="space-y-6">
                    {/* Potential Duplicates */}
                    {insights.potential_duplicates?.length > 0 && (
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                          <h3 className="font-semibold text-amber-900">
                            {language === 'es' ? 'Posibles Duplicados' : 'Potential Duplicates'}
                          </h3>
                        </div>
                        <div className="space-y-2">
                          {insights.potential_duplicates.map((dup, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-amber-800">{dup.description}</span>
                              <Badge className="bg-amber-100 text-amber-700">
                                ${dup.amount} × {dup.count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Unusual Patterns */}
                    {insights.unusual_patterns?.length > 0 && (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <h3 className="font-semibold text-red-900">
                            {language === 'es' ? 'Patrones Inusuales' : 'Unusual Patterns'}
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {insights.unusual_patterns.map((pattern, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  pattern.severity === 'high' ? 'bg-red-100 text-red-700' :
                                  pattern.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                                  'bg-blue-100 text-blue-700'
                                }>
                                  {pattern.severity}
                                </Badge>
                                <span className="text-sm font-medium text-red-800">{pattern.pattern}</span>
                              </div>
                              <p className="text-xs text-red-600 ml-2">{pattern.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top Categories */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <PieChart className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-blue-900">
                          {language === 'es' ? 'Top Categorías de Gasto' : 'Top Spending Categories'}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {insights.top_categories?.map((cat, idx) => (
                          <div key={idx}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-blue-800 capitalize">{cat.category}</span>
                              <span className="text-sm font-bold text-blue-900">${cat.total.toFixed(2)}</span>
                            </div>
                            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-blue-600">{cat.percentage.toFixed(1)}% {language === 'es' ? 'del total' : 'of total'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cost Reduction Tips */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-900">
                          {language === 'es' ? 'Recomendaciones de Ahorro' : 'Cost Reduction Tips'}
                        </h3>
                      </div>
                      <div className="space-y-3">
                        {insights.cost_reduction_tips?.map((tip, idx) => (
                          <div key={idx} className="flex gap-3">
                            <div className="flex-shrink-0">
                              <Badge className={
                                tip.priority === 'high' ? 'bg-green-600 text-white' :
                                tip.priority === 'medium' ? 'bg-green-500 text-white' :
                                'bg-green-400 text-white'
                              }>
                                {tip.priority}
                              </Badge>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-900">{tip.tip}</p>
                              <p className="text-xs text-green-600 mt-1">
                                {language === 'es' ? 'Ahorro potencial' : 'Potential savings'}: {tip.potential_savings}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monthly Projection */}
                    {insights.monthly_projection && (
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Target className="w-5 h-5 text-purple-600" />
                          <h3 className="font-semibold text-purple-900">
                            {language === 'es' ? 'Proyección Mensual' : 'Monthly Projection'}
                          </h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-purple-700">
                              {language === 'es' ? 'Gasto estimado mensual' : 'Estimated monthly spending'}:
                            </span>
                            <span className="text-2xl font-bold text-purple-900">
                              ${insights.monthly_projection.estimated_monthly_total.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {insights.monthly_projection.trend === 'increasing' ? (
                              <TrendingUp className="w-4 h-4 text-red-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-green-500" />
                            )}
                            <span className="text-sm text-purple-700 capitalize">
                              {insights.monthly_projection.trend}
                            </span>
                          </div>
                          <p className="text-sm text-purple-600 mt-2">
                            {insights.monthly_projection.insight}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={analyzeExpenses}
                      variant="outline"
                      disabled={isAnalyzing || expenses.length === 0}
                      className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Re-analizar' : 'Re-analyze'}
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}