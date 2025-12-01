import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, X, ArrowLeft } from "lucide-react";
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
    queryFn: () => base44.entities.QuoteItem.filter({ status: 'active' }),
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
    items: [{ description: '', quantity: 1, unit: 'pcs', unit_price: 0, total: 0, installation_time: 0 }],
    tax_rate: 0,
    notes: '',
    terms: 'Payment due within 30 days. Late payments subject to fees. Thank you for your business.',
  });

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
        const itemData = quoteItems.find(qi => qi.name === item.item_name);
        return sum + ((itemData?.installation_time || 0) * (item.quantity || 0));
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

  const handleTeamChange = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setFormData({
        ...formData,
        team_id: teamId,
        team_name: team.team_name,
      });
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit: 'pcs', unit_price: 0, total: 0, installation_time: 0 }],
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    
    if (field === 'item_name') {
      const selectedItem = quoteItems.find(qi => qi.name === value);
      if (selectedItem) {
        newItems[index].description = selectedItem.description || '';
        newItems[index].unit = selectedItem.unit || 'pcs';
        newItems[index].unit_price = selectedItem.unit_price || 0;
        newItems[index].total = (newItems[index].quantity || 0) * (selectedItem.unit_price || 0);
        
        toast({
          title: language === 'es' 
            ? `Ítem "${selectedItem.name}" cargado` 
            : `Item "${selectedItem.name}" loaded`,
          description: language === 'es'
            ? `Precio unitario: $${selectedItem.unit_price}`
            : `Unit price: $${selectedItem.unit_price}`,
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
              {formData.items.map((item, index) => (
                <div key={index} className="grid md:grid-cols-12 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="md:col-span-3">
                    <Label className="text-slate-700 text-xs">Item</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between bg-white border-slate-300 text-slate-900 h-9 font-normal"
                        >
                          {item.item_name || "Select item"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0 bg-white border-slate-200">
                        <Command className="bg-white">
                          <CommandInput placeholder="Search items..." className="text-slate-900" />
                          <CommandEmpty className="text-slate-500 p-4 text-sm">No items found.</CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-y-auto">
                            {[...quoteItems]
                              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                              .map(qi => (
                                <CommandItem
                                  key={qi.id}
                                  value={qi.name}
                                  onSelect={() => updateItem(index, 'item_name', qi.name)}
                                  className="text-slate-900 cursor-pointer"
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${item.item_name === qi.name ? 'opacity-100' : 'opacity-0'}`}
                                  />
                                  {qi.name} - ${qi.unit_price}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="md:col-span-3">
                    <Label className="text-slate-700 text-xs">{t('description')}</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      required
                      className="bg-white border-slate-300 text-slate-900 h-9"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Label className="text-slate-700 text-xs">{t('quantity')}</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      required
                      className="bg-white border-slate-300 text-slate-900 h-9"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Label className="text-slate-700 text-xs">Unit</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="bg-white border-slate-300 text-slate-900 h-9"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-slate-700 text-xs">{t('unitPrice')}</Label>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      required
                      className="bg-white border-slate-300 text-slate-900 h-9"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <Label className="text-slate-700 text-xs">{t('total')}</Label>
                    <div className="h-9 flex items-center text-[#3B9FF3] font-bold">
                      ${item.total.toFixed(2)}
                    </div>
                  </div>

                  <div className="md:col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length === 1}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 w-9"
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