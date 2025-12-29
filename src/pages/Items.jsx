import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Save,
  AlertTriangle,
  History,
  Shield,
  TrendingDown,
  DollarSign,
  Calculator,
  Clock,
  Info,
  Download,
  FileSpreadsheet,
  Settings,
  RefreshCw
} from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { useLanguage } from "@/components/i18n/LanguageContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Items() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [selectedItemForAudit, setSelectedItemForAudit] = useState(null);
  const [showLaborRateDialog, setShowLaborRateDialog] = useState(false);
  const [laborRateInput, setLaborRateInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list('name'),
    initialData: []
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list(),
    initialData: []
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: []
  });

  const { data: priceLogs = [] } = useQuery({
    queryKey: ['quoteItemPriceLogs'],
    queryFn: () => base44.entities.QuoteItemPriceLog.list('-change_timestamp', 200),
    initialData: []
  });

  // CRITICAL: Fetch Company Settings for standard labor rate
  const { data: companySettings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const settings = await base44.entities.CompanySettings.list();
      return settings[0]; // Should only have one record
    }
  });

  const STANDARD_LABOR_RATE = companySettings?.standard_labor_rate_per_hour || 25.00;

  // Update labor rate mutation
  const updateLaborRateMutation = useMutation({
    mutationFn: async (newRate) => {
      if (!companySettings?.id) {
        // If company settings don't exist, create them
        return base44.entities.CompanySettings.create({
          standard_labor_rate_per_hour: parseFloat(newRate)
        });
      }
      return base44.entities.CompanySettings.update(companySettings.id, {
        standard_labor_rate_per_hour: parseFloat(newRate)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
      setShowLaborRateDialog(false);
      toast.success(language === 'es'
        ? 'Tasa laboral actualizada exitosamente'
        : 'Labor rate updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || (language === 'es' ? 'Error al actualizar tasa laboral' : 'Failed to update labor rate'));
    }
  });

  // Sync prices from MCI Connect
  const syncPricesFromMCIConnect = async () => {
    setIsSyncing(true);
    try {
      const result = await base44.functions.invoke('fetchMCIConnectPrices', {});
      
      if (result.data.success) {
        const mciItems = result.data.items;
        let updatedCount = 0;

        for (const mciItem of mciItems) {
          // Find matching item in local catalog by name
          const localItem = items.find(item => 
            item.name.toLowerCase() === mciItem.name.toLowerCase()
          );

          if (localItem && localItem.unit_price !== mciItem.unit_price) {
            // Update price if it changed
            await updateMutation.mutateAsync({
              id: localItem.id,
              data: {
                ...localItem,
                unit_price: mciItem.unit_price
              }
            });
            updatedCount++;
          }
        }

        toast.success(language === 'es'
          ? `Sincronización completa: ${updatedCount} precios actualizados`
          : `Sync complete: ${updatedCount} prices updated`);
      }
    } catch (error) {
      toast.error(language === 'es'
        ? `Error al sincronizar: ${error.message}`
        : `Sync error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'pcs',
    unit_price: '',
    cost_per_unit: '',
    material_cost: '', // NEW: For labor/services with material components
    supplier: 'Branch',
    installation_time: '',
    category: 'materials',
    account_category: 'revenue_materials',
    in_stock_quantity: 0,
    min_stock_quantity: 5,
    status: 'active',
    is_overtime: false // NEW: For overtime rate calculation
  });

  // ============================================
  // LABOR COST AUTO-CALCULATION
  // ============================================
  const isLaborOrService = formData.category === 'labor' || formData.category === 'services';

  const calculatedCostPerUnit = useMemo(() => {
    if (!isLaborOrService) return null;

    const materialCost = parseFloat(formData.material_cost) || 0;
    const installationTime = parseFloat(formData.installation_time) || 0;
    const laborRate = formData.is_overtime ? STANDARD_LABOR_RATE * 1.5 : STANDARD_LABOR_RATE;
    const laborCost = installationTime * laborRate;

    return (materialCost + laborCost).toFixed(2);
  }, [formData.category, formData.material_cost, formData.installation_time, formData.is_overtime, STANDARD_LABOR_RATE, isLaborOrService]);

  // ============================================
  // EXPORT PRICE LIST TO PDF (Professional Layout)
  // ============================================
  const exportPriceList = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Dark Header Banner
      doc.setFillColor(0, 0, 0);
      doc.rect(0, 0, 210, 30, 'F');

      // Load and add logo in header
      try {
        const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png';
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = logoUrl;
        await new Promise((resolve) => {
          img.onload = () => {
            doc.addImage(img, 'PNG', 15, 7, 70, 16);
            resolve();
          };
          img.onerror = resolve;
        });
      } catch (err) {
        console.log('Could not load logo:', err);
      }

      // PRICE LIST title in header (white text)
      doc.setFontSize(36);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('PRICE LIST', 195, 20, { align: 'right' });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Company info below header
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text('Modern Components Installation', 15, 38);
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('2414 Meadow Isle Ln', 15, 43);
      doc.text('Lawrenceville Georgia 30043', 15, 47);
      doc.text('U.S.A', 15, 51);
      doc.text('Phone: 470-209-3783', 15, 56);

      // Generated date (right side)
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Generated: ${format(new Date(), 'MM.dd.yyyy')}`, 195, 45, { align: 'right' });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Table header (dark background)
      doc.setFillColor(51, 65, 85); // slate-700
      doc.rect(15, 62, 180, 8, 'F');

      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 255, 255); // white text
      doc.text('#', 18, 67);
      doc.text('ITEM NAME', 30, 67);
      doc.text('CATEGORY', 100, 67);
      doc.text('SALE PRICE', 155, 67, { align: 'right' });
      doc.text('SUPPLIER', 180, 67);

      // Reset text color for content
      doc.setTextColor(0, 0, 0);

      // Table content
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      let y = 75;
      let rowIndex = 1;

      for (const item of filteredItems) {
        // Check if we need a new page
        if (y > 270) {
          doc.addPage();
          y = 20;
          
          // Repeat table header on new page
          doc.setFillColor(51, 65, 85);
          doc.rect(15, y - 5, 180, 8, 'F');
          doc.setFont(undefined, 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text('#', 18, y);
          doc.text('ITEM NAME', 30, y);
          doc.text('CATEGORY', 100, y);
          doc.text('SALE PRICE', 155, y, { align: 'right' });
          doc.text('SUPPLIER', 180, y);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
          y += 8;
          rowIndex = 1;
        }

        // Alternating row background
        if (rowIndex % 2 === 0) {
          doc.setFillColor(248, 250, 252); // slate-50
          doc.rect(15, y - 4, 180, 7, 'F');
        }

        const categoryLabel = categoryConfig[item.category]?.label || item.category || '';
        const salePrice = `$${(item.unit_price || 0).toFixed(2)}`;

        // Truncate long text
        const itemName = (item.name || '').length > 40 
          ? (item.name || '').substring(0, 37) + '...' 
          : (item.name || '');

        const supplier = (item.supplier || '').length > 12
          ? (item.supplier || '').substring(0, 9) + '...'
          : (item.supplier || '');

        // Row content
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(rowIndex.toString(), 18, y);
        
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont(undefined, 'bold');
        doc.text(itemName, 30, y);
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(categoryLabel, 100, y);
        
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(salePrice, 155, y, { align: 'right' });
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(supplier, 180, y);

        // Draw separator line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.line(15, y + 2, 195, y + 2);

        y += 7;
        rowIndex++;
      }

      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        doc.text('Modern Components Installation', 15, 290);
        doc.text('470-209-3783', 195, 290, { align: 'right' });
      }

      // Save PDF
      doc.save(`MCI_Price_List_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

      toast.success(language === 'es'
        ? `Lista de precios exportada: ${filteredItems.length} items`
        : `Price list exported: ${filteredItems.length} items`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error(language === 'es'
        ? 'Error al exportar lista de precios'
        : 'Failed to export price list');
    }
  };

  // ============================================
  // AUDIT MUTATION - Log all price changes
  // ============================================
  const createPriceLogMutation = useMutation({
    mutationFn: (logData) => base44.entities.QuoteItemPriceLog.create(logData)
  });

  // ============================================
  // AUTO-UPDATE STOCK STATUS
  // ============================================
  const updateStockStatus = (quantity, minQuantity, category) => {
    if (category !== 'materials') return 'active';

    if (quantity === 0) return 'out_of_stock';
    if (quantity < minQuantity) return 'low_stock';
    return 'active';
  };

  // ============================================
  // CREATE MUTATION WITH VALIDATIONS & AUDIT
  // ============================================
  const createMutation = useMutation({
    mutationFn: async (data) => {
      // AUTO-CALCULATE: Cost for labor/services
      if (data.category === 'labor' || data.category === 'services') {
        const materialCost = parseFloat(data.material_cost) || 0;
        const laborRate = data.is_overtime ? STANDARD_LABOR_RATE * 1.5 : STANDARD_LABOR_RATE;
        const laborCost = (parseFloat(data.installation_time) || 0) * laborRate;
        data.cost_per_unit = materialCost + laborCost;
      } else {
        data.cost_per_unit = parseFloat(data.cost_per_unit) || 0;
      }

      // VALIDATION 1: Margin validation - warn if selling at loss
      if (data.unit_price < data.cost_per_unit) {
        const proceed = window.confirm(
          language === 'es'
            ? `⚠️ ALERTA DE MARGEN NEGATIVO\n\nPrecio de Venta: $${data.unit_price}\nCosto Interno: $${data.cost_per_unit}\nPérdida: $${(data.cost_per_unit - data.unit_price).toFixed(2)} por unidad\n\n¿Continuar de todas formas?`
            : `⚠️ NEGATIVE MARGIN ALERT\n\nSale Price: $${data.unit_price}\nInternal Cost: $${data.cost_per_unit}\nLoss: $${(data.cost_per_unit - data.unit_price).toFixed(2)} per unit\n\nContinue anyway?`
        );

        if (!proceed) {
          throw new Error('Item creation cancelled - negative margin');
        }
      }

      // AUTO-UPDATE: Stock status
      data.status = updateStockStatus(data.in_stock_quantity, data.min_stock_quantity, data.category);

      // Create the item
      const newItem = await base44.entities.QuoteItem.create(data);

      // AUDIT LOG: Record creation with initial prices
      await createPriceLogMutation.mutateAsync({
        item_id: newItem.id,
        item_name: newItem.name,
        action_type: 'created',
        changed_by_email: user.email,
        changed_by_name: user.full_name,
        previous_unit_price: null,
        new_unit_price: data.unit_price,
        previous_cost_per_unit: null,
        new_cost_per_unit: data.cost_per_unit,
        change_timestamp: new Date().toISOString(),
        notes: `Item created with initial pricing${(data.category === 'labor' || data.category === 'services') ? ' (auto-calculated labor cost)' : ''}`
      });

      return newItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteItems'] });
      queryClient.invalidateQueries({ queryKey: ['quoteItemPriceLogs'] });
      setShowForm(false);
      resetFormData();
      toast.success(language === 'es' ? 'Item creado y registrado' : 'Item created and logged');
    },
    onError: (error) => {
      if (!error.message.includes('cancelled')) {
        toast.error(error.message || (language === 'es' ? 'Error al crear item' : 'Failed to create item'));
      }
    }
  });

  // ============================================
  // UPDATE MUTATION WITH VALIDATIONS & AUDIT
  // ============================================
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const previousItem = items.find(i => i.id === id);

      // AUTO-CALCULATE: Cost for labor/services
      if (data.category === 'labor' || data.category === 'services') {
        const materialCost = parseFloat(data.material_cost) || 0;
        const laborCost = (parseFloat(data.installation_time) || 0) * STANDARD_LABOR_RATE;
        data.cost_per_unit = materialCost + laborCost;
      } else {
        data.cost_per_unit = parseFloat(data.cost_per_unit) || 0;
      }

      // VALIDATION 1: Margin validation
      if (data.unit_price < data.cost_per_unit) {
        const proceed = window.confirm(
          language === 'es'
            ? `⚠️ ALERTA DE MARGEN NEGATIVO\n\nPrecio de Venta: $${data.unit_price}\nCosto Interno: $${data.cost_per_unit}\nPérdida: $${(data.cost_per_unit - data.unit_price).toFixed(2)} por unidad\n\n¿Continuar de todas formas?`
            : `⚠️ NEGATIVE MARGIN ALERT\n\nSale Price: $${data.unit_price}\nInternal Cost: $${data.cost_per_unit}\nLoss: $${(data.cost_per_unit - data.unit_price).toFixed(2)} per unit\n\nContinue anyway?`
        );

        if (!proceed) {
          throw new Error('Update cancelled - negative margin');
        }
      }

      // AUTO-UPDATE: Stock status
      data.status = updateStockStatus(data.in_stock_quantity, data.min_stock_quantity, data.category);

      // Update the item
      const updatedItem = await base44.entities.QuoteItem.update(id, data);

      // AUDIT LOG: Record price changes if any
      const priceChanged = previousItem.unit_price !== data.unit_price;
      const costChanged = previousItem.cost_per_unit !== data.cost_per_unit;

      if (priceChanged || costChanged) {
        const actionType = priceChanged && costChanged ? 'both_updated' :
          priceChanged ? 'price_updated' : 'cost_updated';

        await createPriceLogMutation.mutateAsync({
          item_id: id,
          item_name: data.name,
          action_type: actionType,
          changed_by_email: user.email,
          changed_by_name: user.full_name,
          previous_unit_price: previousItem.unit_price,
          new_unit_price: data.unit_price,
          previous_cost_per_unit: previousItem.cost_per_unit,
          new_cost_per_unit: data.cost_per_unit,
          change_timestamp: new Date().toISOString(),
          notes: `Price/cost updated${priceChanged && costChanged ? ' (both)' : ''}${(data.category === 'labor' || data.category === 'services') ? ' (auto-calculated labor cost)' : ''}`
        });
      }

      return updatedItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteItems'] });
      queryClient.invalidateQueries({ queryKey: ['quoteItemPriceLogs'] });
      setShowForm(false);
      setEditingItem(null);
      resetFormData();
      toast.success(language === 'es' ? 'Item actualizado y registrado' : 'Item updated and logged');
    },
    onError: (error) => {
      if (!error.message.includes('cancelled')) {
        toast.error(error.message || (language === 'es' ? 'Error al actualizar item' : 'Failed to update item'));
      }
    }
  });

  // ============================================
  // DELETE MUTATION WITH PROTECTION
  // ============================================
  const deleteItemMutation = useMutation({
    mutationFn: async (item) => {
      // VALIDATION: Check if item is used in any active quotes
      const quotesUsingItem = quotes.filter(quote => {
        if (quote.status === 'converted_to_invoice' || quote.status === 'rejected') return false;
        return quote.items?.some(qItem =>
          qItem.description?.toLowerCase().includes(item.name.toLowerCase())
        );
      });

      // VALIDATION: Check if item is used in any active invoices
      const invoicesUsingItem = invoices.filter(invoice => {
        if (invoice.status === 'cancelled') return false;
        return invoice.items?.some(iItem =>
          iItem.description?.toLowerCase().includes(item.name.toLowerCase())
        );
      });

      // Block deletion if dependencies exist
      if (quotesUsingItem.length > 0 || invoicesUsingItem.length > 0) {
        throw new Error(
          language === 'es'
            ? `No se puede eliminar: Este item está en ${quotesUsingItem.length} cotización(es) y ${invoicesUsingItem.length} factura(s) activa(s). Por favor, inactívelo en su lugar.`
            : `Cannot delete: This item is used in ${quotesUsingItem.length} active quote(s) and ${invoicesUsingItem.length} active invoice(s). Please deactivate it instead.`
        );
      }

      // If validation passes, proceed with deletion
      return base44.entities.QuoteItem.delete(item.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteItems'] });
      toast.success(language === 'es' ? 'Item eliminado exitosamente' : 'Item deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const resetFormData = () => {
    setFormData({
      name: '',
      description: '',
      unit: 'pcs',
      unit_price: '',
      cost_per_unit: '',
      material_cost: '',
      supplier: 'Branch',
      installation_time: '',
      category: 'materials',
      account_category: 'revenue_materials',
      in_stock_quantity: 0,
      min_stock_quantity: 5,
      status: 'active',
      is_overtime: false
    });
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      ...item,
      unit_price: item.unit_price != null ? item.unit_price.toString() : '',
      cost_per_unit: item.cost_per_unit != null ? item.cost_per_unit.toString() : '',
      material_cost: item.material_cost != null ? item.material_cost.toString() : '',
      installation_time: item.installation_time != null ? item.installation_time.toString() : '',
      in_stock_quantity: item.in_stock_quantity != null ? item.in_stock_quantity : 0,
      min_stock_quantity: item.min_stock_quantity != null ? item.min_stock_quantity : 5,
      supplier: item.supplier || 'Branch',
      description: item.description || '',
      account_category: item.account_category || 'revenue_materials',
      is_overtime: item.is_overtime || false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.unit_price || !formData.supplier) {
      toast.error(language === 'es' ? 'Por favor, rellene todos los campos obligatorios.' : 'Please fill in all required fields.');
      return;
    }

    // For labor/services, validate installation_time instead of cost_per_unit
    if (isLaborOrService && !formData.installation_time) {
      toast.error(language === 'es' ? 'El tiempo de instalación es requerido para items de Labor/Servicio.' : 'Installation time is required for Labor/Service items.');
      return;
    }

    // For materials, validate cost_per_unit
    if (!isLaborOrService && !formData.cost_per_unit) {
      toast.error(language === 'es' ? 'El costo por unidad es requerido.' : 'Cost per unit is required.');
      return;
    }

    const dataToSubmit = {
      ...formData,
      unit_price: parseFloat(formData.unit_price) || 0,
      material_cost: parseFloat(formData.material_cost) || 0,
      installation_time: parseFloat(formData.installation_time) || 0,
      in_stock_quantity: parseInt(formData.in_stock_quantity) || 0,
      min_stock_quantity: parseInt(formData.min_stock_quantity) || 5
    };

    // Don't include cost_per_unit in submission for labor/services (will be calculated by backend mutation)
    if (!isLaborOrService) {
      dataToSubmit.cost_per_unit = parseFloat(formData.cost_per_unit) || 0;
    } else {
      // Ensure cost_per_unit is removed or set to 0 if we're sending material_cost and installation_time
      delete dataToSubmit.cost_per_unit;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleViewAudit = (item) => {
    setSelectedItemForAudit(item);
    setShowAuditDialog(true);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryConfig = {
    materials: { label: language === 'es' ? 'Materiales' : 'Materials', color: 'bg-blue-100 text-blue-700' },
    labor: { label: language === 'es' ? 'Mano de Obra' : 'Labor', color: 'bg-purple-100 text-purple-700' },
    equipment: { label: language === 'es' ? 'Equipo' : 'Equipment', color: 'bg-orange-100 text-orange-700' },
    services: { label: language === 'es' ? 'Servicios' : 'Services', color: 'bg-cyan-100 text-cyan-700' },
    other: { label: language === 'es' ? 'Otro' : 'Other', color: 'bg-slate-100 text-slate-700' }
  };

  // Low stock detection
  const lowStockItems = items.filter(item =>
    item.in_stock_quantity < (item.min_stock_quantity || 5) &&
    item.in_stock_quantity > 0 &&
    item.category === 'materials'
  );

  const outOfStockItems = items.filter(item =>
    item.in_stock_quantity === 0 &&
    item.category === 'materials'
  );

  // Items with negative margins
  const negativeMarginItems = items.filter(item =>
    item.unit_price < item.cost_per_unit
  );

  const relevantAuditLogs = selectedItemForAudit
    ? priceLogs.filter(log => log.item_id === selectedItemForAudit.id)
    : [];

  // Real-time margin calculation for form
  const currentMargin = useMemo(() => {
    const price = parseFloat(formData.unit_price) || 0;
    let cost = 0;

    if (isLaborOrService) {
      const materialCost = parseFloat(formData.material_cost) || 0;
      const installationTime = parseFloat(formData.installation_time) || 0;
      const laborRate = formData.is_overtime ? STANDARD_LABOR_RATE * 1.5 : STANDARD_LABOR_RATE;
      const laborCost = installationTime * laborRate;
      cost = materialCost + laborCost;
    } else {
      cost = parseFloat(formData.cost_per_unit) || 0;
    }

    // Only calculate margin if price and cost are provided and valid
    if (price === 0 || cost === 0) return { value: 0, isNegative: false, profit: 0, totalCost: 0 };

    const marginPercent = ((price - cost) / price * 100);
    return {
      value: marginPercent.toFixed(1),
      isNegative: marginPercent < 0,
      profit: (price - cost).toFixed(2),
      totalCost: cost.toFixed(2)
    };
  }, [formData.unit_price, formData.cost_per_unit, formData.material_cost, formData.installation_time, formData.is_overtime, isLaborOrService, STANDARD_LABOR_RATE]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <PageHeader
            title={language === 'es' ? 'Biblioteca de Items' : 'Item Library'}
            description={language === 'es' ? 'Gestiona productos y servicios para estimados' : 'Manage products and services for quotes'}
            icon={Package}
            actions={
              <div className="flex gap-2">
                <Button
                  onClick={syncPricesFromMCIConnect}
                  disabled={isSyncing}
                  variant="outline"
                  className="soft-green-bg"
                >
                  <RefreshCw className={`w-5 h-5 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing 
                    ? (language === 'es' ? 'Sincronizando...' : 'Syncing...') 
                    : (language === 'es' ? 'Sincronizar MCI Connect' : 'Sync MCI Connect')}
                </Button>
                <Button
                  onClick={exportPriceList}
                  variant="outline"
                  className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <Download className="w-5 h-5 mr-2" />
                  {language === 'es' ? 'Exportar Precios' : 'Export Price List'}
                </Button>
                <Button
                  onClick={() => {
                    setEditingItem(null);
                    resetFormData();
                    setShowForm(true);
                  }}
                  className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {language === 'es' ? 'Nuevo Item' : 'New Item'}
                </Button>
              </div>
            }
          />

          {/* LABOR RATE INFO WITH EDIT BUTTON */}
          <Alert className="mb-4 bg-blue-50/40 dark:bg-blue-900/10 border border-blue-200/40 dark:border-blue-700/30">
            <Calculator className="w-4 h-4 text-[#507DB4] dark:text-[#6B9DD8]" />
            <AlertDescription className="text-slate-900 dark:text-slate-100 text-sm flex items-center justify-between">
              <div>
                <strong>Standard Labor Rate:</strong> ${STANDARD_LABOR_RATE.toFixed(2)}/hour
                <span className="ml-2 text-slate-700 dark:text-slate-300">
                  (Labor/Service costs auto-calculated: Material Cost + Installation Time × Labor Rate)
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLaborRateInput(STANDARD_LABOR_RATE.toString());
                  setShowLaborRateDialog(true);
                }}
                className="ml-4 bg-white border-[#507DB4]/30 text-[#507DB4] hover:bg-blue-50/30"
              >
                <Settings className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Editar Tasa' : 'Edit Rate'}
              </Button>
            </AlertDescription>
          </Alert>

          {/* AUDIT NOTICE - Compact */}
          <div className="mb-6 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              <strong className="text-slate-700 dark:text-slate-300">Price Audit Active:</strong> All changes are logged automatically
            </span>
          </div>

          {/* CRITICAL ALERTS */}
          {negativeMarginItems.length > 0 && (
            <div className="mb-6 space-y-3">
              <Alert className="bg-orange-50 border-orange-300">
                <TrendingDown className="h-5 w-5 text-orange-600" />
                <AlertTitle className="font-bold text-orange-900">
                  {language === 'es' ? '💸 Margen Negativo Detectado' : '💸 Negative Margin Detected'}
                </AlertTitle>
                <AlertDescription className="text-orange-800">
                  <div className="mt-2 flex flex-wrap gap-2">
                    {negativeMarginItems.map(item => {
                      const loss = (item.cost_per_unit - item.unit_price).toFixed(2);
                      return (
                        <Badge key={item.id} className="bg-orange-600 text-white">
                          {item.name} (-${loss})
                        </Badge>
                      );
                    })}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="grid md:grid-cols-5 gap-6 mb-6">
            <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'es' ? 'Total Items' : 'Total Items'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{items.length}</div>
              </CardContent>
            </Card>

            {Object.entries(categoryConfig).map(([key, config]) => {
              const count = items.filter(i => i.category === key).length;
              return (
                <Card key={key} className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-600 dark:text-slate-400">{config.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">{count}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700 mb-6">
            <CardContent className="p-4 flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
                <Input
                  placeholder={language === 'es' ? 'Buscar items...' : 'Search items...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-12 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                  <SelectItem value="all" className="text-slate-900 dark:text-white">{language === 'es' ? 'Todas las categorías' : 'All Categories'}</SelectItem>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key} className="text-slate-900 dark:text-white">{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-xl border-slate-200 dark:border-slate-700">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <TableHead className="text-slate-700 dark:text-slate-300">{language === 'es' ? 'Nombre' : 'Name'}</TableHead>
                      <TableHead className="text-slate-700 dark:text-slate-300">{language === 'es' ? 'Categoría' : 'Category'}</TableHead>
                      <TableHead className="text-right text-slate-700 dark:text-slate-300">{language === 'es' ? 'Precio Venta' : 'Sale Price'}</TableHead>
                      <TableHead className="text-right text-slate-700 dark:text-slate-300">{language === 'es' ? 'Costo Interno' : 'Internal Cost'}</TableHead>
                      <TableHead className="text-right text-slate-700 dark:text-slate-300">{language === 'es' ? 'Margen' : 'Profit Margin'}</TableHead>
                      <TableHead className="text-right text-slate-700 dark:text-slate-300">{language === 'es' ? 'Acciones' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-slate-500 dark:text-slate-400">
                          {language === 'es' ? 'Cargando...' : 'Loading...'}
                        </TableCell>
                      </TableRow>
                    ) : filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center h-24 text-slate-500 dark:text-slate-400">
                          {language === 'es' ? 'No se encontraron items' : 'No items found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map(item => {
                        const categoryLabel = categoryConfig[item.category]?.label || categoryConfig.other.label;
                        const profit = (item.unit_price || 0) - (item.cost_per_unit || 0);
                        const marginPercentage = (item.unit_price > 0 && item.cost_per_unit > 0)
                          ? ((item.unit_price - item.cost_per_unit) / item.unit_price * 100).toFixed(1)
                          : 0;

                        const stockStatus = item.category === 'materials' && item.in_stock_quantity === 0
                          ? 'out_of_stock'
                          : item.category === 'materials' && item.in_stock_quantity < (item.min_stock_quantity || 5) && item.in_stock_quantity > 0
                            ? 'low_stock'
                            : 'in_stock';

                        const hasNegativeMargin = item.unit_price < item.cost_per_unit;

                        return (
                          <TableRow key={item.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 border-slate-200 dark:border-slate-700 ${
                            hasNegativeMargin ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''
                          }`}>
                            <TableCell>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                                  {hasNegativeMargin && (
                                    <Badge className="bg-orange-100 text-orange-700 text-xs">
                                      <TrendingDown className="w-3 h-3 mr-1" />
                                      Loss
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{item.description}</p>
                                )}
                                {item.supplier && (
                                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    {language === 'es' ? 'Proveedor' : 'Supplier'}: {item.supplier}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-50/60 text-[#507DB4] border border-blue-200/40 px-2 py-0.5 rounded-full text-xs font-semibold">
                                {categoryLabel}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right font-bold text-[#507DB4] dark:text-[#6B9DD8]">
                              ${(item.unit_price || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-slate-600 dark:text-slate-400">
                              ${(item.cost_per_unit || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge className={
                                hasNegativeMargin ? 'bg-orange-100 text-orange-700' :
                                  marginPercentage > 30 ? 'bg-green-100 text-green-700' :
                                    marginPercentage > 15 ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
                              }>
                                {hasNegativeMargin && '-'}
                                {marginPercentage}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewAudit(item)}
                                  className="text-[#507DB4] hover:bg-blue-50/30"
                                  title="View price history"
                                >
                                  <History className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(item)}
                                  className="text-[#507DB4] hover:bg-blue-50/30"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (window.confirm(language === 'es'
                                      ? `¿Eliminar "${item.name}"?\n\nNOTA: Se verificará que no esté en uso en cotizaciones/facturas activas.`
                                      : `Delete "${item.name}"?\n\nNOTE: Will verify it's not used in active quotes/invoices.`
                                    )) {
                                      deleteItemMutation.mutate(item);
                                    }
                                  }}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ITEM FORM DIALOG */}
          <Dialog open={showForm} onOpenChange={(open) => {
            setShowForm(open);
            if (!open) {
              setEditingItem(null);
              resetFormData();
            }
          }}>
            <DialogContent className="max-w-2xl bg-white dark:bg-[#282828] max-h-[90vh] overflow-y-auto border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-2xl text-slate-900 dark:text-white">
                  {editingItem
                    ? (language === 'es' ? 'Editar Item' : 'Edit Item')
                    : (language === 'es' ? 'Nuevo Item' : 'New Item')}
                </DialogTitle>
                {editingItem && (
                  <DialogDescription className="flex items-center gap-2 text-amber-600">
                    <Shield className="w-4 h-4" />
                    Price changes will be logged for audit purposes
                  </DialogDescription>
                )}
              </DialogHeader>
              {editingItem && (
                <div className="flex gap-2 justify-end -mt-2 mb-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentIndex = filteredItems.findIndex(i => i.id === editingItem.id);
                      const prevItem = filteredItems[currentIndex - 1];
                      if (prevItem) handleEdit(prevItem);
                    }}
                    disabled={!editingItem || filteredItems.findIndex(i => i.id === editingItem.id) === 0}
                    className="text-slate-700"
                  >
                    ← {language === 'es' ? 'Anterior' : 'Previous'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentIndex = filteredItems.findIndex(i => i.id === editingItem.id);
                      const nextItem = filteredItems[currentIndex + 1];
                      if (nextItem) handleEdit(nextItem);
                    }}
                    disabled={!editingItem || filteredItems.findIndex(i => i.id === editingItem.id) === filteredItems.length - 1}
                    className="text-slate-700"
                  >
                    {language === 'es' ? 'Siguiente' : 'Next'} →
                  </Button>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-slate-700">{language === 'es' ? 'Nombre' : 'Name'} *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-slate-700">{language === 'es' ? 'Descripción' : 'Description'}</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="h-20 bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div>
                    <Label className="text-slate-700">{language === 'es' ? 'Categoría' : 'Category'}</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="materials">{language === 'es' ? 'Materiales' : 'Materials'}</SelectItem>
                        <SelectItem value="labor">{language === 'es' ? 'Mano de Obra' : 'Labor'}</SelectItem>
                        <SelectItem value="equipment">{language === 'es' ? 'Equipo' : 'Equipment'}</SelectItem>
                        <SelectItem value="services">{language === 'es' ? 'Servicios' : 'Services'}</SelectItem>
                        <SelectItem value="other">{language === 'es' ? 'Otro' : 'Other'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-slate-700">{language === 'es' ? 'Unidad' : 'Unit'}</Label>
                    <Input
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="pcs, ft, sqft, hours, etc."
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-slate-700">
                      {language === 'es' ? 'Categoría Contable' : 'Account Category'}
                    </Label>
                    <Select value={formData.account_category} onValueChange={(value) => setFormData({ ...formData, account_category: value })}>
                      <SelectTrigger className="bg-slate-50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="revenue_service">{language === 'es' ? 'Ingreso: Servicio' : 'Revenue: Service'}</SelectItem>
                        <SelectItem value="revenue_materials">{language === 'es' ? 'Ingreso: Materiales' : 'Revenue: Materials'}</SelectItem>
                        <SelectItem value="expense_labor_cost">{language === 'es' ? 'Gasto: Costo Laboral' : 'Expense: Labor Cost'}</SelectItem>
                        <SelectItem value="expense_materials">{language === 'es' ? 'Gasto: Materiales' : 'Expense: Materials'}</SelectItem>
                        <SelectItem value="asset_inventory">{language === 'es' ? 'Activo: Inventario' : 'Asset: Inventory'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* PRICING SECTION WITH AUTO-CALCULATION FOR LABOR */}
                  {!isLaborOrService ? (
                    // MATERIALS: Manual cost input
                    <div>
                      <Label className="text-slate-700 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        {language === 'es' ? 'Costo Interno' : 'Cost per Unit'} *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost_per_unit}
                        onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                        required
                        className="bg-slate-50 border-slate-200"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {language === 'es' ? 'Lo que la empresa paga' : 'What company pays'}
                      </p>
                    </div>
                  ) : (
                    // LABOR/SERVICES: Auto-calculated cost
                    <>
                      <div>
                        <Label className="text-slate-700 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {language === 'es' ? 'Tiempo de Instalación (horas)' : 'Installation Time (hours)'} *
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.installation_time}
                          onChange={(e) => setFormData({ ...formData, installation_time: e.target.value })}
                          required
                          className="bg-slate-50 border-slate-200"
                          placeholder="0.0"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {language === 'es' ? 'Horas requeridas para completar' : 'Hours required to complete'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            id="is_overtime"
                            checked={formData.is_overtime}
                            onChange={(e) => setFormData({ ...formData, is_overtime: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-300"
                          />
                          <label htmlFor="is_overtime" className="text-sm text-slate-700 cursor-pointer">
                            {language === 'es' ? 'Tarifa de Overtime (1.5x)' : 'Overtime Rate (1.5x)'}
                          </label>
                        </div>
                      </div>

                      <div>
                        <Label className="text-slate-700 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {language === 'es' ? 'Costo de Materiales (opcional)' : 'Material Cost (optional)'}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.material_cost}
                          onChange={(e) => setFormData({ ...formData, material_cost: e.target.value })}
                          className="bg-slate-50 border-slate-200"
                          placeholder="0.00"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {language === 'es' ? 'Costo de materiales incluidos' : 'Cost of included materials'}
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <Label className="text-slate-700 flex items-center gap-2">
                          <Calculator className="w-4 h-4 text-indigo-600" />
                          {language === 'es' ? 'Costo Total Calculado' : 'Calculated Total Cost'}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-4 h-4 text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-900 text-white">
                              <p className="max-w-xs">
                                {language === 'es'
                                  ? `Fórmula: Costo de Materiales + (Tiempo de Instalación × $${(formData.is_overtime ? STANDARD_LABOR_RATE * 1.5 : STANDARD_LABOR_RATE).toFixed(2)}/hora)${formData.is_overtime ? ' [Overtime 1.5x]' : ''}`
                                  : `Formula: Material Cost + (Installation Time × $${(formData.is_overtime ? STANDARD_LABOR_RATE * 1.5 : STANDARD_LABOR_RATE).toFixed(2)}/hour)${formData.is_overtime ? ' [Overtime 1.5x]' : ''}`}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <div className="bg-blue-50/40 border border-blue-200/40 rounded-md p-3">
                          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            ${calculatedCostPerUnit || '0.00'}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {language === 'es' ? 'Auto-calculado según fórmula' : 'Auto-calculated from formula'}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <Label className="text-slate-700 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      {language === 'es' ? 'Precio de Venta' : 'Sale Price'} *
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                      required
                      className="bg-slate-50 border-slate-200"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {language === 'es' ? 'Precio al cliente' : 'Price to customer'}
                    </p>
                  </div>

                  {/* MARGIN INDICATOR IN FORM */}
                  {(formData.unit_price && (formData.cost_per_unit || isLaborOrService)) && (
                    <div className="md:col-span-2">
                      <Alert className={
                        currentMargin.isNegative
                          ? 'bg-orange-50 border-orange-300'
                          : currentMargin.value > 30
                            ? 'bg-green-50 border-green-300'
                            : 'bg-amber-50 border-amber-300'
                      }>
                        <AlertDescription className={
                          currentMargin.isNegative ? 'text-orange-900' :
                            currentMargin.value > 30 ? 'text-green-900' :
                              'text-amber-900'
                        }>
                          <div className="flex items-center justify-between">
                            <div>
                              <strong>
                                {language === 'es' ? 'Margen de Ganancia' : 'Profit Margin'}: {currentMargin.value}%
                              </strong>
                              <p className="text-sm mt-1">
                                {language === 'es' ? 'Costo Total' : 'Total Cost'}: ${currentMargin.totalCost} | {language === 'es' ? 'Ganancia' : 'Profit'}: {currentMargin.isNegative ? '-' : '+'}${Math.abs(parseFloat(currentMargin.profit))}
                              </p>
                            </div>
                            {currentMargin.isNegative && (
                              <AlertTriangle className="w-6 h-6 text-orange-600" />
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <Label className="text-slate-700">
                      {language === 'es' ? 'Proveedor' : 'Supplier'} *
                    </Label>
                    <Input
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      required
                      className="bg-slate-50 border-slate-200"
                      placeholder="Home Depot, ABC Supply, etc."
                    />
                  </div>

                  {/* Stock Management - Only for materials */}
                  {formData.category === 'materials' && (
                    <>
                      <div>
                        <Label className="text-slate-700">
                          {language === 'es' ? 'Cantidad en Stock' : 'In Stock Quantity'}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.in_stock_quantity}
                          onChange={(e) => setFormData({ ...formData, in_stock_quantity: parseInt(e.target.value) || 0 })}
                          className="bg-slate-50 border-slate-200"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700">
                          {language === 'es' ? 'Stock Mínimo (Alerta)' : 'Minimum Stock (Alert)'}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.min_stock_quantity}
                          onChange={(e) => setFormData({ ...formData, min_stock_quantity: parseInt(e.target.value) || 5 })}
                          className="bg-slate-50 border-slate-200"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="bg-slate-50 border-slate-200"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="soft-blue-gradient"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingItem
                      ? (language === 'es' ? 'Actualizar' : 'Update')
                      : (language === 'es' ? 'Crear' : 'Create')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* AUDIT TRAIL DIALOG */}
          <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
            <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700 max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-white">Price History Audit Trail</DialogTitle>
                {selectedItemForAudit && (
                  <DialogDescription className="text-slate-600 dark:text-slate-400">
                    {selectedItemForAudit.name}
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="space-y-3">
                {relevantAuditLogs.length === 0 && (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No price history available</p>
                  </div>
                )}

                {relevantAuditLogs.map(log => (
                  <div key={log.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={
                        log.action_type === 'created' ? 'bg-green-100 text-green-700' :
                          log.action_type === 'both_updated' ? 'bg-blue-100 text-blue-700' :
                            log.action_type === 'price_updated' ? 'bg-purple-100 text-purple-700' :
                              'bg-amber-100 text-amber-700'
                      }>
                        {log.action_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {format(new Date(log.change_timestamp), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-1">
                      <strong>Changed by:</strong> {log.changed_by_name}
                    </p>

                    {log.action_type !== 'created' && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {(log.action_type === 'price_updated' || log.action_type === 'both_updated') && (
                            <div>
                              <p className="text-slate-500 font-semibold mb-1">Sale Price:</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-red-700 border-red-300">
                                  ${log.previous_unit_price?.toFixed(2)}
                                </Badge>
                                <span>→</span>
                                <Badge variant="outline" className="text-green-700 border-green-300">
                                  ${log.new_unit_price?.toFixed(2)}
                                </Badge>
                              </div>
                            </div>
                          )}

                          {(log.action_type === 'cost_updated' || log.action_type === 'both_updated') && (
                            <div>
                              <p className="text-slate-500 font-semibold mb-1">Internal Cost:</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-red-700 border-red-300">
                                  ${log.previous_cost_per_unit?.toFixed(2)}
                                </Badge>
                                <span>→</span>
                                <Badge variant="outline" className="text-green-700 border-green-300">
                                  ${log.new_cost_per_unit?.toFixed(2)}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {log.notes && (
                      <p className="text-xs text-slate-600 mt-2 italic">{log.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* LABOR RATE EDIT DIALOG */}
          <Dialog open={showLaborRateDialog} onOpenChange={setShowLaborRateDialog}>
            <DialogContent className="bg-white border-slate-200">
              <DialogHeader>
                <DialogTitle className="text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#507DB4]" />
                  {language === 'es' ? 'Editar Tasa Laboral Estándar' : 'Edit Standard Labor Rate'}
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  {language === 'es'
                    ? 'Esta tasa se usa para calcular el costo de items de Labor y Servicios.'
                    : 'This rate is used to calculate the cost of Labor and Service items.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-slate-700">{language === 'es' ? 'Tasa por Hora ($)' : 'Rate per Hour ($)'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={laborRateInput}
                    onChange={(e) => setLaborRateInput(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-lg font-semibold"
                    placeholder="25.00"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    {language === 'es'
                      ? 'Todos los items de Labor/Service se recalcularán automáticamente con esta nueva tasa.'
                      : 'All Labor/Service items will auto-recalculate with this new rate.'}
                  </p>
                </div>

                <Alert className="bg-amber-50 border-amber-300">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription className="text-amber-900 text-sm">
                    <strong>{language === 'es' ? 'Importante:' : 'Important:'}</strong> {language === 'es'
                      ? 'Cambiar esta tasa afectará el cálculo de costos de todos los items de Labor/Service.'
                      : 'Changing this rate will affect cost calculation for all Labor/Service items.'}
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowLaborRateDialog(false)}
                  className="bg-slate-50 border-slate-200"
                >
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button
                  onClick={() => {
                    const rate = parseFloat(laborRateInput);
                    if (isNaN(rate) || rate < 0) {
                      toast.error(language === 'es' ? 'Ingrese una tasa válida (número positivo)' : 'Enter a valid rate (positive number)');
                      return;
                    }
                    updateLaborRateMutation.mutate(rate);
                  }}
                  disabled={updateLaborRateMutation.isPending}
                  className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Guardar Tasa' : 'Save Rate'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
}