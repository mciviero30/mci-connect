import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, X, ArrowLeft, MapPin, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { useToast } from "@/components/ui/toast";

export default function CrearEstimado() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    job_name: '',
    job_id: '',
    job_address: '',
    team_id: '',
    team_name: '',
    quote_date: format(new Date(), 'yyyy-MM-dd'),
    valid_until: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    install_date: '',
    out_of_area: false,
    items: [{ description: '', quantity: 1, unit: 'pcs', unit_price: 0, total: 0, installation_time: 0 }],
    tax_rate: 0,
    notes: '',
    terms: '• Approval: PO required to schedule work.\n• Offload: Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment. Site access issues may require revised quote.\n• Hours: Regular hours only. OT/after-hours billed separately via Change Order.',
  });

  const [calculatingTravel, setCalculatingTravel] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (quoteData) => {
      console.log('Creating quote with data:', quoteData);
      
      const quotes = await base44.entities.Quote.list();
      const existingNumbers = quotes
        .map(q => q.quote_number)
        .filter(n => n?.startsWith('EST-'))
        .map(n => parseInt(n.replace('EST-', '')))
        .filter(n => !isNaN(n));

      const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
      const quote_number = `EST-${String(nextNumber).padStart(5, '0')}`;

      const subtotal = quoteData.items.reduce((sum, item) => sum + (item.total || 0), 0);
      const tax_amount = subtotal * (quoteData.tax_rate / 100);
      const total = subtotal + tax_amount;
      const estimated_hours = quoteData.items.reduce((sum, item) => {
        return sum + ((item.installation_time || 0) * (item.quantity || 0));
      }, 0);

      const finalData = {
        ...quoteData,
        quote_number,
        subtotal,
        tax_amount,
        total,
        estimated_hours,
        status: 'draft',
      };

      console.log('Final quote data:', finalData);
      const result = await base44.entities.Quote.create(finalData);
      console.log('Quote created successfully:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Quote creation successful, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: language === 'es' ? 'Estimado creado exitosamente' : 'Quote created successfully',
        variant: 'success',
      });
      setTimeout(() => {
        navigate(createPageUrl(`VerEstimado?id=${data.id}`));
      }, 500);
    },
    onError: (error) => {
      console.error('Error creating quote:', error);
      toast({
        title: 'Error',
        description: `Error: ${error.message}`,
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
        team_id: job.team_id || formData.team_id,
        team_name: job.team_name || formData.team_name,
      });
    }
  };

  const handleTeamChange = async (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    setFormData({
      ...formData,
      team_id: teamId,
      team_name: team.team_name,
    });

    // If out-of-area is enabled and we have addresses, calculate travel
    if (formData.out_of_area && team.base_address && formData.job_address) {
      await calculateTravelDistance(team.base_address, formData.job_address);
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

  const handleOutOfAreaToggle = (enabled) => {
    setFormData(prev => {
      let newItems = [...prev.items];

      if (enabled) {
        // Remove existing travel items first
        newItems = newItems.filter(item => !item.is_travel_item);

        // Add travel items at the end
        const travelItems = [
          {
            description: language === 'es' ? 'Hotel / Alojamiento' : 'Hotel / Lodging',
            quantity: 2,
            unit: 'nights',
            unit_price: 100,
            total: 200,
            is_travel_item: true,
            travel_item_type: 'hotel'
          },
          {
            description: 'Per Diem / Viáticos',
            quantity: 2,
            unit: 'days',
            unit_price: 40,
            total: 80,
            is_travel_item: true,
            travel_item_type: 'per_diem'
          },
          {
            description: language === 'es' ? 'Millas (Ida y Vuelta)' : 'Mileage (Round Trip)',
            quantity: 0,
            unit: 'miles',
            unit_price: 0.60,
            total: 0,
            is_travel_item: true,
            travel_item_type: 'mileage'
          },
          {
            description: language === 'es' ? 'Tiempo de Viaje (Ida y Vuelta)' : 'Travel Time (Round Trip)',
            quantity: 0,
            unit: 'hours',
            unit_price: 25,
            total: 0,
            is_travel_item: true,
            travel_item_type: 'travel_time'
          }
        ];

        newItems = [...newItems, ...travelItems];
      } else {
        // Remove travel items
        newItems = newItems.filter(item => !item.is_travel_item);
      }

      return { ...prev, out_of_area: enabled, items: newItems };
    });

    // Calculate travel if we have the necessary data
    if (enabled && formData.team_id && formData.job_address) {
      const team = teams.find(t => t.id === formData.team_id);
      if (team?.base_address) {
        calculateTravelDistance(team.base_address, formData.job_address);
      }
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { 
        description: '', 
        quantity: 1, 
        unit: 'pcs', 
        unit_price: 0, 
        total: 0, 
        installation_time: 0,
        tech_count: 1,
        duration_value: 1,
        calculation_type: 'none'
      }],
    });
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
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // Auto-calculate quantity for special items
    if (field === 'tech_count' || field === 'duration_value' || field === 'calculation_type') {
      newItems[index].quantity = calculateQuantity(newItems[index]);
    }
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    if (field === 'item_name') {
      const selectedItem = quoteItems.find(qi => qi.name === value);
      if (selectedItem) {
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

    if (!formData.team_id) {
      toast({
        title: 'Error',
        description: language === 'es' ? 'Por favor selecciona un equipo' : 'Please select a team',
        variant: 'destructive',
      });
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].description) {
      toast({
        title: 'Error',
        description: language === 'es' ? 'Agrega al menos un item' : 'Add at least one item',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(formData);
  };

  // Calculate totals
  const subtotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0);
  const taxAmount = subtotal * (formData.tax_rate / 100);
  const total = subtotal + taxAmount;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={t('newQuote')}
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

                <div>
                  <Label className="text-slate-700">Team *</Label>
                  <Select value={formData.team_id} onValueChange={handleTeamChange}>
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Select team (required)" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id} className="text-slate-900">
                          {team.team_name}
                          {team.base_address && <span className="text-xs text-slate-500 ml-2">📍 {team.base_address}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'es' 
                      ? 'Equipo responsable del proyecto' 
                      : 'Team responsible for the project'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <Label className="text-slate-900 dark:text-white font-semibold">
                          {language === 'es' ? 'Trabajo Fuera del Área' : 'Out-of-Area Job'}
                        </Label>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {language === 'es' 
                            ? 'Agrega costos de viaje automáticamente (hotel, per diem, millas, tiempo de viaje)' 
                            : 'Automatically adds travel costs (hotel, per diem, mileage, travel time)'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.out_of_area}
                      onCheckedChange={handleOutOfAreaToggle}
                    />
                  </div>
                  {calculatingTravel && (
                    <div className="mt-2 flex items-center gap-2 text-blue-600 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {language === 'es' ? 'Calculando distancia con Google Maps...' : 'Calculating distance with Google Maps...'}
                    </div>
                  )}
                  {formData.travel_distance_miles && formData.travel_time_hours && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                        ✓ {language === 'es' ? 'Distancia calculada' : 'Distance calculated'}: {formData.travel_distance_miles} mi • {formData.travel_time_hours} hrs {language === 'es' ? '(ida y vuelta)' : '(round trip)'}
                      </p>
                    </div>
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
            <CardContent className="p-6 space-y-4">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-[2fr,2fr,1.5fr,0.7fr,1fr,1fr,0.5fr] gap-2 px-4 py-2 bg-slate-100 rounded-t-lg border border-slate-200 text-xs font-semibold text-slate-600">
                <div>Item</div>
                <div>{t('description')}</div>
                <div className="text-center">{language === 'es' ? 'Techs/Qty • Días/Hrs' : 'Techs/Qty • Days/Hrs'}</div>
                <div className="text-center">Unit</div>
                <div className="text-center">{t('unitPrice')}</div>
                <div className="text-right">{t('total')}</div>
                <div></div>
              </div>

              {formData.items.map((item, index) => (
                <div 
                  key={index} 
                  className={`grid md:grid-cols-[2fr,2fr,1.5fr,0.7fr,1fr,1fr,0.5fr] gap-2 px-4 py-3 ${item.is_travel_item ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' : 'bg-white'} border-x border-b border-slate-200 items-center ${index === 0 ? 'md:border-t-0 border-t rounded-t-lg md:rounded-t-none' : ''} ${index === formData.items.length - 1 ? 'rounded-b-lg' : ''}`}
                >
                  {/* Item Selector */}
                  <div className="md:col-span-3">
                    <Label className="text-slate-700 text-xs md:hidden mb-1 block">
                      Item {item.is_travel_item && <span className="text-blue-600 ml-1">(Travel)</span>}
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={item.is_travel_item}
                          className={`w-full justify-between h-10 font-normal text-sm truncate ${
                            item.is_travel_item 
                              ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-300 cursor-not-allowed' 
                              : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-300 text-indigo-900 hover:from-indigo-100 hover:to-blue-100'
                          }`}
                        >
                          <span className="truncate font-semibold">{item.item_name || (item.is_travel_item ? item.description : "🔍 Select item from catalog")}</span>
                          {!item.is_travel_item && <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-70" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0 bg-white border-2 border-indigo-300 shadow-2xl">
                        <Command className="bg-white">
                          <CommandInput placeholder="Search items..." className="text-slate-900 border-b-2 border-indigo-200" />
                          <CommandEmpty className="text-slate-500 p-4 text-sm">
                            No items found. Go to <span className="font-bold text-indigo-600">Items Catalog</span> to add items.
                          </CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-y-auto">
                            {[...quoteItems]
                              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                              .map(qi => (
                                <CommandItem
                                  key={qi.id}
                                  value={qi.name}
                                  onSelect={() => updateItem(index, 'item_name', qi.name)}
                                  className="text-slate-900 cursor-pointer hover:bg-indigo-100 py-3 border-b border-slate-100"
                                >
                                  <Check
                                    className={`mr-2 h-5 w-5 text-indigo-600 ${item.item_name === qi.name ? 'opacity-100' : 'opacity-0'}`}
                                  />
                                  <div className="flex-1">
                                    <div className="font-semibold text-sm">{qi.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{qi.description}</div>
                                    <div className="text-xs text-indigo-600 font-bold mt-0.5">${qi.unit_price} / {qi.unit}</div>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-3">
                    <Label className="text-slate-700 text-xs md:hidden mb-1 block">{t('description')}</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      required
                      placeholder="Description"
                      className="bg-white border-slate-300 text-slate-900 h-9 text-sm"
                    />
                  </div>

                  {/* Quantity - Dynamic based on calculation type */}
                  {item.calculation_type !== 'none' ? (
                    <>
                      <div className="md:col-span-1">
                        <Label className="text-slate-700 text-xs mb-1 block">
                          {language === 'es' ? 'Techs' : 'Techs'}
                        </Label>
                        <Input
                          type="number"
                          value={item.tech_count || 1}
                          onChange={(e) => updateItem(index, 'tech_count', parseInt(e.target.value) || 1)}
                          min="1"
                          required
                          className="bg-amber-50 border-amber-300 text-slate-900 h-9 text-sm text-center font-semibold"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Label className="text-slate-700 text-xs mb-1 block">
                          {item.calculation_type === 'hotel' ? (language === 'es' ? 'Noches' : 'Nights') :
                           item.calculation_type === 'per_diem' ? (language === 'es' ? 'Días' : 'Days') :
                           (language === 'es' ? 'Horas' : 'Hours')}
                        </Label>
                        <Input
                          type="number"
                          value={item.duration_value || 1}
                          onChange={(e) => updateItem(index, 'duration_value', parseFloat(e.target.value) || 1)}
                          min="0.01"
                          step="0.01"
                          required
                          className="bg-amber-50 border-amber-300 text-slate-900 h-9 text-sm text-center font-semibold"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <Label className="text-slate-700 text-xs md:hidden mb-1 block">{t('quantity')}</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                        className="bg-white border-slate-300 text-slate-900 h-9 text-sm text-center"
                      />
                    </div>
                  )}

                  {/* Unit */}
                  <div className="md:col-span-1">
                    <Label className="text-slate-700 text-xs md:hidden mb-1 block">Unit</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="bg-white border-slate-300 text-slate-900 h-9 text-sm text-center"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="md:col-span-1">
                    <Label className="text-slate-700 text-xs md:hidden mb-1 block">{t('unitPrice')}</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                      <Input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        required
                        className="bg-white border-slate-300 text-slate-900 h-9 text-sm pl-6 text-right"
                      />
                    </div>
                  </div>

                  {/* Total */}
                  <div className="md:col-span-1 text-right">
                    <Label className="text-slate-700 text-xs md:hidden mb-1 block">{t('total')}</Label>
                    <div className="text-[#3B9FF3] font-bold text-sm">
                      ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {item.installation_time > 0 && (
                      <div className="text-[10px] text-amber-600" title="Solo referencia interna MCI">
                        ⏱ {((item.installation_time || 0) * (item.quantity || 0)).toFixed(1)}h
                      </div>
                    )}
                  </div>

                  {/* Delete Button */}
                  <div className="md:col-span-1 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length === 1}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {createMutation.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}