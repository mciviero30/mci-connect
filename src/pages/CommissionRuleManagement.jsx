import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  Copy,
  Layers,
  Calendar
} from 'lucide-react';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';
import { toast } from 'sonner';
import { format } from 'date-fns';
import RuleVersionEditor from '../components/commission/RuleVersionEditor';

export default function CommissionRuleManagement() {
  // Authentication & Authorization
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    
    const isAdmin = user.role === 'admin';
    const isCEO = user.role === 'ceo' || user.position === 'CEO';
    const isFinance = user.role === 'finance' || 
                      user.position?.toLowerCase().includes('finance') || 
                      user.department?.toLowerCase() === 'finance';
    
    return isAdmin || isCEO || isFinance;
  }, [user]);

  const queryClient = useQueryClient();

  // Fetch rules (READ ONLY)
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['commission-rules-management'],
    queryFn: () => base44.entities.CommissionRule.list('-effective_date'),
    enabled: isAuthorized,
    staleTime: 30000
  });

  // UI State
  const [draftRule, setDraftRule] = useState(null);
  const [showDraftForm, setShowDraftForm] = useState(false);

  // Create new version mutation with end date update for previous version
  const createVersionMutation = useMutation({
    mutationFn: async (newRuleData) => {
      console.log('[CommissionRuleManagement] Creating new version:', newRuleData);
      
      // Create new version
      const newRule = await base44.entities.CommissionRule.create(newRuleData);
      
      // If there's a previous version, update its end_date to be one day before new effective_date
      if (newRuleData.previous_rule_id && newRuleData.effective_date) {
        try {
          const previousEndDate = new Date(newRuleData.effective_date);
          previousEndDate.setDate(previousEndDate.getDate() - 1);
          
          await base44.entities.CommissionRule.update(newRuleData.previous_rule_id, {
            end_date: format(previousEndDate, 'yyyy-MM-dd')
          });
          
          console.log('[CommissionRuleManagement] Updated previous version end_date');
        } catch (updateError) {
          console.warn('[CommissionRuleManagement] Could not update previous version:', updateError);
        }
      }
      
      return newRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules-management'] });
      queryClient.invalidateQueries({ queryKey: ['commission-rules-active'] });
      setShowDraftForm(false);
      setDraftRule(null);
      toast.success('New commission rule version created');
    },
    onError: (error) => {
      console.error('[CommissionRuleManagement] Error creating rule:', error);
      toast.error(`Failed to create rule: ${error.message}`);
    }
  });

  // Helper: Determine rule status
  const getRuleStatus = (rule) => {
    const today = new Date();
    const effectiveDate = new Date(rule.effective_date);
    const endDate = rule.end_date ? new Date(rule.end_date) : null;

    if (!rule.is_active) return { label: 'Inactive', color: 'bg-slate-400 text-white' };
    if (endDate && endDate < today) return { label: 'Expired', color: 'bg-red-500 text-white' };
    if (effectiveDate > today) return { label: 'Future', color: 'bg-blue-500 text-white' };
    return { label: 'Active', color: 'bg-green-500 text-white' };
  };

  // Helper: Format model summary
  const getModelSummary = (rule) => {
    switch (rule.commission_model) {
      case 'percentage_profit':
        return `${rule.rate}% of profit`;
      case 'flat_amount':
        return `$${rule.flat_amount} flat`;
      case 'tiered':
        return `${rule.tiers?.length || 0} tiers`;
      case 'hybrid':
        return `$${rule.base_amount} + ${rule.bonus_rate}%`;
      default:
        return 'Unknown';
    }
  };

  // Clone rule for new version
  const handleCreateVersion = (sourceRule) => {
    const newVersion = {
      rule_name: sourceRule.rule_name,
      rule_description: sourceRule.rule_description,
      applicable_roles: sourceRule.applicable_roles || [],
      applicable_user_ids: sourceRule.applicable_user_ids || [],
      commission_model: sourceRule.commission_model,
      trigger_event: sourceRule.trigger_event,
      rate: sourceRule.rate || 0,
      flat_amount: sourceRule.flat_amount || 0,
      tiers: sourceRule.tiers || [],
      base_amount: sourceRule.base_amount || 0,
      bonus_rate: sourceRule.bonus_rate || 0,
      min_commission: sourceRule.min_commission || 10,
      max_commission_percent_of_profit: sourceRule.max_commission_percent_of_profit || 30,
      min_profit_threshold: sourceRule.min_profit_threshold || 100,
      is_active: true,
      effective_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: null,
      version: (sourceRule.version || 1) + 1,
      previous_rule_id: sourceRule.id
    };

    setDraftRule(newVersion);
    setShowDraftForm(true);
  };

  // Save new version
  const handleSaveVersion = () => {
    if (!draftRule) return;

    // Validation
    if (!draftRule.rule_name) {
      toast.error('Rule name is required');
      return;
    }
    if (!draftRule.effective_date) {
      toast.error('Effective date is required');
      return;
    }

    createVersionMutation.mutate(draftRule);
  };

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // EXECUTIVE-ONLY GATE
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
        <Card className="max-w-md w-full border-2 border-red-300 dark:border-red-900/30 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              Commission Rule Management: Executive Access Only
            </p>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm">
              <ul className="space-y-1 text-slate-700 dark:text-slate-300 text-left">
                <li>✓ Administrators</li>
                <li>✓ Finance Department</li>
                <li>✓ CEO / Executive Leadership</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Layers className="w-8 h-8 text-blue-600" />
            Commission Rules
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage commission calculation rules with version control
          </p>
        </div>

        <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-900/20 mb-6">
          <AlertTriangle className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-200">
            🔒 Historical rules are immutable. To modify a rule, create a new version with an updated effective date.
          </AlertDescription>
        </Alert>

        {/* Rules Table */}
        <Card className="shadow-xl mb-6">
          <CardHeader className="border-b">
            <CardTitle>Active & Historical Rules</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : rules.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                No commission rules found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="p-3 text-left font-semibold">Rule Name</th>
                      <th className="p-3 text-center font-semibold">Version</th>
                      <th className="p-3 text-left font-semibold">Model</th>
                      <th className="p-3 text-left font-semibold">Parameters</th>
                      <th className="p-3 text-left font-semibold">Effective Date</th>
                      <th className="p-3 text-left font-semibold">End Date</th>
                      <th className="p-3 text-center font-semibold">Status</th>
                      <th className="p-3 text-center font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(rule => {
                      const status = getRuleStatus(rule);
                      return (
                        <tr key={rule.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-medium">{rule.rule_name}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">v{rule.version || 1}</Badge>
                          </td>
                          <td className="p-3">
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                              {rule.commission_model.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {getModelSummary(rule)}
                          </td>
                          <td className="p-3">
                            {rule.effective_date ? format(new Date(rule.effective_date), 'MMM d, yyyy') : '-'}
                          </td>
                          <td className="p-3">
                            {rule.end_date ? format(new Date(rule.end_date), 'MMM d, yyyy') : 'Indefinite'}
                          </td>
                          <td className="p-3 text-center">
                            <Badge className={status.color}>{status.label}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCreateVersion(rule)}
                              className="gap-2"
                            >
                              <Copy className="w-3 h-3" />
                              New Version
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Draft Form (Modal) */}
        {showDraftForm && draftRule && (
          <Card className="shadow-2xl border-2 border-blue-500">
            <CardHeader className="bg-blue-50 dark:bg-blue-900/30 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-200">
                  Create New Version: {draftRule.rule_name} (v{draftRule.version})
                </CardTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setShowDraftForm(false);
                    setDraftRule(null);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-900/20">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-900 dark:text-amber-200">
                  This will create version {draftRule.version} as a new rule. The previous version will remain unchanged.
                </AlertDescription>
              </Alert>

              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Rule Name *</Label>
                  <Input
                    value={draftRule.rule_name}
                    onChange={e => setDraftRule({ ...draftRule, rule_name: e.target.value })}
                    placeholder="e.g., Sales Rep 5% Profit"
                  />
                </div>
                <div>
                  <Label>Effective Date *</Label>
                  <Input
                    type="date"
                    value={draftRule.effective_date}
                    onChange={e => setDraftRule({ ...draftRule, effective_date: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={draftRule.rule_description || ''}
                    onChange={e => setDraftRule({ ...draftRule, rule_description: e.target.value })}
                    placeholder="Describe this commission rule..."
                    className="h-20"
                  />
                </div>
              </div>

              {/* Model Configuration */}
              <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 className="font-bold text-slate-900 dark:text-white">Commission Model</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Model Type *</Label>
                    <Select 
                      value={draftRule.commission_model} 
                      onValueChange={v => setDraftRule({ ...draftRule, commission_model: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage_profit">Percentage of Profit</SelectItem>
                        <SelectItem value="flat_amount">Flat Amount</SelectItem>
                        <SelectItem value="tiered">Tiered</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Trigger Event *</Label>
                    <Select 
                      value={draftRule.trigger_event} 
                      onValueChange={v => setDraftRule({ ...draftRule, trigger_event: v })}
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

                  {draftRule.commission_model === 'percentage_profit' && (
                    <div>
                      <Label>Rate (%) *</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={draftRule.rate}
                          onChange={e => setDraftRule({ ...draftRule, rate: parseFloat(e.target.value) })}
                          step="0.5"
                          min="0"
                          max="100"
                        />
                        <Percent className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  )}

                  {draftRule.commission_model === 'flat_amount' && (
                    <div>
                      <Label>Flat Amount ($) *</Label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-slate-400" />
                        <Input
                          type="number"
                          value={draftRule.flat_amount}
                          onChange={e => setDraftRule({ ...draftRule, flat_amount: parseFloat(e.target.value) })}
                          step="10"
                          min="0"
                        />
                      </div>
                    </div>
                  )}

                  {draftRule.commission_model === 'hybrid' && (
                    <>
                      <div>
                        <Label>Base Amount ($) *</Label>
                        <Input
                          type="number"
                          value={draftRule.base_amount}
                          onChange={e => setDraftRule({ ...draftRule, base_amount: parseFloat(e.target.value) })}
                          step="10"
                          min="0"
                        />
                      </div>
                      <div>
                        <Label>Bonus Rate (%) *</Label>
                        <Input
                          type="number"
                          value={draftRule.bonus_rate}
                          onChange={e => setDraftRule({ ...draftRule, bonus_rate: parseFloat(e.target.value) })}
                          step="0.5"
                          min="0"
                          max="50"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <Label>Min Commission ($)</Label>
                    <Input
                      type="number"
                      value={draftRule.min_commission}
                      onChange={e => setDraftRule({ ...draftRule, min_commission: parseFloat(e.target.value) })}
                      step="5"
                      min="0"
                    />
                  </div>

                  <div>
                    <Label>Max Commission (% of Profit)</Label>
                    <Input
                      type="number"
                      value={draftRule.max_commission_percent_of_profit}
                      onChange={e => setDraftRule({ ...draftRule, max_commission_percent_of_profit: parseFloat(e.target.value) })}
                      step="1"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Tiered Configuration */}
                {draftRule.commission_model === 'tiered' && (
                  <div className="mt-4 space-y-3">
                    <Label className="font-bold">Tier Configuration</Label>
                    {(draftRule.tiers || []).map((tier, idx) => (
                      <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
                        <Label className="text-xs font-bold mb-2 block">Tier {idx + 1}</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            type="number"
                            placeholder="Min Profit"
                            value={tier.min_profit}
                            onChange={e => {
                              const newTiers = [...draftRule.tiers];
                              newTiers[idx].min_profit = parseFloat(e.target.value);
                              setDraftRule({ ...draftRule, tiers: newTiers });
                            }}
                          />
                          <Input
                            type="number"
                            placeholder="Max Profit"
                            value={tier.max_profit || ''}
                            onChange={e => {
                              const newTiers = [...draftRule.tiers];
                              newTiers[idx].max_profit = e.target.value ? parseFloat(e.target.value) : null;
                              setDraftRule({ ...draftRule, tiers: newTiers });
                            }}
                          />
                          <Input
                            type="number"
                            placeholder="Rate %"
                            value={tier.rate}
                            onChange={e => {
                              const newTiers = [...draftRule.tiers];
                              newTiers[idx].rate = parseFloat(e.target.value);
                              setDraftRule({ ...draftRule, tiers: newTiers });
                            }}
                            step="0.5"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDraftForm(false);
                    setDraftRule(null);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveVersion}
                  disabled={createVersionMutation.isPending || !draftRule.rule_name || !draftRule.effective_date}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {createVersionMutation.isPending ? 'Saving...' : 'Save New Version'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Version History */}
        {!showDraftForm && rules.length > 0 && (
          <Card className="shadow-xl">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-600" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p>• Total Rules: {rules.length}</p>
                <p>• Active Rules: {rules.filter(r => getRuleStatus(r).label === 'Active').length}</p>
                <p>• Future Rules: {rules.filter(r => getRuleStatus(r).label === 'Future').length}</p>
                <p>• Expired Rules: {rules.filter(r => getRuleStatus(r).label === 'Expired').length}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}