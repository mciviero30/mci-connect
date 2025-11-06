
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Lightbulb,
  Users,
  MapPin,
  DollarSign,
  Clock,
  Target,
  Briefcase,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { toast } from 'react-hot-toast'; // Assuming react-hot-toast is used for notifications

// Placeholder for CustomerForm. In a real application, this would be a separate file,
// e.g., '@/components/CustomerForm'.
function CustomerForm({ onSubmit, onClose, isProcessing, language }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName || !lastName) {
      toast.error(language === 'es' ? 'Nombre y Apellido son requeridos.' : 'First Name and Last Name are required.');
      return;
    }
    onSubmit({ first_name: firstName, last_name: lastName, company, email, phone });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">{language === 'es' ? 'Nombre' : 'First Name'} *</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{language === 'es' ? 'Apellido' : 'Last Name'} *</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">{language === 'es' ? 'Empresa' : 'Company'}</Label>
        <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">{language === 'es' ? 'Teléfono' : 'Phone'}</Label>
        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isProcessing}>
          {language === 'es' ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button type="submit" disabled={isProcessing}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {language === 'es' ? 'Guardar Cliente' : 'Save Customer'}
        </Button>
      </div>
    </form>
  );
}

export default function AIJobWizard({ onComplete, onCancel, existingJob }) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient(); // Initialize useQueryClient
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false); // New state for customer form

  const [jobData, setJobData] = useState(existingJob || {
    name: '',
    description: '',
    address: '',
    customer_name: '',
    contract_amount: 0,
    estimated_hours: 0,
    team_id: '',
    team_name: '',
    status: 'active',
    color: 'blue'
  });

  // Load existing data for pattern analysis
  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date', 100),
    initialData: []
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: []
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('first_name'),
    initialData: []
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date', 50),
    initialData: []
  });

  // New: Customer Creation Mutation
  const createCustomerMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setJobData(prev => ({
        ...prev,
        customer_name: `${newCustomer.first_name} ${newCustomer.last_name}`,
        customer_id: newCustomer.id
      }));
      setShowCustomerForm(false);
      toast.success(language === 'es' ? 'Cliente creado exitosamente' : 'Customer created successfully');
    },
    onError: (error) => {
      console.error("Failed to create customer:", error);
      toast.error(language === 'es' ? `Error al crear cliente: ${error.message}` : `Error creating customer: ${error.message}`);
    }
  });

  // Analyze patterns and get AI suggestions
  const analyzeAndSuggest = async () => {
    setIsAnalyzing(true);
    try {
      // Build context from existing jobs
      const jobPatterns = jobs.slice(0, 20).map(j => ({
        name: j.name,
        description: j.description,
        estimated_hours: j.estimated_hours,
        contract_amount: j.contract_amount,
        team: j.team_name
      }));

      const context = `
Analyzing MCI Connect job creation patterns:

Recent jobs (for pattern analysis):
${JSON.stringify(jobPatterns, null, 2)}

Available teams: ${teams.map(t => t.team_name).join(', ')}
Average contract amount: $${(jobs.reduce((sum, j) => sum + (j.contract_amount || 0), 0) / jobs.length).toFixed(0)}

User input so far:
- Job Name: ${jobData.name || 'Not provided'}
- Description: ${jobData.description || 'Not provided'}
- Address: ${jobData.address || 'Not provided'}
- Customer: ${jobData.customer_name || 'Not provided'}

Task: Based on industry best practices for electrical/HVAC/construction jobs and the patterns in existing jobs, provide intelligent suggestions.

${language === 'es' ? 'Responde en español.' : 'Respond in English.'}
`;

      const prompt = language === 'es'
        ? `${context}\n\nProporciona sugerencias para este proyecto en formato JSON:\n{\n  "suggested_title": "Título profesional sugerido basado en el input",\n  "suggested_description": "Descripción detallada del alcance del trabajo",\n  "estimated_hours": "Horas estimadas basadas en trabajos similares",\n  "suggested_team": "Equipo recomendado",\n  "budget_range": "Rango presupuestario sugerido",\n  "key_considerations": ["consideración 1", "consideración 2", "consideración 3"]\n}`
        : `${context}\n\nProvide suggestions for this project in JSON format:\n{\n  "suggested_title": "Professional title suggestion based on input",\n  "suggested_description": "Detailed work scope description",\n  "estimated_hours": "Estimated hours based on similar jobs",\n  "suggested_team": "Recommended team",\n  "budget_range": "Suggested budget range",\n  "key_considerations": ["consideration 1", "consideration 2", "consideration 3"]\n}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            suggested_title: { type: "string" },
            suggested_description: { type: "string" },
            estimated_hours: { type: "number" },
            suggested_team: { type: "string" },
            budget_range: { type: "string" },
            key_considerations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiSuggestions(response);
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error(language === 'es' ? `Error en el análisis de IA: ${error.message}` : `AI analysis error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze when basic info is provided
  useEffect(() => {
    if (step === 2 && jobData.name && !aiSuggestions) {
      analyzeAndSuggest();
    }
  }, [step, jobData.name, aiSuggestions]);

  const applySuggestion = (field, value) => {
    setJobData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    onComplete(jobData);
  };

  const steps = [
    { number: 1, title: language === 'es' ? 'Información Básica' : 'Basic Information', icon: Briefcase },
    { number: 2, title: language === 'es' ? 'Propuesta de Recurso y Riesgo AI' : 'AI Resource & Risk Proposal', icon: Sparkles },
    { number: 3, title: language === 'es' ? 'Equipo y Recursos' : 'Team & Resources', icon: Users },
    { number: 4, title: language === 'es' ? 'Revisión Final' : 'Final Review', icon: Check }
  ];

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, idx) => (
          <React.Fragment key={s.number}>
            <div className={`flex flex-col items-center ${step >= s.number ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                step >= s.number
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                <s.icon className="w-6 h-6" />
              </div>
              <p className={`text-xs font-medium ${step >= s.number ? 'text-slate-900' : 'text-slate-500'}`}>
                {s.title}
              </p>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded transition-all ${
                step > s.number ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-slate-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Briefcase className="w-5 h-5 text-purple-500" />
                  {language === 'es' ? 'Información Básica del Proyecto' : 'Basic Project Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Nombre del Proyecto' : 'Project Name'} *
                  </Label>
                  <Input
                    value={jobData.name}
                    onChange={(e) => setJobData({ ...jobData, name: e.target.value })}
                    placeholder={language === 'es' ? 'Ej: Instalación Edificio Central' : 'Ex: Central Building Installation'}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Cliente' : 'Customer'}
                  </Label>
                  <div className="flex gap-2">
                    <Select
                      value={jobData.customer_name}
                      onValueChange={(value) => {
                        const customer = customers.find(c => `${c.first_name} ${c.last_name}` === value);
                        setJobData({
                          ...jobData,
                          customer_name: value,
                          customer_id: customer?.id
                        });
                      }}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 flex-1">
                        <SelectValue placeholder={language === 'es' ? 'Seleccionar cliente' : 'Select customer'} />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {customers.map(c => (
                          <SelectItem key={c.id} value={`${c.first_name} ${c.last_name}`}>
                            {c.first_name} {c.last_name} {c.company && `- ${c.company}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* NEW: Quick Create Customer Button */}
                    <Button
                      type="button"
                      onClick={() => setShowCustomerForm(true)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                      size="sm" // Added size for better fit
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {language === 'es' ? 'Nuevo' : 'New'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Dirección del Proyecto' : 'Project Address'}
                  </Label>
                  <Input
                    value={jobData.address}
                    onChange={(e) => setJobData({ ...jobData, address: e.target.value })}
                    placeholder={language === 'es' ? 'Dirección completa' : 'Full address'}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Descripción Breve' : 'Brief Description'}
                  </Label>
                  <Textarea
                    value={jobData.description}
                    onChange={(e) => setJobData({ ...jobData, description: e.target.value })}
                    placeholder={language === 'es' ? 'Descripción general del alcance del trabajo...' : 'General work scope description...'}
                    className="h-24 bg-slate-50 border-slate-200"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: AI Suggestions - RENAMED */}
          {step === 2 && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  {language === 'es' ? 'Propuesta de Recurso y Riesgo AI' : 'AI Resource & Risk Proposal'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
                    <p className="text-slate-600">
                      {language === 'es' ? 'Analizando patrones y generando sugerencias...' : 'Analyzing patterns and generating suggestions...'}
                    </p>
                  </div>
                ) : aiSuggestions ? (
                  <div className="space-y-4">
                    {/* Title Suggestion */}
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-purple-600" />
                          <Label className="text-purple-900 font-semibold">
                            {language === 'es' ? 'Título Sugerido' : 'Suggested Title'}
                          </Label>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => applySuggestion('name', aiSuggestions.suggested_title)}
                          className="text-purple-600 hover:text-purple-700"
                        >
                          {language === 'es' ? 'Aplicar' : 'Apply'}
                        </Button>
                      </div>
                      <p className="text-slate-700 text-sm">{aiSuggestions.suggested_title}</p>
                    </div>

                    {/* Description Suggestion */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-600" />
                          <Label className="text-blue-900 font-semibold">
                            {language === 'es' ? 'Descripción Detallada' : 'Detailed Description'}
                          </Label>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => applySuggestion('description', aiSuggestions.suggested_description)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {language === 'es' ? 'Aplicar' : 'Apply'}
                        </Button>
                      </div>
                      <p className="text-slate-700 text-sm whitespace-pre-wrap">{aiSuggestions.suggested_description}</p>
                    </div>

                    {/* Estimated Hours */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            <Label className="text-green-900 font-semibold">
                              {language === 'es' ? 'Horas Estimadas' : 'Estimated Hours'}
                            </Label>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => applySuggestion('estimated_hours', aiSuggestions.estimated_hours)}
                            className="text-green-600 hover:text-green-700"
                          >
                            {language === 'es' ? 'Aplicar' : 'Apply'}
                          </Button>
                        </div>
                        <p className="text-2xl font-bold text-green-700">{aiSuggestions.estimated_hours}h</p>
                      </div>

                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 text-amber-600" />
                          <Label className="text-amber-900 font-semibold">
                            {language === 'es' ? 'Rango Presupuestario' : 'Budget Range'}
                          </Label>
                        </div>
                        <p className="text-lg font-semibold text-amber-700">{aiSuggestions.budget_range}</p>
                      </div>
                    </div>

                    {/* Key Considerations */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <Label className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        {language === 'es' ? 'Consideraciones Clave' : 'Key Considerations'}
                      </Label>
                      <ul className="space-y-2">
                        {aiSuggestions.key_considerations.map((consideration, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{consideration}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <Button onClick={analyzeAndSuggest} className="w-full bg-gradient-to-r from-purple-500 to-blue-500">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Generar Sugerencias' : 'Generate Suggestions'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Team & Resources */}
          {step === 3 && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Users className="w-5 h-5 text-purple-500" />
                  {language === 'es' ? 'Equipo y Recursos' : 'Team & Resources'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Asignar Equipo' : 'Assign Team'}
                  </Label>
                  <Select
                    value={jobData.team_id}
                    onValueChange={(value) => {
                      const team = teams.find(t => t.id === value);
                      setJobData({
                        ...jobData,
                        team_id: value,
                        team_name: team?.team_name
                      });
                    }}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue placeholder={language === 'es' ? 'Seleccionar equipo' : 'Select team'} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {team.team_name} - {team.location}
                            {team.is_headquarters && <Badge className="ml-2 bg-amber-100 text-amber-700">HQ</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {aiSuggestions?.suggested_team && (
                    <p className="text-xs text-purple-600 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      {language === 'es' ? 'Sugerido' : 'Suggested'}: {aiSuggestions.suggested_team}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">
                      {language === 'es' ? 'Monto del Contrato ($)' : 'Contract Amount ($)'}
                    </Label>
                    <Input
                      type="number"
                      value={jobData.contract_amount}
                      onChange={(e) => setJobData({ ...jobData, contract_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="25000.00"
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700">
                      {language === 'es' ? 'Horas Estimadas' : 'Estimated Hours'}
                    </Label>
                    <Input
                      type="number"
                      value={jobData.estimated_hours}
                      onChange={(e) => setJobData({ ...jobData, estimated_hours: parseFloat(e.target.value) || 0 })}
                      placeholder="120"
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Color del Proyecto' : 'Project Color'}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {['blue', 'green', 'purple', 'pink', 'amber', 'red', 'teal', 'indigo'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setJobData({...jobData, color})}
                        className={`w-10 h-10 rounded-full border-2 transition-transform ${
                          jobData.color === color ? 'border-purple-500 scale-110' : 'border-slate-300'
                        } bg-${color}-500`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Final Review */}
          {step === 4 && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Check className="w-5 h-5 text-green-500" />
                  {language === 'es' ? 'Revisión Final' : 'Final Review'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-500">{language === 'es' ? 'Nombre' : 'Name'}</Label>
                      <p className="font-semibold text-slate-900">{jobData.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">{language === 'es' ? 'Cliente' : 'Customer'}</Label>
                      <p className="text-slate-700">{jobData.customer_name || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">{language === 'es' ? 'Dirección' : 'Address'}</Label>
                      <p className="text-slate-700">{jobData.address || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">{language === 'es' ? 'Equipo' : 'Team'}</Label>
                      <p className="text-slate-700">{jobData.team_name || '-'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-500">{language === 'es' ? 'Monto del Contrato' : 'Contract Amount'}</Label>
                      <p className="font-semibold text-green-600">${jobData.contract_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">{language === 'es' ? 'Horas Estimadas' : 'Estimated Hours'}</Label>
                      <p className="text-slate-700">{jobData.estimated_hours}h</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">{language === 'es' ? 'Estado' : 'Status'}</Label>
                      <Badge className="bg-blue-50 text-blue-700">{language === 'es' ? 'Activo' : 'Active'}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-slate-500">{language === 'es' ? 'Descripción' : 'Description'}</Label>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{jobData.description || '-'}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t border-slate-200">
        <Button
          variant="outline"
          onClick={step === 1 ? onCancel : handleBack}
          className="bg-slate-50 border-slate-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 1 ? (language === 'es' ? 'Cancelar' : 'Cancel') : (language === 'es' ? 'Atrás' : 'Back')}
        </Button>

        <Button
          onClick={step === 4 ? handleComplete : handleNext}
          disabled={step === 1 && !jobData.name}
          className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
        >
          {step === 4 ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Crear Proyecto' : 'Create Project'}
            </>
          ) : (
            <>
              {language === 'es' ? 'Siguiente' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      {/* NEW: Quick Customer Creation Dialog */}
      <Dialog open={showCustomerForm} onOpenChange={setShowCustomerForm}>
        <DialogContent className="max-w-2xl bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-900">
              {language === 'es' ? 'Crear Cliente Rápido' : 'Quick Create Customer'}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSubmit={(data) => createCustomerMutation.mutate(data)}
            onClose={() => setShowCustomerForm(false)}
            isProcessing={createCustomerMutation.isPending}
            language={language} // Pass language prop to CustomerForm
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
