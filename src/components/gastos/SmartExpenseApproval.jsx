import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertTriangle, Brain, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function SmartExpenseApproval({ expense, onAction }) {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const approveMutation = useMutation({
    mutationFn: () => base44.entities.Expense.update(expense.id, { status: 'approved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(language === 'es' ? '✅ Gasto aprobado' : '✅ Expense approved');
      if (onAction) onAction();
    }
  });

  const rejectMutation = useMutation({
    mutationFn: () => base44.entities.Expense.update(expense.id, { status: 'rejected' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(language === 'es' ? '❌ Gasto rechazado' : '❌ Expense rejected');
      if (onAction) onAction();
    }
  });

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = language === 'es'
        ? `Analiza este gasto empresarial y determina si debe ser aprobado:

Descripción: ${expense.description}
Monto: $${expense.amount}
Categoría: ${expense.category}
Fecha: ${expense.date}
Método de pago: ${expense.payment_method}

Proporciona:
1. Recomendación (approve/reject/review)
2. Razón de la recomendación
3. Nivel de confianza (0-100)
4. Alertas o banderas rojas (si existen)

Formato JSON.`
        : `Analyze this business expense and determine if it should be approved:

Description: ${expense.description}
Amount: $${expense.amount}
Category: ${expense.category}
Date: ${expense.date}
Payment method: ${expense.payment_method}

Provide:
1. Recommendation (approve/reject/review)
2. Reason for recommendation
3. Confidence level (0-100)
4. Any red flags or alerts

JSON format.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            recommendation: { type: "string", enum: ["approve", "reject", "review"] },
            reason: { type: "string" },
            confidence: { type: "number" },
            red_flags: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiSuggestion(response);
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error(language === 'es' ? 'Error al analizar' : 'Analysis error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSuggestionColor = (recommendation) => {
    if (recommendation === 'approve') return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (recommendation === 'reject') return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
    return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
  };

  const getSuggestionIcon = (recommendation) => {
    if (recommendation === 'approve') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (recommendation === 'reject') return <XCircle className="w-5 h-5 text-red-600" />;
    return <AlertTriangle className="w-5 h-5 text-amber-600" />;
  };

  return (
    <div className="space-y-4">
      {/* AI Analysis Card */}
      {aiSuggestion && (
        <Card className={`${getSuggestionColor(aiSuggestion.recommendation)} border-2`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {getSuggestionIcon(aiSuggestion.recommendation)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold">
                    {language === 'es' ? 'Recomendación AI' : 'AI Recommendation'}
                  </h4>
                  <Badge className="bg-purple-500 text-white">
                    <Brain className="w-3 h-3 mr-1" />
                    {aiSuggestion.confidence}% {language === 'es' ? 'confianza' : 'confidence'}
                  </Badge>
                </div>
                <p className="text-sm mb-2">{aiSuggestion.reason}</p>
                {aiSuggestion.red_flags?.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-semibold text-red-700">
                      {language === 'es' ? '🚩 Alertas:' : '🚩 Red Flags:'}
                    </p>
                    {aiSuggestion.red_flags.map((flag, idx) => (
                      <p key={idx} className="text-xs text-red-600 ml-4">• {flag}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!aiSuggestion && (
          <Button
            onClick={analyzeWithAI}
            disabled={isAnalyzing}
            variant="outline"
            size="sm"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            {isAnalyzing ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                {language === 'es' ? 'Analizando...' : 'Analyzing...'}
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Analizar con AI' : 'Analyze with AI'}
              </>
            )}
          </Button>
        )}
        <Button
          onClick={() => approveMutation.mutate()}
          disabled={approveMutation.isPending}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Aprobar' : 'Approve'}
        </Button>
        <Button
          onClick={() => rejectMutation.mutate()}
          disabled={rejectMutation.isPending}
          size="sm"
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          <XCircle className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Rechazar' : 'Reject'}
        </Button>
      </div>
    </div>
  );
}