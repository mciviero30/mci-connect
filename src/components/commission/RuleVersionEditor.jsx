import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  X, 
  AlertTriangle, 
  DollarSign, 
  Percent, 
  Plus,
  Trash2,
  Calendar
} from 'lucide-react';
import { format, addDays, isAfter, isBefore, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function RuleVersionEditor({ 
  sourceRule, 
  onSave, 
  onCancel, 
  isSaving,
  existingRules = []
}) {
  const [formData, setFormData] = useState(() => {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    
    return {
      rule_name: sourceRule?.rule_name || '',
      rule_description: sourceRule?.rule_description || '',
      applicable_roles: sourceRule?.applicable_roles || [],
      applicable_user_ids: sourceRule?.applicable_user_ids || [],
      commission_model: sourceRule?.commission_model || 'percentage_profit',
      trigger_event: sourceRule?.trigger_event || 'invoice_paid',
      rate: sourceRule?.rate || 5,
      flat_amount: sourceRule?.flat_amount || 0,
      tiers: sourceRule?.tiers || [],
      base_amount: sourceRule?.base_amount || 0,
      bonus_rate: sourceRule?.bonus_rate || 0,
      min_commission: sourceRule?.min_commission || 10,
      max_commission_percent_of_profit: sourceRule?.max_commission_percent_of_profit || 30,
      min_profit_threshold: sourceRule?.min_profit_threshold || 100,
      is_active: true,
      effective_date: tomorrow,
      end_date: null,
      version: (sourceRule?.version || 0) + 1,
      previous_rule_id: sourceRule?.id || null,
      change_notes: ''
    };
  });

  const [errors, setErrors] = useState({});

  // Validation
  const validateForm = () => {
    const newErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Required fields
    if (!formData.rule_name?.trim()) {
      newErrors.rule_name = 'Rule name is required';
    }

    if (!formData.effective_date) {
      newErrors.effective_date = 'Effective date is required';
    } else {
      const effectiveDate = new Date(formData.effective_date);
      effectiveDate.setHours(0, 0, 0, 0);

      // Must be in the future
      if (!isAfter(effectiveDate, today)) {
        newErrors.effective_date = 'Effective date must be in the future';
      }

      // Check for overlapping dates with existing rules of same family
      const sameFamily = existingRules.filter(r => 
        r.rule_name === formData.rule_name && 
        r.id !== sourceRule?.id
      );

      const hasOverlap = sameFamily.some(existingRule => {
        const existingStart = parseISO(existingRule.effective_date);
        const existingEnd = existingRule.end_date ? parseISO(existingRule.end_date) : null;
        const newStart = effectiveDate;
        const newEnd = formData.end_date ? parseISO(formData.end_date) : null;

        // Check if ranges overlap
        if (!existingEnd && !newEnd) return true; // Both indefinite
        if (!existingEnd) return !newEnd || isAfter(newEnd, existingStart);
        if (!newEnd) return isAfter(effectiveDate, existingStart);
        
        return (isAfter(newStart, existingStart) && isBefore(newStart, existingEnd)) ||
               (isAfter(newEnd, existingStart) && isBefore(newEnd, existingEnd)) ||
               (isBefore(newStart, existingStart) && isAfter(newEnd, existingEnd));
      });

      if (hasOverlap) {
        newErrors.effective_date = 'Date range overlaps with existing version';
      }
    }

    // End date validation
    if (formData.end_date) {
      const endDate = new Date(formData.end_date);
      const effectiveDate = new Date(formData.effective_date);
      
      if (!isAfter(endDate, effectiveDate)) {
        newErrors.end_date = 'End date must be after effective date';
      }
    }

    // Model-specific validation
    if (formData.commission_model === 'percentage_profit' && (!formData.rate || formData.rate <= 0)) {
      newErrors.rate = 'Rate must be greater than 0';
    }

    if (formData.commission_model === 'flat_amount' && (!formData.flat_amount || formData.flat_amount <= 0)) {
      newErrors.flat_amount = 'Flat amount must be greater than 0';
    }

    if (formData.commission_model === 'hybrid') {
      if (!formData.base_amount || formData.base_amount < 0) {
        newErrors.base_amount = 'Base amount is required';
      }
      if (!formData.bonus_rate || formData.bonus_rate <= 0) {
        newErrors.bonus_rate = 'Bonus rate must be greater than 0';
      }
    }

    if (formData.commission_model === 'tiered' && (!formData.tiers || formData.tiers.length === 0)) {
      newErrors.tiers = 'At least one tier is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Please fix validation errors');
      return;
    }

    onSave(formData);
  };

  const addTier = () => {
    setFormData(prev => ({
      ...prev,
      tiers: [
        ...(prev.tiers || []),
        { min_profit: 0, max_profit: null, rate: 5 }
      ]
    }));
  };

  const removeTier = (index) => {
    setFormData(prev => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index)
    }));
  };

  const updateTier = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      )
    }));
  };

  return (
    <Card className="shadow-2xl border-2 border-blue-500 dark:border-blue-700">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {sourceRule ? `New Version: ${formData.rule_name} (v${formData.version})` : 'Create New Rule'}
            </CardTitle>
            {sourceRule && (
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Creating version {formData.version} from v{sourceRule.version}
              </p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onCancel}
            className="hover:bg-blue-100 dark:hover:bg-blue-900/50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Immutability Notice */}
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-200">
            🔒 This creates a NEW version. Previous versions remain unchanged and historical.
          </AlertDescription>
        </Alert>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Basic Information</h3>
          
          <div>
            <Label>Rule Name *</Label>
            <Input
              value={formData.rule_name}
              onChange={e => setFormData({ ...formData, rule_name: e.target.value })}
              placeholder="e.g., Sales Rep 5% Profit"
              className={errors.rule_name ? 'border-red-500' : ''}
              disabled={!!sourceRule}
            />
            {errors.rule_name && (
              <p className="text-xs text-red-600 mt-1">{errors.rule_name}</p>
            )}
            {sourceRule && (
              <p className="text-xs text-slate-500 mt-1">
                ℹ️ Rule name is inherited and cannot be changed
              </p>
            )}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.rule_description || ''}
              onChange={e => setFormData({ ...formData, rule_description: e.target.value })}
              placeholder="Describe when and how this rule applies..."
              className="h-20"
            />
          </div>

          <div>
            <Label>Change Notes (Reason for New Version)</Label>
            <Textarea
              value={formData.change_notes || ''}
              onChange={e => setFormData({ ...formData, change_notes: e.target.value })}
              placeholder="Why are you creating this version? What changed?"
              className="h-16"
            />
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-bold text-slate-900 dark:text-white">Effective Period</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Effective Date * (Must be future)</Label>
              <Input
                type="date"
                value={formData.effective_date}
                onChange={e => setFormData({ ...formData, effective_date: e.target.value })}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                className={errors.effective_date ? 'border-red-500' : ''}
              />
              {errors.effective_date && (
                <p className="text-xs text-red-600 mt-1">{errors.effective_date}</p>
              )}
            </div>

            <div>
              <Label>End Date (Optional)</Label>
              <Input
                type="date"
                value={formData.end_date || ''}
                onChange={e => setFormData({ ...formData, end_date: e.target.value || null })}
                min={formData.effective_date || format(addDays(new Date(), 2), 'yyyy-MM-dd')}
                className={errors.end_date ? 'border-red-500' : ''}
              />
              {errors.end_date && (
                <p className="text-xs text-red-600 mt-1">{errors.end_date}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">Leave blank for indefinite</p>
            </div>
          </div>
        </div>

        {/* Commission Model Configuration */}
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <h3 className="font-bold text-slate-900 dark:text-white">Commission Model</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Model Type *</Label>
              <Select 
                value={formData.commission_model} 
                onValueChange={v => setFormData({ ...formData, commission_model: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage_profit">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      Percentage of Profit
                    </div>
                  </SelectItem>
                  <SelectItem value="flat_amount">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Flat Amount
                    </div>
                  </SelectItem>
                  <SelectItem value="tiered">Tiered</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Base + Bonus)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Trigger Event *</Label>
              <Select 
                value={formData.trigger_event} 
                onValueChange={v => setFormData({ ...formData, trigger_event: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice_paid">Invoice Paid</SelectItem>
                  <SelectItem value="job_completed">Job Completed</SelectItem>
                  <SelectItem value="quote_approved">Quote Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Model-Specific Parameters */}
          <div className="mt-4 space-y-4">
            {formData.commission_model === 'percentage_profit' && (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                <Label>Commission Rate (%) *</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={formData.rate}
                    onChange={e => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    step="0.5"
                    min="0"
                    max="100"
                    className={errors.rate ? 'border-red-500' : ''}
                  />
                  <Percent className="w-5 h-5 text-slate-400" />
                </div>
                {errors.rate && (
                  <p className="text-xs text-red-600 mt-1">{errors.rate}</p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Example: 5% means 5% of net profit
                </p>
              </div>
            )}

            {formData.commission_model === 'flat_amount' && (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border-2 border-green-200 dark:border-green-800">
                <Label>Flat Commission Amount ($) *</Label>
                <div className="flex items-center gap-2 mt-2">
                  <DollarSign className="w-5 h-5 text-slate-400" />
                  <Input
                    type="number"
                    value={formData.flat_amount}
                    onChange={e => setFormData({ ...formData, flat_amount: parseFloat(e.target.value) || 0 })}
                    step="10"
                    min="0"
                    className={errors.flat_amount ? 'border-red-500' : ''}
                  />
                </div>
                {errors.flat_amount && (
                  <p className="text-xs text-red-600 mt-1">{errors.flat_amount}</p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Fixed amount paid regardless of profit
                </p>
              </div>
            )}

            {formData.commission_model === 'hybrid' && (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border-2 border-purple-200 dark:border-purple-800 space-y-4">
                <div>
                  <Label>Base Amount ($) *</Label>
                  <Input
                    type="number"
                    value={formData.base_amount}
                    onChange={e => setFormData({ ...formData, base_amount: parseFloat(e.target.value) || 0 })}
                    step="10"
                    min="0"
                    className={errors.base_amount ? 'border-red-500' : ''}
                  />
                  {errors.base_amount && (
                    <p className="text-xs text-red-600 mt-1">{errors.base_amount}</p>
                  )}
                </div>
                <div>
                  <Label>Bonus Rate (% of Profit) *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={formData.bonus_rate}
                      onChange={e => setFormData({ ...formData, bonus_rate: parseFloat(e.target.value) || 0 })}
                      step="0.5"
                      min="0"
                      max="50"
                      className={errors.bonus_rate ? 'border-red-500' : ''}
                    />
                    <Percent className="w-5 h-5 text-slate-400" />
                  </div>
                  {errors.bonus_rate && (
                    <p className="text-xs text-red-600 mt-1">{errors.bonus_rate}</p>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Total commission = Base + (Profit × Bonus Rate)
                </p>
              </div>
            )}

            {formData.commission_model === 'tiered' && (
              <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border-2 border-orange-200 dark:border-orange-800 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="font-bold">Tiers Configuration *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addTier}
                    className="gap-2"
                  >
                    <Plus className="w-3 h-3" />
                    Add Tier
                  </Button>
                </div>
                
                {errors.tiers && (
                  <p className="text-xs text-red-600">{errors.tiers}</p>
                )}

                <div className="space-y-2">
                  {(formData.tiers || []).map((tier, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Tier {idx + 1}</Badge>
                        {formData.tiers.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeTier(idx)}
                            className="h-6 w-6 hover:bg-red-100 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Min Profit ($)</Label>
                          <Input
                            type="number"
                            value={tier.min_profit}
                            onChange={e => updateTier(idx, 'min_profit', parseFloat(e.target.value) || 0)}
                            step="100"
                            min="0"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Max Profit ($)</Label>
                          <Input
                            type="number"
                            value={tier.max_profit || ''}
                            onChange={e => updateTier(idx, 'max_profit', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="Unlimited"
                            step="100"
                            min="0"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Rate (%)</Label>
                          <Input
                            type="number"
                            value={tier.rate}
                            onChange={e => updateTier(idx, 'rate', parseFloat(e.target.value) || 0)}
                            step="0.5"
                            min="0"
                            max="100"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Min Commission ($)</Label>
              <Input
                type="number"
                value={formData.min_commission}
                onChange={e => setFormData({ ...formData, min_commission: parseFloat(e.target.value) || 0 })}
                step="5"
                min="0"
              />
              <p className="text-xs text-slate-500 mt-1">Below this = $0</p>
            </div>

            <div>
              <Label>Max Commission (% of Profit)</Label>
              <Input
                type="number"
                value={formData.max_commission_percent_of_profit}
                onChange={e => setFormData({ ...formData, max_commission_percent_of_profit: parseFloat(e.target.value) || 0 })}
                step="1"
                min="0"
                max="100"
              />
              <p className="text-xs text-slate-500 mt-1">Cap as % of profit</p>
            </div>

            <div>
              <Label>Min Profit Threshold ($)</Label>
              <Input
                type="number"
                value={formData.min_profit_threshold}
                onChange={e => setFormData({ ...formData, min_profit_threshold: parseFloat(e.target.value) || 0 })}
                step="50"
                min="0"
              />
              <p className="text-xs text-slate-500 mt-1">Min profit required</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.rule_name || !formData.effective_date}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save New Version'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}