import React, { useState, useEffect, useMemo } from "react";
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
import { Plus, Trash2, Save, Send, RefreshCw, Lock, Clock, Check, ChevronsUpDown } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { canCreateFinancialDocs, needsApproval, canSendDocument } from "@/components/core/roleRules";
import ApprovalBanner from "@/components/shared/ApprovalBanner";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import { getCustomerDisplayName, sortCustomersByName } from "@/components/utils/nameHelpers";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

import { Badge } from "@/components/ui/badge";
/**
 * ============================================================================
 * CAPA 7 - INVOICE SNAPSHOT (NO RECALCULATION)
 * ============================================================================
 * 
 * ⚠️ CRITICAL: Invoices inherit quantities as SNAPSHOT from Quote.
 * 
 * When Invoice is created from Quote:
 * - ALL quantities are copied as-is (including hotel, per diem)
 * - Invoice does NOT recalculate derived values
 * - Invoice displays inherited snapshot
 * 
 * This prevents financial discrepancies:
 * - Quote: $5,800 (approved by client)
 * - Invoice: $5,800 (must match quote exactly)
 * 
 * DO NOT call computeQuoteDerived on Invoices.
 */

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
  const billingType = urlParams.get('billing_type');
  const jobIdFromUrl = urlParams.get('job_id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const canCreate = canCreateFinancialDocs(user);
  const requiresApproval = needsApproval(user);

  // QUERY OPTIMIZATION: Add staleTime and refetch config to all lookups
  const { data: invoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: [],
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: quotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
    initialData: [],
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const result = await base44.entities.Customer.list();
      console.log('Customers loaded:', result?.length || 0);
      return result;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 3
  });

  const { data: quoteItems = [] } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list(),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: companySettings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const data = await base44.entities.CompanySettings.list();
      return data[0] || {};
    },
    staleTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
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
    work_details: "",
    team_id: "",
    team_name: "",
    team_ids: [],
    team_names: [],
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    items: [{ item_name: "", description: "", quantity: 1, unit: "pcs", unit_price: 0, total: 0 }],
    tax_rate: 0,
    auto_tax_enabled: false,
    notes: "",
    terms: "• Payment: Due 30 days from invoice date (unless otherwise specified).\n• Late Fee: 1.5% monthly interest on overdue balance.\n• Collection: Client responsible for all collection costs including attorney fees.\n• Disputes: Report discrepancies within 5 days in writing. Undisputed amounts due by due date.\n• Scope: Final cost includes all approved Change Orders.",
    status: "draft",
    quote_id: quoteId || null
  });

  const [isCalculatingTravel, setIsCalculatingTravel] = useState(false);
  const [generatingFromHours, setGeneratingFromHours] = useState(false);
  const [pricesLocked, setPricesLocked] = useState(false);
  


  useEffect(() => {
    if (existingInvoice && !loadingInvoice) {
      // Ensure items have item_name (migrate from legacy name/description fields)
      const itemsWithItemName = (existingInvoice.items || []).map(item => ({
        ...item,
        item_name: (item.item_name ?? item.name ?? ''),
        description: (item.description ?? ''),
        unit: (item.unit ?? item.uom ?? 'pcs'),
        // REMOVE auto-calculation flags - invoices are editable snapshots
        auto_calculated: false,
        manual_override: false
      }));

      // Lock prices if invoice was sent
      const shouldLockPrices = existingInvoice.status === 'sent' || existingInvoice.status === 'paid' || existingInvoice.status === 'partial';
      setPricesLocked(shouldLockPrices);

      // Safe date formatting with validation
      const formatSafeDate = (dateValue) => {
        if (!dateValue) return format(new Date(), 'yyyy-MM-dd');
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return format(new Date(), 'yyyy-MM-dd');
          return format(date, 'yyyy-MM-dd');
        } catch {
          return format(new Date(), 'yyyy-MM-dd');
        }
      };

      setFormData({
        ...existingInvoice,
        items: itemsWithItemName,
        // Ensure date formats are correct for input type="date"
        invoice_date: formatSafeDate(existingInvoice.invoice_date),
        due_date: formatSafeDate(existingInvoice.due_date),
        auto_tax_enabled: existingInvoice.auto_tax_enabled ?? false
      });
    }
  }, [existingInvoice, loadingInvoice]);

  // ============================================================================
  // CAPA 7 - QUOTE → INVOICE SNAPSHOT
  // ============================================================================
  // When loading from Quote, copy ALL values as-is (SNAPSHOT)
  // DO NOT recalculate hotel rooms, per diem, or any derived values
  // Generate invoice from hours for T&M jobs
  useEffect(() => {
    if (billingType === 'time_materials' && jobIdFromUrl && !generatingFromHours) {
      setGeneratingFromHours(true);
      
      const generateFromHours = async () => {
        try {
          const { data } = await base44.functions.invoke('generateInvoiceFromHours', { job_id: jobIdFromUrl });
          
          if (data.success && data.invoice_data) {
            setFormData(prev => ({
              ...prev,
              ...data.invoice_data,
              items: data.invoice_data.items || []
            }));
            
            toast({
              title: language === 'es' ? '✅ Factura generada desde horas trabajadas' : '✅ Invoice generated from hours',
              description: language === 'es' 
                ? `${data.summary.total_hours.toFixed(1)} horas • ${data.summary.employees_count} empleados • $${data.invoice_data.total.toFixed(2)}`
                : `${data.summary.total_hours.toFixed(1)} hours • ${data.summary.employees_count} employees • $${data.invoice_data.total.toFixed(2)}`,
              variant: 'success'
            });
          }
        } catch (error) {
          console.error('Error generating invoice from hours:', error);
          toast({
            title: 'Error',
            description: safeErrorMessage(error),
            variant: 'destructive'
          });
        } finally {
          setGeneratingFromHours(false);
        }
      };
      
      generateFromHours();
    }
  }, [billingType, jobIdFromUrl, generatingFromHours, language]);

  useEffect(() => {
    if (quoteId && quotes.length > 0) {
      const quote = quotes.find(q => q.id === quoteId);
      if (quote) {
        // ⚠️ CRITICAL: Preserve ALL quantities from quote (SNAPSHOT)
        // Items with auto_calculated flag still use their stored quantity
        // This is the accepted value from quote - DO NOT recalculate
        const itemsWithItemName = (quote.items || []).map(item => ({
          ...item,
          item_name: (item.item_name ?? item.name ?? ''),
          description: (item.description ?? ''),
          unit: (item.unit ?? item.uom ?? 'pcs'),
          // SNAPSHOT: Keep quantity as-is from quote
          quantity: item.quantity,
          total: item.quantity * (item.unit_price || 0),
          // REMOVE auto-calculation flags in invoices - they're editable snapshots
          auto_calculated: false,
          manual_override: false
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

  // ============================================================================
  // CAPA 7 - INVOICE TOTALS (NO RECALCULATION)
  // ============================================================================
  // Invoice uses snapshot quantities from Quote
  // NO enrichment, NO recalculation of derived values
  const totals = useMemo(() => {
    // Use items as-is (snapshot from quote or manual entry)
    return calculateInvoiceTotals(formData.items, formData.tax_rate, formData.amount_paid || 0);
  }, [formData.items, formData.tax_rate, formData.amount_paid]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = (field === 'description' || field === 'unit' || field === 'item_name') ? value : parseFloat(value) || 0;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }
    
    // No need to manually update quantities - they are derived automatically
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_name: "", description: "", quantity: 1, unit: "pcs", unit_price: 0, total: 0 }]
    });
  };

  const handleRefreshPrices = () => {
    if (!window.confirm(
      language === 'es'
        ? '¿Actualizar desde el catálogo?\n\nEsto actualizará precios y tiempos de instalación. Las cantidades no cambiarán.'
        : 'Update from catalog?\n\nThis will update prices and installation times. Quantities will not change.'
    )) {
      return;
    }

    const updatedItems = formData.items.map(item => {
      if (!item.item_name) return item;
      
      const catalogItem = quoteItems.find(qi => qi.name === item.item_name);
      if (catalogItem) {
        return {
          ...item,
          unit_price: catalogItem.unit_price || item.unit_price,
          installation_time: catalogItem.installation_time || item.installation_time,
          total: (item.quantity || 0) * (catalogItem.unit_price || item.unit_price)
        };
      }
      return item;
    });

    setFormData({ ...formData, items: updatedItems });
    
    toast.success(
      language === 'es' ? 'Actualizado desde catálogo' : 'Updated from catalog',
      { 
        description: language === 'es' 
          ? 'Precios y tiempos actualizados'
          : 'Prices and times updated'
      }
    );
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
      setFormData(prevFormData => ({
        ...prevFormData,
        customer_id: customerId,
        customer_name: getCustomerDisplayName(customer),
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
      
      // DEBUG: Log quantities BEFORE save
      if (import.meta.env.DEV) {
        console.log('[QUANTITY SNAPSHOT] BEFORE SAVE:', normalizedData.items.map(i => ({
          item_name: i.item_name,
          sent_quantity: invoiceData.items[normalizedData.items.indexOf(i)]?.quantity,
          saved_quantity: i.quantity
        })));
      }
      
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

      // Step 3: Build final data with generated number + approval workflow
      const approvalStatus = requiresApproval ? 'pending_approval' : 'approved';
      
      // CRITICAL: Recalculate balance from totals
      const recalculatedBalance = normalizedData.total - (normalizedData.amount_paid || 0);
      
      // WRITE GUARD — STRICT MODE for Invoice (blocks without user_id)
      const finalData = {
        ...normalizedData,
        invoice_number,
        balance: recalculatedBalance,
        status: 'draft',
        approval_status: approvalStatus,
        created_by_user_id: user?.id,
        created_by_role: user?.position || user?.role || '',
        ...(approvalStatus === 'approved' && {
          approved_by: user.email,
          approved_at: new Date().toISOString()
        })
      };

      // STRICT MODE: Block if user_id missing
      if (!user?.id) {
        console.error('[WRITE GUARD] 🚫 STRICT MODE: Blocking Invoice without user_id', {
          email: user?.email,
          invoice_number
        });
        
        throw new Error(language === 'es'
          ? '🔒 Identidad de usuario requerida. Por favor cierra sesión y vuelve a iniciar sesión antes de crear facturas.'
          : '🔒 User identity required. Please logout and login again before creating invoices.');
      }

      console.log('Final invoice data (normalized):', finalData);
      
      // Try to auto-link to existing job if job_name provided but no job_id
      if (!finalData.job_id && finalData.job_name) {
        const duplicateJobs = await base44.entities.Job.filter({
          name: finalData.job_name,
          customer_id: finalData.customer_id || ''
        });
        if (duplicateJobs.length > 0) {
          finalData.job_id = duplicateJobs[0].id;
        }
        // If no job found, save draft anyway without job_id (user can link later)
      }
      
      const result = await base44.entities.Invoice.create(finalData);
      
      // DEBUG: Log quantities AFTER reload
      if (import.meta.env.DEV) {
        console.log('[QUANTITY SNAPSHOT] AFTER SAVE & RELOAD:', result.items.map(i => ({
          item_name: i.item_name,
          loaded_quantity: i.quantity,
          invoice_total: result.total
        })));
      }
      
      console.log('Invoice created successfully:', result);
      
      // TRIGGER 2: Manual Invoice Creation Provisioning (ONLY IF APPROVED)
      if (finalData.approval_status === 'approved') {
        try {
          await base44.functions.invoke('provisionJobFromInvoice', {
            invoice_id: result.id
          });
        } catch (provisionError) {
          console.warn('Provisioning failed (non-critical):', provisionError);
        }
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Invoice'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({
        title: language === 'es' ? 'Factura creada exitosamente' : 'Invoice created successfully',
        variant: 'success'
      });
      navigate(createPageUrl(`VerFactura?id=${data.id}`));
    },
    onError: (error) => {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: safeErrorMessage(error),
        variant: 'destructive'
      });
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
      toast({
        title: 'Error',
        description: language === 'es' ? 'Por favor completa el nombre del cliente y el nombre del trabajo.' : 'Please complete customer name and job name.',
        variant: 'destructive'
      });
      return;
    }

    // For drafts, allow incomplete items - filter out empty ones
    const validItems = (formData.items || []).filter(i => 
      i.item_name || i.description || i.quantity > 0 || i.unit_price > 0
    );

    // Calculate estimated hours from items
    const estimated_hours = validItems.reduce((sum, item) => {
      const hours = (item.installation_time || 0) * (item.quantity || 0);
      return sum + hours;
    }, 0);

    createMutation.mutate({
      ...formData,
      items: validItems.length > 0 ? validItems : [{ item_name: "", description: "", quantity: 1, unit: "pcs", unit_price: 0, total: 0 }],
      estimated_hours
    });
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
      
      // Calculate estimated hours from items
      const estimated_hours = (data.items || []).reduce((sum, item) => {
        const hours = (item.installation_time || 0) * (item.quantity || 0);
        return sum + hours;
      }, 0);
      
      // Normalize and validate data (preserves payment info)
      const normalizedData = normalizeInvoiceForSave({
        ...data,
        estimated_hours,
        amount_paid: existingInvoice?.amount_paid || 0, // Preserve existing payments
      });

      // CRITICAL: Recalculate balance from updated totals
      const recalculatedBalance = normalizedData.total - (normalizedData.amount_paid || 0);
      normalizedData.balance = recalculatedBalance;

      console.log('Final invoice data (normalized):', normalizedData);
      
      // DEBUG: Log quantities on UPDATE
      if (import.meta.env.DEV) {
        console.log('[QUANTITY SNAPSHOT] UPDATE:', normalizedData.items.map(i => ({
          item_name: i.item_name,
          update_quantity: i.quantity
        })));
      }
      
      return base44.entities.Invoice.update(editId, normalizedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Invoice'] });
      toast({
        title: language === 'es' ? 'Factura actualizada exitosamente' : 'Invoice updated successfully',
        variant: 'success'
      });
      navigate(createPageUrl(`VerFactura?id=${editId}`));
    },
    onError: (error) => {
      console.error('Error updating invoice:', error);
      toast({
        title: 'Error',
        description: safeErrorMessage(error),
        variant: 'destructive'
      });
    }
  });

  // Send mutation with normalization
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      // APPROVAL GATE: Cannot send if pending approval
      const effectiveStatus = editId && existingInvoice 
        ? (existingInvoice.approval_status || 'approved')
        : (requiresApproval ? 'pending_approval' : 'approved');

      if (effectiveStatus !== 'approved') {
        throw new Error(
          language === 'es'
            ? 'Este documento está pendiente de aprobación. Pide a un administrador que lo apruebe primero.'
            : 'This document is pending approval. Ask an admin to approve it first.'
        );
      }

      console.log('Sending invoice with data:', data);
      
      // Calculate estimated hours from items
      const estimated_hours = (data.items || []).reduce((sum, item) => {
        const hours = (item.installation_time || 0) * (item.quantity || 0);
        return sum + hours;
      }, 0);
      
      // Normalize and validate
      const normalizedData = normalizeInvoiceForSave({
        ...data,
        estimated_hours,
        amount_paid: editId ? existingInvoice?.amount_paid || 0 : 0,
      });

      // CRITICAL: Recalculate balance from updated totals
      const recalculatedBalance = normalizedData.total - (normalizedData.amount_paid || 0);
      normalizedData.balance = recalculatedBalance;

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

      // Try to auto-link to existing job if job_name provided but no job_id
      if (!invoiceData.job_id && invoiceData.job_name) {
        const duplicateJobs = await base44.entities.Job.filter({
          name: invoiceData.job_name,
          customer_id: invoiceData.customer_id || ''
        });
        if (duplicateJobs.length > 0) {
          invoiceData.job_id = duplicateJobs[0].id;
        }
      }

      let savedInvoice;
      if (editId) {
        savedInvoice = await base44.entities.Invoice.update(editId, invoiceData);
      } else {
        savedInvoice = await base44.entities.Invoice.create(invoiceData);
      }
      
      // TRIGGER 3: Invoice Send Provisioning (ONLY IF APPROVED)
      if (!editId && effectiveStatus === 'approved') {
        try {
          await base44.functions.invoke('provisionJobFromInvoice', {
            invoice_id: savedInvoice.id
          });
        } catch (provisionError) {
          console.warn('Provisioning failed (non-critical):', provisionError);
        }
      }

      // Send email
      const itemsList = invoiceData.items.map(item => 
        `${item.quantity}${item.unit ? ` ${item.unit}` : ''}x ${item.description} - $${item.unit_price.toFixed(2)} = $${item.total.toFixed(2)}`
      ).join('\n');

      // Safe date formatting for email
      const formatEmailDate = (dateValue) => {
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) return 'N/A';
          return format(date, 'd MMMM yyyy', { locale: language === 'es' ? es : undefined });
        } catch {
          return 'N/A';
        }
      };

      await base44.integrations.Core.SendEmail({
        to: invoiceData.customer_email,
        subject: `${t('invoice')} ${invoice_number} - ${invoiceData.job_name}`,
        body: `Dear ${invoiceData.customer_name},\n\nPlease find your invoice for: ${invoiceData.job_name}\n\nInvoice #: ${invoice_number}\nDate: ${formatEmailDate(invoiceData.invoice_date)}\nDue Date: ${formatEmailDate(invoiceData.due_date)}\n\nITEMS:\n${itemsList}\n\nSubtotal: $${invoiceData.subtotal.toFixed(2)}\nTax (${invoiceData.tax_rate}%): $${invoiceData.tax_amount.toFixed(2)}\nTOTAL: $${invoiceData.total.toFixed(2)}\n\nNotes:\n${invoiceData.notes}\n\nTerms:\n${invoiceData.terms}\n\nThank you for your business.`
      });

      return savedInvoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: language === 'es' ? 'Factura enviada exitosamente' : 'Invoice sent successfully',
        variant: 'success'
      });
      navigate(createPageUrl('Facturas'));
    },
    onError: (error) => {
      console.error('Error sending invoice:', error);
      toast({
        title: 'Error',
        description: safeErrorMessage(error, 'Failed to send invoice'),
        variant: 'destructive'
      });
    }
  });

  const { subtotal, tax_amount, total, balance } = totals;

  if (editId && loadingInvoice) {
    return <div className="p-8">{t('loading')}...</div>;
  }

  // Block non-authorized users
  if (user && !canCreate) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">
              {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
            </h2>
            <p className="text-red-700">
              {language === 'es' 
                ? 'No tienes permisos para crear facturas. Solo CEO, Administrator, Admin, o Manager pueden crear documentos financieros.'
                : 'You do not have permission to create invoices. Only CEO, Administrator, Admin, or Manager can create financial documents.'}
            </p>
            <Button 
              className="mt-4" 
              onClick={() => navigate(createPageUrl('Facturas'))}
            >
              {language === 'es' ? 'Volver a Facturas' : 'Back to Invoices'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const effectiveApprovalStatus = editId && existingInvoice
    ? (existingInvoice.approval_status || 'approved')
    : (requiresApproval ? 'pending_approval' : 'approved');

  const canSend = canSendDocument({ approval_status: effectiveApprovalStatus });

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={editId ? t('editInvoice') : (billingType === 'time_materials' ? (language === 'es' ? 'Factura T&M' : 'T&M Invoice') : t('newInvoice'))}
          showBack={true}
        />

        {/* Fixed Total Bar */}
        <div className="sticky top-0 z-10 mb-6 p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl shadow-xl border-2 border-emerald-300">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <p className="text-sm opacity-90">{language === 'es' ? 'Total de la Factura' : 'Invoice Total'}</p>
              <p className="text-4xl font-bold">${total.toFixed(2)}</p>
            </div>
            <div className="text-right text-white text-sm">
              <p className="opacity-90">{t('subtotal')}: ${subtotal.toFixed(2)}</p>
              <p className="opacity-90">{t('tax')}: ${tax_amount.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">{formData.items.length} {language === 'es' ? 'ítems' : 'items'}</p>
            </div>
          </div>
        </div>

        {/* T&M Invoice Info Banner */}
        {billingType === 'time_materials' && (
          <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-emerald-900 mb-1">
                    {language === 'es' ? 'Factura generada desde horas trabajadas' : 'Invoice generated from hours worked'}
                  </h3>
                  <p className="text-sm text-emerald-700">
                    {language === 'es' 
                      ? 'Esta factura se generó automáticamente desde las horas aprobadas. Puedes editar las horas, tarifas, y cantidades antes de enviar.'
                      : 'This invoice was auto-generated from approved hours. You can edit hours, rates, and quantities before sending.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Approval Banner */}
        {editId && existingInvoice && (
          <ApprovalBanner
            approval_status={existingInvoice.approval_status}
            approved_by={existingInvoice.approved_by}
            rejected_by={existingInvoice.rejected_by}
            approval_notes={existingInvoice.approval_notes}
          />
        )}

        {/* Wrap all content in a form. For existing invoices, prevent default submission, as buttons handle mutations. */}
        {/* For new invoices (editId is null), onSubmit will trigger handleSubmit for initial draft creation. */}
        <form onSubmit={editId ? (e) => e.preventDefault() : handleSubmit} className="space-y-6">
          <Card className="glass-card shadow-xl border-slate-200 mb-6">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900">{t('customerInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">{t('selectCustomer')}</Label>
                  <Select value={formData.customer_id || ""} onValueChange={handleCustomerSelect}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder={t('selectCustomer')} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 max-h-[300px] overflow-y-auto">
                      {customers && customers.length > 0 ? (
                        sortCustomersByName(customers).map(customer => (
                          <SelectItem key={customer.id} value={customer.id} className="text-slate-900">
                            {getCustomerDisplayName(customer)}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-slate-500 text-center">
                          {language === 'es' ? 'Sin clientes disponibles' : 'No customers available'}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700">{t('customerName')} *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700">{t('customerEmail')}</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={e => setFormData({ ...formData, customer_email: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700">{t('customerPhone')}</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-xl border-slate-200 mb-6">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900">{t('jobDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">{t('selectExistingJob')} ({t('optional')})</Label>
                  <Select value={formData.job_id} onValueChange={handleJobSelect}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder={t('selectExistingJob')} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 z-50">
                      {jobs.map(job => (
                        <SelectItem key={job.id} value={job.id} className="text-slate-900">
                          {job.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700">{t('jobName')} *</Label>
                  <Input
                    value={formData.job_name}
                    onChange={e => setFormData({ ...formData, job_name: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-slate-700">{t('jobAddress')}</Label>
                  <AddressAutocomplete
                    value={formData.job_address}
                    onChange={(value) => setFormData({ ...formData, job_address: value })}
                    onPlaceSelected={(placeData) => {
                      setFormData({ ...formData, job_address: placeData.full_address || placeData.address });
                    }}
                    placeholder={language === 'es' ? 'Ej: 123 Main St, Los Angeles, CA 90001' : 'e.g., 123 Main St, Los Angeles, CA 90001'}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                   <Label className="text-slate-700">{language === 'es' ? 'Detalles del Trabajo' : 'Work Details'} ({t('optional')})</Label>
                   <Textarea
                     value={formData.work_details || ''}
                     onChange={e => setFormData({ ...formData, work_details: e.target.value })}
                     className="h-20 bg-white border-slate-300 text-slate-900"
                     placeholder={language === 'es' ? 'Ej: Piso 2, Habitación 205, lado norte...' : 'e.g., Floor 2, Room 205, north side...'}
                   />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-slate-700">Teams {(formData.team_ids || []).length > 0 && <span className="text-blue-600">({(formData.team_ids || []).length} selected)</span>}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between bg-white border-slate-300 text-slate-900 h-10"
                      >
                        <span className="truncate">
                          {(formData.team_ids || []).length === 0
                            ? (language === 'es' ? 'Seleccionar equipos' : 'Select teams')
                            : (formData.team_names || []).join(', ')}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-2 bg-white border-slate-200 z-50" align="start">
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {teams.map(team => {
                          const isSelected = (formData.team_ids || []).includes(team.id);
                          return (
                            <div
                              key={team.id}
                              onClick={() => handleTeamToggle(team.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                                isSelected ? 'bg-emerald-100 text-emerald-900' : 'hover:bg-slate-100'
                              }`}
                            >
                              <Check className={`h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{team.team_name}</div>
                                {team.base_address && (
                                  <div className="text-xs text-slate-500">📍 {team.base_address}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>



                <div>
                  <Label className="text-slate-700">{t('invoiceDate')}</Label>
                  <Input
                    type="date"
                    value={formData.invoice_date}
                    onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <Label className="text-slate-700">{t('dueDate')}</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-xl border-slate-200">
            <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between py-3">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                {t('invoiceItems')}
                {pricesLocked && (
                  <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    {language === 'es' ? 'Precios Bloqueados' : 'Prices Locked'}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {editId && existingInvoice && (existingInvoice.status === 'sent' || existingInvoice.status === 'paid' || existingInvoice.status === 'partial') && (
                  <Button
                    type="button"
                    onClick={handleRefreshPrices}
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    <span className="text-xs">{language === 'es' ? 'Actualizar' : 'Update'}</span>
                  </Button>
                )}
                <Button onClick={addItem} size="sm" variant="outline" type="button">
                  <Plus className="w-3 h-3 mr-1" />
                  <span className="text-xs">{t('addItem')}</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <LineItemsEditor 
                items={formData.items}
                onItemsChange={(newItems) => setFormData({ ...formData, items: newItems })}
                catalogItems={quoteItems}
                allowCatalogSelect={true}
                allowReorder={false}
                onToast={(toastData) => toast[toastData.variant || 'success'](toastData.title, { description: toastData.description })}
                derivedValues={null}
                onAddItem={addItem}
                pricesLocked={pricesLocked}
              />

              <div className="mt-6 space-y-3 max-w-md ml-auto">
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="font-medium">{t('subtotal')}:</span>
                  <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{t('tax')}:</span>
                    {companySettings?.auto_calculate_sales_tax && formData.auto_tax_enabled ? (
                      <>
                        <span className="text-sm text-emerald-600 font-medium">{companySettings.default_tax_rate}% (auto)</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({ ...formData, auto_tax_enabled: false })}
                          className="h-6 px-2 text-xs text-slate-500 hover:text-slate-700"
                        >
                          {language === 'es' ? 'Manual' : 'Manual'}
                        </Button>
                      </>
                    ) : (
                      <>
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
                        {companySettings?.auto_calculate_sales_tax && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ 
                              ...formData, 
                              auto_tax_enabled: true,
                              tax_rate: companySettings.default_tax_rate || 0
                            })}
                            className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                          >
                            {language === 'es' ? 'Auto' : 'Auto'}
                          </Button>
                        )}
                      </>
                    )}
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

          <Card className="glass-card shadow-xl border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900">{t('notesAndTerms')}</CardTitle>
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
              {pricesLocked && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (window.confirm(
                      language === 'es'
                        ? '¿Desbloquear precios para editar?\n\nEsto te permitirá modificar los precios de la factura enviada.'
                        : 'Unlock prices for editing?\n\nThis will allow you to modify prices on the sent invoice.'
                    )) {
                      setPricesLocked(false);
                    }
                  }}
                  className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Desbloquear' : 'Unlock'}
                </Button>
              )}
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
                 disabled={createMutation.isPending || !formData.customer_name || !formData.job_name}
                 variant="outline"
               >
                 <Save className="w-4 h-4 mr-2" />
                 {createMutation.isPending ? t('saving') : t('saveDraft')}
               </Button>
              )}
              <Button
               onClick={() => {
                 // Validate items for sending
                 const invalid = (formData.items || []).filter(i => !isValidLineItem(i));
                 if (invalid.length > 0) {
                   toast({
                     title: 'Error',
                     description: language === 'es' ? 'Por favor completa todos los campos de los items antes de enviar' : 'Please complete all item fields before sending',
                     variant: 'destructive'
                   });
                   return;
                 }
                 sendMutation.mutate(formData);
               }}
               disabled={!canSend || sendMutation.isPending || !formData.customer_name || !formData.customer_email || !formData.job_name}
               className="bg-gradient-to-r from-emerald-600 to-emerald-700"
               type="button"
               title={!canSend ? (language === 'es' ? 'Pendiente de aprobación' : 'Pending approval') : ''}
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