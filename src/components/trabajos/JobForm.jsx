import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/i18n/LanguageContext";
import JobImporter from "../sync/JobImporter";
import { MapPin, FolderPlus, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";

export default function JobForm({ job, onSubmit, onCancel, isProcessing }) {
  const { t, language } = useLanguage();
  const toast = useToast();
  
  // Get current user for admin check
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });
  const [showImporter, setShowImporter] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  
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
    status: job?.status || 'active',
    show_on_website: job?.show_on_website || false,
    hero_photo_url: job?.hero_photo_url || '',
    website_description: job?.website_description || '',
    geofence_radius: job?.geofence_radius || 100,
    billing_type: job?.billing_type || 'fixed_price',
    regular_hourly_rate: job?.regular_hourly_rate || 60,
    overtime_hourly_rate: job?.overtime_hourly_rate || 90
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

  const handleCreateDriveFolder = async () => {
    if (!formData.id || !formData.name) {
      toast.error('Save the job first before creating a folder');
      return;
    }

    setCreatingFolder(true);
    try {
      const { createJobDriveFolder } = await import('@/functions/createJobDriveFolder');
      const response = await createJobDriveFolder({
        job_id: formData.id,
        job_name: formData.name
      });

      if (response.data.success) {
        setFormData({
          ...formData,
          drive_folder_id: response.data.folder_id,
          drive_folder_url: response.data.folder_url
        });
        toast.success('Google Drive folder created!');
      } else {
        toast.error(response.data.error || 'Failed to create folder');
      }
    } catch (error) {
      toast.error('Error creating folder: ' + error.message);
    } finally {
      setCreatingFolder(false);
    }
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

        <div>
          <Label className="text-slate-700 font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            {t('address')} - Google Places
          </Label>
          <AddressAutocomplete
            value={formData.address}
            onChange={(value) => setFormData({...formData, address: value})}
            onPlaceSelected={(place) => {
              setFormData({
                ...formData,
                address: place.address,
                city: place.city,
                state: place.state,
                zip: place.zip,
                latitude: place.lat,
                longitude: place.lng
              });
            }}
            placeholder="Start typing address..."
            className="bg-slate-50 border-slate-200"
          />
          <p className="text-xs text-slate-500 mt-1">Start typing to search addresses (auto-fills city, state, zip)</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label className="text-slate-700 font-semibold">{t('city')}</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              className="bg-slate-50 border-slate-200"
              placeholder="Atlanta"
            />
          </div>

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

        {/* Geofence Configuration */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-5 rounded-2xl border-2 border-green-300 dark:border-green-700 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <Label className="text-slate-900 dark:text-white font-bold text-base">
                Radio de Geofencing
              </Label>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Distancia máxima permitida para fichar entrada/salida
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={formData.geofence_radius}
              onChange={(e) => setFormData({...formData, geofence_radius: parseInt(e.target.value)})}
              className="flex-1 h-3 bg-green-200 dark:bg-green-800 rounded-lg appearance-none cursor-pointer accent-green-600"
            />
            <div className="text-center min-w-[100px]">
              <p className="text-3xl font-black text-green-700 dark:text-green-400">{formData.geofence_radius}</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">metros</p>
            </div>
          </div>
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">
            <span>50m (Estricto)</span>
            <span>500m (Flexible)</span>
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

        {/* Billing Type Selection */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-5 rounded-2xl border-2 border-purple-300 dark:border-purple-700 shadow-md">
          <Label className="text-slate-900 dark:text-white font-bold text-base mb-3 block">
            {language === 'es' ? 'Tipo de Facturación' : 'Billing Type'}
          </Label>
          <Select 
            value={formData.billing_type} 
            onValueChange={(value) => setFormData({...formData, billing_type: value})}
          >
            <SelectTrigger className="bg-white border-purple-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="fixed_price">
                💰 {language === 'es' ? 'Precio Fijo (desde quote)' : 'Fixed Price (from quote)'}
              </SelectItem>
              <SelectItem value="time_materials">
                ⏱️ {language === 'es' ? 'Tiempo y Materiales (T&M)' : 'Time & Materials (T&M)'}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* T&M Hourly Rates - Only shown for time_materials */}
        {formData.billing_type === 'time_materials' && (
          <div className="grid md:grid-cols-2 gap-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-5 rounded-2xl border-2 border-green-300 dark:border-green-700">
            <div>
              <Label className="text-slate-900 dark:text-white font-bold">
                {language === 'es' ? 'Tarifa Regular' : 'Regular Rate'}
              </Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.regular_hourly_rate}
                  onChange={(e) => setFormData({...formData, regular_hourly_rate: parseFloat(e.target.value) || 60})}
                  className="pl-7 bg-white border-green-300"
                  placeholder="60"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">/hr</span>
              </div>
            </div>

            <div>
              <Label className="text-slate-900 dark:text-white font-bold">
                {language === 'es' ? 'Tarifa Overtime' : 'Overtime Rate'}
              </Label>
              <div className="relative mt-2">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.overtime_hourly_rate}
                  onChange={(e) => setFormData({...formData, overtime_hourly_rate: parseFloat(e.target.value) || 90})}
                  className="pl-7 bg-white border-green-300"
                  placeholder="90"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">/hr</span>
              </div>
            </div>
          </div>
        )}

        {/* Contract Amount & Estimated Cost - Only for fixed_price */}
        {formData.billing_type === 'fixed_price' && (
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
        )}

        {/* Google Drive Folder - ADMIN ONLY */}
        {user?.role === 'admin' && job && (
          <div className="border-t-4 border-blue-400 pt-6 mt-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:bg-blue-900/10 -mx-4 px-4 pb-4 rounded-lg shadow-inner">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-2xl">
                <FolderPlus className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-slate-900 dark:text-white text-xl">Google Drive Folder</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Auto-create project folder for photos & documents</p>
              </div>
            </div>

            {formData.drive_folder_url ? (
              <a
                href={formData.drive_folder_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border-2 border-blue-400 hover:border-blue-500 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">Folder Created</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Click to open in Google Drive</p>
                </div>
                <ExternalLink className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
              </a>
            ) : (
              <Button
                type="button"
                onClick={handleCreateDriveFolder}
                disabled={creatingFolder}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-lg"
              >
                {creatingFolder ? (
                  <>Creating Folder...</>
                ) : (
                  <>
                    <FolderPlus className="w-5 h-5 mr-2" />
                    Create Google Drive Folder
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Web Portfolio Settings - ADMIN ONLY */}
        {user?.role === 'admin' && (
        <div className="border-t-4 border-yellow-400 pt-6 mt-6 bg-gradient-to-br from-yellow-50 to-amber-50 dark:bg-yellow-900/10 -mx-4 px-4 pb-4 rounded-lg shadow-inner">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-2xl animate-pulse">
              <span className="text-4xl">🌐</span>
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-900 dark:text-white text-xl">Public on MCI-us.com</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Sync this project to the public website portfolio</p>
            </div>
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg px-3 py-1.5 text-sm font-bold">
              🔒 Admin Only
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border-2 border-yellow-400">
              <div>
                <Label className="text-slate-900 dark:text-white font-bold text-base">Show on MCI-us.com</Label>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Enable for completed projects (privacy: no pricing, no full addresses, no quantities)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.show_on_website}
                  onChange={(e) => setFormData({...formData, show_on_website: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border-2 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-yellow-400 peer-checked:to-amber-500 shadow-lg"></div>
              </label>
            </div>

            {formData.show_on_website && (
              <>
                <div>
                  <Label className="text-slate-700 font-semibold">Hero Photo URL</Label>
                  <Input
                    value={formData.hero_photo_url}
                    onChange={(e) => setFormData({...formData, hero_photo_url: e.target.value})}
                    className="bg-slate-50 border-slate-200"
                    placeholder="https://... (high-resolution project photo)"
                  />
                  <p className="text-xs text-slate-600 mt-1">Used for PDF cover & website portfolio</p>
                </div>

                <div>
                  <Label className="text-slate-700 font-semibold">Public Description</Label>
                  <Textarea
                    value={formData.website_description}
                    onChange={(e) => setFormData({...formData, website_description: e.target.value})}
                    className="bg-slate-50 border-slate-200 h-20"
                    placeholder="Privacy-filtered description (no pricing, no full addresses)"
                  />
                  <p className="text-xs text-amber-600 mt-1">⚠️ Auto-filtered: No $ amounts, no street addresses, no LF quantities</p>
                </div>
              </>
            )}
          </div>
        </div>
        )}
        {/* End Admin Web Portfolio Settings */}

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