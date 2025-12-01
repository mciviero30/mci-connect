import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  Download, 
  Send, 
  Edit, 
  Trash2,
  FileCheck,
  AlertTriangle,
  Briefcase,
  TrendingUp,
  FileWarning,
  Save
} from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

const DOCUMENT_TYPES = {
  offer_letter: {
    label: 'Carta de Oferta',
    icon: FileCheck,
    color: 'from-green-500 to-emerald-500',
    description: 'Carta de oferta de empleo basada en rol y salario'
  },
  performance_review: {
    label: 'Evaluación de Desempeño',
    icon: TrendingUp,
    color: 'from-blue-500 to-cyan-500',
    description: 'Resumen de evaluación basado en datos y feedback'
  },
  project_proposal: {
    label: 'Propuesta de Proyecto',
    icon: Briefcase,
    color: 'from-purple-500 to-pink-500',
    description: 'Propuesta basada en datos de trabajos'
  },
  status_report: {
    label: 'Reporte de Estado',
    icon: FileText,
    color: 'from-amber-500 to-orange-500',
    description: 'Reporte de progreso basado en registros de tiempo'
  },
  warning_letter: {
    label: 'Carta de Advertencia',
    icon: FileWarning,
    color: 'from-red-500 to-orange-500',
    description: 'Advertencia formal para empleado'
  },
  custom: {
    label: 'Documento Personalizado',
    icon: FileText,
    color: 'from-slate-500 to-slate-600',
    description: 'Documento personalizado con tu contexto'
  }
};

export default function DocumentosAI() {
  const queryClient = useQueryClient();
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const isAdmin = user?.role === 'admin';

  const { data: documents = [] } = useQuery({
    queryKey: ['aiDocuments'],
    queryFn: () => base44.entities.AIDocument.list('-created_date'),
    initialData: []
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
    initialData: []
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    enabled: isAdmin,
    initialData: []
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 100),
    enabled: isAdmin && selectedType === 'status_report',
    initialData: []
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => base44.entities.AIDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiDocuments'] });
      setShowGenerator(false);
      resetForm();
      alert('✅ Documento guardado exitosamente!');
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => base44.entities.AIDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiDocuments'] });
      alert('✅ Documento eliminado!');
    }
  });

  const generateDocument = async () => {
    if (!selectedType) {
      alert('Selecciona un tipo de documento');
      return;
    }

    setGenerating(true);
    try {
      let prompt = '';
      let contextData = {};

      const employee = employees.find(e => e.email === selectedEmployee);
      const job = jobs.find(j => j.id === selectedJob);

      switch (selectedType) {
        case 'offer_letter':
          if (!employee) {
            alert('Selecciona un empleado');
            setGenerating(false);
            return;
          }
          contextData = {
            employee_name: employee.full_name,
            position: employee.position,
            hourly_rate: employee.hourly_rate,
            hire_date: employee.hire_date
          };
          prompt = `Generate a professional offer letter in Spanish for ${employee.full_name}.
          Position: ${employee.position}
          Hourly Rate: $${employee.hourly_rate}/hour
          Start Date: ${employee.hire_date || 'To be determined'}
          
          Include: welcome message, position details, compensation, start date, benefits overview, and next steps.
          ${customInstructions ? `Additional instructions: ${customInstructions}` : ''}
          
          Format in clean, professional Spanish.`;
          break;

        case 'performance_review':
          if (!employee) {
            alert('Selecciona un empleado');
            setGenerating(false);
            return;
          }
          const empTimeEntries = timeEntries.filter(t => t.employee_email === employee.email);
          const totalHours = empTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
          contextData = {
            employee_name: employee.full_name,
            position: employee.position,
            total_hours: totalHours,
            time_entries_count: empTimeEntries.length
          };
          prompt = `Generate a performance review summary in Spanish for ${employee.full_name}.
          Position: ${employee.position}
          Total Hours Worked: ${totalHours.toFixed(1)} hours
          Time Entries: ${empTimeEntries.length} records
          
          Include: summary of work performance, strengths, areas for improvement, and recommendations.
          ${customInstructions ? `Manager feedback: ${customInstructions}` : ''}
          
          Be professional and constructive.`;
          break;

        case 'project_proposal':
          if (!job) {
            alert('Selecciona un trabajo');
            setGenerating(false);
            return;
          }
          contextData = {
            job_name: job.name,
            description: job.description,
            contract_amount: job.contract_amount,
            status: job.status
          };
          prompt = `Generate a project proposal in Spanish for: ${job.name}
          Description: ${job.description || 'To be defined'}
          Budget: $${job.contract_amount || 'To be estimated'}
          
          Include: executive summary, scope of work, timeline, budget breakdown, deliverables, and terms.
          ${customInstructions ? `Additional requirements: ${customInstructions}` : ''}
          
          Professional format for client presentation.`;
          break;

        case 'status_report':
          if (!job) {
            alert('Selecciona un trabajo');
            setGenerating(false);
            return;
          }
          const jobTimeEntries = timeEntries.filter(t => t.job_id === job.id);
          const jobHours = jobTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
          contextData = {
            job_name: job.name,
            total_hours: jobHours,
            time_entries: jobTimeEntries.length,
            status: job.status
          };
          prompt = `Generate a project status report in Spanish for: ${job.name}
          Status: ${job.status}
          Total Hours Worked: ${jobHours.toFixed(1)} hours
          Time Entries: ${jobTimeEntries.length} records
          
          Include: project overview, progress summary, hours breakdown, current status, challenges, and next steps.
          ${customInstructions ? `Additional notes: ${customInstructions}` : ''}
          
          Clear and concise for stakeholders.`;
          break;

        case 'warning_letter':
          if (!employee) {
            alert('Selecciona un empleado');
            setGenerating(false);
            return;
          }
          if (!customInstructions) {
            alert('Describe el motivo de la advertencia');
            setGenerating(false);
            return;
          }
          contextData = { employee_name: employee.full_name, position: employee.position };
          prompt = `Generate a formal warning letter in Spanish for ${employee.full_name}.
          Position: ${employee.position}
          Reason: ${customInstructions}
          
          Include: formal tone, clear issue description, expectations, consequences, and improvement plan.
          Professional and legally appropriate.`;
          break;

        case 'custom':
          if (!customInstructions) {
            alert('Describe qué tipo de documento necesitas');
            setGenerating(false);
            return;
          }
          prompt = `Generate a professional document in Spanish based on these instructions: ${customInstructions}
          ${employee ? `Employee: ${employee.full_name} (${employee.position})` : ''}
          ${job ? `Job: ${job.name}` : ''}
          
          Professional format and tone.`;
          break;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setGeneratedContent(result);
    } catch (error) {
      alert('Error generando documento: ' + error.message);
    }
    setGenerating(false);
  };

  const saveDocument = () => {
    if (!generatedContent) {
      alert('Genera el documento primero');
      return;
    }

    const employee = employees.find(e => e.email === selectedEmployee);
    const job = jobs.find(j => j.id === selectedJob);

    createDocMutation.mutate({
      document_type: selectedType,
      title: `${DOCUMENT_TYPES[selectedType].label} - ${employee?.full_name || job?.name || 'Documento'}`,
      content: generatedContent,
      employee_email: selectedEmployee,
      employee_name: employee?.full_name,
      job_id: selectedJob,
      job_name: job?.name,
      generated_by_email: user.email,
      generated_by_name: user.full_name,
      context_data: {
        employee_email: selectedEmployee,
        job_id: selectedJob
      },
      custom_instructions: customInstructions,
      status: 'draft'
    });
  };

  const resetForm = () => {
    setSelectedType('');
    setCustomInstructions('');
    setSelectedEmployee('');
    setSelectedJob('');
    setGeneratedContent('');
    setEditingDoc(null);
  };

  const statusColors = {
    draft: 'bg-slate-100 text-slate-700 border-slate-300',
    finalized: 'bg-blue-100 text-blue-700 border-blue-300',
    sent: 'bg-green-100 text-green-700 border-green-300'
  };

  if (!isAdmin) {
    return (
      <div className="p-8 bg-gradient-to-br from-slate-50 to-white min-h-screen">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <p className="text-slate-600">Esta función solo está disponible para administradores</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Documentos con AI"
          description="Genera documentos profesionales automáticamente con inteligencia artificial"
          icon={Sparkles}
          actions={
            <Button 
              onClick={() => setShowGenerator(true)} 
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Nuevo Documento
            </Button>
          }
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(DOCUMENT_TYPES).map(([key, type]) => {
            const Icon = type.icon;
            return (
              <Card 
                key={key}
                onClick={() => {
                  setSelectedType(key);
                  setShowGenerator(true);
                }}
                className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 hover:shadow-xl hover:scale-105 transition-all cursor-pointer group"
              >
                <CardContent className="p-6">
                  <div className={`w-16 h-16 bg-gradient-to-br ${type.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{type.label}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{type.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl border-slate-200 dark:border-slate-700">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700">
            <CardTitle className="text-slate-900 dark:text-white">Documentos Generados</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No hay documentos generados aún</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Comienza creando tu primer documento con AI</p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map(doc => {
                  const Icon = DOCUMENT_TYPES[doc.document_type]?.icon || FileText;
                  return (
                    <Card key={doc.id} className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 bg-gradient-to-br ${DOCUMENT_TYPES[doc.document_type]?.color || 'from-slate-500 to-slate-600'} rounded-lg`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-slate-900 dark:text-white">{doc.title}</h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 dark:text-slate-400">
                                <span>{doc.employee_name || doc.job_name || 'General'}</span>
                                <span>•</span>
                                <span>{format(new Date(doc.created_date), 'MMM dd, yyyy')}</span>
                              </div>
                              <Badge className={`mt-2 ${statusColors[doc.status]}`}>
                                {doc.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingDoc(doc)}
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (window.confirm('¿Eliminar este documento?')) {
                                  deleteDocMutation.mutate(doc.id);
                                }
                              }}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showGenerator} onOpenChange={(open) => {
          setShowGenerator(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Generar Documento con AI
              </DialogTitle>
            </DialogHeader>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700">Tipo de Documento *</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Selecciona tipo..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {Object.entries(DOCUMENT_TYPES).map(([key, type]) => (
                        <SelectItem key={key} value={key} className="text-slate-900">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {['offer_letter', 'performance_review', 'warning_letter'].includes(selectedType) && (
                  <div>
                    <Label className="text-slate-700">Empleado *</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                        <SelectValue placeholder="Selecciona empleado..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {employees.map(emp => (
                          <SelectItem key={emp.email} value={emp.email} className="text-slate-900">
                            {emp.full_name} - {emp.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {['project_proposal', 'status_report'].includes(selectedType) && (
                  <div>
                    <Label className="text-slate-700">Trabajo *</Label>
                    <Select value={selectedJob} onValueChange={setSelectedJob}>
                      <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                        <SelectValue placeholder="Selecciona trabajo..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {jobs.map(job => (
                          <SelectItem key={job.id} value={job.id} className="text-slate-900">
                            {job.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label className="text-slate-700">
                    {selectedType === 'warning_letter' ? 'Motivo de Advertencia *' : 'Instrucciones Personalizadas'}
                  </Label>
                  <Textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder={
                      selectedType === 'offer_letter' ? 'Ej: Incluir bono por firma, beneficios adicionales...' :
                      selectedType === 'performance_review' ? 'Ej: Excelente trabajo en equipo, mejorar puntualidad...' :
                      selectedType === 'warning_letter' ? 'Describe la conducta o situación que motiva la advertencia' :
                      'Agrega contexto específico, requisitos especiales, etc...'
                    }
                    className="bg-white border-slate-300 text-slate-900 h-32"
                  />
                </div>

                <Button
                  onClick={generateDocument}
                  disabled={generating || !selectedType}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando documento...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generar con AI
                    </>
                  )}
                </Button>
              </div>

              <div className="border-l border-slate-200 pl-6">
                <Label className="text-slate-700 mb-2 block">Vista Previa</Label>
                {generatedContent ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-6 max-h-[500px] overflow-y-auto">
                    <ReactMarkdown className="prose prose-sm max-w-none text-slate-900">
                      {generatedContent}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">
                      {generating ? 'Generando documento...' : 'El documento generado aparecerá aquí'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {generatedContent && (
              <DialogFooter className="border-t border-slate-200 pt-4">
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline" 
                    onClick={resetForm}
                    className="bg-white border-slate-300 text-slate-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={generateDocument}
                    variant="outline"
                    className="bg-white border-purple-300 text-purple-700 hover:bg-purple-50"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Re-generar
                  </Button>
                  <Button
                    onClick={saveDocument}
                    disabled={createDocMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white shadow-lg"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Documento
                  </Button>
                </div>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{editingDoc?.title}</DialogTitle>
            </DialogHeader>
            {editingDoc && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg p-6 max-h-[500px] overflow-y-auto">
                  <ReactMarkdown className="prose prose-sm max-w-none text-slate-900">
                    {editingDoc.content}
                  </ReactMarkdown>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 bg-white border-slate-300 text-slate-700">
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PDF
                  </Button>
                  <Button className="flex-1 bg-gradient-to-r from-[#3B9FF3] to-blue-500 text-white">
                    <Send className="w-4 h-4 mr-2" />
                    Enviar por Email
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}