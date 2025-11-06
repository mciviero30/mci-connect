import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save, Palette, Lock } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";

const jobColors = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 
  'red', 'orange', 'amber', 'yellow', 'lime', 
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia', 
  'pink', 'rose'
];

export default function JobForm({ job, onSubmit, onClose, isProcessing, fromQuote }) {
  const { t, language } = useLanguage();
  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: []
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.list('first_name'),
    initialData: []
  });

  // NEW: Check if this job is linked to a quote (Prompt #47)
  const isLinkedToQuote = job?.quote_id || fromQuote;

  const [formData, setFormData] = useState(job || {
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    customer_name: "",
    customer_id: "",
    quote_id: "",
    team_id: "",
    team_name: "",
    contract_amount: 0,
    estimated_cost: 0,
    estimated_hours: 0,
    profit_margin: 0,
    status: "active",
    color: "blue",
  });

  // NEW: Auto-calculate profit margin when amounts change
  useEffect(() => {
    if (formData.contract_amount && formData.estimated_cost) {
      const margin = ((formData.contract_amount - formData.estimated_cost) / formData.contract_amount * 100);
      setFormData(prev => ({ ...prev, profit_margin: margin }));
    }
  }, [formData.contract_amount, formData.estimated_cost]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-slate-700">{language === 'es' ? 'Nombre del Proyecto' : 'Project Name'} *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-slate-50 border-slate-200 text-slate-900"
          autoCapitalizeInput={true}
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-700">{language === 'es' ? 'Descripción' : 'Description'}</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={language === 'es' ? 'Detalles sobre el trabajo...' : 'Job details...'}
          className="h-24 bg-slate-50 border-slate-200 text-slate-900"
        />
      </div>

      {/* NEW: Structured Address Fields (Prompt #48) */}
      <div className="space-y-4">
        <Label className="text-slate-700 font-semibold">
          {language === 'es' ? 'Ubicación del Proyecto' : 'Project Location'}
        </Label>
        
        <div>
          <Label className="text-slate-700 text-sm">{language === 'es' ? 'Dirección' : 'Street Address'}</Label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Main Street"
            className="bg-slate-50 border-slate-200 text-slate-900"
            autoCapitalizeInput={true}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-slate-700 text-sm">{language === 'es' ? 'Ciudad' : 'City'}</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Atlanta"
              className="bg-slate-50 border-slate-200 text-slate-900"
              autoCapitalizeInput={true}
            />
          </div>

          <div>
            <Label className="text-slate-700 text-sm">{language === 'es' ? 'Estado' : 'State'}</Label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
              placeholder="GA"
              maxLength={2}
              className="bg-slate-50 border-slate-200 text-slate-900 uppercase"
            />
          </div>

          <div>
            <Label className="text-slate-700 text-sm">{language === 'es' ? 'Código Postal' : 'ZIP Code'}</Label>
            <Input
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              placeholder="30043"
              maxLength={10}
              className="bg-slate-50 border-slate-200 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* NEW: Customer Field with Lock Indicator (Prompt #47) */}
      <div className="space-y-2">
        <Label className="text-slate-700 flex items-center gap-2">
          {language === 'es' ? 'Cliente' : 'Customer'}
          {isLinkedToQuote && <Lock className="w-3 h-3 text-amber-600" title={language === 'es' ? 'Bloqueado por vinculación a cotización' : 'Locked by quote linkage'} />}
        </Label>
        <Select 
          value={formData.customer_name} 
          onValueChange={(value) => {
            const customer = customers.find(c => `${c.first_name} ${c.last_name}` === value);
            setFormData({ 
              ...formData, 
              customer_name: value,
              customer_id: customer?.id 
            });
          }}
          disabled={isLinkedToQuote}
        >
          <SelectTrigger className={`bg-slate-50 border-slate-200 text-slate-900 ${isLinkedToQuote ? 'opacity-60' : ''}`}>
            <SelectValue placeholder={language === 'es' ? 'Seleccionar cliente' : 'Select customer'} />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            {customers.map(c => (
              <SelectItem key={c.id} value={`${c.first_name} ${c.last_name}`}>
                {c.first_name} {c.last_name} {c.company && `- ${c.company}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLinkedToQuote && (
          <p className="text-xs text-amber-600">
            {language === 'es' 
              ? 'Este campo está bloqueado porque el proyecto está vinculado a una cotización.' 
              : 'This field is locked because the project is linked to a quote.'}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700">{language === 'es' ? 'Equipo Asignado' : 'Assigned Team'}</Label>
          <Select 
            value={formData.team_id} 
            onValueChange={(value) => {
              const team = teams.find(t => t.id === value);
              setFormData({ 
                ...formData, 
                team_id: value,
                team_name: team?.team_name 
              });
            }}
          >
            <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900">
              <SelectValue placeholder={language === 'es' ? 'Seleccionar equipo' : 'Select team'} />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {team.team_name} - {team.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* NEW: Contract Amount with Lock Indicator (Prompt #47) */}
        {user?.role === 'admin' && (
          <div className="space-y-2">
            <Label className="text-slate-700 flex items-center gap-2">
              {language === 'es' ? 'Monto del Contrato ($)' : 'Contract Amount ($)'}
              {isLinkedToQuote && <Lock className="w-3 h-3 text-amber-600" />}
            </Label>
            <Input
              type="number"
              value={formData.contract_amount}
              onChange={(e) => setFormData({ ...formData, contract_amount: parseFloat(e.target.value) || 0 })}
              placeholder="25000.00"
              className={`bg-slate-50 border-slate-200 text-slate-900 ${isLinkedToQuote ? 'opacity-60' : ''}`}
              disabled={isLinkedToQuote}
            />
            {isLinkedToQuote && (
              <p className="text-xs text-amber-600">
                {language === 'es' 
                  ? 'Bloqueado - tomado de la cotización' 
                  : 'Locked - taken from quote'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* NEW: Estimated Cost and Hours (Prompt #46) */}
      {user?.role === 'admin' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-700">{language === 'es' ? 'Costo Estimado ($)' : 'Estimated Cost ($)'}</Label>
            <Input
              type="number"
              value={formData.estimated_cost}
              onChange={(e) => setFormData({ ...formData, estimated_cost: parseFloat(e.target.value) || 0 })}
              placeholder="18000.00"
              className="bg-slate-50 border-slate-200 text-slate-900"
            />
            <p className="text-xs text-slate-500">
              {language === 'es' 
                ? 'Costo total de materiales + mano de obra' 
                : 'Total cost of materials + labor'}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700">{language === 'es' ? 'Horas Estimadas' : 'Estimated Hours'}</Label>
            <Input
              type="number"
              value={formData.estimated_hours}
              onChange={(e) => setFormData({ ...formData, estimated_hours: parseFloat(e.target.value) || 0 })}
              placeholder="120"
              className="bg-slate-50 border-slate-200 text-slate-900"
            />
          </div>
        </div>
      )}

      {/* NEW: Profit Margin Display */}
      {user?.role === 'admin' && formData.contract_amount > 0 && formData.estimated_cost > 0 && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              {language === 'es' ? 'Margen de Ganancia Proyectado' : 'Projected Profit Margin'}
            </span>
            <span className={`text-2xl font-bold ${formData.profit_margin >= 30 ? 'text-green-600' : formData.profit_margin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
              {formData.profit_margin.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-2">
            {language === 'es' 
              ? `Ganancia esperada: $${(formData.contract_amount - formData.estimated_cost).toFixed(2)}` 
              : `Expected profit: $${(formData.contract_amount - formData.estimated_cost).toFixed(2)}`}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-slate-700">
          <Palette className="w-4 h-4" />
          {language === 'es' ? 'Color del Trabajo' : 'Job Color'}
        </Label>
        <div className="flex flex-wrap gap-2">
          {jobColors.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({...formData, color})}
              className={`w-8 h-8 rounded-full border-2 transition-transform duration-150 ${formData.color === color ? 'border-blue-400 scale-110' : 'border-slate-300'} bg-${color}-500`}
              aria-label={`Select ${color} color`}
            />
          ))}
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isProcessing}
          className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
        >
          <X className="w-4 h-4 mr-2" />
          {language === 'es' ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button
          type="submit"
          disabled={isProcessing}
          className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {job ? (language === 'es' ? 'Actualizar' : 'Update') : (language === 'es' ? 'Guardar Trabajo' : 'Save Job')}
        </Button>
      </div>
    </form>
  );
}