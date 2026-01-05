import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, Save, DollarSign } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/shared/PageHeader';

export default function CompanySettings() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['companySettings'],
    queryFn: async () => {
      const data = await base44.entities.CompanySettings.list();
      return data[0] || {};
    },
  });

  const [formData, setFormData] = useState({});

  React.useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        company_logo_url: settings.company_logo_url || '',
        address_line_1: settings.address_line_1 || '',
        address_line_2: settings.address_line_2 || '',
        city: settings.city || '',
        state: settings.state || '',
        zip: settings.zip || '',
        country: settings.country || 'U.S.A',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
        default_hourly_rate: settings.default_hourly_rate ?? 25,
        standard_labor_rate_per_hour: settings.standard_labor_rate_per_hour ?? 25,
        default_per_diem_amount: settings.default_per_diem_amount ?? 50,
        travel_mileage_rate: settings.travel_mileage_rate ?? 0.70,
        travel_driving_time_rate: settings.travel_driving_time_rate ?? 60,
        travel_per_diem_rate: settings.travel_per_diem_rate ?? 55,
        travel_hotel_nightly_rate: settings.travel_hotel_nightly_rate ?? 200,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings?.id) {
        return await base44.entities.CompanySettings.update(settings.id, data);
      } else {
        return await base44.entities.CompanySettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companySettings'] });
      toast({
        title: language === 'es' ? 'Configuración guardada' : 'Settings saved',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  // Only admin/CEO can edit
  const isAdmin = user?.role === 'admin' || user?.role === 'ceo';

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-red-900 mb-2">
              {language === 'es' ? 'Acceso Denegado' : 'Access Denied'}
            </h2>
            <p className="text-red-700">
              {language === 'es' 
                ? 'Solo administradores pueden editar la configuración de la empresa.'
                : 'Only administrators can edit company settings.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center">{t('loading')}</div>;
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Configuración de la Empresa' : 'Company Settings'}
          showBack={true}
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Info Card */}
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Building2 className="w-5 h-5" />
                {language === 'es' ? 'Información de la Empresa' : 'Company Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>{language === 'es' ? 'Nombre de la Empresa' : 'Company Name'} *</Label>
                  <Input
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    required
                    className="bg-white border-slate-300"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label>{language === 'es' ? 'Dirección' : 'Address'}</Label>
                  <Input
                    value={formData.address_line_1}
                    onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                    placeholder={language === 'es' ? 'Línea 1' : 'Line 1'}
                    className="bg-white border-slate-300"
                  />
                </div>

                <div>
                  <Label>{language === 'es' ? 'Ciudad' : 'City'}</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="bg-white border-slate-300"
                  />
                </div>

                <div>
                  <Label>{language === 'es' ? 'Estado' : 'State'}</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="bg-white border-slate-300"
                  />
                </div>

                <div>
                  <Label>{language === 'es' ? 'Teléfono' : 'Phone'}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white border-slate-300"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-white border-slate-300"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Labor Rates Card */}
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <DollarSign className="w-5 h-5" />
                {language === 'es' ? 'Tarifas Laborales' : 'Labor Rates'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'es' ? 'Tarifa por Hora por Defecto' : 'Default Hourly Rate'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.default_hourly_rate}
                    onChange={(e) => setFormData({ ...formData, default_hourly_rate: parseFloat(e.target.value) })}
                    className="bg-white border-slate-300"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'es' ? 'Para nuevos empleados' : 'For new employees'}
                  </p>
                </div>

                <div>
                  <Label>{language === 'es' ? 'Tasa Laboral Estándar' : 'Standard Labor Rate'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.standard_labor_rate_per_hour}
                    onChange={(e) => setFormData({ ...formData, standard_labor_rate_per_hour: parseFloat(e.target.value) })}
                    className="bg-white border-slate-300"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {language === 'es' ? 'Para cálculo de costos' : 'For cost calculations'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Travel & Stay Rates Card */}
          <Card className="shadow-lg border-blue-200 bg-blue-50/30">
            <CardHeader className="border-b border-blue-200">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <Car className="w-5 h-5 text-blue-600" />
                {language === 'es' ? 'Tarifas de Viaje y Estadía' : 'Travel & Stay Rates'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-900">
                    {language === 'es' ? 'Tarifa por Milla' : 'Mileage Rate'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.travel_mileage_rate}
                    onChange={(e) => setFormData({ ...formData, travel_mileage_rate: parseFloat(e.target.value) })}
                    className="bg-white border-slate-300"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    {language === 'es' ? 'Reembolso por milla de viaje' : 'Travel mileage reimbursement'}
                  </p>
                </div>

                <div>
                  <Label className="text-slate-900">
                    {language === 'es' ? 'Tarifa de Tiempo de Manejo' : 'Driving Time Rate'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.travel_driving_time_rate}
                    onChange={(e) => setFormData({ ...formData, travel_driving_time_rate: parseFloat(e.target.value) })}
                    className="bg-white border-slate-300"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    {language === 'es' ? 'Por hora de manejo' : 'Per hour of driving'}
                  </p>
                </div>

                <div>
                  <Label className="text-slate-900">
                    {language === 'es' ? 'Tarifa de Per Diem' : 'Per Diem Rate'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.travel_per_diem_rate}
                    onChange={(e) => setFormData({ ...formData, travel_per_diem_rate: parseFloat(e.target.value) })}
                    className="bg-white border-slate-300"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    {language === 'es' ? 'Viáticos por día' : 'Daily meal allowance'}
                  </p>
                </div>

                <div>
                  <Label className="text-slate-900">
                    {language === 'es' ? 'Tarifa de Hotel por Noche' : 'Hotel Nightly Rate'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.travel_hotel_nightly_rate}
                    onChange={(e) => setFormData({ ...formData, travel_hotel_nightly_rate: parseFloat(e.target.value) })}
                    className="bg-white border-slate-300"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    {language === 'es' ? 'Por habitación por noche' : 'Per room per night'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? t('saving') : t('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}