import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import PageHeader from '@/components/shared/PageHeader';
import AIExpenseCategorizer from '@/components/gastos/AIExpenseCategorizer';
import { useLanguage } from '@/components/i18n/LanguageContext';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileQuestion,
  DollarSign,
  Calendar,
  TrendingUp,
  Loader2,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

export default function AIExpensesAudit() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastAuditTime, setLastAuditTime] = useState(null);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses_last_month'],
    queryFn: async () => {
      const allExpenses = await base44.entities.Expense.list('-date');
      const lastMonth = subMonths(new Date(), 1);
      const monthStart = startOfMonth(lastMonth);
      const monthEnd = endOfMonth(lastMonth);
      
      return allExpenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= monthStart && expDate <= monthEnd;
      });
    },
    initialData: []
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const total = expenses.length;
    const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const withReceipts = expenses.filter(exp => exp.receipt_url).length;
    const aiAnalyzed = expenses.filter(exp => exp.ai_analyzed).length;
    const needsReview = expenses.filter(exp => 
      exp.ai_confidence < 70 || !exp.receipt_url || !exp.ai_analyzed
    ).length;

    return {
      total,
      totalAmount,
      withReceipts,
      aiAnalyzed,
      needsReview,
      averageConfidence: aiAnalyzed > 0 
        ? (expenses.reduce((sum, exp) => sum + (exp.ai_confidence || 0), 0) / aiAnalyzed).toFixed(1)
        : 0
    };
  }, [expenses]);

  const runAIAudit = async () => {
    // Check if audit was run recently (within last 60 seconds)
    if (lastAuditTime && (Date.now() - lastAuditTime) < 60000) {
      toast({
        title: language === 'es' ? '⏱️ Por favor espera' : '⏱️ Please wait',
        description: language === 'es' 
          ? 'Debes esperar 1 minuto entre auditorías para evitar límites de tasa.' 
          : 'Please wait 1 minute between audits to avoid rate limits.',
        variant: "destructive"
      });
      return;
    }

    setAnalyzing(true);
    try {
      // Limit to 50 most recent expenses to avoid overwhelming the AI
      const limitedExpenses = expenses.slice(0, 50);
      
      const expenseData = limitedExpenses.map(exp => ({
        id: exp.id,
        date: exp.date,
        amount: exp.amount,
        category: exp.category,
        description: exp.description,
        employee_name: exp.employee_name,
        has_receipt: !!exp.receipt_url,
        ai_confidence: exp.ai_confidence || 0,
        payment_method: exp.payment_method
      }));

      const prompt = `Analiza estos gastos empresariales y detecta anomalías:

${JSON.stringify(expenseData, null, 2)}

Detecta:
1. Gastos duplicados (mismo empleado, monto similar, fecha cercana)
2. Gastos sin recibo
3. Montos inusuales (muy altos o muy bajos)
4. Categorías potencialmente incorrectas

IMPORTANTE: Limita tu respuesta a máximo 10 anomalías más críticas.

Devuelve un JSON con:
{
  "overall_confidence_score": <0-100>,
  "total_issues_found": <número>,
  "anomalies": [
    {
      "expense_id": "id",
      "severity": "high|medium|low",
      "issue_type": "duplicate|missing_receipt|unusual_amount|wrong_category",
      "description": "descripción breve",
      "recommendation": "acción recomendada"
    }
  ],
  "summary": "resumen breve del análisis"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            overall_confidence_score: { type: "number" },
            total_issues_found: { type: "number" },
            anomalies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  expense_id: { type: "string" },
                  severity: { type: "string" },
                  issue_type: { type: "string" },
                  description: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setAiAnalysis(result);
      setLastAuditTime(Date.now());
      
      toast({
        title: language === 'es' ? '✅ Auditoría completada' : '✅ Audit completed',
        description: language === 'es' 
          ? `Se encontraron ${result.total_issues_found} problemas potenciales.` 
          : `Found ${result.total_issues_found} potential issues.`
      });
    } catch (error) {
      console.error('Error running AI audit:', error);
      
      let errorMessage = language === 'es' 
        ? 'Error al ejecutar la auditoría. Por favor intenta de nuevo más tarde.' 
        : 'Error running audit. Please try again later.';
      
      if (error.message?.includes('429') || error.response?.status === 429) {
        errorMessage = language === 'es'
          ? '⏱️ Límite de tasa alcanzado. Por favor espera 1 minuto e intenta de nuevo.'
          : '⏱️ Rate limit reached. Please wait 1 minute and try again.';
      }
      
      toast({
        title: language === 'es' ? '❌ Error' : '❌ Error',
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <XCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <FileQuestion className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getIssueTypeLabel = (type) => {
    const labels = {
      duplicate: language === 'es' ? 'Duplicado' : 'Duplicate',
      missing_receipt: language === 'es' ? 'Sin Recibo' : 'Missing Receipt',
      unusual_amount: language === 'es' ? 'Monto Inusual' : 'Unusual Amount',
      wrong_category: language === 'es' ? 'Categoría Incorrecta' : 'Wrong Category',
      suspicious: language === 'es' ? 'Sospechoso' : 'Suspicious'
    };
    return labels[type] || type;
  };

  // Calculate cooldown time
  const getCooldownSeconds = () => {
    if (!lastAuditTime) return 0;
    const elapsed = Math.floor((Date.now() - lastAuditTime) / 1000);
    return Math.max(0, 60 - elapsed);
  };

  const cooldownSeconds = getCooldownSeconds();

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Auditoría AI de Gastos' : 'AI Expenses Audit'}
          description={language === 'es' 
            ? 'Análisis automático de gastos para detectar anomalías y mejorar la precisión' 
            : 'Automated expense analysis to detect anomalies and improve accuracy'}
          icon={Sparkles}
        />

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs text-slate-600 dark:text-slate-400">{language === 'es' ? 'Total Gastos' : 'Total Expenses'}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ${stats.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ImageIcon className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-600">{language === 'es' ? 'Con Recibos' : 'With Receipts'}</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.withReceipts}</p>
              <p className="text-xs text-slate-500 mt-1">
                {((stats.withReceipts / stats.total) * 100).toFixed(0)}% {language === 'es' ? 'completo' : 'complete'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-slate-600">{language === 'es' ? 'Analizados AI' : 'AI Analyzed'}</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.aiAnalyzed}</p>
              <p className="text-xs text-slate-500 mt-1">
                {((stats.aiAnalyzed / stats.total) * 100).toFixed(0)}% {language === 'es' ? 'procesado' : 'processed'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs text-slate-600">{language === 'es' ? 'Confianza Promedio' : 'Avg Confidence'}</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.averageConfidence}%</p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.averageConfidence >= 80 
                  ? (language === 'es' ? 'Excelente' : 'Excellent')
                  : stats.averageConfidence >= 60
                  ? (language === 'es' ? 'Bueno' : 'Good')
                  : (language === 'es' ? 'Necesita Revisión' : 'Needs Review')
                }
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-slate-600">{language === 'es' ? 'Requieren Revisión' : 'Needs Review'}</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{stats.needsReview}</p>
              <p className="text-xs text-slate-500 mt-1">
                {((stats.needsReview / stats.total) * 100).toFixed(0)}% {language === 'es' ? 'pendiente' : 'pending'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Audit Button */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 border-purple-500/30 dark:border-purple-500/40 shadow-xl mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  {language === 'es' ? 'Ejecutar Auditoría Completa con IA' : 'Run Full AI Audit'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'es' 
                    ? 'Analiza los gastos del último mes para detectar duplicados, anomalías y errores' 
                    : 'Analyze expenses from last month to detect duplicates, anomalies, and errors'}
                </p>
                {cooldownSeconds > 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⏱️ {language === 'es' ? 'Espera' : 'Wait'} {cooldownSeconds}s {language === 'es' ? 'antes de ejecutar otra auditoría' : 'before running another audit'}
                  </p>
                )}
              </div>
              <Button
                onClick={runAIAudit}
                disabled={analyzing || expenses.length === 0 || cooldownSeconds > 0}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'es' ? 'Analizando...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Iniciar Auditoría' : 'Start Audit'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis Results */}
        {aiAnalysis && (
          <div className="space-y-6 mb-6">
            {/* Overall Score */}
            <Card className="bg-white dark:bg-[#282828] shadow-xl border-slate-200 dark:border-slate-700">
              <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    {language === 'es' ? 'Puntuación de Confianza General' : 'Overall Confidence Score'}
                  </span>
                  <Badge className={`text-lg px-4 py-2 ${
                    aiAnalysis.overall_confidence_score >= 80 
                      ? 'bg-green-500/20 text-green-700 border-green-300'
                      : aiAnalysis.overall_confidence_score >= 60
                      ? 'bg-yellow-500/20 text-yellow-700 border-yellow-300'
                      : 'bg-red-500/20 text-red-700 border-red-300'
                  }`}>
                    {aiAnalysis.overall_confidence_score}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Alert className={`mb-4 ${
                  aiAnalysis.total_issues_found === 0
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <AlertDescription className={
                    aiAnalysis.total_issues_found === 0 ? 'text-green-700' : 'text-amber-700'
                  }>
                    {aiAnalysis.summary}
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{language === 'es' ? 'Problemas Detectados' : 'Issues Found'}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{aiAnalysis.total_issues_found}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{language === 'es' ? 'Gastos Revisados' : 'Expenses Reviewed'}</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{Math.min(expenses.length, 50)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anomalies List */}
            {aiAnalysis.anomalies && aiAnalysis.anomalies.length > 0 && (
              <Card className="bg-white dark:bg-[#282828] shadow-xl border-slate-200 dark:border-slate-700">
                <CardHeader className="border-b border-slate-200 dark:border-slate-700">
                  <CardTitle className="text-slate-900 dark:text-white">
                    {language === 'es' ? 'Anomalías Detectadas' : 'Detected Anomalies'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {aiAnalysis.anomalies.map((anomaly, idx) => {
                      const expense = expenses.find(e => e.id === anomaly.expense_id);
                      
                      return (
                        <div
                          key={idx}
                          className="p-4 bg-slate-50 rounded-lg border-l-4"
                          style={{
                            borderLeftColor: anomaly.severity === 'high' ? '#ef4444' 
                              : anomaly.severity === 'medium' ? '#f59e0b' 
                              : '#3b82f6'
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={getSeverityColor(anomaly.severity)}>
                                <span className="flex items-center gap-1">
                                  {getSeverityIcon(anomaly.severity)}
                                  {anomaly.severity.toUpperCase()}
                                </span>
                              </Badge>
                              <Badge className="bg-slate-200 text-slate-700 border-slate-300">
                                {getIssueTypeLabel(anomaly.issue_type)}
                              </Badge>
                            </div>
                            {expense && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedExpense(expense)}
                                className="text-xs"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                {language === 'es' ? 'Ver Gasto' : 'View Expense'}
                              </Button>
                            )}
                          </div>
                          
                          {expense && (
                            <div className="text-sm text-slate-600 mb-2">
                              <span className="font-medium">{expense.employee_name}</span>
                              {' • '}
                              <span>${expense.amount.toFixed(2)}</span>
                              {' • '}
                              <span>{format(new Date(expense.date), 'MMM dd, yyyy')}</span>
                            </div>
                          )}
                          
                          <p className="text-sm text-slate-700 mb-2">{anomaly.description}</p>
                          
                          <div className="flex items-start gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-blue-900 font-semibold mb-1">
                                {language === 'es' ? 'Recomendación:' : 'Recommendation:'}
                              </p>
                              <p className="text-xs text-blue-700">{anomaly.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Expenses Table with AI Confidence */}
        <Card className="bg-white dark:bg-[#282828] shadow-xl border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="text-slate-900 dark:text-white">
              {language === 'es' ? 'Gastos del Último Mes' : 'Last Month Expenses'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">
                  {language === 'es' ? 'No hay gastos del último mes' : 'No expenses from last month'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                      <TableHead className="text-slate-700 dark:text-slate-300">{language === 'es' ? 'Empleado' : 'Employee'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">{language === 'es' ? 'Fecha' : 'Date'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">{language === 'es' ? 'Categoría' : 'Category'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">{language === 'es' ? 'Monto' : 'Amount'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">{language === 'es' ? 'Recibo' : 'Receipt'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">{language === 'es' ? 'Confianza AI' : 'AI Confidence'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <TableCell className="font-medium text-slate-900 dark:text-white">{expense.employee_name}</TableCell>
                        <TableCell className="text-slate-700 dark:text-slate-300">
                          {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500/20 text-blue-700 border-blue-300">
                            {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-white">
                          ${expense.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {expense.receipt_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setShowReceipt(true);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-700 border-red-300 text-xs">
                              {language === 'es' ? 'Sin recibo' : 'No receipt'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {expense.ai_analyzed ? (
                            <Badge className={
                              expense.ai_confidence >= 80 
                                ? 'bg-green-500/20 text-green-700 border-green-300'
                                : expense.ai_confidence >= 60
                                ? 'bg-yellow-500/20 text-yellow-700 border-yellow-300'
                                : 'bg-red-500/20 text-red-700 border-red-300'
                            }>
                              {expense.ai_confidence}%
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-200 text-slate-600 border-slate-300">
                              {language === 'es' ? 'No analizado' : 'Not analyzed'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <AIExpenseCategorizer
                            expense={expense}
                            onUpdate={() => {}}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipt Preview Dialog */}
        {selectedExpense && (
          <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-slate-900">
                  {language === 'es' ? 'Recibo' : 'Receipt'} - {selectedExpense.employee_name}
                </DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <img
                  src={selectedExpense.receipt_url}
                  alt="Receipt"
                  className="w-full h-auto rounded-lg border border-slate-200"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}