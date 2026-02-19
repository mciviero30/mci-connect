import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { normalizeQuoteForSave } from "../components/utils/dataValidation";
import { calculateQuoteTotals } from "../components/utils/quoteCalculations";
import { generateQuoteNumber } from "@/functions/generateQuoteNumber";
import { isValidLineItem } from "@/components/core/documentItemRules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, X, ArrowLeft, MapPin, Loader2, ChevronUp, ChevronDown, FileText, RefreshCw, Lock } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";
import LineItemsEditor from "../components/documentos/LineItemsEditor";
import { safeErrorMessage } from "@/components/utils/safeErrorMessage";
import UnifiedOutOfAreaCalculator from "../components/quotes/UnifiedOutOfAreaCalculator";
import { getCustomerDisplayName, sortCustomersByName } from "@/components/utils/nameHelpers";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import ProjectDurationSummary from "../components/quotes/ProjectDurationSummary";
import { canCreateFinancialDocs, needsApproval } from "@/components/core/roleRules";
import ApprovalBanner from "@/components/shared/ApprovalBanner";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";
import { calculateLineItemQuantity } from "@/components/domain/calculations/quantityCalculations";
import { enrichItemsWithDerivedQuantities } from "@/components/domain/calculations/derivedItemQuantities";
import { computeQuoteDerived, createComputeInput } from "@/components/domain/quotes/computeQuoteDerived";
import ItemsMatchImporter from "@/components/quotes/ItemsMatchImporter";
import { useDraftPersistence } from "@/components/hooks/useDraftPersistence";

export default function CrearEstimado() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const canCreate = user ? canCreateFinancialDocs(user) : false;
  const requiresApproval = user ? needsApproval(user) : false;

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list(),
    initialData: [],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list(),
    initialData: [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: quoteItems = [] } = useQuery({
    queryKey: ['quoteItems'],
    queryFn: () => base44.entities.QuoteItem.list(),
    initialData: [],
  });

  const { data: companySettings } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const data = await base44.entities.CompanySettings.list();
      return data[0] || {};
    },
  });

  // Fetch existing quote if editing
  const { data: existingQuote } = useQuery({
    queryKey: ['quote', editId],
    queryFn: () => base44.entities.Quote.filter({ id: editId }).then(res => res[0]),
    enabled: !!editId,
  });

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    job_name: '',
    job_id: '',
    job_address: '',
    work_details: '', // NEW: Details like floor, room, etc.
    team_ids: [], // Changed to array for multiple teams
    team_names: [], // Changed to array for multiple team names
    quote_date: format(new Date(), 'yyyy-MM-dd'),
    valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    install_date: '',
    out_of_area: false,
    items: [{ item_name: '', description: '', quantity: 1, unit: 'pcs', unit_price: 0, total: 0, installation_time: 0 }],
    tax_rate: 0,
    auto_tax_enabled: false,
    notes: '',
    terms: '• Approval: PO required to schedule work.\n• Offload: Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment. Site access issues may require revised quote.\n• Hours: Regular hours only. OT/after-hours billed separately via Change Order.',
  });

  // ============================================================================
  // CAPA 4 - ELIMINAR ESTADOS INTERMEDIOS
  // ============================================================================
  // NO MORE: useState for derived values like hotel rooms, per diem, nights
  // ALL derived values come from useMemo below
  
  const [isCalculatingTravel, setIsCalculatingTravel] = useState(false);
  const [profitTargetEnabled, setProfitTargetEnabled] = useState(false);
  const [profitTargetPercent, setProfitTargetPercent] = useState(25);
  const [projectTechCount, setProjectTechCount] = useState(2);
  const [travelTimeHours, setTravelTimeHours] = useState(0);
  // N3 FIX: roomsPerNight tracks projectTechCount dynamically
  const [roomsPerNight, setRoomsPerNight] = useState(1);
  useEffect(() => {
    setRoomsPerNight(Math.ceil(projectTechCount / 2));
  }, [projectTechCount]);
  const [showItemsMatcher, setShowItemsMatcher] = useState(false);
  const [pricesLocked, setPricesLocked] = useState(false);

  const [stayConfig, setStayConfig] = useState({ roundTrips: 1, daysPerTrip: 2, nightsPerTrip: 2, total_nights: null, total_calendar_days: null });


  
  // Draft persistence - auto-save to localStorage
  const { clearDraft } = useDraftPersistence({
    draftKey: editId ? `quote-draft-${editId}` : 'quote-draft-new',
    formData,
    enabled: !editId, // Only for new quotes (not edits)
    onRestore: (restoredData) => {
      setFormData(restoredData);
      toast({
        title: language === 'es' ? 'Borrador restaurado' : 'Draft restored',
        description: language === 'es' 
          ? 'Se restauró tu trabajo anterior' 
          : 'Your previous work was restored',
        variant: 'success'
      });
    },
  });
  
  // ============================================================================
  // CAPA 3 - useMemo ÚNICO EN QUOTE ROOT
  // ============================================================================
  // SINGLE source of truth for ALL derived values
  // Dependencies: items, techs, travel, calendar
  
  const derivedValues = useMemo(() => {
    // CRITICAL: Exclude travel items to get BASE project duration
    // This prevents cumulative errors when recalculating travel
    const nonTravelItems = formData.items.filter(item => !item.is_travel_item);
    
    // Create canonical input (CAPA 2)
    const input = createComputeInput({
      items: nonTravelItems, // Only use installation items for base calculation
      techs: projectTechCount,
      travelEnabled: travelTimeHours > 4, // Auto-detect travel requirement
      travelHours: travelTimeHours,
      hoursPerDay: 8,
      roomsPerNight,
      roundTrips: stayConfig.roundTrips,
      nightsPerTrip: stayConfig.nightsPerTrip,
      daysPerTrip: stayConfig.daysPerTrip
    });
    
    // Compute derived values (SINGLE SOURCE OF TRUTH)
    return computeQuoteDerived(input);
  }, [formData.items, projectTechCount, travelTimeHours, roomsPerNight, stayConfig.roundTrips, stayConfig.nightsPerTrip]);

  const handleAddAllOutOfAreaItems = (allItems, stayData) => {
    // Remove existing travel items AND hotel/per diem items
    const filteredItems = formData.items.filter(item => {
      const itemNameLower = item.item_name?.toLowerCase() || '';
      const isHotel = itemNameLower.includes('hotel');
      const isPerDiem = itemNameLower.includes('per') && itemNameLower.includes('diem');
      const isCompletelyEmpty = !item.item_name && (!item.quantity || item.quantity === 0);
      return !item.is_travel_item && !isHotel && !isPerDiem && !isCompletelyEmpty;
    });

    // Preserve items exactly as calculated by the calculator, just fix total
    const updatedItems = allItems.map(item => {
      const qty = item.quantity || 0;
      const price = item.unit_price || 0;
      return {
        ...item,
        total: qty * price
      };
    });

    const finalItems = [...filteredItems, ...updatedItems];

    // CRITICAL: Update stayConfig with the values from the calculator
    setStayConfig({
      roundTrips: stayData.round_trips,
      daysPerTrip: stayData.days_per_trip,
      nightsPerTrip: stayData.nights_per_trip,
      total_nights: stayData.total_nights,
      total_calendar_days: stayData.total_calendar_days
    });

    setFormData(prev => ({
      ...prev,
      items: finalItems
    }));

    toast({
      title: language === 'es' ? `${allItems.length} items agregados` : `${allItems.length} items added`,
      description: language === 'es'
        ? 'Items de viaje, hotel y per diem agregados al estimado'
        : 'Travel, hotel and per diem items added to quote',
      variant: 'success'
    });
  };

  // Load existing quote data when editing
  useEffect(() => {
    if (existingQuote) {
      // Ensure all items have item_name field (for backwards compatibility)
      const itemsWithItemName = (existingQuote.items || []).map(item => ({
        ...item,
        item_name: item.item_name ?? item.catalog_name ?? item.name ?? undefined,
      }));

      // Extract tech count from existing items if available
      const hotelItem = itemsWithItemName.find(i => i.calculation_type === 'hotel');
      const perDiemItem = itemsWithItemName.find(i => i.calculation_type === 'per_diem');
      const drivingItem = itemsWithItemName.find(i => i.calculation_type === 'hours');
      
      // EDIT MODE: never restore derivation inputs — saved items are SSOT
      if (!editId) {
        if (hotelItem?.tech_count) {
          setProjectTechCount(hotelItem.tech_count);
        } else if (perDiemItem?.tech_count) {
          setProjectTechCount(perDiemItem.tech_count);
        } else if (drivingItem?.tech_count) {
          setProjectTechCount(drivingItem.tech_count);
        }

        if (drivingItem?.duration_value) {
          setTravelTimeHours(parseFloat(drivingItem.duration_value) || 0);
        }
      }

      // Lock prices if quote was sent
      const shouldLockPrices = existingQuote.status === 'sent' || existingQuote.status === 'approved';
      setPricesLocked(shouldLockPrices);

      setFormData({
        customer_id: existingQuote.customer_id || '',
        customer_name: existingQuote.customer_name || '',
        customer_email: existingQuote.customer_email || '',
        customer_phone: existingQuote.customer_phone || '',
        job_name: existingQuote.job_name || '',
        job_id: existingQuote.job_id || '',
        job_address: existingQuote.job_address || '',
        work_details: existingQuote.work_details || '',
        team_ids: existingQuote.team_ids || (existingQuote.team_id ? [existingQuote.team_id] : []),
        team_names: existingQuote.team_names || (existingQuote.team_name ? [existingQuote.team_name] : []),
        quote_date: existingQuote.quote_date || format(new Date(), 'yyyy-MM-dd'),
        valid_until: existingQuote.valid_until || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        install_date: existingQuote.install_date || '',
        out_of_area: existingQuote.out_of_area || false,
        items: itemsWithItemName.length > 0 ? itemsWithItemName : [{ item_name: '', description: '', quantity: 1, unit: 'pcs', unit_price: 0, total: 0, installation_time: 0 }],
        tax_rate: existingQuote.tax_rate || 0,
        auto_tax_enabled: existingQuote.auto_tax_enabled ?? false,
        notes: existingQuote.notes || '',
        terms: existingQuote.terms || '• Approval: PO required to schedule work.\n• Offload: Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment. Site access issues may require revised quote.\n• Hours: Regular hours only. OT/after-hours billed separately via Change Order.',
      });
    }
  }, [existingQuote]);

  const createMutation = useMutation({
    mutationFn: async (quoteData) => {
      console.log('Creating quote with data:', quoteData);
      
      // VERIFICATION LOG - Quote before normalization
      console.log('📊 [QUOTE VERIFICATION] RAW PAYLOAD:', quoteData.items.map(i => ({
        item_name: i.item_name,
        quantity_sent: i.quantity,
        auto_calculated: i.auto_calculated,
        manual_override: i.manual_override
      })));
      
      // Step 1: Normalize and validate data
      const normalizedData = normalizeQuoteForSave(quoteData);
      
      // VERIFICATION LOG - Quote after normalization
      console.log('📊 [QUOTE VERIFICATION] NORMALIZED PAYLOAD:', normalizedData.items.map(i => ({
        item_name: i.item_name,
        quantity_normalized: i.quantity,
        auto_calculated: i.auto_calculated,
        manual_override: i.manual_override
      })));
      
      // Step 2: Generate quote number via backend function (thread-safe)
      const response = await generateQuoteNumber({});
      const quote_number = response.quote_number || response.data?.quote_number;

      // Step 3: Build final data with generated number + approval workflow
      const approvalStatus = requiresApproval ? 'pending_approval' : 'approved';
      
      // WRITE GUARD — STRICT MODE for Quote (blocks without user_id)
      const finalData = {
        ...normalizedData,
        quote_number,
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
        console.error('[WRITE GUARD] 🚫 STRICT MODE: Blocking Quote without user_id', {
          email: user?.email,
          quote_number
        });
        
        throw new Error(language === 'es'
          ? '🔒 Identidad de usuario requerida. Por favor cierra sesión y vuelve a iniciar sesión antes de crear estimados.'
          : '🔒 User identity required. Please logout and login again before creating quotes.');
      }

      console.log('Final quote data (normalized):', finalData);
      const result = await base44.entities.Quote.create(finalData);
      
      // VERIFICATION LOG - Quote after DB save
      console.log('📊 [QUOTE VERIFICATION] LOADED FROM DB:', result.items.map(i => ({
        item_name: i.item_name,
        quantity_loaded: i.quantity,
        auto_calculated: i.auto_calculated,
        manual_override: i.manual_override
      })));
      
      console.log('Quote created successfully:', result);
      return result;
    },
    onSuccess: async (data) => {
      console.log('Quote creation successful, invalidating queries...');
      clearDraft(); // Clear draft after successful save
      await queryClient.invalidateQueries({ queryKey: ['quotes'] });
      await queryClient.refetchQueries({ queryKey: ['quotes'] });
      toast({
        title: language === 'es' ? 'Estimado creado exitosamente' : 'Quote created successfully',
        variant: 'success',
      });
      setTimeout(() => {
        navigate(createPageUrl(`VerEstimado?id=${data.id}`));
      }, 800);
    },
    onError: (error) => {
      console.error('Error creating quote:', error);
      toast({
        title: 'Error',
        description: safeErrorMessage(error),
        variant: 'destructive',
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (quoteData) => {
      console.log('Updating quote with data:', quoteData);
      
      // Normalize and validate data
      const normalizedData = normalizeQuoteForSave(quoteData);

      // If quote was sent, keep it sent (preserve status)
      if (existingQuote?.status === 'sent') {
        normalizedData.status = 'sent';
      }

      // VERIFICATION LOG - Quote update
      console.log('📊 [QUOTE VERIFICATION] UPDATE PAYLOAD:', normalizedData.items.map(i => ({
        item_name: i.item_name,
        quantity_update: i.quantity
      })));
      
      console.log('Final quote data (normalized):', normalizedData);
      const result = await base44.entities.Quote.update(editId, normalizedData);
      
      // VERIFICATION LOG - Quote after update reload
      console.log('📊 [QUOTE VERIFICATION] RELOADED AFTER UPDATE:', result.items.map(i => ({
        item_name: i.item_name,
        quantity_reloaded: i.quantity
      })));
      
      return result;
    },
    onSuccess: async (data) => {
      clearDraft(); // Clear draft after successful save
      await queryClient.invalidateQueries({ queryKey: ['quotes'] });
      await queryClient.invalidateQueries({ queryKey: ['quote', editId] });
      await queryClient.refetchQueries({ queryKey: ['quotes'] });
      toast({
        title: language === 'es' ? 'Estimado actualizado exitosamente' : 'Quote updated successfully',
        variant: 'success',
      });
      setTimeout(() => {
        navigate(createPageUrl(`VerEstimado?id=${editId}`));
      }, 800);
    },
    onError: (error) => {
      console.error('Error updating quote:', error);
      toast({
        title: 'Error',
        description: safeErrorMessage(error),
        variant: 'destructive',
      });
    }
  });



  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_id: customerId,
        customer_name: getCustomerDisplayName(customer),
        customer_email: customer.email || '',
        customer_phone: customer.phone || '',
      });
    }
  };

  const handleJobChange = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setFormData({
        ...formData,
        job_id: jobId,
        job_name: job.name,
        job_address: job.address || '',
        customer_id: job.customer_id || formData.customer_id,
        customer_name: job.customer_name || formData.customer_name,
        team_ids: job.team_id ? [job.team_id] : formData.team_ids,
        team_names: job.team_name ? [job.team_name] : formData.team_names,
      });
    }
  };

  const handleTeamToggle = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const isSelected = formData.team_ids.includes(teamId);
    
    if (isSelected) {
      // Remove team
      setFormData({
        ...formData,
        team_ids: formData.team_ids.filter(id => id !== teamId),
        team_names: formData.team_names.filter(name => name !== team.team_name),
      });
    } else {
      // Add team
      setFormData({
        ...formData,
        team_ids: [...formData.team_ids, teamId],
        team_names: [...formData.team_names, team.team_name],
      });
    }
  };

  // C1 FIX: handleOutOfAreaToggle no longer duplicates travel calculation logic.
  // UnifiedOutOfAreaCalculator handles ALL travel calculations via "Add All" button.
  // This toggle only sets the flag and removes travel items when disabled.
  const handleOutOfAreaToggle = (enabled) => {
    if (enabled) {
      // Just mark as out_of_area — UnifiedOutOfAreaCalculator handles the rest
      setFormData(prev => ({ ...prev, out_of_area: true }));
    } else {
      // Remove all travel-related items when disabling
      setFormData(prev => ({
        ...prev,
        out_of_area: false,
        items: prev.items.filter(item => !item.is_travel_item && item.travel_item_type !== 'hotel' && item.travel_item_type !== 'per_diem')
      }));
    }
  };

  const addItem = () => {
    // Separate travel and regular items
    const regularItems = formData.items.filter(item => !item.is_travel_item);
    const travelItems = formData.items.filter(item => item.is_travel_item);
    
    // Add new item at the end of regular items, before travel items
    setFormData({
      ...formData,
      items: [
        ...regularItems,
        { 
          item_name: '',
          description: '', 
          quantity: 1, 
          unit: 'pcs', 
          unit_price: 0, 
          total: 0, 
          installation_time: 0,
          tech_count: 1,
          duration_value: 1,
          calculation_type: 'none'
        },
        ...travelItems
      ],
    });
  };

  const handleRefreshPrices = async () => {
    if (!window.confirm(
      language === 'es'
        ? '¿Actualizar desde el catálogo?\n\nEsto actualizará precios y tiempos de instalación. Las cantidades no cambiarán.'
        : 'Update from catalog?\n\nThis will update prices and installation times. Quantities will not change.'
    )) {
      return;
    }

    // Update regular items from catalog
    let updatedItems = formData.items.map(item => {
      if (!item.item_name || item.is_travel_item) return item;
      
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

    // C2 FIX: handleRefreshPrices only refreshes catalog prices for non-travel items.
    // Travel items are managed exclusively by UnifiedOutOfAreaCalculator.
    // To recalculate travel distances, use the "Recalculate" button in the Out of Area section.
    setFormData({ ...formData, items: updatedItems });
    
    toast({
      title: language === 'es' ? 'Actualizado desde catálogo' : 'Updated from catalog',
      description: language === 'es' 
        ? 'Precios, tiempos y cálculos de viaje actualizados'
        : 'Prices, times and travel calculations updated',
      variant: 'success'
    });
  };

  const handleAddMatchedItems = (matchedItems) => {
    const regularItems = formData.items.filter(item => !item.is_travel_item);
    const travelItems = formData.items.filter(item => item.is_travel_item);
    
    setFormData({
      ...formData,
      items: [
        ...regularItems,
        ...matchedItems,
        ...travelItems
      ]
    });
  };

  const moveItem = (index, direction) => {
    const newItems = [...formData.items];
    const item = newItems[index];
    
    // Can't move travel items or move into travel items section
    if (item.is_travel_item) return;
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Check boundaries and don't move into travel items
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    if (newItems[targetIndex].is_travel_item) return;
    
    // Swap items
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    // Prevent removing travel items if out_of_area is enabled
    if (formData.items[index].is_travel_item && formData.out_of_area) {
      toast({
        title: language === 'es' ? 'No se puede eliminar' : 'Cannot remove',
        description: language === 'es' 
          ? 'Desactiva "Trabajo Fuera del Área" para eliminar ítems de viaje' 
          : 'Disable "Out-of-Area Job" to remove travel items',
        variant: 'destructive'
      });
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };



  const updateItem = (index, field, value) => {
    // Guard: Never allow clearing item_name
    if (field === 'item_name' && !value) return;
    
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Auto-calculate quantity for special items
    if (field === 'tech_count' || field === 'duration_value' || field === 'calculation_type') {
      newItems[index].quantity = calculateLineItemQuantity(newItems[index]);
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    if (field === 'item_name') {
      const selectedItem = quoteItems.find(qi => qi.name === value);
      if (selectedItem) {
        // CRITICAL: Keep item_name in addition to description
        newItems[index].item_name = selectedItem.name || selectedItem.item_name;
        newItems[index].description = selectedItem.description || '';
        newItems[index].unit = selectedItem.unit || 'pcs';
        newItems[index].unit_price = selectedItem.unit_price || 0;
        newItems[index].installation_time = selectedItem.installation_time || 0;
        newItems[index].calculation_type = selectedItem.calculation_type || 'none';
        
        // Set default values based on calculation type
        if (selectedItem.calculation_type && selectedItem.calculation_type !== 'none') {
          newItems[index].tech_count = projectTechCount;
          newItems[index].duration_value = 1;
          newItems[index].quantity = calculateLineItemQuantity(newItems[index]);
        }
        
        newItems[index].total = (newItems[index].quantity || 0) * (selectedItem.unit_price || 0);
        
        toast({
          title: language === 'es' 
            ? `Ítem "${selectedItem.name || selectedItem.item_name}" cargado` 
            : `Item "${selectedItem.name || selectedItem.item_name}" loaded`,
          description: language === 'es'
            ? `Precio unitario: $${selectedItem.unit_price}${selectedItem.installation_time ? ` • Tiempo: ${selectedItem.installation_time}h` : ''}`
            : `Unit price: $${selectedItem.unit_price}${selectedItem.installation_time ? ` • Time: ${selectedItem.installation_time}h` : ''}`,
          variant: 'success',
        });
      }
    }
    
    // No need to manually update quantities anymore - they are derived automatically
    
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.job_name) {
      toast({
        title: 'Error',
        description: language === 'es' ? 'Por favor completa todos los campos requeridos' : 'Please complete all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.team_ids.length === 0) {
      toast({
        title: 'Error',
        description: language === 'es' ? 'Por favor selecciona al menos un equipo' : 'Please select at least one team',
        variant: 'destructive',
      });
      return;
    }

    // formData.items is the single source of truth — never re-derive quantity on save
    const enrichedItems = formData.items.map(item => ({
      ...item,
      total: (item.quantity || 0) * (item.unit_price || 0)
    }));

    // Unified validation using isValidLineItem
    const invalid = enrichedItems.filter(i => !isValidLineItem(i));
    if (invalid.length > 0) {
      // Find first invalid item and get missing fields
      const firstInvalid = invalid[0];
      const missing = [];
      if (!firstInvalid.item_name) missing.push(language === 'es' ? 'Nombre del Item' : 'Item Name');
      if (!firstInvalid.description) missing.push(language === 'es' ? 'Descripción' : 'Description');
      if (!firstInvalid.quantity || firstInvalid.quantity <= 0) missing.push(language === 'es' ? 'Cantidad' : 'Quantity');
      if (!firstInvalid.unit_price || firstInvalid.unit_price < 0) missing.push(language === 'es' ? 'Precio' : 'Price');
      
      toast({
        title: 'Error',
        description: language === 'es' 
          ? `Campos faltantes en items: ${missing.join(', ')}` 
          : `Missing fields in items: ${missing.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // Calculate estimated hours from items
    const estimated_hours = enrichedItems.reduce((sum, item) => {
      const hours = (item.installation_time || 0) * (item.quantity || 0);
      return sum + hours;
    }, 0);

    // Calculate estimated cost (internal cost from catalog)
    const estimated_cost = enrichedItems.reduce((sum, item) => {
      // Find matching catalog item to get internal cost
      const catalogItem = quoteItems.find(qi => qi.name === item.item_name);
      if (!catalogItem) return sum;
      
      const costPerUnit = catalogItem.cost_per_unit || 0;
      const materialCost = catalogItem.material_cost || 0;
      const totalCost = (costPerUnit + materialCost) * (item.quantity || 0);
      return sum + totalCost;
    }, 0);

    // Calculate profit margin
    const revenue = subtotal; // Use subtotal (without tax) for profit margin
    const profit_margin = revenue > 0 ? ((revenue - estimated_cost) / revenue) * 100 : 0;

    // Save with enriched items (derived quantities applied)
    const dataToSave = {
      ...formData,
      items: enrichedItems,
      estimated_hours,
      estimated_cost,
      profit_margin
    };

    console.log('🔍 ITEMS BEFORE SAVE (with derived):', enrichedItems.map(i => ({
      item_name: i.item_name,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      auto_calculated: i.auto_calculated,
      calculation_type: i.calculation_type
    })));

    if (editId) {
      updateMutation.mutate(dataToSave);
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  // ============================================================================
  // CALCULATE TOTALS USING DERIVED VALUES (READ-ONLY)
  // ============================================================================
  
  const { subtotal, tax_amount: taxAmount, total } = useMemo(() => {
    // formData.items is the single source of truth — no re-derivation
    const totals = calculateQuoteTotals(formData.items, formData.tax_rate);
    return {
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      total: totals.total
    };
  }, [formData.items, formData.tax_rate]);

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
                ? 'No tienes permisos para crear estimados. Solo CEO, Administrator, Admin, o Manager pueden crear documentos financieros.'
                : 'You do not have permission to create quotes. Only CEO, Administrator, Admin, or Manager can create financial documents.'}
            </p>
            <Button 
              className="mt-4" 
              onClick={() => navigate(createPageUrl('Estimados'))}
            >
              {language === 'es' ? 'Volver a Estimados' : 'Back to Quotes'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-sky-50">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={editId ? t('editQuote') : t('newQuote')}
          showBack={true}
        />

        {/* Approval Banner */}
        {editId && existingQuote && (
          <ApprovalBanner
            approval_status={existingQuote.approval_status}
            approved_by={existingQuote.approved_by}
            rejected_by={existingQuote.rejected_by}
            approval_notes={existingQuote.approval_notes}
          />
        )}

        {/* NEW: Fixed Total Bar */}
        <div className="sticky top-0 z-10 mb-6 p-4 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] rounded-2xl shadow-xl border-2 border-blue-300">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <p className="text-sm opacity-90">{language === 'es' ? 'Total de la Cotización' : 'Quote Total'}</p>
              <p className="text-4xl font-bold">${total.toFixed(2)}</p>
            </div>
            <div className="text-right text-white text-sm">
              <p className="opacity-90">{t('subtotal')}: ${subtotal.toFixed(2)}</p>
              <p className="opacity-90">{t('tax')}: ${taxAmount.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">{formData.items.length} {language === 'es' ? 'ítems' : 'items'}</p>
              {formData.items.reduce((sum, item) => sum + ((item.installation_time || 0) * (item.quantity || 0)), 0) > 0 && (
                <p className="text-xs opacity-75 mt-0.5" title="Solo referencia interna MCI">
                  ⏱ {formData.items.reduce((sum, item) => sum + ((item.installation_time || 0) * (item.quantity || 0)), 0).toFixed(1)}h {language === 'es' ? '(ref. MCI)' : '(MCI ref.)'}
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="glass-card shadow-xl border-slate-200 mb-6">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900">{t('customerInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-700">{t('selectCustomer')}</Label>
                  <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder={t('selectCustomer')} />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {sortCustomersByName(customers).map(customer => (
                        <SelectItem key={customer.id} value={customer.id} className="text-slate-900">
                          {getCustomerDisplayName(customer)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-slate-700">{t('customerName')}</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    required
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <Label className="text-slate-700">{t('customerEmail')}</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <Label className="text-slate-700">{t('customerPhone')}</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
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
                  <Select value={formData.job_id} onValueChange={handleJobChange}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder={t('selectExistingJob')} />
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

                <div>
                  <Label className="text-slate-700">{t('jobName')} *</Label>
                  <Input
                    value={formData.job_name}
                    onChange={(e) => setFormData({...formData, job_name: e.target.value})}
                    required
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-slate-700">{t('jobAddress')}</Label>
                  <AddressAutocomplete
                    value={formData.job_address}
                    onChange={(value) => setFormData({...formData, job_address: value})}
                    onPlaceSelected={(placeData) => {
                      setFormData({
                        ...formData,
                        job_address: placeData.full_address || placeData.address
                      });
                    }}
                    placeholder={language === 'es' ? 'Ej: 123 Main St, Los Angeles, CA 90001' : 'e.g., 123 Main St, Los Angeles, CA 90001'}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-slate-700">
                    {language === 'es' ? 'Detalles del Trabajo' : 'Work Details'} ({t('optional')})
                  </Label>
                  <Textarea
                    value={formData.work_details}
                    onChange={(e) => setFormData({...formData, work_details: e.target.value})}
                    className="h-20 bg-white border-slate-300 text-slate-900"
                    placeholder={language === 'es' ? 'Ej: Piso 2, Habitación 205, lado norte...' : 'e.g., Floor 2, Room 205, north side...'}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-slate-700">Teams * {formData.team_ids.length > 0 && <span className="text-blue-600">({formData.team_ids.length} selected)</span>}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-white border-slate-300 text-slate-900 h-10"
                      >
                        <span className="truncate">
                          {formData.team_ids.length === 0 
                            ? (language === 'es' ? 'Seleccionar equipos (requerido)' : 'Select teams (required)')
                            : formData.team_names.join(', ')}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-2 bg-white border-slate-200" align="start">
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {teams.map(team => {
                          const isSelected = formData.team_ids.includes(team.id);
                          return (
                            <div
                              key={team.id}
                              onClick={() => handleTeamToggle(team.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'hover:bg-slate-100'
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
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'es' 
                      ? 'Equipos responsables del proyecto (puedes seleccionar múltiples)' 
                      : 'Teams responsible for the project (you can select multiple)'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="space-y-4">
                    <UnifiedOutOfAreaCalculator
                      jobAddress={formData.job_address}
                      selectedTeamIds={formData.team_ids}
                      onAddAllItems={handleAddAllOutOfAreaItems}
                      derivedValues={derivedValues}
                      techCount={projectTechCount}
                      onTechCountChange={setProjectTechCount}
                      roomsPerNight={roomsPerNight}
                      onRoomsPerNightChange={setRoomsPerNight}
                      onStayConfigChange={setStayConfig}
                      editMode={!!editId}
                    />
                    
                    <ProjectDurationSummary
                      derivedValues={derivedValues}
                      quoteItems={formData.items}
                      quoteTotal={total}
                      catalogItems={quoteItems}
                      roundTrips={stayConfig.roundTrips}
                      daysPerTrip={stayConfig.daysPerTrip}
                      nightsPerTrip={stayConfig.nightsPerTrip}
                      stayConfig={stayConfig}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-700">{t('quoteDate')}</Label>
                  <Input
                    type="date"
                    value={formData.quote_date}
                    onChange={(e) => setFormData({...formData, quote_date: e.target.value})}
                    required
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <Label className="text-slate-700">{t('validUntil')}</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                    required
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <Label className="text-slate-700">Installation Date ({t('optional')})</Label>
                  <Input
                    type="date"
                    value={formData.install_date}
                    onChange={(e) => setFormData({...formData, install_date: e.target.value})}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                </div>


              </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-xl border-slate-200 mb-6">
            <CardHeader className="border-b border-slate-200 flex flex-row items-center justify-between">
              <CardTitle className="text-slate-900 flex items-center gap-2">
                {t('items')}
                {pricesLocked && (
                  <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-xs">
                    <Lock className="w-3 h-3 mr-1" />
                    {language === 'es' ? 'Precios Bloqueados' : 'Prices Locked'}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {editId && (
                  <Button
                    type="button"
                    onClick={handleRefreshPrices}
                    size="sm"
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    disabled={isCalculatingTravel}
                  >
                    {isCalculatingTravel ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {language === 'es' ? 'Actualizar Precios' : 'Update Prices'}
                  </Button>
                )}
                <Button 
                  type="button" 
                  onClick={() => setShowItemsMatcher(true)} 
                  size="sm" 
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Items Match
                </Button>
                <Button type="button" onClick={addItem} size="sm" className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('addItem')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <LineItemsEditor 
                items={formData.items}
                onItemsChange={(newItems) => setFormData(prev => ({ ...prev, items: newItems }))}
                catalogItems={quoteItems}
                allowCatalogSelect={true}
                allowReorder={true}
                onToast={toast}
                derivedValues={derivedValues}
                onAddItem={addItem}
                pricesLocked={pricesLocked}
              />

              <div className="mt-6 space-y-3 max-w-md ml-auto px-3 pb-4">
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
                  <span className="text-lg font-bold">${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
                  <span className="text-lg font-bold text-emerald-900">{t('total').toUpperCase()}:</span>
                  <span className="text-2xl font-bold text-emerald-700">${total.toFixed(2)}</span>
                </div>

                {/* Scope of Work Profit Target */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Checkbox id="profit-target-quote" checked={profitTargetEnabled} onCheckedChange={setProfitTargetEnabled} />
                    <label htmlFor="profit-target-quote" className="text-xs text-slate-600 cursor-pointer select-none">
                      {language === 'es' ? 'Meta de ganancia (Scope of Work)' : 'Profit Target (Scope of Work)'}
                    </label>
                  </div>
                  {profitTargetEnabled && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Input type="number" value={profitTargetPercent} onChange={e => setProfitTargetPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))} min="0" max="100" step="1" className="w-14 h-6 text-xs text-center font-bold border-violet-300 p-1" />
                        <span className="text-xs font-bold text-violet-700">%</span>
                      </div>
                      <span className="text-xs text-slate-400">→</span>
                      <span className="text-xs font-bold text-violet-700">${(subtotal * profitTargetPercent / 100).toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400">| max cost: <span className="font-semibold text-slate-600">${(subtotal * (1 - profitTargetPercent / 100)).toFixed(2)}</span></span>
                    </div>
                  )}
                </div>
                </div>
            </CardContent>
          </Card>

          <Card className="glass-card shadow-xl border-slate-200 mb-6">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900">{t('notesAndTerms')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-slate-700">{t('notes')}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="h-24 bg-white border-slate-300 text-slate-900"
                  placeholder={t('additionalNotes')}
                />
              </div>

              <div>
                <Label className="text-slate-700">{t('termsAndConditions')}</Label>
                <Textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({...formData, terms: e.target.value})}
                  className="h-24 bg-white border-slate-300 text-slate-900"
                  placeholder={t('paymentTerms')}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {language === 'es' 
                    ? 'Términos estándar pre-cargados. Puedes editarlos según necesites.' 
                    : 'Standard terms pre-loaded. You can edit them as needed.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl('Estimados'))}
              className="bg-white border-slate-300 text-slate-700"
            >
              <X className="w-4 h-4 mr-2" />
              {t('cancel')}
            </Button>
            {pricesLocked && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (window.confirm(
                    language === 'es'
                      ? '¿Desbloquear precios para editar?\n\nEsto te permitirá modificar los precios del estimado enviado.'
                      : 'Unlock prices for editing?\n\nThis will allow you to modify prices on the sent quote.'
                  )) {
                    setPricesLocked(false);
                  }
                }}
                className="bg-white border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Lock className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Desbloquear Precios' : 'Unlock Prices'}
              </Button>
            )}
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {(createMutation.isPending || updateMutation.isPending) ? t('saving') : t('save')}
            </Button>
          </div>
        </form>

        <ItemsMatchImporter
          isOpen={showItemsMatcher}
          onClose={() => setShowItemsMatcher(false)}
          onAddItems={handleAddMatchedItems}
        />
      </div>
    </div>
  );
}