import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Upload, Receipt, ExternalLink } from "lucide-react"; // Removed Camera, Sparkles, Loader2
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query"; // Added useMutation
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { differenceInDays, format } from "date-fns"; // Added format (but per-diem related logic is removed, so 'format' might become unused)
// import { Badge } from "@/components/ui/badge"; // Badge is no longer needed if AI related UI is removed
import { useLanguage } from "@/components/i18n/LanguageContext";
// import AIExpenseCategorizer from './AIExpenseCategorizer'; // AIExpenseCategorizer is no longer used

const categories = [
  { value: "travel", label: "Travel" },
  { value: "meals", label: "Meals" },
  { value: "transport", label: "Transport" },
  { value: "supplies", label: "Supplies" },
  { value: "client_entertainment", label: "Client Entertainment" },
  { value: "equipment", label: "Equipment" },
  { value: "per_diem", label: "Per Diem" },
  { value: "other", label: "Other" },
];

export default function ExpenseForm({ expense, onSubmit, onCancel, isProcessing }) {
  const { t, language } = useLanguage();
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
  });

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
      alert('Error uploading file.');
    },
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    uploadMutation.mutate(file);
  };

  // Remove calculatePerDiemTotal function
  // const calculatePerDiemTotal = () => { /* ... */ };

  const handleSubmit = (e) => {
    e.preventDefault();
    const job = jobs?.find(j => j.id === formData.job_id);
    
    // NEW: Prompt #58 - Require receipt for all expenses
    if (!formData.receipt_url) {
      alert('⚠️ Receipt is required. Please upload a document.');
      return;
    }

    // Convert amount to float
    const finalAmount = parseFloat(formData.amount || '0');

    onSubmit({
      ...formData,
      amount: finalAmount,
      status: expense?.status || "pending", // Keep existing status if editing
      job_name: job?.name, // Ensure job_name is passed
    });
  };

  // NEW: Account category options (Prompt #59)
  const accountCategories = [
    { value: 'expense_labor_cost', label: 'Expense: Labor Cost' },
    { value: 'expense_travel_per_diem', label: 'Expense: Travel & Per Diem' },
    { value: 'expense_materials', label: 'Expense: Materials' },
    { value: 'expense_equipment', label: 'Expense: Equipment' },
    { value: 'expense_other', label: 'Expense: Other' }
  ];
  
  return (
    <Card className="bg-white shadow-xl border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Receipt className="w-5 h-5 text-[#3B9FF3]" />
          {expense ? t('edit') : t('new_expense')}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="p-6 space-y-4">
          {/* Removed all isPerDiem conditional rendering blocks */}
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
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
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-700 mb-2 block">Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Ex: Gas for trip to job site"
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
                Account Category *
              </Label>
              <Select 
                value={formData.account_category} 
                onValueChange={(value) => setFormData({...formData, account_category: value})}
                required
              >
                <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                  <SelectValue placeholder="Select account category..."/>
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
                For accounting reports and financial analysis
              </p>
            </div>

            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <RadioGroup 
                value={formData.payment_method} 
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="personal" id="personal" />
                  <Label htmlFor="personal" className="font-normal cursor-pointer">
                    Personal Money (Reimbursement)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="company_card" id="company_card" />
                  <Label htmlFor="company_card" className="font-normal cursor-pointer">
                    Company Card
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the expense..."
                className="h-20 bg-slate-50 border-slate-200 text-slate-900"
              />
            </div>
          </>

          <div className="space-y-2">
            <Label>Associate to Job *</Label>
            <Select
              value={formData.job_id || ''}
              onValueChange={(value) => setFormData({ ...formData, job_id: value })}
              disabled={jobsLoading}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a job..." />
              </SelectTrigger>
              <SelectContent>
                {jobsLoading && <SelectItem value={null} disabled>Loading jobs...</SelectItem>}
                {!jobsLoading && !jobs?.length && <SelectItem value={null} disabled>No active jobs</SelectItem>}
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
              Receipt <span className="text-red-500">*</span>
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
                  Uploading receipt...
                </p>
              )}
              {formData.receipt_url && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <ExternalLink className="w-4 h-4" />
                  <a href={formData.receipt_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    View Receipt
                  </a>
                </div>
              )}
              <p className="text-xs text-amber-600">
                ⚠️ Required: Receipt must be attached before submitting
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
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isProcessing || !formData.job_id || uploadMutation.isPending}
            className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800"
          >
            <Save className="w-4 h-4 mr-2" />
            {expense ? 'Save Changes' : 'Save'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}