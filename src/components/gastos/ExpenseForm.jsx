import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Upload, Receipt, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { uploadReceiptToDrive } from "@/functions/uploadReceiptToDrive";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { differenceInDays, format } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { enforceUserIdOnWrite } from "@/components/utils/writeGuards";
import { SyncStatusBadge, useSyncStatus } from "@/components/feedback/SyncStatusBadge";

const categories = [
  { value: "travel", label: "Viajes", labelEn: "Travel" },
  { value: "meals", label: "Comidas", labelEn: "Meals" },
  { value: "transport", label: "Transporte", labelEn: "Transport" },
  { value: "supplies", label: "Suministros", labelEn: "Supplies" },
  { value: "client_entertainment", label: "Entretenimiento cliente", labelEn: "Client Entertainment" },
  { value: "equipment", label: "Equipo", labelEn: "Equipment" },
  { value: "per_diem", label: "Per Diem / Viáticos", labelEn: "Per Diem" }, // Per Diem category is still valid for display if old expenses have it
  { value: "other", label: "Otro", labelEn: "Other" },
];

export default function ExpenseForm({ expense, onSubmit, onCancel, isProcessing }) {
  const { t, language } = useLanguage();
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.list('name'),
  });

  // Check sync status for existing expense
  const syncStatus = useSyncStatus('Expense', expense?.id);

  // Remove past expenses query as AIExpenseCategorizer is removed
  // const { data: user } = useQuery({ queryKey: ['currentUser'] });
  // const { data: pastExpenses = [] } = useQuery({
  //   queryKey: ['pastExpenses', user?.email],
  //   queryFn: async () => {
  //     if (!user?.email) return [];
  //     return base44.entities.Expense.filter({ 
  //       employee_email: user.email 
  //     }, '-date', 50);
  //   },
  //   enabled: !!user?.email,
  //   initialData: []
  // });
  
  const [formData, setFormData] = useState(() => {
    return {
      amount: String(expense?.amount || ''), // Ensure amount is a string for input
      category: expense?.category || 'supplies', // Default to 'supplies'
      account_category: expense?.account_category || 'expense_other', // NEW: Prompt #59
      description: expense?.description || '',
      date: expense?.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0], // Default to today's date
      receipt_url: expense?.receipt_url || '',
      payment_method: expense?.payment_method || 'personal',
      job_id: expense?.job_id || '', // '' for Select value that means "no selection"
      job_name: expense?.job_name || '', // New field
      notes: expense?.notes || '', // New field
      // Removed AI-related fields: ai_suggested_category, ai_confidence, ai_analyzed, user_corrected_ai
    };
  });

  // Remove isPerDiem useEffect
  // useEffect(() => { /* ... existing per-diem effect logic ... */ }, [isPerDiem, expense, language]);

  // Remove AI categorization handler functions
  // const handleAICategorySelect = (category, aiMetadata) => { /* ... */ };
  // const handleManualCategoryChange = (category) => { /* ... */ };

  // New useMutation for file upload
  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    },
    onSuccess: (file_url) => {
      setFormData(prev => ({ ...prev, receipt_url: file_url }));
    },
    onError: (error) => {
      console.error("Error uploading file:", error);
      const msg = error?.message || String(error);
      alert(language === 'es' 
        ? `Error al subir el archivo: ${msg}` 
        : `Error uploading file: ${msg}`);
    },
  });

  const compressImage = (file) => {
    return new Promise((resolve) => {
      // If not an image, return as-is
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => resolve(file); // fallback to original on error
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => resolve(file); // fallback to original on error
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1200;
            let { width, height } = img;
            if (width > MAX_SIZE || height > MAX_SIZE) {
              if (width > height) {
                height = Math.round((height * MAX_SIZE) / width);
                width = MAX_SIZE;
              } else {
                width = Math.round((width * MAX_SIZE) / height);
                height = MAX_SIZE;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (!blob) {
                resolve(file); // fallback to original if blob is null
                return;
              }
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.8);
          } catch {
            resolve(file); // fallback to original on any error
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      uploadMutation.mutate(compressed);
    } catch (err) {
      console.error('File prepare error:', err);
      // Try uploading original file as fallback
      uploadMutation.mutate(file);
    }
  };

  // Remove calculatePerDiemTotal function
  // const calculatePerDiemTotal = () => { /* ... */ };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const job = jobs?.find(j => j.id === formData.job_id);
    
    // NEW: Prompt #58 - Require receipt for all expenses
    if (!formData.receipt_url) {
      alert(language === 'es' 
        ? '⚠️ El recibo es obligatorio. Por favor sube un documento.' 
        : '⚠️ Receipt is required. Please upload a document.');
      return;
    }

    // Convert amount to float
    const finalAmount = parseFloat(formData.amount || '0');

    // WRITE GUARD — STRICT MODE for Expense (blocks without user_id)
    const baseData = {
      ...formData,
      amount: finalAmount,
      status: expense?.status || "pending",
      job_name: job?.name,
    };

    try {
      // Enforce employee_user_id for new Expense records (STRICT)
      const guardedData = enforceUserIdOnWrite(
        baseData,
        currentUser,
        'Expense',
        'employee_user_id'
      );

      onSubmit(guardedData);
    } catch (error) {
      if (error.code === 'USER_ID_REQUIRED') {
        alert(language === 'es'
          ? '🔒 Identidad de usuario requerida.\n\nPor favor cierra sesión y vuelve a iniciar sesión.\n\nSi el problema persiste, contacta a tu administrador.'
          : '🔒 User identity required.\n\nPlease logout and login again.\n\nIf the issue persists, contact your admin.');
      } else {
        throw error;
      }
    }
  };

  // NEW: Account category options (Prompt #59)
  const accountCategories = [
    { value: 'expense_labor_cost', label: language === 'es' ? 'Gasto: Costo Laboral' : 'Expense: Labor Cost' },
    { value: 'expense_travel_per_diem', label: language === 'es' ? 'Gasto: Viaje y Per Diem' : 'Expense: Travel & Per Diem' },
    { value: 'expense_materials', label: language === 'es' ? 'Gasto: Materiales' : 'Expense: Materials' },
    { value: 'expense_equipment', label: language === 'es' ? 'Gasto: Equipo' : 'Expense: Equipment' },
    { value: 'expense_other', label: language === 'es' ? 'Gasto: Otro' : 'Expense: Other' }
  ];
  
  return (
    <Card className="bg-white shadow-xl border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#3B9FF3]" />
            {expense ? t('edit') : t('new_expense')}
          </div>
          <SyncStatusBadge 
            status={syncStatus}
            onRetry={() => {
              const queue = JSON.parse(localStorage.getItem('offline_mutation_queue') || '[]');
              const updated = queue.map(op => 
                op.entity === 'Expense' && op.entityId === expense?.id
                  ? { ...op, status: 'pending', retryCount: 0 }
                  : op
              );
              localStorage.setItem('offline_mutation_queue', JSON.stringify(updated));
              window.location.reload();
            }}
          />
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-4">
          {/* Removed all isPerDiem conditional rendering blocks */}
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'es' ? 'Monto' : 'Amount'} *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'es' ? 'Fecha' : 'Date'} *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 mb-2 block">{t('description')} *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder={language === 'es' ? "Ej: Gasolina para viaje a sitio de trabajo" : "Ex: Gas for trip to job site"}
                className="bg-slate-50 border-slate-200 text-slate-900"
                required
              />
            </div>

            {/* Removed AI Categorization component */}
            {/* {!expense?.id && formData.description && !formData.category && (
              <AIExpenseCategorizer
                description={formData.description}
                amount={formData.amount}
                currentCategory={formData.category}
                onCategorySelect={handleAICategorySelect}
                pastExpenses={pastExpenses}
                categories={categories}
                language={language}
                t={t} // Pass t for internal translations if needed
              />
            )} */}

            <div>
              <Label className="text-slate-700 mb-2 block">
                {t('category')} *
                {/* Removed AI-related badge */}
                {/* {formData.ai_analyzed && formData.ai_confidence > 0 && (
                  <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-300 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI {formData.ai_confidence}%
                    {formData.user_corrected_ai && (language === 'es' ? ' (Corregido)' : ' (Corrected)')}
                  </Badge>
                )} */}
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData({...formData, category: value})} // Changed from handleManualCategoryChange
                required
              >
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
                  <SelectValue placeholder={t('category')} />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {categories.filter(c => c.value !== 'per_diem').map(cat => ( // Still filter per_diem from regular expenses
                    <SelectItem key={cat.value} value={cat.value} className="text-slate-900 hover:bg-slate-100">
                      {t(cat.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* NEW: Account Category Field (Prompt #59) */}
            <div>
              <Label className="text-slate-700">
                {language === 'es' ? 'Categoría Contable *' : 'Account Category *'}
              </Label>
              <Select 
                value={formData.account_category} 
                onValueChange={(value) => setFormData({...formData, account_category: value})}
                required
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                  <SelectValue placeholder={language === 'es' ? 'Seleccionar categoría contable...' : 'Select account category...'}/>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {accountCategories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-slate-900">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'es' 
                  ? 'Para reportes contables y análisis financiero' 
                  : 'For accounting reports and financial analysis'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{language === 'es' ? 'Método de Pago' : 'Payment Method'} *</Label>
              <RadioGroup 
                value={formData.payment_method} 
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="personal" />
                  <Label htmlFor="personal" className="font-normal cursor-pointer">
                    {language === 'es' ? 'Dinero Personal (Reembolso)' : 'Personal Money (Reimbursement)'}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company_card" id="company_card" />
                  <Label htmlFor="company_card" className="font-normal cursor-pointer">
                    {language === 'es' ? 'Tarjeta de la Compañía' : 'Company Card'}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>{t('notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={language === 'es' ? 'Notas adicionales sobre el gasto...' : 'Additional notes about the expense...'}
                className="h-20 bg-slate-50 border-slate-200 text-slate-900"
              />
            </div>
          </>

          <div className="space-y-2">
            <Label>{language === 'es' ? 'Asociar a Trabajo' : 'Associate to Job'} *</Label>
            <Select
              value={formData.job_id || ''} // Handle empty string job_id for select component
              onValueChange={(value) => setFormData({ ...formData, job_id: value })}
              disabled={jobsLoading}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'es' ? 'Seleccionar un trabajo...' : 'Select a job...'} />
              </SelectTrigger>
              <SelectContent>
                {jobsLoading && <SelectItem value={null} disabled>{language === 'es' ? 'Cargando trabajos...' : 'Loading jobs...'}</SelectItem>}
                {!jobsLoading && !jobs?.length && <SelectItem value={null} disabled>{language === 'es' ? 'No hay trabajos activos' : 'No active jobs'}</SelectItem>}
                {jobs?.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Modified: Receipt upload with required indicator */}
          <div>
            <Label className="text-slate-700">
              {t('receipt')} <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={uploadMutation.isPending}
                className="bg-white border-slate-300 text-slate-900"
              />
              {uploadMutation.isPending && (
                <p className="text-sm text-blue-600">
                  <Upload className="w-4 h-4 inline-block mr-1" />
                  {language === 'es' ? 'Subiendo recibo...' : 'Uploading receipt...'}
                </p>
              )}
              {formData.receipt_url && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <ExternalLink className="w-4 h-4" />
                  <a href={formData.receipt_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {t('view')} {t('receipt')}
                  </a>
                </div>
              )}
              <p className="text-xs text-amber-600">
                {language === 'es' 
                  ? '⚠️ Obligatorio: El recibo debe ser adjuntado antes de enviar' 
                  : '⚠️ Required: Receipt must be attached before submitting'}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t border-slate-100 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
          >
            <X className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            disabled={isProcessing || !formData.job_id || uploadMutation.isPending}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
          >
            <Save className="w-4 h-4 mr-2" />
            {expense 
                ? (language === 'es' ? 'Guardar Cambios' : 'Save Changes')
                : (language === 'es' ? 'Guardar' : 'Save')
            }
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}