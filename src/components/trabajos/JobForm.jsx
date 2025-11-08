import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/i18n/LanguageContext";
import JobImporter from "../sync/JobImporter";

export default function JobForm({ job, onSubmit, onCancel, isProcessing }) {
  const { t } = useLanguage();
  const [showImporter, setShowImporter] = useState(false);
  
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => base44.entities.Customer.filter({ status: 'active' }, 'company'),
    initialData: []
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.filter({ status: 'active' }, 'team_name'),
    initialData: []
  });

  const [formData, setFormData] = useState({
    id: job?.id || '',
    name: job?.name || '',
    description: job?.description || '',
    customer_id: job?.customer_id || '',
    customer_name: job?.customer_name || '',
    address: job?.address || '',
    city: job?.city || '',
    state: job?.state || '',
    zip: job?.zip || '',
    contract_amount: job?.contract_amount || '',
    estimated_cost: job?.estimated_cost || '',
    estimated_hours: job?.estimated_hours || '',
    team_id: job?.team_id || '',
    team_name: job?.team_name || '',
    color: job?.color || 'blue',
    status: job?.status || 'active'
  });

  const handleCustomerChange = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customer_id: customerId,
        customer_name: customer.company || `${customer.first_name} ${customer.last_name}`
      });
    }
  };

  const handleTeamChange = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (team) {
      setFormData({
        ...formData,
        team_id: teamId,
        team_name: team.team_name
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate Job ID if it's provided
    if (formData.id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(formData.id)) {
        alert('❌ Invalid Job ID format. Must be a valid UUID or leave empty for auto-generation.');
        return;
      }
    }

    onSubmit(formData);
  };

  const handleImportedJob = (importedData) => {
    setFormData({
      ...formData,
      ...importedData
    });
    setShowImporter(false);
  };

  return (
    <div className="space-y-6">
      {/* Job Importer (for synced jobs from Modern Components) */}
      {!job && (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowImporter(!showImporter)}
            className="w-full bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 mb-4"
          >
            {showImporter ? '❌ Cancel Import' : '📥 Import Job from Modern Components'}
          </Button>

          {showImporter && (
            <JobImporter onJobImported={handleImportedJob} />
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Job ID (Read-only if editing, or synced) */}
        {(job || formData.id) && (
          <div>
            <Label className="text-slate-700 font-semibold">
              Job ID
              <span className="text-xs text-blue-600 ml-2">(Shared across all systems)</span>
            </Label>
            <Input
              value={formData.id}
              disabled
              className="bg-slate-100 border-slate-300 font-mono text-sm"
            />
          </div>
        )}

        <div>
          <Label className="text-slate-700 font-semibold">{t('jobName')} *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
            className="bg-slate-50 border-slate-200"
            placeholder="Hilton Hotel - Modular Wall Installation"
          />
        </div>

        <div>
          <Label className="text-slate-700 font-semibold">{t('description')}</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="bg-slate-50 border-slate-200 h-24"
            placeholder="Project details..."
          />
        </div>

        <div>
          <Label className="text-slate-700 font-semibold">{t('customer')}</Label>
          <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
            <SelectTrigger className="bg-slate-50 border-slate-200">
              <SelectValue placeholder={t('selectCustomer')} />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.company || `${customer.first_name} ${customer.last_name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-700 font-semibold">{t('address')}</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="bg-slate-50 border-slate-200"
              placeholder="123 Main St"
            />
          </div>

          <div>
            <Label className="text-slate-700 font-semibold">{t('city')}</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              className="bg-slate-50 border-slate-200"
              placeholder="Atlanta"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-700 font-semibold">{t('state')}</Label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
              className="bg-slate-50 border-slate-200"
              placeholder="Georgia"
            />
          </div>

          <div>
            <Label className="text-slate-700 font-semibold">{t('zip')}</Label>
            <Input
              value={formData.zip}
              onChange={(e) => setFormData({...formData, zip: e.target.value})}
              className="bg-slate-50 border-slate-200"
              placeholder="30303"
            />
          </div>
        </div>

        <div>
          <Label className="text-slate-700 font-semibold">Team</Label>
          <Select value={formData.team_id} onValueChange={handleTeamChange}>
            <SelectTrigger className="bg-slate-50 border-slate-200">
              <SelectValue placeholder="Select Team" />
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

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-700 font-semibold">{t('contractAmount')}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.contract_amount}
                onChange={(e) => setFormData({...formData, contract_amount: e.target.value})}
                className="pl-7 bg-slate-50 border-slate-200"
                placeholder="50000"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-700 font-semibold">Estimated Cost</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})}
                className="pl-7 bg-slate-50 border-slate-200"
                placeholder="35000"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="bg-white border-slate-300"
          >
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isProcessing}
            className="bg-gradient-to-r from-[#3B9FF3] to-blue-600 text-white shadow-lg"
          >
            {isProcessing ? 'Saving...' : (job ? t('update') : t('create'))}
          </Button>
        </div>
      </form>
    </div>
  );
}