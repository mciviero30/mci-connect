import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, FileCheck, Loader2, AlertCircle, TrendingUp, DollarSign, Clock, Receipt, CheckCircle2, RefreshCw, Info } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function AIInvoiceGenerator() {
  const { language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedJob, setSelectedJob] = useState("");
  const [manualJobName, setManualJobName] = useState("");
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualJobDescription, setManualJobDescription] = useState("");
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });
  const [taxRate, setTaxRate] = useState(0);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  // Fetch data
  const { data: jobs = [] } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.list('-created_date'),
    initialData: []
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('first_name'),
    initialData: []
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['approvedTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'approved' }, '-date', 500),
    initialData: []
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['approvedExpenses'],
    queryFn: () => base44.entities.Expense.filter({ status: 'approved' }, '-date', 500),
    initialData: []
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.JobAssignment.list('-date', 500),
    initialData: []
  });

  const { data: companySettings = {} } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const settings = await base44.entities.CompanySettings.list();
      return settings[0] || {};
    },
    initialData: {}
  });

  // Create invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData) => {
      return await base44.entities.Invoice.create(invoiceData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(language === 'es' ? '✅ Factura creada exitosamente' : '✅ Invoice created successfully');
      
      // Navigate to invoice view
      setTimeout(() => {
        navigate(createPageUrl(`VerFactura?id=${data.id}`));
      }, 1000);
    },
    onError: (error) => {
      toast.error(`❌ Error: ${error.message}`);
    }
  });

  // Generate invoice with AI
  const handleGenerateInvoice = async () => {
    // Validation
    if (!useManualEntry && !selectedJob) {
      toast.error(language === 'es' ? 'Selecciona un trabajo' : 'Select a job');
      return;
    }

    if (useManualEntry && !manualJobName.trim()) {
      toast.error(language === 'es' ? 'Escribe el nombre del trabajo' : 'Enter job name');
      return;
    }

    if (useManualEntry && !manualCustomerName.trim()) {
      toast.error(language === 'es' ? 'Escribe el nombre del cliente' : 'Enter customer name');
      return;
    }

    if (!dateRange.start || !dateRange.end) {
      toast.error(language === 'es' ? 'Selecciona un rango de fechas' : 'Select a date range');
      return;
    }

    setIsGenerating(true);
    setGeneratedInvoice(null);
    setAnalysisData(null);

    try {
      let job, customer;
      
      if (useManualEntry) {
        // Use manual entry data
        job = {
          name: manualJobName.trim(),
          description: manualJobDescription.trim(),
          customer_name: manualCustomerName.trim()
        };
        
        // Try to find matching customer
        customer = customers.find(c => 
          c.first_name?.toLowerCase().includes(manualCustomerName.toLowerCase()) ||
          c.last_name?.toLowerCase().includes(manualCustomerName.toLowerCase()) ||
          (c.first_name + ' ' + c.last_name).toLowerCase() === manualCustomerName.toLowerCase()
        );
      } else {
        // Use selected job
        job = jobs.find(j => j.id === selectedJob);
        if (!job) throw new Error('Job not found');
        
        customer = customers.find(c => c.email === job.customer_email || c.first_name + ' ' + c.last_name === job.customer_name);
      }

      // Filter data by job and date range
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      const jobTimeEntries = timeEntries.filter(e => {
        if (useManualEntry) {
          // For manual entry, include all time entries in date range
          const entryDate = new Date(e.date);
          return entryDate >= startDate && entryDate <= endDate;
        } else {
          if (e.job_id !== selectedJob) return false;
          const entryDate = new Date(e.date);
          return entryDate >= startDate && entryDate <= endDate;
        }
      });

      const jobExpenses = expenses.filter(e => {
        if (useManualEntry) {
          // For manual entry, include all expenses in date range
          const expenseDate = new Date(e.date);
          return expenseDate >= startDate && expenseDate <= endDate;
        } else {
          if (e.job_id !== selectedJob) return false;
          const expenseDate = new Date(e.date);
          return expenseDate >= startDate && expenseDate <= endDate;
        }
      });

      const jobAssignments = assignments.filter(a => {
        if (useManualEntry) {
          const assignmentDate = new Date(a.date);
          return assignmentDate >= startDate && assignmentDate <= endDate;
        } else {
          if (a.job_id !== selectedJob) return false;
          const assignmentDate = new Date(a.date);
          return assignmentDate >= startDate && assignmentDate <= endDate;
        }
      });

      // Calculate totals
      const totalHours = jobTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      const totalExpenses = jobExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const avgHourlyRate = companySettings.default_hourly_rate || 75;

      // Prepare data for AI analysis
      const analysisPrompt = `You are an intelligent invoice generation system. Analyze the following project data and generate a professional invoice breakdown.

PROJECT DETAILS:
- Job Name: ${job.name}
- Customer: ${job.customer_name}
- Project Description: ${job.description || 'N/A'}
- Date Range: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}
${additionalNotes ? `- Additional Notes: ${additionalNotes}` : ''}
${useManualEntry ? '- Note: This is a manually entered job (not in the system yet)' : ''}

LABOR DATA:
- Total Hours Worked: ${totalHours.toFixed(2)} hours
- Number of Time Entries: ${jobTimeEntries.length}
- Suggested Hourly Rate: $${avgHourlyRate}

EXPENSE DATA:
- Total Expenses: $${totalExpenses.toFixed(2)}
- Number of Expenses: ${jobExpenses.length}
- Expense Categories: ${[...new Set(jobExpenses.map(e => e.category))].join(', ')}

MILESTONES/EVENTS:
- Completed Milestones: ${jobAssignments.length}
- Milestone Details: ${jobAssignments.map(a => `${a.event_title || a.job_name} on ${format(new Date(a.date), 'MMM dd')}`).join('; ')}

TASK:
Generate a professional invoice with intelligent categorization of line items. Create clear, billable line items that combine similar work into logical categories. For expenses, group by type if appropriate.

Guidelines:
1. Combine labor hours into clear service categories (e.g., "Installation Services", "Project Management", "Technical Support")
2. Group expenses intelligently (e.g., "Materials & Supplies", "Travel & Per Diem")
3. Create separate line items for major milestones if they represent significant deliverables
4. Use professional, clear descriptions
5. Calculate realistic pricing based on the data provided
6. Ensure all line items have: description, quantity, unit, unit_price, and total

Return a JSON array of invoice line items. Each item must include:
- description: Clear, professional description
- quantity: Numeric value
- unit: Unit of measurement (hours, items, etc.)
- unit_price: Price per unit
- total: Total amount (quantity * unit_price)
- account_category: Either "revenue_service" or "revenue_materials"
- notes: Optional internal notes about the item`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  unit_price: { type: "number" },
                  total: { type: "number" },
                  account_category: { type: "string" },
                  notes: { type: "string" }
                },
                required: ["description", "quantity", "unit", "unit_price", "total"]
              }
            },
            summary: {
              type: "object",
              properties: {
                total_labor_cost: { type: "number" },
                total_expenses_cost: { type: "number" },
                total_billable: { type: "number" },
                profit_margin_percentage: { type: "number" }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["items", "summary"]
        }
      });

      const invoiceItems = aiResponse.items || [];
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      // Generate invoice number
      const invoiceCount = (await base44.entities.Invoice.list()).length;
      const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, '0')}`;

      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_id: customer?.id || null,
        customer_name: job.customer_name,
        customer_email: customer?.email || null,
        customer_phone: customer?.phone || null,
        job_name: job.name,
        job_id: useManualEntry ? null : job.id,
        job_address: job.address || '',
        team_id: job.team_id || null,
        team_name: job.team_name || null,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        items: invoiceItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total: item.total,
          account_category: item.account_category || 'revenue_service'
        })),
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total: total,
        amount_paid: 0,
        balance: total,
        notes: additionalNotes || `Generated from ${totalHours.toFixed(1)}h of labor and ${jobExpenses.length} expenses${useManualEntry ? ' (Manual Entry)' : ''}`,
        status: 'draft'
      };

      setGeneratedInvoice(invoiceData);
      setAnalysisData({
        ...aiResponse,
        rawData: {
          totalHours,
          totalExpenses,
          timeEntriesCount: jobTimeEntries.length,
          expensesCount: jobExpenses.length,
          milestonesCount: jobAssignments.length
        }
      });

      toast.success(language === 'es' ? '✨ Factura generada con AI' : '✨ Invoice generated with AI');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error(`❌ ${language === 'es' ? 'Error al generar factura' : 'Error generating invoice'}: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveInvoice = () => {
    if (!generatedInvoice) return;
    createInvoiceMutation.mutate(generatedInvoice);
  };

  const jobsWithData = jobs.filter(job => {
    const hasTimeEntries = timeEntries.some(e => e.job_id === job.id && e.status === 'approved');
    const hasExpenses = expenses.some(e => e.job_id === job.id && e.status === 'approved');
    return hasTimeEntries || hasExpenses;
  });

  const selectedJobData = jobs.find(j => j.id === selectedJob);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Generador de Facturas AI' : 'AI Invoice Generator'}
          description={language === 'es' 
            ? 'Genera facturas inteligentemente desde horas, gastos y milestones' 
            : 'Intelligently generate invoices from hours, expenses, and milestones'}
          icon={Sparkles}
          appBadge="✨ AI"
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white shadow-xl border-slate-200">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#3B9FF3]" />
                  {language === 'es' ? 'Configuración' : 'Configuration'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Toggle Manual Entry */}
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <Label className="text-purple-900 font-semibold text-sm">
                    {language === 'es' ? 'Entrada Manual' : 'Manual Entry'}
                  </Label>
                  <button
                    onClick={() => setUseManualEntry(!useManualEntry)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useManualEntry ? 'bg-purple-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useManualEntry ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {useManualEntry ? (
                  <>
                    {/* Manual Entry Fields */}
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900 text-xs">
                        {language === 'es' 
                          ? 'Modo manual: AI generará la factura basándose en todas las horas y gastos aprobados en el rango de fechas.' 
                          : 'Manual mode: AI will generate invoice based on all approved hours and expenses in the date range.'}
                      </AlertDescription>
                    </Alert>

                    <div>
                      <Label className="text-slate-700 font-semibold mb-2 block">
                        {language === 'es' ? 'Nombre del Trabajo *' : 'Job Name *'}
                      </Label>
                      <Input
                        value={manualJobName}
                        onChange={(e) => setManualJobName(e.target.value)}
                        placeholder={language === 'es' ? 'Ej: Instalación de Ventanas' : 'Ex: Window Installation'}
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-700 font-semibold mb-2 block">
                        {language === 'es' ? 'Nombre del Cliente *' : 'Customer Name *'}
                      </Label>
                      <Input
                        value={manualCustomerName}
                        onChange={(e) => setManualCustomerName(e.target.value)}
                        placeholder={language === 'es' ? 'Ej: John Smith' : 'Ex: John Smith'}
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-700 font-semibold mb-2 block">
                        {language === 'es' ? 'Descripción del Trabajo' : 'Job Description'}
                        <span className="text-slate-400 font-normal ml-1">({language === 'es' ? 'opcional' : 'optional'})</span>
                      </Label>
                      <Textarea
                        value={manualJobDescription}
                        onChange={(e) => setManualJobDescription(e.target.value)}
                        placeholder={language === 'es' ? 'Describe el trabajo...' : 'Describe the job...'}
                        className="bg-slate-50 border-slate-200 h-20"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {/* Job Selection */}
                    <div>
                      <Label className="text-slate-700 font-semibold mb-2 block">
                        {language === 'es' ? 'Seleccionar Trabajo' : 'Select Job'}
                      </Label>
                      <Select value={selectedJob} onValueChange={setSelectedJob}>
                        <SelectTrigger className="bg-slate-50 border-slate-200">
                          <SelectValue placeholder={language === 'es' ? 'Elige un trabajo...' : 'Choose a job...'} />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {jobsWithData.length === 0 ? (
                            <div className="p-4 text-sm text-slate-500 text-center">
                              {language === 'es' ? 'No hay trabajos con datos aprobados' : 'No jobs with approved data'}
                            </div>
                          ) : (
                            jobsWithData.map(job => (
                              <SelectItem key={job.id} value={job.id} className="text-slate-900">
                                {job.name}
                                <Badge className="ml-2 text-xs" variant="outline">
                                  {job.customer_name}
                                </Badge>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-700 font-semibold mb-2 block text-sm">
                      {language === 'es' ? 'Desde' : 'From'}
                    </Label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-700 font-semibold mb-2 block text-sm">
                      {language === 'es' ? 'Hasta' : 'To'}
                    </Label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>
                </div>

                {/* Tax Rate */}
                <div>
                  <Label className="text-slate-700 font-semibold mb-2 block">
                    {language === 'es' ? 'Tasa de Impuesto (%)' : 'Tax Rate (%)'}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>

                {/* Additional Notes */}
                <div>
                  <Label className="text-slate-700 font-semibold mb-2 block">
                    {language === 'es' ? 'Notas Adicionales' : 'Additional Notes'}
                  </Label>
                  <Textarea
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder={language === 'es' ? 'Instrucciones especiales para la AI...' : 'Special instructions for AI...'}
                    className="bg-slate-50 border-slate-200 h-24"
                  />
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateInvoice}
                  disabled={
                    (!useManualEntry && !selectedJob) ||
                    (useManualEntry && (!manualJobName.trim() || !manualCustomerName.trim())) ||
                    !dateRange.start ||
                    !dateRange.end ||
                    isGenerating
                  }
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'es' ? 'Generando con AI...' : 'Generating with AI...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Generar Factura' : 'Generate Invoice'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Selected Job Info */}
            {!useManualEntry && selectedJobData && (
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg border-blue-200">
                <CardHeader className="border-b border-blue-200">
                  <CardTitle className="text-blue-900 text-sm">
                    {language === 'es' ? 'Información del Trabajo' : 'Job Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-sm">
                  <div>
                    <span className="text-blue-700 font-semibold">{language === 'es' ? 'Cliente:' : 'Customer:'}</span>
                    <p className="text-blue-900">{selectedJobData.customer_name}</p>
                  </div>
                  {selectedJobData.description && (
                    <div>
                      <span className="text-blue-700 font-semibold">{language === 'es' ? 'Descripción:' : 'Description:'}</span>
                      <p className="text-blue-900 text-xs">{selectedJobData.description}</p>
                    </div>
                  )}
                  {selectedJobData.contract_amount && (
                    <div>
                      <span className="text-blue-700 font-semibold">{language === 'es' ? 'Contrato:' : 'Contract:'}</span>
                      <p className="text-blue-900 font-bold">${selectedJobData.contract_amount.toLocaleString()}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {useManualEntry && manualJobName && manualCustomerName && (
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg border-purple-200">
                <CardHeader className="border-b border-purple-200">
                  <CardTitle className="text-purple-900 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {language === 'es' ? 'Vista Previa' : 'Preview'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-2 text-sm">
                  <div>
                    <span className="text-purple-700 font-semibold">{language === 'es' ? 'Trabajo:' : 'Job:'}</span>
                    <p className="text-purple-900 font-bold">{manualJobName}</p>
                  </div>
                  <div>
                    <span className="text-purple-700 font-semibold">{language === 'es' ? 'Cliente:' : 'Customer:'}</span>
                    <p className="text-purple-900">{manualCustomerName}</p>
                  </div>
                  {manualJobDescription && (
                    <div>
                      <span className="text-purple-700 font-semibold">{language === 'es' ? 'Descripción:' : 'Description:'}</span>
                      <p className="text-purple-900 text-xs">{manualJobDescription}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {!generatedInvoice && !isGenerating && (
              <Card className="bg-white shadow-lg border-slate-200">
                <CardContent className="p-12 text-center">
                  <Sparkles className="w-20 h-20 text-purple-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-700 mb-2">
                    {language === 'es' ? 'Listo para Generar' : 'Ready to Generate'}
                  </h3>
                  <p className="text-slate-500">
                    {language === 'es'
                      ? useManualEntry 
                        ? 'Completa los campos y rango de fechas, luego haz clic en "Generar Factura"'
                        : 'Selecciona un trabajo y rango de fechas, luego haz clic en "Generar Factura"'
                      : useManualEntry
                        ? 'Fill in the fields and date range, then click "Generate Invoice"'
                        : 'Select a job and date range, then click "Generate Invoice"'}
                  </p>
                </CardContent>
              </Card>
            )}

            {isGenerating && (
              <Card className="bg-white shadow-lg border-slate-200">
                <CardContent className="p-12 text-center">
                  <Loader2 className="w-16 h-16 text-purple-500 mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-bold text-slate-700 mb-2">
                    {language === 'es' ? 'AI Analizando Datos...' : 'AI Analyzing Data...'}
                  </h3>
                  <p className="text-slate-500">
                    {language === 'es'
                      ? 'Categorizando items y calculando totales inteligentemente'
                      : 'Intelligently categorizing items and calculating totals'}
                  </p>
                </CardContent>
              </Card>
            )}

            {generatedInvoice && analysisData && (
              <Tabs defaultValue="preview" className="space-y-6">
                <TabsList className="bg-white border border-slate-200 p-1">
                  <TabsTrigger value="preview" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
                    {language === 'es' ? 'Vista Previa' : 'Preview'}
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
                    {language === 'es' ? 'Análisis AI' : 'AI Analysis'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview">
                  <Card className="bg-white shadow-xl border-slate-200">
                    <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-slate-900 flex items-center gap-2">
                          <FileCheck className="w-5 h-5 text-purple-600" />
                          {generatedInvoice.invoice_number}
                        </CardTitle>
                        <Badge className="bg-purple-500 text-white">
                          {language === 'es' ? 'Generado por AI' : 'AI Generated'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {/* Customer Info */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-1">{language === 'es' ? 'Facturar a:' : 'Bill To:'}</h4>
                          <p className="text-lg font-bold text-slate-900">{generatedInvoice.customer_name}</p>
                          {generatedInvoice.customer_email && (
                            <p className="text-sm text-slate-600">{generatedInvoice.customer_email}</p>
                          )}
                          {generatedInvoice.customer_phone && (
                            <p className="text-sm text-slate-600">{generatedInvoice.customer_phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">{language === 'es' ? 'Fecha:' : 'Date:'}</p>
                          <p className="font-semibold text-slate-900">{format(new Date(generatedInvoice.invoice_date), 'MMM dd, yyyy')}</p>
                          <p className="text-sm text-slate-600 mt-2">{language === 'es' ? 'Vencimiento:' : 'Due:'}</p>
                          <p className="font-semibold text-slate-900">{format(new Date(generatedInvoice.due_date), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>

                      {/* Job Info */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-1">{language === 'es' ? 'Proyecto:' : 'Project:'}</h4>
                        <p className="text-blue-900">{generatedInvoice.job_name}</p>
                        {useManualEntry && (
                          <Badge className="mt-2 bg-purple-100 text-purple-700 border-purple-300">
                            {language === 'es' ? '✨ Entrada Manual' : '✨ Manual Entry'}
                          </Badge>
                        )}
                      </div>

                      {/* Line Items */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-slate-300 bg-slate-50">
                              <th className="text-left p-3 text-slate-700 font-semibold">{language === 'es' ? 'Descripción' : 'Description'}</th>
                              <th className="text-right p-3 text-slate-700 font-semibold">{language === 'es' ? 'Cant.' : 'Qty'}</th>
                              <th className="text-right p-3 text-slate-700 font-semibold">{language === 'es' ? 'Precio' : 'Rate'}</th>
                              <th className="text-right p-3 text-slate-700 font-semibold">{language === 'es' ? 'Total' : 'Total'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {generatedInvoice.items.map((item, idx) => (
                              <tr key={idx} className="border-b border-slate-200">
                                <td className="p-3">
                                  <div>
                                    <p className="font-semibold text-slate-900">{item.description}</p>
                                    <Badge className="mt-1 text-xs" variant="outline">
                                      {item.account_category === 'revenue_service' ? '💼 Service' : '📦 Materials'}
                                    </Badge>
                                  </div>
                                </td>
                                <td className="p-3 text-right text-slate-900">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="p-3 text-right text-slate-900">
                                  ${item.unit_price.toFixed(2)}
                                </td>
                                <td className="p-3 text-right font-bold text-slate-900">
                                  ${item.total.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals */}
                      <div className="border-t-2 border-slate-300 pt-4">
                        <div className="max-w-sm ml-auto space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">{language === 'es' ? 'Subtotal:' : 'Subtotal:'}</span>
                            <span className="font-semibold text-slate-900">${generatedInvoice.subtotal.toFixed(2)}</span>
                          </div>
                          {generatedInvoice.tax_rate > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-600">{language === 'es' ? 'Impuesto' : 'Tax'} ({generatedInvoice.tax_rate}%):</span>
                              <span className="font-semibold text-slate-900">${generatedInvoice.tax_amount.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-xl font-bold text-slate-900 pt-2 border-t border-slate-200">
                            <span>{language === 'es' ? 'TOTAL:' : 'TOTAL:'}</span>
                            <span className="text-[#3B9FF3]">${generatedInvoice.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={handleSaveInvoice}
                          disabled={createInvoiceMutation.isPending}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                        >
                          {createInvoiceMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              {language === 'es' ? 'Guardando...' : 'Saving...'}
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              {language === 'es' ? 'Guardar Factura' : 'Save Invoice'}
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setGeneratedInvoice(null);
                            setAnalysisData(null);
                          }}
                          variant="outline"
                          className="bg-white border-slate-300 text-slate-700"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          {language === 'es' ? 'Regenerar' : 'Regenerate'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analysis">
                  <div className="space-y-6">
                    {/* AI Summary */}
                    {analysisData.summary && (
                      <Card className="bg-white shadow-xl border-slate-200">
                        <CardHeader className="border-b border-slate-200">
                          <CardTitle className="text-slate-900 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[#3B9FF3]" />
                            {language === 'es' ? 'Resumen del Análisis' : 'Analysis Summary'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid md:grid-cols-3 gap-4">
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-sm text-green-700 mb-1">{language === 'es' ? 'Costo Laboral' : 'Labor Cost'}</p>
                              <p className="text-2xl font-bold text-green-900">
                                ${analysisData.summary.total_labor_cost?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                              <p className="text-sm text-amber-700 mb-1">{language === 'es' ? 'Gastos' : 'Expenses'}</p>
                              <p className="text-2xl font-bold text-amber-900">
                                ${analysisData.summary.total_expenses_cost?.toFixed(2) || '0.00'}
                              </p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                              <p className="text-sm text-purple-700 mb-1">{language === 'es' ? 'Margen' : 'Margin'}</p>
                              <p className="text-2xl font-bold text-purple-900">
                                {analysisData.summary.profit_margin_percentage?.toFixed(1) || '0'}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Raw Data Summary */}
                    <Card className="bg-white shadow-xl border-slate-200">
                      <CardHeader className="border-b border-slate-200">
                        <CardTitle className="text-slate-900 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-[#3B9FF3]" />
                          {language === 'es' ? 'Datos Procesados' : 'Processed Data'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                            <Clock className="w-8 h-8 text-blue-600" />
                            <div>
                              <p className="text-sm text-blue-700">{language === 'es' ? 'Horas Trabajadas' : 'Hours Worked'}</p>
                              <p className="text-2xl font-bold text-blue-900">
                                {analysisData.rawData.totalHours.toFixed(1)}h
                              </p>
                              <p className="text-xs text-blue-600">
                                {analysisData.rawData.timeEntriesCount} {language === 'es' ? 'entradas' : 'entries'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                            <Receipt className="w-8 h-8 text-purple-600" />
                            <div>
                              <p className="text-sm text-purple-700">{language === 'es' ? 'Gastos Totales' : 'Total Expenses'}</p>
                              <p className="text-2xl font-bold text-purple-900">
                                ${analysisData.rawData.totalExpenses.toFixed(2)}
                              </p>
                              <p className="text-xs text-purple-600">
                                {analysisData.rawData.expensesCount} {language === 'es' ? 'gastos' : 'expenses'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                            <div>
                              <p className="text-sm text-green-700">{language === 'es' ? 'Hitos' : 'Milestones'}</p>
                              <p className="text-2xl font-bold text-green-900">
                                {analysisData.rawData.milestonesCount}
                              </p>
                              <p className="text-xs text-green-600">
                                {language === 'es' ? 'completados' : 'completed'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Recommendations */}
                    {analysisData.recommendations && analysisData.recommendations.length > 0 && (
                      <Alert className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-300">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        <AlertTitle className="text-purple-900 font-bold">
                          {language === 'es' ? 'Recomendaciones de AI' : 'AI Recommendations'}
                        </AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1 text-purple-800 mt-2">
                            {analysisData.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}