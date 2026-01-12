import React, { useState } from "react";
import { Card, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Save, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AddressAutocomplete from "@/components/shared/AddressAutocomplete";

export default function CustomerForm({ customer, onSubmit, onClose, isProcessing }) {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState(customer || {
    first_name: "",
    last_name: "",
    title: "", // NEW: Role/Title field
    email: "",
    phone: "",
    company: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
    status: "active"
  });

  const [companyWarning, setCompanyWarning] = useState("");

  // IMPROVED: Extract company from email domain with better handling
  const extractCompanyFromEmail = (email) => {
    if (!email || !email.includes('@')) return null;

    const domain = email.split('@')[1];
    if (!domain) return null;

    // Generic email providers - don't suggest company
    const genericProviders = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
      'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'
    ];

    if (genericProviders.includes(domain.toLowerCase())) {
      return 'GENERIC';
    }

    // Extract company name from domain
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return null;

    // Remove TLD (.com, .net, .org, etc.)
    const companyName = domainParts.slice(0, -1).join('.');

    // IMPROVED: Handle different patterns
    
    // Pattern 1: Acronyms with hyphens (e.g., cbi-nc → CBI-NC)
    if (companyName.includes('-')) {
      return companyName
        .split('-')
        .map(part => part.toUpperCase())
        .join('-');
    }

    // Pattern 2: CamelCase detection (e.g., gallerycarts → Gallery Carts)
    const splitCamelCase = (str) => {
      // Insert space before uppercase letters
      return str.replace(/([a-z])([A-Z])/g, '$1 $2');
    };

    const camelCaseSplit = splitCamelCase(companyName);
    
    // If camelCase was detected (contains space after split)
    if (camelCaseSplit.includes(' ')) {
      return camelCaseSplit
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Pattern 3: Underscores (e.g., my_company → My Company)
    if (companyName.includes('_')) {
      return companyName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Pattern 4: Regular single word (e.g., falkbuilt → Falkbuilt)
    return companyName.charAt(0).toUpperCase() + companyName.slice(1).toLowerCase();
  };

  // NEW: Handle email blur - auto-suggest company
  const handleEmailBlur = (e) => {
    const email = e.target.value;
    
    // Only suggest if company field is empty
    if (!formData.company && email) {
      const suggestion = extractCompanyFromEmail(email);
      
      if (suggestion === 'GENERIC') {
        setCompanyWarning(language === 'es' 
          ? 'Email genérico detectado. Por favor ingresa la empresa manualmente.' 
          : 'Generic email detected. Please input company manually.');
      } else if (suggestion) {
        setFormData({ ...formData, company: suggestion });
        setCompanyWarning('');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure name field is populated for backwards compatibility
    const dataToSubmit = {
      ...formData,
      name: formData.first_name && formData.last_name 
        ? `${formData.first_name} ${formData.last_name}`
        : formData.name || ''
    };
    onSubmit(dataToSubmit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name and Title Row */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700">
            {language === 'es' ? 'Nombre' : 'First Name'} *
          </Label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            placeholder="John"
            required
            className="bg-white border-slate-300 text-slate-900"
            autoCapitalizeInput={true}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700">
            {language === 'es' ? 'Apellido' : 'Last Name'} *
          </Label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            placeholder="Doe"
            required
            className="bg-white border-slate-300 text-slate-900"
            autoCapitalizeInput={true}
          />
        </div>

        {/* NEW: Title/Role field */}
        <div className="space-y-2">
          <Label className="text-slate-700">
            {language === 'es' ? 'Cargo/Puesto' : 'Role/Title'} *
          </Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={language === 'es' ? 'Gerente de Proyectos' : 'Project Manager'}
            required
            className="bg-white border-slate-300 text-slate-900"
            autoCapitalizeInput={true}
          />
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-700">{t('email')} *</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            onBlur={handleEmailBlur}
            placeholder="customer@email.com"
            required
            className="bg-white border-slate-300 text-slate-900"
          />
        </div>
        
        <div className="space-y-2">
          <Label className="text-slate-700">{t('phone')}</Label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(555) 123-4567"
            className="bg-white border-slate-300 text-slate-900"
          />
        </div>
      </div>

      {/* Company field with warning */}
      <div className="space-y-2">
        <Label className="text-slate-700">{t('company')} *</Label>
        <Input
          value={formData.company}
          onChange={(e) => {
            setFormData({ ...formData, company: e.target.value });
            setCompanyWarning(''); // Clear warning when user manually edits
          }}
          placeholder="ABC Company"
          required
          className="bg-white border-slate-300 text-slate-900"
          autoCapitalizeInput={true}
        />
        {companyWarning && (
          <Alert className="bg-amber-50 border-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              {companyWarning}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-slate-700">{t('address')}</Label>
          <AddressAutocomplete
            value={formData.address}
            onChange={(value) => setFormData({ ...formData, address: value })}
            onPlaceSelected={(place) => {
              setFormData({
                ...formData,
                address: place.address,
                city: place.city,
                state: place.state,
                zip: place.zip
              });
            }}
            placeholder={language === 'es' ? 'Ej: 123 Main St, New York, NY 10001' : 'e.g., 123 Main St, New York, NY 10001'}
            className="bg-white border-slate-300 text-slate-900"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-700">{t('city')}</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="New York"
              className="bg-white border-slate-300 text-slate-900"
              autoCapitalizeInput={true}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-700">{t('state')}</Label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="NY"
              maxLength={2}
              className="bg-white border-slate-300 text-slate-900 uppercase"
              style={{ textTransform: 'uppercase' }}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-700">{t('zip')}</Label>
            <Input
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              placeholder="10001"
              maxLength={10}
              className="bg-white border-slate-300 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label className="text-slate-700">{t('notes')}</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder={language === 'es' ? 'Notas adicionales...' : 'Additional notes...'}
          className="h-24 bg-white border-slate-300 text-slate-900"
        />
      </div>

      <CardFooter className="flex justify-end gap-3 px-0 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isProcessing}
          className="bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
        >
          <X className="w-4 h-4 mr-2" />
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isProcessing}
          className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {customer ? t('update') : t('save')}
        </Button>
      </CardFooter>
    </form>
  );
}