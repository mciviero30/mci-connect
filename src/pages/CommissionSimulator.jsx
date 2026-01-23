import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Calculator,
  ArrowRight,
  RotateCcw,
  Percent,
  Layers
} from 'lucide-react';
import { hasFullAccess } from '@/components/core/roleRules';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';

export default function CommissionSimulator() {
  // Authentication & Authorization
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: Infinity
  });

  const isAuthorized = useMemo(() => {
    if (!user) return false;
    const allowedRoles = ['admin', 'finance', 'ceo'];
    return allowedRoles.includes(user.role) || user.position === 'CEO';
  }, [user]);

  // Simulation Parameters (UI State Only)
  const [simulationScope, setSimulationScope] = useState('rule'); // 'rule' | 'employee' | 'global'
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [commissionModel, setCommissionModel] = useState('percentage_profit');
  const [rate, setRate] = useState(5); // percentage
  const [flatAmount, setFlatAmount] = useState(100);
  const [tiers, setTiers] = useState([
    { min_profit: 0, max_profit: 5000, rate: 3 },
    { min_profit: 5000, max_profit: 10000, rate: 5 },
    { min_profit: 10000, max_profit: null, rate: 7 }
  ]);
  const [baseAmount, setBaseAmount] = useState(50);
  const [bonusRate, setBonusRate] = useState(2);

  // Fetch READ ONLY data
  const { data: commissionRecords = [] } = useQuery({
    queryKey: ['commissionRecords'],
    queryFn: () => base44.entities.CommissionRecord.list('-calculation_date', 500),
    enabled: isAuthorized,
    staleTime: 60000
  });

  const { data: commissionRules = [] } = useQuery({
    queryKey: ['commissionRules'],
    queryFn: () => base44.entities.CommissionRule.filter({ is_active: true }),
    enabled: isAuthorized,
    staleTime: 60000
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employeeDirectory'],
    queryFn: async () => {
      const directory = await base44.entities.EmployeeDirectory.filter({ status: 'active' });
      return directory.map(d => ({
        id: d.user_id,
        name: d.full_name,
        email: d.employee_email
      }));
    },
    enabled: isAuthorized,
    staleTime: 300000
  });

  // Simulation Logic: Clone production formula
  const calculateSimulatedCommission = (record, simulatedRule) => {
    const inputs = record.calculation_inputs;
    if (!inputs || !inputs.profit) return 0;

    const profit = inputs.profit;
    let commission = 0;

    switch (simulatedRule.commission_model) {
      case 'percentage_profit':
        commission = profit * (simulatedRule.rate / 100);
        break;

      case 'flat_amount':
        commission = simulatedRule.flat_amount;
        break;

      case 'tiered':
        const tier = simulatedRule.tiers.find(t => 
          profit >= t.min_profit && (t.max_profit === null || profit < t.max_profit)
        );
        if (tier) {
          commission = profit * (tier.rate / 100);
        }
        break;

      case 'hybrid':
        commission = simulatedRule.base_amount + (profit * (simulatedRule.bonus_rate / 100));
        break;

      default:
        commission = 0;
    }

    // Apply caps (same as production)
    const minCommission = simulatedRule.min_commission || 10;
    const maxCommissionPercent = simulatedRule.max_commission_percent_of_profit || 30;
    const maxCommission = profit * (maxCommissionPercent / 100);

    if (commission < minCommission) commission = 0;
    if (commission > maxCommission) commission = maxCommission;

    return Math.round(commission * 100) / 100;
  };

  // Filter records based on simulation scope
  const filteredRecords = useMemo(() => {
    let records = [...commissionRecords];

    if (simulationScope === 'rule' && selectedRuleId) {
      records = records.filter(r => r.rule_id === selectedRuleId);
    } else if (simulationScope === 'employee' && selectedUserId) {
      records = records.filter(r => r.user_id === selectedUserId);
    }
    // 'global' = all records

    return records;
  }, [commissionRecords, simulationScope, selectedRuleId, selectedUserId]);

  // Run simulation (IN MEMORY ONLY)
  const simulation = useMemo(() => {
    const simulatedRule = {
      commission_model: commissionModel,
      rate,
      flat_amount: flatAmount,
      tiers,
      base_amount: baseAmount,
      bonus_rate: bonusRate,
      min_commission: 10,
      max_commission_percent_of_profit: 30
    };

    let actualTotal = 0;
    let simulatedTotal = 0;
    const comparisons = [];

    filteredRecords.forEach(record => {
      const actual = record.commission_amount;
      const simulated = calculateSimulatedCommission(record, simulatedRule);
      const delta = simulated - actual;
      const deltaPercent = actual > 0 ? ((delta / actual) * 100) : 0;

      actualTotal += actual;
      simulatedTotal += simulated;

      comparisons.push({
        id: record.id,
        invoice_number: record.trigger_entity_number,
        employee_name: employees.find(e => e.id === record.user_id)?.name || 'Unknown',
        profit: record.calculation_inputs?.profit || 0,
        actual,
        simulated,
        delta,
        deltaPercent
      });
    });

    const totalDelta = simulatedTotal - actualTotal;
    const totalDeltaPercent = actualTotal > 0 ? ((totalDelta / actualTotal) * 100) : 0;

    // Calculate net margin after simulated commissions
    const totalRevenue = filteredRecords.reduce((sum, r) => 
      sum + (r.calculation_inputs?.invoice_total || 0), 0
    );
    const totalProfit = filteredRecords.reduce((sum, r) => 
      sum + (r.calculation_inputs?.profit || 0), 0
    );
    const netMarginAfterSimulation = totalProfit - simulatedTotal;
    const simulatedCommissionPercentOfProfit = totalProfit > 0 
      ? (simulatedTotal / totalProfit) * 100 
      : 0;

    return {
      actualTotal,
      simulatedTotal,
      totalDelta,
      totalDeltaPercent,
      comparisons,
      totalRevenue,
      totalProfit,
      netMarginAfterSimulation,
      simulatedCommissionPercentOfProfit,
      recordCount: filteredRecords.length
    };
  }, [filteredRecords, commissionModel, rate, flatAmount, tiers, baseAmount, bonusRate, employees]);

  const resetToDefaults = () => {
    setCommissionModel('percentage_profit');
    setRate(5);
    setFlatAmount(100);
    setTiers([
      { min_profit: 0, max_profit: 5000, rate: 3 },
      { min_profit: 5000, max_profit: 10000, rate: 5 },
      { min_profit: 10000, max_profit: null, rate: 7 }
    ]);
    setBaseAmount(50);
    setBonusRate(2);
  };

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Authorization check
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-600">This simulator is only available to Admin, Finance, and CEO roles.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with SIMULATION banner */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Calculator className="w-8 h-8 text-blue-600" />
                Commission Simulator
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Preview the impact of alternative commission structures
              </p>
            </div>
            <Button onClick={resetToDefaults} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>

          <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-900/20">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-900 dark:text-orange-200 font-bold">
              🔒 SIMULATION ONLY — No data will be modified. All calculations happen in your browser.
            </AlertDescription>
          </Alert>
        </div>

        {/* Controls Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Scope Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Simulation Scope
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Scope</Label>
                <Select value={simulationScope} onValueChange={setSimulationScope}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">All Commissions</SelectItem>
                    <SelectItem value="rule">Specific Rule</SelectItem>
                    <SelectItem value="employee">Specific Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {simulationScope === 'rule' && (
                <div>
                  <Label>Commission Rule</Label>
                  <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rule..." />
                    </SelectTrigger>
                    <SelectContent>
                      {commissionRules.map(rule => (
                        <SelectItem key={rule.id} value={rule.id}>
                          {rule.rule_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {simulationScope === 'employee' && (
                <div>
                  <Label>Employee</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                Commission Model
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Model Type</Label>
                <Select value={commissionModel} onValueChange={setCommissionModel}>
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

              {commissionModel === 'percentage_profit' && (
                <div>
                  <Label>Rate (%)</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number" 
                      value={rate} 
                      onChange={e => setRate(parseFloat(e.target.value))}
                      step="0.5"
                      min="0"
                      max="50"
                    />
                    <Percent className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              )}

              {commissionModel === 'flat_amount' && (
                <div>
                  <Label>Flat Amount ($)</Label>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                    <Input 
                      type="number" 
                      value={flatAmount} 
                      onChange={e => setFlatAmount(parseFloat(e.target.value))}
                      step="10"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {commissionModel === 'hybrid' && (
                <>
                  <div>
                    <Label>Base Amount ($)</Label>
                    <Input 
                      type="number" 
                      value={baseAmount} 
                      onChange={e => setBaseAmount(parseFloat(e.target.value))}
                      step="10"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>Bonus Rate (%)</Label>
                    <Input 
                      type="number" 
                      value={bonusRate} 
                      onChange={e => setBonusRate(parseFloat(e.target.value))}
                      step="0.5"
                      min="0"
                      max="20"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tiered Config */}
          {commissionModel === 'tiered' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tier Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tiers.map((tier, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
                    <Label className="text-xs font-bold">Tier {idx + 1}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <Input 
                        type="number" 
                        placeholder="Min $"
                        value={tier.min_profit} 
                        onChange={e => {
                          const newTiers = [...tiers];
                          newTiers[idx].min_profit = parseFloat(e.target.value);
                          setTiers(newTiers);
                        }}
                        className="text-xs"
                      />
                      <Input 
                        type="number" 
                        placeholder="Max $"
                        value={tier.max_profit || ''} 
                        onChange={e => {
                          const newTiers = [...tiers];
                          newTiers[idx].max_profit = e.target.value ? parseFloat(e.target.value) : null;
                          setTiers(newTiers);
                        }}
                        className="text-xs"
                      />
                      <Input 
                        type="number" 
                        placeholder="Rate %"
                        value={tier.rate} 
                        onChange={e => {
                          const newTiers = [...tiers];
                          newTiers[idx].rate = parseFloat(e.target.value);
                          setTiers(newTiers);
                        }}
                        step="0.5"
                        className="text-xs"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Scenario Comparison: A (Actual) vs B (Simulated) */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Scenario A: ACTUAL */}
          <Card className="border-2 border-slate-400 dark:border-slate-600 shadow-lg">
            <CardHeader className="bg-slate-100 dark:bg-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                  Scenario A: ACTUAL
                </CardTitle>
                <Badge className="bg-slate-600 text-white">Current State</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Total Commission */}
              <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Commission</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  ${simulation.actualTotal.toLocaleString()}
                </p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Commission % of Profit</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {simulation.totalProfit > 0 ? ((simulation.actualTotal / simulation.totalProfit) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Net Margin</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    ${(simulation.totalProfit - simulation.actualTotal).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Avg per Invoice</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    ${simulation.recordCount > 0 ? Math.round(simulation.actualTotal / simulation.recordCount).toLocaleString() : 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Records</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {simulation.recordCount}
                  </p>
                </div>
              </div>

              {/* Risk Indicators */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 uppercase font-semibold mb-2">Risk Indicators</p>
                <div className="space-y-2">
                  {simulation.totalProfit > 0 && (simulation.actualTotal / simulation.totalProfit) > 0.30 && (
                    <Badge className="w-full justify-start bg-orange-100 text-orange-800 border border-orange-300">
                      <AlertTriangle className="w-3 h-3 mr-2" />
                      Commission &gt; 30% of profit
                    </Badge>
                  )}
                  {(simulation.totalProfit - simulation.actualTotal) < 0 && (
                    <Badge className="w-full justify-start bg-red-100 text-red-800 border border-red-300">
                      <AlertTriangle className="w-3 h-3 mr-2" />
                      Negative margin
                    </Badge>
                  )}
                  {simulation.totalProfit > 0 && (simulation.actualTotal / simulation.totalProfit) <= 0.30 && (simulation.totalProfit - simulation.actualTotal) >= 0 && (
                    <Badge className="w-full justify-start bg-green-100 text-green-800 border border-green-300">
                      ✓ Within safe limits
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scenario B: SIMULATED */}
          <Card className="border-2 border-blue-500 shadow-lg">
            <CardHeader className="bg-blue-50 dark:bg-blue-900/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-200">
                  Scenario B: SIMULATED
                </CardTitle>
                <Badge className="bg-blue-600 text-white">What-If Analysis</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Total Commission */}
              <div className="pb-4 border-b border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold mb-1">Total Commission</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-bold text-blue-600">
                    ${simulation.simulatedTotal.toLocaleString()}
                  </p>
                  <Badge className={`${simulation.totalDelta >= 0 ? 'bg-red-500' : 'bg-green-500'} text-white`}>
                    {simulation.totalDelta >= 0 ? '+' : ''}{simulation.totalDeltaPercent.toFixed(1)}%
                  </Badge>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Commission % of Profit</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold text-blue-600">
                      {simulation.simulatedCommissionPercentOfProfit.toFixed(1)}%
                    </p>
                    <span className={`text-xs ${
                      simulation.simulatedCommissionPercentOfProfit > (simulation.actualTotal / simulation.totalProfit * 100) 
                      ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ({simulation.simulatedCommissionPercentOfProfit > (simulation.actualTotal / simulation.totalProfit * 100) ? '+' : ''}
                      {(simulation.simulatedCommissionPercentOfProfit - (simulation.actualTotal / simulation.totalProfit * 100)).toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Net Margin</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-bold text-blue-600">
                      ${simulation.netMarginAfterSimulation.toLocaleString()}
                    </p>
                    <span className={`text-xs ${
                      simulation.netMarginAfterSimulation < (simulation.totalProfit - simulation.actualTotal)
                      ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ({simulation.netMarginAfterSimulation < (simulation.totalProfit - simulation.actualTotal) ? '' : '+'}
                      ${(simulation.netMarginAfterSimulation - (simulation.totalProfit - simulation.actualTotal)).toLocaleString()})
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Avg per Invoice</p>
                  <p className="text-xl font-bold text-blue-600">
                    ${simulation.recordCount > 0 ? Math.round(simulation.simulatedTotal / simulation.recordCount).toLocaleString() : 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Impact Delta</p>
                  <p className={`text-xl font-bold ${simulation.totalDelta >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {simulation.totalDelta >= 0 ? '+' : ''}${simulation.totalDelta.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Risk Indicators */}
              <div className="pt-4 border-t border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold mb-2">Risk Indicators</p>
                <div className="space-y-2">
                  {simulation.simulatedCommissionPercentOfProfit > 30 && (
                    <Badge className="w-full justify-start bg-red-100 text-red-800 border border-red-300">
                      <AlertTriangle className="w-3 h-3 mr-2" />
                      ⚠️ Commission &gt; 30% of profit
                    </Badge>
                  )}
                  {simulation.netMarginAfterSimulation < 0 && (
                    <Badge className="w-full justify-start bg-red-100 text-red-800 border border-red-300">
                      <AlertTriangle className="w-3 h-3 mr-2" />
                      🚨 NEGATIVE MARGIN AFTER COMMISSION
                    </Badge>
                  )}
                  {simulation.simulatedTotal > (simulation.totalRevenue * 0.15) && (
                    <Badge className="w-full justify-start bg-orange-100 text-orange-800 border border-orange-300">
                      <AlertTriangle className="w-3 h-3 mr-2" />
                      Commission exceeds 15% of revenue
                    </Badge>
                  )}
                  {simulation.simulatedCommissionPercentOfProfit <= 30 && simulation.netMarginAfterSimulation >= 0 && (
                    <Badge className="w-full justify-start bg-green-100 text-green-800 border border-green-300">
                      ✓ Within safe limits
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Impact */}
        <Card className="mb-6 border-2 border-purple-300 bg-purple-50 dark:bg-purple-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900 dark:text-purple-200">
              <TrendingUp className="w-5 h-5" />
              Financial Impact Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Revenue</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  ${simulation.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Profit</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  ${simulation.totalProfit.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Net Margin (After Commissions)</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  ${simulation.netMarginAfterSimulation.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Commission % of Profit</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {simulation.simulatedCommissionPercentOfProfit.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-blue-600" />
              Detailed Comparison ({simulation.comparisons.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="p-3 text-left font-semibold">Invoice</th>
                    <th className="p-3 text-left font-semibold">Employee</th>
                    <th className="p-3 text-right font-semibold">Profit</th>
                    <th className="p-3 text-right font-semibold">Actual</th>
                    <th className="p-3 text-right font-semibold">Simulated</th>
                    <th className="p-3 text-right font-semibold">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.comparisons.slice(0, 50).map(comp => (
                    <tr key={comp.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-mono text-xs">{comp.invoice_number}</td>
                      <td className="p-3">{comp.employee_name}</td>
                      <td className="p-3 text-right font-medium">${comp.profit.toLocaleString()}</td>
                      <td className="p-3 text-right">${comp.actual.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-blue-600">${comp.simulated.toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <Badge className={comp.delta >= 0 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}>
                          {comp.delta >= 0 ? '+' : ''}${comp.delta.toLocaleString()} ({comp.deltaPercent >= 0 ? '+' : ''}{comp.deltaPercent.toFixed(1)}%)
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {simulation.comparisons.length > 50 && (
                <p className="text-xs text-slate-500 mt-4 text-center">
                  Showing first 50 of {simulation.comparisons.length} records
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}