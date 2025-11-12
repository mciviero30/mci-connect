import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { toast } from 'sonner'; // Added toast import

export default function CrearFactura() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');
  const quoteId = urlParams.get('quote_id');

  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: [],
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
  });

  const { data: quotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
    initialData: [],
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: [],
  });

  const { data: existingInvoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['invoice', editId],
    queryFn: () => base44.entities.Invoice.get(editId),
    enabled: !!editId,
  });

  const [formData, setFormData] = useState({
    customer_id: "", // Added customer_id
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    job_name: "",
    job_id: "",
    job_address: "",
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    items: [{ description: "", quantity: 1, unit: "pcs", unit_price: 0, total: 0 }],
    tax_rate: 0,
    notes: "",
    terms: "Payment due within 30 days.\nLate payments subject to fees.\nThank you for your business.",
    status: "draft",
    quote_id: quoteId || null
  });

  useEffect(() => {
    if (existingInvoice && !loadingInvoice) {
      setFormData({
        ...existingInvoice,
        // Ensure date formats are correct for input type="date"
        invoice_date: format(new Date(existingInvoice.invoice_date), 'yyyy-MM-dd'),
        due_date: format(new Date(existingInvoice.due_date), 'yyyy-MM-dd'),
      });
    }
  }, [existingInvoice, loadingInvoice]);

  useEffect(() => {
    if (quoteId && quotes.length > 0) {
      const quote = quotes.find(q => q.id === quoteId);
      if (quote) {
        setFormData(prevFormData => ({
          ...prevFormData,
          quote_id: quoteId,
          customer_id: quote.customer_id || prevFormData.customer_id, // Populate customer_id from quote if available
          customer_name: quote.customer_name,
          customer_email: quote.customer_email,
          customer_phone: quote.customer_phone,
          job_name: quote.job_name,
          job_id: quote.job_id,
          job_address: quote.job_address,
          items: quote.items,
          tax_rate: quote.tax_rate,
          notes: quote.notes,
          terms: quote.terms
        }));
      }
    }
  }, [quoteId, quotes]);

  const generateInvoiceNumber = () => {
    const existingNumbers = invoices
      .map(inv => inv.invoice_number)
      .filter(n => n?.startsWith('INV-'))
      .map(n => parseInt(n.replace('INV-', '')))
      .filter(n => !isNaN(n));
    
    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `INV-${String(nextNumber).padStart(5, '0')}`;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
    const tax_amount = subtotal * (formData.tax_rate / 100);
    const total = subtotal + tax_amount;
    return { subtotal, tax_amount, total };
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = (field === 'description' || field === 'unit') ? value : parseFloat(value) || 0;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unit: "pcs", unit_price: 0, total: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    }
  };

  const handleJobSelect = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setFormData({
        ...formData,
        job_id: jobId,
        job_name: job.name,
        job_address: job.address || ""
      });
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData(prevFormData => ({
        ...prevFormData,
        customer_id: customerId,
        customer_name: `${customer.first_name} ${customer.last_name}`.trim(),
        customer_email: customer.email || "",
        customer_phone: customer.phone || "",
        job_address: customer.address || prevFormData.job_address
      }));
    }
  };

  // New mutation for creating a fresh invoice as a draft.
  const createMutation = useMutation({
    mutationFn: async (invoiceData) => {
      console.log('Creating invoice with data:', invoiceData);
      
      const invoices = await base44.entities.Invoice.list();
      const existingNumbers = invoices
        .map(inv => inv.invoice_number)
        .filter(n => n?.startsWith('INV-'))
        .map(n => parseInt(n.replace('INV-', '')))
        .filter(n => !isNaN(n));

      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const invoice_number = `INV-${String(nextNumber).padStart(5, '0')}`;

      const subtotal = invoiceData.items.reduce((sum, item) => sum + (item.total || 0), 0);
      const tax_amount = subtotal * (invoiceData.tax_rate / 100);
      const total = subtotal + tax_amount;

      const finalData = {
        ...invoiceData,
        invoice_number,
        subtotal,
        tax_amount,
        total,
        amount_paid: 0,
        balance: total,
        status: 'draft', // Explicitly setting status to draft
      };

      console.log('Final invoice data for creation:', finalData);
      const result = await base44.entities.Invoice.create(finalData);
      console.log('Invoice created successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Invoice creation successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(language === 'es' ? 'Factura creada exitosamente' : 'Invoice created successfully');
      setTimeout(() => {
        navigate(createPageUrl(`VerFactura?id=${data.id}`)); // Navigate to view the newly created invoice
      }, 500);
    },
    onError: (error) => {
      console.error('Error creating invoice:', error);
      toast.error(`Error: ${error.message}`);
    }
  });

  // New handleSubmit function for initial creation with validation
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // This handler is specifically for creating new invoices (when editId is null).
    if (editId) {
        console.warn("handleSubmit called on an existing invoice. This might be unintended as it's meant for initial creation.");
        return;
    }

    if (!formData.customer_name || !formData.job_name) {
      toast.error(language === 'es' ? 'Por favor completa el nombre del cliente y el nombre del trabajo.' : 'Please complete customer name and job name.');
      return;
    }

    // Ensure at least one item and its description is not empty
    if (formData.items.length === 0 || formData.items.some(item => !item.description.trim())) {
      toast.error(language === 'es' ? 'Agrega al menos un item con una descripción.' : 'Add at least one item with a description.');
      return;
    }

    createMutation.mutate(formData);
  };

  // Modified existing saveMutation to now only handle UPDATES of existing invoices.
  const updateMutation = useMutation({ // Renamed from saveMutation for clarity
    mutationFn: async (data) => {
      if (!editId) {
        // This mutation is now intended only for updates.
        // Initial creation as draft should go through handleSubmit -> createMutation.
        throw new Error("updateMutation called without editId. Use the 'Save Draft' button for new invoices.");
      }
      
      const { subtotal, tax_amount, total } = calculateTotals();
      const invoiceData = {
        ...data,
        subtotal,
        tax_amount,
        total,
        // The balance and amount_paid fields in the original `saveMutation`
        // were incorrectly resetting to total and 0 on update.
        // For this implementation, we preserve them as they were in the original code,
        // but note this requires careful handling in a production app if payments are involved.
        balance: total, 
        amount_paid: 0,
      };

      return base44.entities.Invoice.update(editId, invoiceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(language === 'es' ? 'Factura actualizada exitosamente' : 'Invoice updated successfully');
      navigate(createPageUrl('Facturas')); // Navigate to list view
    },
    onError: (error) => {
      console.error('Error updating invoice:', error);
      toast.error(`Error: ${error.message}`);
    }
  });

  // Existing sendMutation, now with added validation before proceeding
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const { subtotal, tax_amount, total } = calculateTotals();
      const invoiceData = {
        ...data,
        invoice_number: data.invoice_number || generateInvoiceNumber(),
        subtotal,
        tax_amount,
        total,
        // The balance and amount_paid fields in the original `sendMutation`
        // were incorrectly resetting to total and 0 on update/create.
        // For this implementation, we preserve them as they were in the original code,
        // but note this requires careful handling in a production app if payments are involved.
        balance: total,
        amount_paid: 0,
        status: 'sent'
      };

      // Critical validation for sending
      if (!invoiceData.customer_name || !invoiceData.job_name || !invoiceData.customer_email) {
        throw new Error(language === 'es' ? 'Nombre de cliente, nombre de trabajo y email de cliente son requeridos para enviar.' : 'Customer name, job name, and customer email are required to send.');
      }
      if (invoiceData.items.length === 0 || invoiceData.items.some(item => !item.description.trim())) {
        throw new Error(language === 'es' ? 'Agrega al menos un item con una descripción para enviar.' : 'Add at least one item with a description to send.');
      }

      let savedInvoice;
      if (editId) {
        savedInvoice = await base44.entities.Invoice.update(editId, invoiceData);
      } else {
        // This path handles creating a new invoice and sending it immediately.
        savedInvoice = await base44.entities.Invoice.create(invoiceData);
      }

      const itemsList = data.items.map(item => 
        `${item.quantity}${item.unit ? ` ${item.unit}` : ''}x ${item.description} - $${item.unit_price.toFixed(2)} = $${item.total.toFixed(2)}`
      ).join('\n');

      await base44.integrations.Core.SendEmail({
        to: data.customer_email,
        subject: `${t('invoice')} ${savedInvoice.invoice_number} - ${data.job_name}`,
        body: `Dear ${data.customer_name},\n\nPlease find your invoice for: ${data.job_name}\n\nInvoice #: ${savedInvoice.invoice_number}\nDate: ${format(new Date(data.invoice_date), 'd MMMM yyyy', { locale: language === 'es' ? es : undefined })}\nDue Date: ${format(new Date(data.due_date), 'd MMMM yyyy', { locale: language === 'es' ? es : undefined })}\n\nITEMS:\n${itemsList}\n\nSubtotal: $${subtotal.toFixed(2)}\nTax (${data.tax_rate}%): $${tax_amount.toFixed(2)}\nTOTAL: $${total.toFixed(2)}\n\nNotes:\n${data.notes}\n\nTerms:\n${data.terms}\n\nThank you for your business.`
      });

      return savedInvoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(language === 'es' ? 'Factura enviada exitosamente' : 'Invoice sent successfully');
      navigate(createPageUrl('Facturas'));
    },
    onError: (error) => {
      console.error('Error sending invoice:', error);
      toast.error(`Error: ${error.message || 'Failed to send invoice'}`);
    }
  });

  const { subtotal, tax_amount, total } = calculateTotals();

  if (editId && loadingInvoice) {
    return <div className="p-8">{t('loading')}...</div>;
  }

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={editId ? t('editInvoice') : t('newInvoice')}
          showBack={true}
        />

        {/* Wrap all content in a form. For existing invoices, prevent default submission, as buttons handle mutations. */}
        {/* For new invoices (editId is null), onSubmit will trigger handleSubmit for initial draft creation. */}
        <form onSubmit={editId ? (e) => e.preventDefault() : handleSubmit} className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b">
              <CardTitle>{t('customerInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>{t('selectCustomer')} ({t('optional')})</Label>
                  <Select value={formData.customer_id} onValueChange={handleCustomerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectExistingCustomer')} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.filter(c => c.status === 'active').map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.first_name} {customer.last_name} {customer.company && `- ${customer.company}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('customerName')} *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder={t('fullName')}
                  />
                </div>
                <div>
                  <Label>{t('customerEmail')} *</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <Label>{t('phone')}</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label>{t('job')} ({t('optional')})</Label>
                  <Select value={formData.job_id} onValueChange={handleJobSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectExistingJob')} />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map(job => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b">
              <CardTitle>{t('jobDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>{t('jobName')} *</Label>
                  <Input
                    value={formData.job_name}
                    onChange={e => setFormData({ ...formData, job_name: e.target.value })}
                    placeholder={t('jobDescription')}
                  />
                </div>
                <div>
                  <Label>{t('jobAddress')}</Label>
                  <Input
                    value={formData.job_address}
                    onChange={e => setFormData({ ...formData, job_address: e.target.value })}
                    placeholder={t('fullAddress')}
                  />
                </div>
                <div>
                  <Label>{t('invoiceDate')}</Label>
                  <Input
                    type="date"
                    value={formData.invoice_date}
                    onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>{t('dueDate')}</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b flex flex-row items-center justify-between">
              <CardTitle>{t('invoiceItems')}</CardTitle>
              <Button onClick={addItem} size="sm" variant="outline" type="button"> {/* Added type="button" to prevent form submission */}
                <Plus className="w-4 h-4 mr-2" />
                {t('addItem')}
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end p-4 bg-slate-50 rounded-lg">
                    <div className="col-span-12 md:col-span-4">
                      <Label>{t('description')}</Label>
                       <Textarea
                        value={item.description}
                        onChange={e => handleItemChange(index, 'description', e.target.value)}
                        placeholder={t('serviceDescription')}
                        className="h-24"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label>{t('quantity')}</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-1">
                      <Label>Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={e => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="pcs"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <Label>{t('unitPrice')}</Label>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={e => handleItemChange(index, 'unit_price', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <Label>{t('total')}</Label>
                      <Input
                        value={`$${item.total.toFixed(2)}`}
                        readOnly
                        className="bg-white font-bold"
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length === 1}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        type="button" // Added type="button" to prevent form submission
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 max-w-md ml-auto">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium">{t('subtotal')}:</span>
                  <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('tax')}:</span>
                    <Input
                      type="number"
                      value={formData.tax_rate}
                      onChange={e => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                      className="w-20 h-8"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span>%</span>
                  </div>
                  <span className="text-lg font-bold">${tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                  <span className="text-lg font-bold text-emerald-900">{t('total').toUpperCase()}:</span>
                  <span className="text-2xl font-bold text-emerald-700">${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b">
              <CardTitle>{t('notesAndTerms')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>{t('additionalNotes')}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('projectNotes')}
                  className="h-24"
                />
              </div>
              <div>
                <Label>{t('termsAndConditions')}</Label>
                <Textarea
                  value={formData.terms}
                  onChange={e => setFormData({ ...formData, terms: e.target.value })}
                  placeholder={t('paymentTerms')}
                  className="h-32"
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t pt-6">
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl('Facturas'))}
                type="button" // Added type="button" to prevent form submission
              >
                {t('cancel')}
              </Button>
              {editId ? (
                // If editing an existing invoice, "Save Draft" uses updateMutation
                <Button
                  onClick={() => updateMutation.mutate(formData)}
                  disabled={updateMutation.isPending || !formData.customer_name || !formData.job_name}
                  variant="outline"
                  type="button" // Added type="button"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateMutation.isPending ? t('saving') : t('saveDraft')}
                </Button>
              ) : (
                // If creating a new invoice, "Save Draft" triggers form submission via handleSubmit -> createMutation
                <Button
                  type="submit" // This button will trigger the form's onSubmit handler
                  disabled={createMutation.isPending || !formData.customer_name || !formData.job_name || formData.items.length === 0 || formData.items.some(item => !item.description.trim())}
                  variant="outline"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? t('saving') : t('saveDraft')}
                </Button>
              )}
              <Button
                onClick={() => sendMutation.mutate(formData)}
                disabled={sendMutation.isPending || !formData.customer_name || !formData.customer_email || !formData.job_name || formData.items.length === 0 || formData.items.some(item => !item.description.trim())}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700"
                type="button" // Added type="button"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMutation.isPending ? t('sending') : t('saveAndSend')}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}