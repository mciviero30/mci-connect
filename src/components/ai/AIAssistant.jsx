import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  TrendingUp,
  DollarSign,
  Clock,
  Briefcase,
  FileText,
  Users,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';

export default function AIAssistant({ currentPage, pageContext = {} }) {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Welcome message when opening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMsg = language === 'es' 
        ? `¡Hola ${user?.first_name || 'Usuario'}! 👋 Soy tu asistente de IA para MCI Connect. Puedo ayudarte con:\n\n• Responder preguntas sobre funciones\n• Resumir reportes y rendimiento\n• Crear entradas de trabajo, gastos y facturas\n• Analizar datos y sugerir mejoras\n\n¿En qué puedo ayudarte hoy?`
        : `Hi ${user?.first_name || 'User'}! 👋 I'm your AI assistant for MCI Connect. I can help you:\n\n• Answer questions about features\n• Summarize reports and performance\n• Create jobs, expenses, and invoices\n• Analyze data and suggest improvements\n\nWhat can I help you with today?`;
      
      setMessages([{
        role: 'assistant',
        content: welcomeMsg,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, user, language]);

  // Quick action suggestions based on current page
  const getQuickActions = () => {
    const actions = {
      Dashboard: [
        { icon: TrendingUp, text: language === 'es' ? 'Resumir mi desempeño esta semana' : 'Summarize my performance this week', prompt: 'Summarize my performance this week' },
        { icon: Clock, text: language === 'es' ? 'Cuántas horas he trabajado?' : 'How many hours have I worked?', prompt: 'How many hours have I worked this week?' },
        { icon: DollarSign, text: language === 'es' ? 'Estimado de pago semanal' : 'Weekly pay estimate', prompt: 'Estimate my weekly pay' }
      ],
      Trabajos: [
        { icon: Briefcase, text: language === 'es' ? 'Crear nuevo trabajo' : 'Create new job', prompt: 'Help me create a new job' },
        { icon: TrendingUp, text: language === 'es' ? 'Analizar rendimiento de trabajos' : 'Analyze job performance', prompt: 'Analyze job performance and efficiency' },
        { icon: Lightbulb, text: language === 'es' ? 'Sugerir mejoras' : 'Suggest improvements', prompt: 'Suggest improvements for our job management' }
      ],
      Gastos: [
        { icon: FileText, text: language === 'es' ? 'Crear nuevo gasto' : 'Create new expense', prompt: 'Help me create a new expense' },
        { icon: DollarSign, text: language === 'es' ? 'Resumen de gastos del mes' : 'Monthly expense summary', prompt: 'Summarize my expenses this month' },
        { icon: TrendingUp, text: language === 'es' ? 'Identificar ahorros potenciales' : 'Identify potential savings', prompt: 'Identify potential cost savings in our expenses' }
      ],
      Reportes: [
        { icon: TrendingUp, text: language === 'es' ? 'Analizar tendencias' : 'Analyze trends', prompt: 'Analyze financial and operational trends' },
        { icon: Lightbulb, text: language === 'es' ? 'Insights de rentabilidad' : 'Profitability insights', prompt: 'Provide insights on profitability and efficiency' },
        { icon: DollarSign, text: language === 'es' ? 'Proyección de ingresos' : 'Revenue projection', prompt: 'Project revenue based on current trends' }
      ],
      Empleados: [
        { icon: Users, text: language === 'es' ? 'Analizar productividad del equipo' : 'Analyze team productivity', prompt: 'Analyze team productivity and performance' },
        { icon: TrendingUp, text: language === 'es' ? 'Identificar top performers' : 'Identify top performers', prompt: 'Who are our top performing employees?' },
        { icon: Lightbulb, text: language === 'es' ? 'Sugerencias de mejora' : 'Improvement suggestions', prompt: 'Suggest team improvements' }
      ]
    };

    return actions[currentPage] || [
      { icon: Sparkles, text: language === 'es' ? 'Qué puedes hacer?' : 'What can you do?', prompt: 'What features can you help me with?' },
      { icon: TrendingUp, text: language === 'es' ? 'Resumen general' : 'General overview', prompt: 'Give me a general overview of the app' },
      { icon: Lightbulb, text: language === 'es' ? 'Tips y consejos' : 'Tips and advice', prompt: 'Give me tips on using MCI Connect effectively' }
    ];
  };

  const buildContext = async (userMessage) => {
    let context = `Current page: ${currentPage}\nUser role: ${user?.role}\nUser name: ${user?.full_name}\n\n`;

    if (pageContext.jobs) {
      context += `Active jobs: ${pageContext.jobs.length}\n`;
    }
    if (pageContext.expenses) {
      context += `Pending expenses: ${pageContext.expenses.filter(e => e.status === 'pending').length}\n`;
    }
    if (pageContext.timeEntries) {
      const weekHours = pageContext.timeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      context += `Hours worked this week: ${weekHours.toFixed(1)}\n`;
    }

    const lowerMsg = userMessage.toLowerCase();
    
    if (lowerMsg.includes('create') || lowerMsg.includes('crear') || lowerMsg.includes('new') || lowerMsg.includes('nuevo')) {
      context += `\nUser wants to create something. Provide a step-by-step guide or ask for required information.`;
    }
    
    if (lowerMsg.includes('summary') || lowerMsg.includes('resumen') || lowerMsg.includes('analyze') || lowerMsg.includes('analizar')) {
      context += `\nUser wants analysis or summary. Provide data-driven insights.`;
    }

    return context;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      const context = await buildContext(userMessage);
      
      const systemPrompt = language === 'es'
        ? `Eres un asistente de IA útil para MCI Connect, un sistema de gestión empresarial. Ayudas a los usuarios con:
- Responder preguntas sobre funciones de la app
- Resumir reportes y datos de rendimiento
- Asistir en crear trabajos, gastos, facturas
- Analizar datos y sugerir mejoras de eficiencia y ahorro de costos

Responde de manera clara, concisa y útil. Si necesitas información adicional, pregunta. Si el usuario quiere crear algo, guíalo paso a paso.

Contexto actual:
${context}

Pregunta del usuario: ${userMessage}`
        : `You are a helpful AI assistant for MCI Connect, a business management system. You help users with:
- Answering questions about app features
- Summarizing reports and performance data
- Assisting in creating jobs, expenses, invoices
- Analyzing data and suggesting efficiency improvements and cost savings

Respond in a clear, concise, and helpful manner. If you need more information, ask. If the user wants to create something, guide them step by step.

Current context:
${context}

User question: ${userMessage}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        add_context_from_internet: false
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: language === 'es' 
          ? '❌ Lo siento, ocurrió un error. Por favor intenta de nuevo.'
          : '❌ Sorry, an error occurred. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt) => {
    setInput(prompt);
    setTimeout(() => handleSendMessage(), 100);
  };

  // CRITICAL FIX: Always show for all users (remove any permission checks)
  return (
    <>
      {/* Floating Action Button - ALWAYS VISIBLE */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-[45]"
          >
            <Button
              onClick={() => {
                console.log('✨ AI Assistant: Opening chat');
                setIsOpen(true);
              }}
              size="lg"
              className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-2xl shadow-purple-500/50 group hover:scale-110 transition-transform"
            >
              <Sparkles className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </Button>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-full right-0 mb-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap shadow-lg pointer-events-none"
            >
              {language === 'es' ? '¡Pregúntame algo!' : 'Ask me anything!'}
              <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[45] w-[380px] max-w-[calc(100vw-48px)]"
          >
            <Card className="shadow-2xl border-slate-200 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    <CardTitle className="text-base">
                      {language === 'es' ? 'Asistente IA' : 'AI Assistant'}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      console.log('✨ AI Assistant: Closing chat');
                      setIsOpen(false);
                    }}
                    className="text-white hover:bg-white/20 h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {/* Messages */}
                <div
                  ref={chatContainerRef}
                  className="h-[400px] overflow-y-auto p-4 space-y-4 bg-slate-50"
                >
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                            : 'bg-white border border-slate-200 text-slate-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-purple-100' : 'text-slate-400'}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {messages.length <= 1 && (
                  <div className="p-4 bg-white border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2 font-medium">
                      {language === 'es' ? 'Acciones rápidas:' : 'Quick actions:'}
                    </p>
                    <div className="space-y-2">
                      {getQuickActions().slice(0, 3).map((action, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAction(action.prompt)}
                          className="w-full justify-start text-xs bg-slate-50 hover:bg-slate-100 border-slate-200"
                        >
                          <action.icon className="w-3.5 h-3.5 mr-2 text-purple-500" />
                          {action.text}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input */}
                <div className="p-4 bg-white border-t border-slate-200">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={language === 'es' ? 'Escribe tu mensaje...' : 'Type your message...'}
                      className="flex-1 bg-slate-50 border-slate-200"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!input.trim() || isLoading}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}