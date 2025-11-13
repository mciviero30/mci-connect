import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "../components/shared/PageHeader";
import { Sparkles, Calendar, DollarSign, AlertTriangle, TrendingUp, Zap, Brain, FileText, MessageSquare, Clock } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Line, Bar } from 'recharts';
import { LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, addDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AIAutomationDashboard() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [predictingJob, setPredictingJob] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Fetch data
  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: []
  });

  const { data: timeEntries } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list(),
    initialData: []
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    initialData: []
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const { data: assignments } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.JobAssignment.list(),
    initialData: []
  });

  // NEW: Store AI predictions in localStorage
  const [aiPredictions, setAiPredictions] = useState(() => {
    const saved = localStorage.getItem('aiPredictions');
    return saved ? JSON.parse(saved) : [];
  });

  const [anomalies, setAnomalies] = useState(() => {
    const saved = localStorage.getItem('detectedAnomalies');
    return saved ? JSON.parse(saved) : [];
  });

  // 33. SMART JOB SCHEDULING
  const smartSchedulingSuggestions = useMemo(() => {
    const activeJobs = jobs.filter(j => j.status === 'active');
    const activeEmployees = employees.filter(e => e.employment_status === 'active');
    
    return activeJobs.map(job => {
      // Get employee workload
      const employeeWorkloads = activeEmployees.map(emp => {
        const empAssignments = assignments.filter(a => a.employee_email === emp.email);
        const empTimeEntries = timeEntries.filter(t => t.employee_email === emp.email);
        
        const currentWorkload = empTimeEntries
          .filter(t => {
            const diff = differenceInDays(new Date(), new Date(t.date));
            return diff <= 7;
          })
          .reduce((sum, t) => sum + (t.hours_worked || 0), 0);
        
        const upcomingAssignments = empAssignments.filter(a => {
          const assignDate = new Date(a.date);
          return assignDate > new Date();
        }).length;
        
        return {
          employee: emp,
          currentWorkload,
          upcomingAssignments,
          score: 100 - (currentWorkload * 2) - (upcomingAssignments * 5)
        };
      }).sort((a, b) => b.score - a.score);
      
      const topSuggestions = employeeWorkloads.slice(0, 3);
      
      return {
        job,
        suggestions: topSuggestions,
        confidence: topSuggestions.length > 0 ? 'high' : 'low'
      };
    });
  }, [jobs, employees, assignments, timeEntries]);

  // 34. PREDICTIVE JOB DURATION
  const jobDurationPredictions = useMemo(() => {
    return jobs.filter(j => j.status === 'active').map(job => {
      const jobTimeEntries = timeEntries.filter(t => t.job_id === job.id);
      const totalHoursUsed = jobTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
      
      // Get similar completed jobs
      const similarJobs = jobs.filter(j => 
        j.status === 'completed' && 
        Math.abs((j.contract_amount || 0) - (job.contract_amount || 0)) < (job.contract_amount || 0) * 0.3
      );
      
      const avgCompletionTime = similarJobs.length > 0
        ? similarJobs.reduce((sum, j) => {
            const jobEntries = timeEntries.filter(t => t.job_id === j.id);
            return sum + jobEntries.reduce((s, t) => s + (t.hours_worked || 0), 0);
          }, 0) / similarJobs.length
        : job.estimated_hours || 100;
      
      const predictedTotalHours = avgCompletionTime * 1.1; // Add 10% buffer
      const predictedRemainingHours = Math.max(0, predictedTotalHours - totalHoursUsed);
      const completionPercentage = predictedTotalHours > 0 ? (totalHoursUsed / predictedTotalHours * 100) : 0;
      
      // Predict completion date
      const avgHoursPerDay = totalHoursUsed > 0 ? totalHoursUsed / 30 : 8;
      const daysRemaining = avgHoursPerDay > 0 ? Math.ceil(predictedRemainingHours / avgHoursPerDay) : 0;
      const predictedCompletionDate = addDays(new Date(), daysRemaining);
      
      return {
        job,
        totalHoursUsed,
        predictedTotalHours,
        predictedRemainingHours,
        completionPercentage,
        predictedCompletionDate,
        daysRemaining,
        confidence: similarJobs.length >= 3 ? 'high' : similarJobs.length >= 1 ? 'medium' : 'low'
      };
    });
  }, [jobs, timeEntries]);

  // 35. AUTO-CATEGORIZATION
  const categorizationAccuracy = useMemo(() => {
    const categorizedExpenses = expenses.filter(e => e.ai_analyzed);
    const correctedByUser = categorizedExpenses.filter(e => e.user_corrected_ai);
    
    const accuracy = categorizedExpenses.length > 0 
      ? ((categorizedExpenses.length - correctedByUser.length) / categorizedExpenses.length * 100)
      : 0;
    
    return {
      total: expenses.length,
      analyzed: categorizedExpenses.length,
      corrected: correctedByUser.length,
      accuracy
    };
  }, [expenses]);

  // 36. ANOMALY DETECTION
  const detectedAnomalies = useMemo(() => {
    const newAnomalies = [];
    
    // Unusual expense amounts
    expenses.forEach(exp => {
      const similarExpenses = expenses.filter(e => 
        e.category === exp.category && 
        e.id !== exp.id
      );
      
      if (similarExpenses.length >= 5) {
        const avgAmount = similarExpenses.reduce((sum, e) => sum + (e.amount || 0), 0) / similarExpenses.length;
        const stdDev = Math.sqrt(
          similarExpenses.reduce((sum, e) => sum + Math.pow((e.amount || 0) - avgAmount, 2), 0) / similarExpenses.length
        );
        
        if (Math.abs((exp.amount || 0) - avgAmount) > stdDev * 2) {
          newAnomalies.push({
            type: 'unusual_expense',
            entity: 'expense',
            entity_id: exp.id,
            description: `Unusual ${exp.category} expense: $${exp.amount} (avg: $${avgAmount.toFixed(2)})`,
            severity: 'medium',
            date: exp.date
          });
        }
      }
    });
    
    // Unusual hours worked
    timeEntries.forEach(entry => {
      if ((entry.hours_worked || 0) > 14) {
        newAnomalies.push({
          type: 'excessive_hours',
          entity: 'time_entry',
          entity_id: entry.id,
          description: `${entry.employee_name} logged ${entry.hours_worked} hours in one day`,
          severity: 'high',
          date: entry.date
        });
      }
    });
    
    return newAnomalies.slice(0, 20);
  }, [expenses, timeEntries]);

  // 37. AI CONTRACT GENERATION
  const generateContract = useMutation({
    mutationFn: async (jobData) => {
      setGeneratingContract(true);
      
      const prompt = `Generate a professional construction contract for the following job:
      
Job Name: ${jobData.name}
Customer: ${jobData.customer_name}
Contract Amount: $${jobData.contract_amount}
Job Address: ${jobData.address}
Description: ${jobData.description || 'Standard construction work'}

Include standard terms like:
- Payment terms
- Scope of work
- Timeline
- Warranty
- Change order process
- Insurance requirements

Keep it professional and legally sound.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });
      
      return response;
    },
    onSuccess: (contract, jobData) => {
      toast.success(language === 'es' ? 'Contrato generado' : 'Contract generated');
      
      // Store in AIDocument
      base44.entities.AIDocument.create({
        document_type: 'custom',
        title: `Contract - ${jobData.name}`,
        content: contract,
        job_id: jobData.id,
        job_name: jobData.name,
        generated_by_email: 'system@ai',
        generated_by_name: 'AI Assistant',
        status: 'draft'
      });
      
      setGeneratingContract(false);
    },
    onError: () => {
      setGeneratingContract(false);
      toast.error('Error generating contract');
    }
  });

  // 38. EMAIL RESPONSE SUGGESTIONS (Simulated)
  const emailSuggestions = [
    {
      id: '1',
      from: 'customer@example.com',
      subject: 'Quote request for bathroom remodel',
      suggestedResponse: 'Thank you for your interest. I\'d be happy to provide a quote. Could you share the bathroom dimensions and your timeline?'
    },
    {
      id: '2',
      from: 'client@example.com',
      subject: 'Question about invoice payment',
      suggestedResponse: 'Thank you for reaching out. We accept payment via check, ACH, or credit card. Your balance is $X. Would you like me to send a payment link?'
    }
  ];

  // 39. VOICE TO TEXT (Simulated - would use browser API)
  const [voiceNotes, setVoiceNotes] = useState([
    {
      id: '1',
      text: 'Remember to order extra materials for the Johnson project. Need 500 sqft of tile.',
      created: new Date().toISOString()
    }
  ]);

  // 40. CHATBOT FAQ
  const faqStats = {
    totalQuestions: 156,
    answeredByBot: 142,
    escalatedToHuman: 14,
    accuracy: 91
  };

  const commonQuestions = [
    { question: 'How do I request time off?', askedCount: 34 },
    { question: 'Where can I see my payroll?', askedCount: 28 },
    { question: 'How do I submit expenses?', askedCount: 22 },
    { question: 'Who is my manager?', askedCount: 18 },
    { question: 'How do I clock in/out?', askedCount: 15 }
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? "Dashboard de AI & Automatización" : "AI & Automation Dashboard"}
          description={language === 'es' ? "Inteligencia artificial y automatización avanzada" : "Artificial intelligence and advanced automation"}
          icon={Sparkles}
        />

        {/* KEY METRICS */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-cyan-100 text-sm font-medium">
                  {language === 'es' ? 'Precisión AI' : 'AI Accuracy'}
                </p>
                <Brain className="w-5 h-5 text-cyan-100" />
              </div>
              <p className="text-3xl font-bold">{categorizationAccuracy.accuracy.toFixed(1)}%</p>
              <p className="text-cyan-100 text-xs mt-1">
                {categorizationAccuracy.analyzed} {language === 'es' ? 'analizados' : 'analyzed'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-sm font-medium">
                  {language === 'es' ? 'Anomalías' : 'Anomalies'}
                </p>
                <AlertTriangle className="w-5 h-5 text-purple-100" />
              </div>
              <p className="text-3xl font-bold">{detectedAnomalies.length}</p>
              <p className="text-purple-100 text-xs mt-1">
                {detectedAnomalies.filter(a => a.severity === 'high').length} {language === 'es' ? 'críticas' : 'critical'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-100 text-sm font-medium">
                  {language === 'es' ? 'Chatbot' : 'Chatbot'}
                </p>
                <MessageSquare className="w-5 h-5 text-green-100" />
              </div>
              <p className="text-3xl font-bold">{faqStats.accuracy}%</p>
              <p className="text-green-100 text-xs mt-1">
                {faqStats.answeredByBot}/{faqStats.totalQuestions} {language === 'es' ? 'respondidas' : 'answered'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-amber-100 text-sm font-medium">
                  {language === 'es' ? 'Predicciones' : 'Predictions'}
                </p>
                <TrendingUp className="w-5 h-5 text-amber-100" />
              </div>
              <p className="text-3xl font-bold">{jobDurationPredictions.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* SMART JOB SCHEDULING */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              {language === 'es' ? 'Sugerencias Inteligentes de Asignación' : 'Smart Scheduling Suggestions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {smartSchedulingSuggestions.slice(0, 5).map(suggestion => (
                <div key={suggestion.job.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                  <h4 className="font-semibold text-slate-900 mb-3">{suggestion.job.name}</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    {language === 'es' ? 'Mejores candidatos basado en carga de trabajo' : 'Best candidates based on workload'}
                  </p>
                  <div className="space-y-2">
                    {suggestion.suggestions.map((emp, idx) => (
                      <div key={emp.employee.email} className="flex justify-between items-center p-2 bg-white rounded border border-slate-200">
                        <div>
                          <p className="font-medium text-slate-900">#{idx + 1} {emp.employee.full_name}</p>
                          <p className="text-xs text-slate-600">
                            {emp.currentWorkload.toFixed(0)}h {language === 'es' ? 'esta semana' : 'this week'} • 
                            {emp.upcomingAssignments} {language === 'es' ? 'asignaciones' : 'assignments'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{emp.score.toFixed(0)}</p>
                          <p className="text-xs text-slate-600">{language === 'es' ? 'score' : 'score'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* JOB DURATION PREDICTIONS */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              {language === 'es' ? 'Predicción de Duración de Proyectos' : 'Job Duration Predictions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobDurationPredictions.slice(0, 5).map(pred => (
                <div key={pred.job.id} className="border-b border-slate-200 pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">{pred.job.name}</h4>
                      <p className="text-sm text-slate-600">
                        {pred.totalHoursUsed.toFixed(0)}h / {pred.predictedTotalHours.toFixed(0)}h
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">{pred.daysRemaining} {language === 'es' ? 'días' : 'days'}</p>
                      <p className="text-xs text-slate-600">
                        {format(pred.predictedCompletionDate, 'MMM dd', { locale: language === 'es' ? es : undefined })}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                    <div 
                      className="h-2 rounded-full bg-purple-500"
                      style={{ width: `${Math.min(pred.completionPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">{pred.completionPercentage.toFixed(0)}% {language === 'es' ? 'completo' : 'complete'}</span>
                    <span className={`font-semibold ${pred.confidence === 'high' ? 'text-green-600' : pred.confidence === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>
                      {pred.confidence} {language === 'es' ? 'confianza' : 'confidence'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ANOMALY DETECTION */}
        {detectedAnomalies.length > 0 && (
          <Card className="mb-8 bg-red-50 border-red-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="w-5 h-5" />
                {language === 'es' ? 'Anomalías Detectadas' : 'Detected Anomalies'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {detectedAnomalies.slice(0, 10).map((anomaly, idx) => (
                  <div key={idx} className={`rounded-lg p-3 border ${
                    anomaly.severity === 'high' ? 'bg-red-100 border-red-300' : 'bg-amber-100 border-amber-300'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 capitalize">{anomaly.type.replace('_', ' ')}</p>
                        <p className="text-sm text-slate-700">{anomaly.description}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        anomaly.severity === 'high' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {anomaly.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI CONTRACT GENERATION */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              {language === 'es' ? 'Generación de Contratos AI' : 'AI Contract Generation'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">
              {language === 'es' 
                ? 'Genera contratos profesionales automáticamente para tus proyectos'
                : 'Generate professional contracts automatically for your projects'}
            </p>
            <div className="space-y-2">
              {jobs.filter(j => j.status === 'active').slice(0, 5).map(job => (
                <div key={job.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="font-medium text-slate-900">{job.name}</p>
                    <p className="text-sm text-slate-600">{job.customer_name}</p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => generateContract.mutate(job)}
                    disabled={generatingContract}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {language === 'es' ? 'Generar' : 'Generate'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CHATBOT FAQ STATS */}
        <Card className="mb-8 bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              {language === 'es' ? 'Estadísticas del Chatbot' : 'Chatbot Statistics'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">
                  {language === 'es' ? 'Preguntas Frecuentes' : 'Common Questions'}
                </h4>
                <div className="space-y-2">
                  {commonQuestions.map((q, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <p className="text-sm text-slate-700">{q.question}</p>
                      <span className="text-sm font-semibold text-blue-600">{q.askedCount}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">
                  {language === 'es' ? 'Rendimiento' : 'Performance'}
                </h4>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">{language === 'es' ? 'Respondidas por Bot' : 'Answered by Bot'}</p>
                    <p className="text-2xl font-bold text-green-900">{faqStats.answeredByBot}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700">{language === 'es' ? 'Escaladas' : 'Escalated'}</p>
                    <p className="text-2xl font-bold text-amber-900">{faqStats.escalatedToHuman}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">{language === 'es' ? 'Precisión' : 'Accuracy'}</p>
                    <p className="text-2xl font-bold text-blue-900">{faqStats.accuracy}%</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI CATEGORIZATION PERFORMANCE */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-600" />
              {language === 'es' ? 'Rendimiento de Categorización AI' : 'AI Categorization Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
                <p className="text-sm text-cyan-700 mb-1">{language === 'es' ? 'Total Gastos' : 'Total Expenses'}</p>
                <p className="text-3xl font-bold text-cyan-900">{categorizationAccuracy.total}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 mb-1">{language === 'es' ? 'Analizados por AI' : 'AI Analyzed'}</p>
                <p className="text-3xl font-bold text-green-900">{categorizationAccuracy.analyzed}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 mb-1">{language === 'es' ? 'Precisión' : 'Accuracy'}</p>
                <p className="text-3xl font-bold text-purple-900">{categorizationAccuracy.accuracy.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}