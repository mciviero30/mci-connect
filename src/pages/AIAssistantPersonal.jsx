import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/shared/PageHeader";
import { Brain, MessageSquare, Mic, FileText, Sparkles, Send } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

export default function AIAssistantPersonal() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [voiceNotes, setVoiceNotes] = useState([
    {
      id: '1',
      text: language === 'es' 
        ? 'Recordar ordenar materiales extra para el proyecto Johnson. Necesito 500 sqft de azulejos.'
        : 'Remember to order extra materials for the Johnson project. Need 500 sqft of tile.',
      created: new Date().toISOString()
    }
  ]);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const askAIMutation = useMutation({
    mutationFn: async (query) => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a helpful assistant for MCI Connect employees. Answer this question: ${query}`,
        add_context_from_internet: false
      });
      return response;
    },
    onSuccess: (response, query) => {
      setChatHistory([...chatHistory, 
        { role: 'user', content: query },
        { role: 'assistant', content: response }
      ]);
      setQuestion('');
      toast.success(language === 'es' ? 'Respuesta recibida' : 'Response received');
    },
    onError: () => {
      toast.error(language === 'es' ? 'Error al procesar' : 'Error processing');
    }
  });

  const commonQuestions = [
    { 
      question: language === 'es' ? '¿Cómo solicito tiempo libre?' : 'How do I request time off?',
      answer: language === 'es' 
        ? 'Puedes solicitar tiempo libre desde el Dashboard haciendo clic en "Solicitar Tiempo Libre" o yendo a la sección de Calendario.'
        : 'You can request time off from the Dashboard by clicking "Request Time Off" or going to the Calendar section.'
    },
    { 
      question: language === 'es' ? '¿Dónde veo mi nómina?' : 'Where can I see my payroll?',
      answer: language === 'es'
        ? 'Puedes ver tu nómina en la sección "Mi Nómina" del menú. Allí encontrarás tu historial de pagos.'
        : 'You can see your payroll in the "My Payroll" section of the menu. There you\'ll find your payment history.'
    },
    { 
      question: language === 'es' ? '¿Cómo registro mis gastos?' : 'How do I submit expenses?',
      answer: language === 'es'
        ? 'Ve a "Mis Gastos" en el menú, haz clic en "Nuevo Gasto", sube tu recibo y completa los detalles.'
        : 'Go to "My Expenses" in the menu, click "New Expense", upload your receipt and complete the details.'
    },
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={language === 'es' ? "Mi Asistente AI" : "My AI Assistant"}
          description={language === 'es' ? "Tu asistente personal inteligente" : "Your personal intelligent assistant"}
          icon={Brain}
        />

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Chat Assistant */}
          <Card className="bg-white/90 shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                {language === 'es' ? 'Chat con AI' : 'Chat with AI'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-blue-50 text-blue-900 ml-8' 
                      : 'bg-slate-50 text-slate-900 mr-8'
                  }`}>
                    <p className="text-sm font-semibold mb-1">
                      {msg.role === 'user' ? (language === 'es' ? 'Tú' : 'You') : 'AI'}
                    </p>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))}
                {chatHistory.length === 0 && (
                  <p className="text-slate-500 text-center py-8">
                    {language === 'es' ? 'Hazme una pregunta' : 'Ask me anything'}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={language === 'es' ? 'Escribe tu pregunta...' : 'Type your question...'}
                  className="flex-1"
                  rows={2}
                />
                <Button 
                  onClick={() => askAIMutation.mutate(question)}
                  disabled={!question || askAIMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {askAIMutation.isPending ? (
                    <Sparkles className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Voice Notes */}
          <Card className="bg-white/90 shadow-lg border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-purple-600" />
                {language === 'es' ? 'Notas de Voz' : 'Voice Notes'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-4">
                {voiceNotes.map(note => (
                  <div key={note.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-slate-900">{note.text}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(note.created).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <Button className="w-full bg-purple-600 hover:bg-purple-700">
                <Mic className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Nueva Nota de Voz' : 'New Voice Note'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Common Questions */}
        <Card className="bg-white/90 shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              {language === 'es' ? 'Preguntas Frecuentes' : 'Common Questions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commonQuestions.map((faq, idx) => (
                <div key={idx} className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <p className="font-semibold text-slate-900 mb-2">{faq.question}</p>
                  <p className="text-sm text-slate-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}