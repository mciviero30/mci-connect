import React, { useState, useEffect } from "react";
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
import { Plus, Trash2, Save, X, ArrowLeft, MapPin, Loader2, ChevronUp, ChevronDown } from "lucide-react";
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
import OutOfAreaCalculator from "../components/quotes/OutOfAreaCalculator";
import { Checkbox } from "@/components/ui/checkbox";

export default function CrearEstimado() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

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
    team_ids: [], // Changed to array for multiple teams
    team_names: [], // Changed to array for multiple team names
    quote_date: format(new Date(), 'yyyy-MM-dd'),
    valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    install_date: '',
    out_of_area: false,
    items: [{ item_name: '', description: '', quantity: 1, unit: 'pcs', unit_price: 0, total: 0, installation_time: 0 }],
    tax_rate: 0,
    notes: '',
    terms: '• Approval: PO required to schedule work.\n• Offload: Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment. Site access issues may require revised quote.\n• Hours: Regular hours only. OT/after-hours billed separately via Change Order.',
  });

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

    toast({
      title: language === 'es' ? `${travelItems.length} items de viaje agregados` : `${travelItems.length} travel items added`,
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

      setFormData({
        customer_id: existingQuote.customer_id || '',
        customer_name: existingQuote.customer_name || '',
        customer_email: existingQuote.customer_email || '',
        customer_phone: existingQuote.customer_phone || '',
        job_name: existingQuote.job_name || '',
        job_id: existingQuote.job_id || '',
        job_address: existingQuote.job_address || '',
        team_ids: existingQuote.team_ids || (existingQuote.team_id ? [existingQuote.team_id] : []),
        team_names: existingQuote.team_names || (existingQuote.team_name ? [existingQuote.team_name] : []),
        quote_date: existingQuote.quote_date || format(new Date(), 'yyyy-MM-dd'),
        valid_until: existingQuote.valid_until || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        install_date: existingQuote.install_date || '',
        out_of_area: existingQuote.out_of_area || false,
        items: itemsWithItemName.length > 0 ? itemsWithItemName : [{ item_name: '', description: '', quantity: 1, unit: 'pcs', unit_price: 0, total: 0, installation_time: 0 }],
        tax_rate: existingQuote.tax_rate || 0,
        notes: existingQuote.notes || '',
        terms: existingQuote.terms || '• Approval: PO required to schedule work.\n• Offload: Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment. Site access issues may require revised quote.\n• Hours: Regular hours only. OT/after-hours billed separately via Change Order.',
      });
    }
  }, [existingQuote]);

  const createMutation = useMutation({
    mutationFn: async (quoteData) => {
      console.log('Creating quote with data:', quoteData);
      
      // Step 1: Normalize and validate data
      const normalizedData = normalizeQuoteForSave(quoteData);
      
      // Step 2: Generate quote number via backend function (thread-safe)
      const response = await generateQuoteNumber({});
      const quote_number = response.data.quote_number;

      // Step 3: Build final data with generated number
      const finalData = {
        ...normalizedData,
        quote_number,
        status: 'draft',
      };

      console.log('Final quote data (normalized):', finalData);
      const result = await base44.entities.Quote.create(finalData);
      console.log('Quote created successfully:', result);
      return result;
    },
    onSuccess: async (data) => {
      console.log('Quote creation successful, invalidating queries...');
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

      console.log('Final quote data (normalized):', normalizedData);
      return await base44.entities.Quote.update(editId, normalizedData);
    },
    onSuccess: async (data) => {
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

  // Helper to get customer display name
  const getCustomerDisplayName = (customer) => {
    if (!customer) return '';
    
    // If has first and last name
    if (customer.first_name || customer.last_name) {
      const first = customer.first_name || '';
      const last = customer.last_name || '';
      return `${first} ${last}`.trim();
    }
    
    // If has full_name or name
    if (customer.full_name) return customer.full_name;
    if (customer.name) return customer.name;
    
    // If has company
    if (customer.company) return customer.company;
    
    // Fallback to email
    return customer.email || 'Unknown';
  };

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

  const calculateTravelDistance = async (origin, destination) => {
    if (!origin || !destination) return;

    setCalculatingTravel(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Calculate the driving distance and time between these two addresses:
Origin: ${origin}
Destination: ${destination}

Return ONLY a JSON object with this exact structure (no additional text):
{
  "distance_miles": <number>,
  "travel_time_hours": <number>
}

Use realistic driving estimates. Round distance to 1 decimal, time to nearest 0.5 hours.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            distance_miles: { type: "number" },
            travel_time_hours: { type: "number" }
          }
        }
      });

      if (response?.distance_miles && response?.travel_time_hours) {
        // Update travel items with calculated values
        const updatedItems = formData.items.map(item => {
          if (item.travel_item_type === 'mileage') {
            return { ...item, quantity: response.distance_miles * 2, total: response.distance_miles * 2 * (item.unit_price || 0.60) };
          }
          if (item.travel_item_type === 'travel_time') {
            return { ...item, quantity: response.travel_time_hours * 2, total: response.travel_time_hours * 2 * (item.unit_price || 25) };
          }
          return item;
        });

        setFormData(prev => ({
          ...prev,
          items: updatedItems,
          travel_distance_miles: response.distance_miles,
          travel_time_hours: response.travel_time_hours
        }));

        toast({
          title: language === 'es' ? '✓ Distancia Calculada' : '✓ Distance Calculated',
          description: `${response.distance_miles} mi • ${response.travel_time_hours} hrs`,
          variant: 'success'
        });
      }
    } catch (error) {
      console.error('Error calculating distance:', error);
      toast({
        title: 'Error',
        description: language === 'es' ? 'No se pudo calcular la distancia' : 'Could not calculate distance',
        variant: 'destructive'
      });
    }
    setCalculatingTravel(false);
  };

  const handleOutOfAreaToggle = async (enabled) => {
    if (enabled) {
      // Find exact items from catalog by name
      const hotelItem = quoteItems.find(qi => qi.name === 'Hotel Rooms');
      const perDiemItem = quoteItems.find(qi => qi.name === 'Per-Diem');
      const drivingHoursItem = quoteItems.find(qi => qi.name === 'Driving Time');
      const mileageItem = quoteItems.find(qi => qi.name === 'Miles Per Vehicle');
      
      let newItems = [...formData.items.filter(item => !item.is_travel_item)];
      
      // Add Hotel Rooms
      newItems.push({
        item_name: 'Hotel Rooms',
        description: 'Hotel Rooms',
        quantity: 1,
        unit: hotelItem?.unit || 'nights',
        unit_price: hotelItem?.unit_price || 200,
        total: 1 * (hotelItem?.unit_price || 200),
        is_travel_item: true,
        calculation_type: 'hotel',
        tech_count: 2,
        duration_value: 1,
        installation_time: 0,
      });
      
      // Add Per-Diem
      newItems.push({
        item_name: 'Per-Diem',
        description: 'Per-Diem',
        quantity: 2,
        unit: perDiemItem?.unit || 'days',
        unit_price: perDiemItem?.unit_price || 55,
        total: 2 * (perDiemItem?.unit_price || 55),
        is_travel_item: true,
        calculation_type: 'per_diem',
        tech_count: 2,
        duration_value: 1,
        installation_time: 0,
      });
      
      // Calculate and add mileage + driving time for each selected team
      if (formData.team_ids.length > 0 && formData.job_address) {
        setCalculatingTravel(true);
        
        for (const teamId of formData.team_ids) {
          const team = teams.find(t => t.id === teamId);
          if (team?.base_address) {
            try {
              const response = await base44.integrations.Core.InvokeLLM({
                prompt: `Calculate the driving distance and time between these two addresses:
Origin: ${team.base_address}
Destination: ${formData.job_address}

Return ONLY a JSON object with this exact structure (no additional text):
{
  "distance_miles": <number>,
  "driving_hours": <number>
}

Use realistic driving estimates. Round distance to 1 decimal place, hours to nearest 0.5.`,
                add_context_from_internet: true,
                response_json_schema: {
                  type: "object",
                  properties: {
                    distance_miles: { type: "number" },
                    driving_hours: { type: "number" }
                  }
                }
              });

              if (response?.distance_miles && response?.driving_hours) {
                // Calculate: round trip (x2) + 10% extra
                const roundTripMiles = response.distance_miles * 2;
                const totalMiles = Math.round(roundTripMiles * 1.1);
                const roundTripHours = response.driving_hours * 2;
                const hoursWithBuffer = roundTripHours * 1.1;
                
                // Custom rounding: if decimal < 0.5, round to .5, else round up to next integer
                const roundToHalfHour = (hours) => {
                  const integer = Math.floor(hours);
                  const decimal = hours - integer;
                  if (decimal < 0.5) {
                    return integer + 0.5;
                  } else {
                    return integer + 1;
                  }
                };
                
                const roundedHours = roundToHalfHour(hoursWithBuffer);
                const teamName = team.team_name || 'Team';
                
                // Add Driving Time item for this team
                newItems.push({
                  item_name: drivingHoursItem?.name || 'Driving Time',
                  description: `${teamName}`,
                  quantity: 2 * roundedHours, // 2 techs by default
                  unit: drivingHoursItem?.unit || 'hours',
                  unit_price: drivingHoursItem?.unit_price || 60,
                  total: 2 * roundedHours * (drivingHoursItem?.unit_price || 60),
                  is_travel_item: true,
                  calculation_type: 'hours',
                  tech_count: 2,
                  duration_value: roundedHours,
                  installation_time: 0,
                });
                
                // Add mileage item for this team
                newItems.push({
                  item_name: mileageItem?.name || 'Miles Per Vehicle',
                  description: `${teamName} (${response.distance_miles} mi each way)`,
                  quantity: totalMiles,
                  unit: mileageItem?.unit || 'miles',
                  unit_price: mileageItem?.unit_price || 0.60,
                  total: totalMiles * (mileageItem?.unit_price || 0.60),
                  is_travel_item: true,
                  calculation_type: 'none',
                  installation_time: 0,
                });
              }
            } catch (error) {
              console.error(`Error calculating mileage for team ${team.team_name}:`, error);
            }
          }
        }
        
        setCalculatingTravel(false);
      }
      
      setFormData(prev => ({ ...prev, out_of_area: true, items: newItems }));
    } else {
      // Remove travel items
      setFormData(prev => ({
        ...prev,
        out_of_area: false,
        items: prev.items.filter(item => !item.is_travel_item)
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

  const calculateQuantity = (item) => {
    const techCount = parseInt(item.tech_count) || 1;
    const durationValue = parseFloat(item.duration_value) || 1;

    if (item.calculation_type === 'hotel') {
      // Hotel: Math.ceil(tech_count / 2) × nights
      const rooms = Math.ceil(techCount / 2);
      return rooms * durationValue;
    } else if (item.calculation_type === 'per_diem') {
      // Per-diem: tech_count × days
      return techCount * durationValue;
    } else if (item.calculation_type === 'hours') {
      // Hours (driving, normal, overtime): tech_count × hours
      return techCount * durationValue;
    }
    
    return item.quantity || 1;
  };

  const updateItem = (index, field, value) => {
    // Guard: Never allow clearing item_name
    if (field === 'item_name' && !value) return;
    
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Auto-calculate quantity for special items
    if (field === 'tech_count' || field === 'duration_value' || field === 'calculation_type') {
      newItems[index].quantity = calculateQuantity(newItems[index]);
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    if (field === 'item_name') {
      const selectedItem = quoteItems.find(qi => qi.name === value);
      if (selectedItem) {
        // CRITICAL: Keep item_name in addition to description
        newItems[index].item_name = selectedItem.name;
        newItems[index].description = selectedItem.description || '';
        newItems[index].unit = selectedItem.unit || 'pcs';
        newItems[index].unit_price = selectedItem.unit_price || 0;
        newItems[index].installation_time = selectedItem.installation_time || 0;
        newItems[index].calculation_type = selectedItem.calculation_type || 'none';
        
        // Set default values based on calculation type
        if (selectedItem.calculation_type && selectedItem.calculation_type !== 'none') {
          newItems[index].tech_count = 1;
          newItems[index].duration_value = 1;
          newItems[index].quantity = calculateQuantity(newItems[index]);
        }
        
        newItems[index].total = (newItems[index].quantity || 0) * (selectedItem.unit_price || 0);
        
        toast({
          title: language === 'es' 
            ? `Ítem "${selectedItem.name}" cargado` 
            : `Item "${selectedItem.name}" loaded`,
          description: language === 'es'
            ? `Precio unitario: $${selectedItem.unit_price}${selectedItem.installation_time ? ` • Tiempo: ${selectedItem.installation_time}h` : ''}`
            : `Unit price: $${selectedItem.unit_price}${selectedItem.installation_time ? ` • Time: ${selectedItem.installation_time}h` : ''}`,
          variant: 'success',
        });
      }
    }
    
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

    // Unified validation using isValidLineItem
    const invalid = (formData.items || []).filter(i => !isValidLineItem(i));
    if (invalid.length > 0) {
      toast({
        title: 'Error',
        description: language === 'es' ? 'Por favor completa todos los campos requeridos de los items' : 'Please complete all required item fields',
        variant: 'destructive',
      });
      return;
    }

    // DEBUG: Log items before save to check if item_name exists
    console.log('🔍 ITEMS BEFORE SAVE:', formData.items.map(i => ({
      item_name: i.item_name,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
    })));

    if (editId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  // Calculate totals using centralized function
  const { subtotal, tax_amount: taxAmount, total } = calculateQuoteTotals(formData.items, formData.tax_rate);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={editId ? t('editQuote') : t('newQuote')}
          showBack={true}
        />

        {/* NEW: Fixed Total Bar */}
        <div className="sticky top-0 z-10 mb-6 p-4 bg-gradient-to-r from-[#3B9FF3] to-blue-600 rounded-2xl shadow-xl border-2 border-blue-300">
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
                      {[...customers]
                        .sort((a, b) => getCustomerDisplayName(a).localeCompare(getCustomerDisplayName(b)))
                        .map(customer => (
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
                  <Input
                    value={formData.job_address}
                    onChange={(e) => setFormData({...formData, job_address: e.target.value})}
                    className="bg-white border-slate-300 text-slate-900"
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
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id="out-of-area"
                      checked={formData.out_of_area}
                      onCheckedChange={(checked) => setFormData({ ...formData, out_of_area: checked })}
                    />
                    <Label htmlFor="out-of-area" className="cursor-pointer text-slate-900 dark:text-white font-medium">
                      {language === 'es' ? 'Trabajo Fuera de Área' : 'Out of Area Job'}
                    </Label>
                  </div>
                  
                  {formData.out_of_area && (
                    <OutOfAreaCalculator
                      jobAddress={formData.job_address}
                      selectedTeamIds={formData.team_ids}
                      onAddTravelItems={handleAddTravelItems}
                      isCalculating={isCalculatingTravel}
                      setIsCalculating={setIsCalculatingTravel}
                    />
                  )}
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
              <CardTitle className="text-slate-900">{t('items')}</CardTitle>
              <Button type="button" onClick={addItem} size="sm" className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white">
                <Plus className="w-4 h-4 mr-2" />
                {t('addItem')}
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <LineItemsEditor 
                items={formData.items}
                onItemsChange={(newItems) => setFormData({ ...formData, items: newItems })}
                catalogItems={quoteItems}
                allowCatalogSelect={true}
                allowReorder={true}
                onToast={toast}
              />
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
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {(createMutation.isPending || updateMutation.isPending) ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}