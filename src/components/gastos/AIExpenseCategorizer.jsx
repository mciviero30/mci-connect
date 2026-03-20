import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Check, X, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function AIExpenseCategorizer({ 
  description, 
  amount, 
  currentCategory,
  onCategorySelect,
  disabled = true  // AI Feature disabled to save integration credits
}) {
  const { t, language } = useLanguage();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const categoryLabels = {
    travel: t('travel'),
    meals: t('meals'),
    transport: t('transport'),
    supplies: t('supplies'),
    client_entertainment: t('client_entertainment'),
    equipment: t('equipment'),
    per_diem: t('per_diem'),
    other: t('other')
  };

  const analyzeExpense = async () => {
    if (!description || description.length < 3) {
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = language === 'es' 
        ? `Analiza este gasto y sugiere la mejor categoría.

Descripción: "${description}"
Monto: $${amount || 0}

Categorías disponibles:
- travel: Viajes (vuelos, hoteles, alquiler de autos)
- meals: Comidas (restaurantes, comida)
- transport: Transporte (gasolina, peajes, uber)
- supplies: Suministros (materiales, herramientas pequeñas)
- client_entertainment: Entretenimiento de cliente (cenas con clientes, eventos)
- equipment: Equipo (herramientas, maquinaria)
- per_diem: Per Diem (viáticos diarios)
- other: Otro (cualquier otra cosa)

Responde con la categoría más apropiada, nivel de confianza (0-100), y una breve explicación en español.`
        : `Analyze this expense and suggest the best category.

Description: "${description}"
Amount: $${amount || 0}

Available categories:
- travel: Travel (flights, hotels, car rental)
- meals: Meals (restaurants, food)
- transport: Transport (gas, tolls, uber)
- supplies: Supplies (materials, small tools)
- client_entertainment: Client Entertainment (client dinners, events)
- equipment: Equipment (tools, machinery)
- per_diem: Per Diem (daily allowances)
- other: Other (anything else)

Respond with the most appropriate category, confidence level (0-100), and a brief explanation.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            category: { 
              type: "string",
              enum: ["travel", "meals", "transport", "supplies", "client_entertainment", "equipment", "per_diem", "other"]
            },
            confidence: { type: "number" },
            explanation: { type: "string" }
          }
        }
      });

      if (response.category) {
        setSuggestion({
          category: response.category,
          confidence: Math.round(response.confidence || 0),
          explanation: response.explanation
        });
        setHasAnalyzed(true);
      }
    } catch (err) {
      console.error('AI categorization error:', err);
      setError(language === 'es' 
        ? 'Error al analizar el gasto. Por favor, selecciona la categoría manualmente.' 
        : 'Error analyzing expense. Please select category manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze when description changes (debounced)
  useEffect(() => {
    if (!description || disabled || hasAnalyzed) return;
    
    const timer = setTimeout(() => {
      analyzeExpense();
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timer);
  }, [description, amount]);

  const handleAcceptSuggestion = () => {
    if (suggestion) {
      onCategorySelect(suggestion.category, {
        ai_suggested_category: suggestion.category,
        ai_confidence: suggestion.confidence,
        ai_analyzed: true,
        user_corrected_ai: false
      });
      setSuggestion(null);
    }
  };

  const handleRejectSuggestion = () => {
    setSuggestion(null);
    // User will manually select, which will be tracked as correction
  };

  const handleReanalyze = () => {
    setHasAnalyzed(false);
    setSuggestion(null);
    analyzeExpense();
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'from-green-500 to-emerald-500';
    if (confidence >= 60) return 'from-blue-500 to-cyan-500';
    if (confidence >= 40) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 80) return language === 'es' ? 'Alta confianza' : 'High confidence';
    if (confidence >= 60) return language === 'es' ? 'Confianza media' : 'Medium confidence';
    if (confidence >= 40) return language === 'es' ? 'Confianza baja' : 'Low confidence';
    return language === 'es' ? 'Muy baja confianza' : 'Very low confidence';
  };

  if (disabled) return null;

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-blue-50 border-blue-200">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-700">
                <Sparkles className="w-4 h-4 inline mr-1" />
                {language === 'es' ? 'Analizando gasto con AI...' : 'Analyzing expense with AI...'}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {suggestion && !isAnalyzing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Alert className={`bg-gradient-to-r ${getConfidenceColor(suggestion.confidence)} bg-opacity-10 border-2`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${getConfidenceColor(suggestion.confidence)}`}>
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-bold text-slate-900">
                      {language === 'es' ? 'Sugerencia de AI' : 'AI Suggestion'}
                    </p>
                    <Badge className={`bg-gradient-to-r ${getConfidenceColor(suggestion.confidence)} text-white`}>
                      {suggestion.confidence}% {getConfidenceLabel(suggestion.confidence)}
                    </Badge>
                  </div>
                  
                  <p className="text-slate-700 text-sm mb-2">
                    <strong>{language === 'es' ? 'Categoría sugerida:' : 'Suggested category:'}</strong>{' '}
                    <span className="font-semibold">{categoryLabels[suggestion.category]}</span>
                  </p>
                  
                  <p className="text-slate-600 text-xs mb-3">
                    {suggestion.explanation}
                  </p>

                  {suggestion.confidence < 60 && (
                    <div className="flex items-center gap-1 text-amber-600 text-xs mb-2">
                      <AlertTriangle className="w-3 h-3" />
                      {language === 'es' 
                        ? 'Confianza baja - verifica esta sugerencia' 
                        : 'Low confidence - please verify this suggestion'}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleAcceptSuggestion}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      {language === 'es' ? 'Aceptar' : 'Accept'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleRejectSuggestion}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      <X className="w-4 h-4 mr-1" />
                      {language === 'es' ? 'Rechazar' : 'Reject'}
                    </Button>
                  </div>
                </div>
              </div>
            </Alert>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {hasAnalyzed && !suggestion && !isAnalyzing && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleReanalyze}
          className="border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Reanalizar con AI' : 'Reanalyze with AI'}
        </Button>
      )}
    </div>
  );
}