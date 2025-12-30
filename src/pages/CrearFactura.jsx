import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { normalizeInvoiceForSave } from "../components/utils/dataValidation";
import { calculateInvoiceTotals } from "../components/utils/quoteCalculations";
import { generateInvoiceNumber } from "@/functions/generateInvoiceNumber";
import { isValidLineItem } from "@/components/core/documentItemRules";
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
import { toast } from 'sonner';
import LineItemsEditor from "../components/documentos/LineItemsEditor";
import { safeErrorMessage } from "@/components/utils/safeErrorMessage";
import OutOfAreaCalculator from "../components/quotes/OutOfAreaCalculator";
import { Checkbox } from "@/components/ui/checkbox";

// Helper to extract invoice number from various response structures
function extractInvoiceNumber(res) {
  if (!res) return '';
  if (typeof res === 'string') return res;                       // "INV-00001"
  if (typeof res?.invoice_number === 'string') return res.invoice_number;
  if (typeof res?.data?.invoice_number === 'string') return res.data.invoice_number;
  if (typeof res?.data === 'string') return res.data;            // por si data = "INV-00001"
  return '';
}

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

  const { data: itemCatalog = [] } = useQuery({
    queryKey: ['itemCatalog'],
    queryFn: () => base44.entities.ItemCatalog.list(),
    initialData: [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: []
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
    team_id: "",
    team_name: "",
    team_ids: [],
    team_names: [],
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    items: [{ item_name: "", description: "", quantity: 1, unit: "pcs", unit_price: 0, total: 0 }],
    tax_rate: 0,
    notes: "",
    terms: "• Payment: Due 30 days from invoice date (unless otherwise specified).\n• Late Fee: 1.5% monthly interest on overdue balance.\n• Collection: Client responsible for all collection costs including attorney fees.\n• Disputes: Report discrepancies within 5 days in writing. Undisputed amounts due by due date.\n• Scope: Final cost includes all approved Change Orders.",
    status: "draft",
    quote_id: quoteId || null
  });

  const [outOfAreaEnabled, setOutOfAreaEnabled] = useState(false);
  const [isCalculatingTravel, setIsCalculatingTravel] = useState(false);

  const handleAddTravelItems = (travelItems) => {
    // Remove existing travel items first
    const nonTravelItems = formData.items.filter(item => !item.is_travel_item);
    
    // Add new travel items
    const updatedItems = [...nonTravelItems, ...travelItems];
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));

    toast.success(language === 'es' ? `${travelItems.length} items de viaje agregados` : `${travelItems.length} travel items added`);
  };

  useEffect(() => {
    if (existingInvoice && !loadingInvoice) {
      // Ensure items have item_name (migrate from legacy name/description fields)
      const itemsWithItemName = (existingInvoice.items || []).map(item => ({
        ...item,
        item_name: (item.item_name ?? item.name ?? ''),
        description: (item.description ?? ''),
        unit: (item.unit ?? item.uom ?? 'pcs'),
      }));

      setFormData({
        ...existingInvoice,
        items: itemsWithItemName,
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
        // Ensure items have item_name preserved from quote
        const itemsWithItemName = (quote.items || []).map(item => ({
          ...item,
          item_name: (item.item_name ?? item.name ?? ''),
          description: (item.description ?? ''),
          unit: (item.unit ?? item.uom ?? 'pcs'),
        }));

        setFormData(prevFormData => ({
          ...prevFormData,
          quote_id: quoteId,
          customer_id: quote.customer_id || prevFormData.customer_id,
          customer_name: quote.customer_name,
          customer_email: quote.customer_email,
          customer_phone: quote.customer_phone,
          job_name: quote.job_name,
          job_id: quote.job_id,
          job_address: quote.job_address,
          items: itemsWithItemName,
          tax_rate: quote.tax_rate,
          notes: quote.notes,
          terms: quote.terms
        }));
      }
    }
  }, [quoteId, quotes]);

  const calculateTotals = () => {
    return calculateInvoiceTotals(formData.items, formData.tax_rate, formData.amount_paid || 0);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = (field === 'description' || field === 'unit' || field === 'item_name') ? value : parseFloat(value) || 0;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_name: "", description: "", quantity: 1, unit: "pcs", unit_price: 0, total: 0 }]
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
        job_address: job.address || "",
        team_id: job.team_id || "",
        team_name: job.team_name || ""
      });
    }
  };

  const handleTeamToggle = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    setFormData(prev => {
      const currentIds = prev.team_ids || [];
      const currentNames = prev.team_names || [];
      const isSelected = currentIds.includes(teamId);

      if (isSelected) {
        // Remove team
        return {
          ...prev,
          team_ids: currentIds.filter(id => id !== teamId),
          team_names: currentNames.filter(name => name !== team.team_name),
          team_id: currentIds[0] === teamId ? (currentIds[1] || '') : prev.team_id,
          team_name: currentNames[0] === team.team_name ? (currentNames[1] || '') : prev.team_name
        };
      } else {
        // Add team
        return {
          ...prev,
          team_ids: [...currentIds, teamId],
          team_names: [...currentNames, team.team_name],
          team_id: currentIds.length === 0 ? teamId : prev.team_id,
          team_name: currentNames.length === 0 ? team.team_name : prev.team_name
        };
      }
    });
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      const customerName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      setFormData(prevFormData => ({
        ...prevFormData,
        customer_id: customerId,
        customer_name: customerName,
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
      
      // DEV LOG
      if (import.meta.env.DEV) {
        console.log("[Invoice before normalize]", invoiceData.items.map(i => ({
          item_name: i.item_name,
          description: i.description,
          unit: i.unit,
          unit_price: i.unit_price
        })));
      }
      
      // Step 1: Normalize and validate data
      const normalizedData = normalizeInvoiceForSave(invoiceData);
      
      // Step 2: Generate invoice number via backend function (thread-safe)
      if (import.meta.env.DEV) {
        console.log('[InvoiceNumber] calling backend generateInvoiceNumber()');
      }
      const raw = await generateInvoiceNumber({});
      
      if (import.meta.env.DEV) {
        console.log('[InvoiceNumber] raw response:', raw);
      }
      
      const invoiceNumber = extractInvoiceNumber(raw);

      if (!invoiceNumber) {
        console.error('❌ Invoice number missing from generateInvoiceNumber response. Raw:', raw);
        throw new Error('Invoice number missing from generateInvoiceNumber response');
      }

      const invoice_number = invoiceNumber;
      
      if (import.meta.env.DEV) {
        console.log('[InvoiceNumber] ✅ resolved:', invoice_number);
      }

      // Step 3: Build final data with generated number
      const finalData = {
        ...normalizedData,
        invoice_number,
        status: 'draft',
      };

      console.log('Final invoice data (normalized):', finalData);
      
      // Step 4: Auto-create Job BEFORE creating invoice if needed
      let jobId = finalData.job_id;
      if (!jobId && finalData.job_name) {
        console.log('🏗️ Auto-creating Job from invoice...');
        try {
          const newJob = await base44.entities.Job.create({
            name: finalData.job_name,
            address: finalData.job_address || '',
            city: finalData.job_address ? '' : '',
            state: '',
            zip: '',
            customer_id: finalData.customer_id || '',
            customer_name: finalData.customer_name || '',
            contract_amount: finalData.total || 0,
            estimated_cost: 0,
            estimated_hours: 0,
            status: 'active',
            team_id: finalData.team_id || '',
            team_name: finalData.team_name || '',
            color: 'blue',
            description: `Auto-created from Invoice ${invoice_number}`
          });
          
          jobId = newJob.id;
          finalData.job_id = newJob.id;
          console.log('✅ Job auto-created:', newJob.id, newJob.name);
        } catch (jobError) {
          console.error('⚠️ Error auto-creating job:', jobError);
        }
      }
      
      const result = await base44.entities.Invoice.create(finalData);
      console.log('Invoice created successfully:', result);
      
      return result;
    },
    onSuccess: async (data) => {
      console.log('Invoice creation successful, invalidating queries...');
      
      // DEV LOG: Verify item_name persistence after save
      if (import.meta.env.DEV) {
        const saved = await base44.entities.Invoice.filter({ id: data.id }).then(r => r[0]);
        console.log("[Invoice after save DB read]", saved.items.map(i => ({
          item_name: i.item_name,
          description: i.description,
          calculation_type: i.calculation_type,
          tech_count: i.tech_count,
          duration_value: i.duration_value,
          is_travel_item: i.is_travel_item
        })));
      }
      
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      await queryClient.refetchQueries({ queryKey: ['invoices'] });
      toast.success(language === 'es' ? 'Factura creada exitosamente' : 'Invoice created successfully');
      setTimeout(() => {
        navigate(createPageUrl(`VerFactura?id=${data.id}`));
      }, 800);
    },
    onError: (error) => {
      console.error('Error creating invoice:', error);
      toast.error(safeErrorMessage(error));
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

    // Unified validation using isValidLineItem
    const invalid = (formData.items || []).filter(i => !isValidLineItem(i));
    if (invalid.length > 0) {
      toast.error(language === 'es' ? 'Por favor completa todos los campos requeridos de los items' : 'Please complete all required item fields');
      return;
    }

    createMutation.mutate(formData);
  };

  // Modified existing saveMutation to now only handle UPDATES of existing invoices.
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      if (!editId) {
        throw new Error("updateMutation called without editId");
      }
      
      console.log('Updating invoice with data:', data);
      
      // DEV LOG
      if (import.meta.env.DEV) {
        console.log("[Invoice before normalize]", data.items.map(i => ({
          item_name: i.item_name,
          description: i.description,
          unit: i.unit,
          unit_price: i.unit_price
        })));
      }
      
      // Normalize and validate data (preserves payment info)
      const normalizedData = normalizeInvoiceForSave({
        ...data,
        amount_paid: existingInvoice?.amount_paid || 0, // Preserve existing payments
      });

      console.log('Final invoice data (normalized):', normalizedData);
      return base44.entities.Invoice.update(editId, normalizedData);
    },
    onSuccess: async (data) => {
      // DEV LOG: Verify item_name persistence after update
      if (import.meta.env.DEV) {
        const saved = await base44.entities.Invoice.filter({ id: editId }).then(r => r[0]);
        console.log("[Invoice after save DB read]", saved.items.map(i => ({
          item_name: i.item_name,
          description: i.description,
          calculation_type: i.calculation_type,
          tech_count: i.tech_count,
          duration_value: i.duration_value,
          is_travel_item: i.is_travel_item
        })));
      }
      
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.refetchQueries({ queryKey: ['invoices'] });
      toast.success(language === 'es' ? 'Factura actualizada exitosamente' : 'Invoice updated successfully');
      setTimeout(() => {
        navigate(createPageUrl(`VerFactura?id=${editId}`));
      }, 800);
    },
    onError: (error) => {
      console.error('Error updating invoice:', error);
      toast.error(safeErrorMessage(error));
    }
  });

  // Send mutation with normalization
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Sending invoice with data:', data);
      
      // Normalize and validate
      const normalizedData = normalizeInvoiceForSave({
        ...data,
        amount_paid: editId ? existingInvoice?.amount_paid || 0 : 0,
      });

      // Ensure we have an invoice number
      let invoice_number = normalizedData.invoice_number;
      if (!invoice_number) {
        if (import.meta.env.DEV) {
          console.log('[InvoiceNumber] calling backend generateInvoiceNumber()');
        }
        const raw = await generateInvoiceNumber({});
        
        if (import.meta.env.DEV) {
          console.log('[InvoiceNumber] raw response:', raw);
        }
        
        const invoiceNumber = extractInvoiceNumber(raw);

        if (!invoiceNumber) {
          console.error('❌ Invoice number missing from generateInvoiceNumber response. Raw:', raw);
          throw new Error('Invoice number missing from generateInvoiceNumber response');
        }

        invoice_number = invoiceNumber;
        
        if (import.meta.env.DEV) {
          console.log('[InvoiceNumber] ✅ resolved:', invoice_number);
        }
      }

      const invoiceData = {
        ...normalizedData,
        invoice_number,
        status: 'sent'
      };

      // Auto-create Job if needed BEFORE saving invoice
      let jobId = invoiceData.job_id;
      if (!jobId && invoiceData.job_name) {
        console.log('🏗️ Auto-creating Job from invoice (send flow)...');
        try {
          const newJob = await base44.entities.Job.create({
            name: invoiceData.job_name,
            address: invoiceData.job_address || '',
            city: '',
            state: '',
            zip: '',
            customer_id: invoiceData.customer_id || '',
            customer_name: invoiceData.customer_name || '',
            contract_amount: invoiceData.total || 0,
            estimated_cost: 0,
            estimated_hours: 0,
            status: 'active',
            team_id: invoiceData.team_id || '',
            team_name: invoiceData.team_name || '',
            color: 'blue',
            description: `Auto-created from Invoice ${invoice_number}`
          });
          
          jobId = newJob.id;
          invoiceData.job_id = newJob.id;
          console.log('✅ Job auto-created (send):', newJob.id, newJob.name);
        } catch (jobError) {
          console.error('⚠️ Error auto-creating job:', jobError);
        }
      }

      let savedInvoice;
      if (editId) {
        savedInvoice = await base44.entities.Invoice.update(editId, invoiceData);
      } else {
        savedInvoice = await base44.entities.Invoice.create(invoiceData);
      }

      // Send email
      const itemsList = invoiceData.items.map(item => 
        `${item.quantity}${item.unit ? ` ${item.unit}` : ''}x ${item.description} - $${item.unit_price.toFixed(2)} = $${item.total.toFixed(2)}`
      ).join('\n');

      await base44.integrations.Core.SendEmail({
        to: invoiceData.customer_email,
        subject: `${t('invoice')} ${invoice_number} - ${invoiceData.job_name}`,
        body: `Dear ${invoiceData.customer_name},\n\nPlease find your invoice for: ${invoiceData.job_name}\n\nInvoice #: ${invoice_number}\nDate: ${format(new Date(invoiceData.invoice_date), 'd MMMM yyyy', { locale: language === 'es' ? es : undefined })}\nDue Date: ${format(new Date(invoiceData.due_date), 'd MMMM yyyy', { locale: language === 'es' ? es : undefined })}\n\nITEMS:\n${itemsList}\n\nSubtotal: $${invoiceData.subtotal.toFixed(2)}\nTax (${invoiceData.tax_rate}%): $${invoiceData.tax_amount.toFixed(2)}\nTOTAL: $${invoiceData.total.toFixed(2)}\n\nNotes:\n${invoiceData.notes}\n\nTerms:\n${invoiceData.terms}\n\nThank you for your business.`
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
      toast.error(safeErrorMessage(error, 'Failed to send invoice'));
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
                  <Select value={formData.customer_id || ""} onValueChange={handleCustomerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectExistingCustomer')}>
                        {formData.customer_id ? (() => {
                          const selected = customers.find(c => c.id === formData.customer_id);
                          if (!selected) return t('selectExistingCustomer');
                          const personName = selected.name || `${selected.first_name || ''} ${selected.last_name || ''}`.trim();
                          return selected.company ? `${selected.company} - ${personName}` : personName;
                        })() : t('selectExistingCustomer')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {customers.filter(c => c.status === 'active').map(customer => {
                        const personName = customer.name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
                        const displayText = customer.company 
                          ? `${customer.company} - ${personName}`
                          : personName;
                        
                        return (
                          <SelectItem key={customer.id} value={customer.id}>
                            {displayText}
                          </SelectItem>
                        );
                      })}
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

          {/* Team Selection Card */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b">
              <CardTitle>{language === 'es' ? 'Equipos Asignados' : 'Assigned Teams'}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {teams.map(team => (
                  <div
                    key={team.id}
                    onClick={() => handleTeamToggle(team.id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      (formData.team_ids || []).includes(team.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={(formData.team_ids || []).includes(team.id)}
                        onCheckedChange={() => handleTeamToggle(team.id)}
                        className="pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {team.team_name}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                          {team.location}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Out of Area Travel Section */}
          {formData.job_address && (formData.team_ids || []).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="out-of-area"
                  checked={outOfAreaEnabled}
                  onCheckedChange={setOutOfAreaEnabled}
                />
                <Label htmlFor="out-of-area" className="text-sm font-medium cursor-pointer">
                  {language === 'es' ? 'Calcular viaje fuera de área' : 'Calculate out of area travel'}
                </Label>
              </div>

              {outOfAreaEnabled && (
                <OutOfAreaCalculator
                  jobAddress={formData.job_address}
                  selectedTeamIds={formData.team_ids || []}
                  onAddTravelItems={handleAddTravelItems}
                  isCalculating={isCalculatingTravel}
                  setIsCalculating={setIsCalculatingTravel}
                />
              )}
            </div>
          )}

          <Card className="border-0 shadow-lg">
            <CardHeader className="border-b flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">{t('invoiceItems')}</CardTitle>
              <Button onClick={addItem} size="sm" variant="outline" type="button">
                <Plus className="w-3 h-3 mr-1" />
                <span className="text-xs">{t('addItem')}</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <LineItemsEditor 
                items={formData.items}
                onItemsChange={(newItems) => setFormData({ ...formData, items: newItems })}
                catalogItems={itemCatalog}
                allowCatalogSelect={true}
                allowReorder={false}
                onToast={(toastData) => toast[toastData.variant || 'success'](toastData.title, { description: toastData.description })}
              />

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
                  disabled={createMutation.isPending || !formData.customer_name || !formData.job_name || (formData.items || []).some(i => !isValidLineItem(i))}
                  variant="outline"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createMutation.isPending ? t('saving') : t('saveDraft')}
                </Button>
              )}
              <Button
                onClick={() => sendMutation.mutate(formData)}
                disabled={sendMutation.isPending || !formData.customer_name || !formData.customer_email || !formData.job_name || (formData.items || []).some(i => !isValidLineItem(i))}
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