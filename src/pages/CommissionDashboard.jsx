import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, Award, AlertTriangle, Users, FileText, Target, Calendar, Lock } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from 'date-fns';

export default function CommissionDashboard() {
  // SECURITY: Admin / Finance / CEO only
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const [period, setPeriod] = useState('mtd');
  const [customStart, setCustomStart] = useState(null);
  const [customEnd, setCustomEnd] = useState(null);

  // Period calculation
  const periodDates = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'mtd':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'qtd':
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'ytd':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        return { start: customStart || startOfMonth(now), end: customEnd || endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period, customStart, customEnd]);

  // SECURITY: Check authorization before rendering
  const isAuthorized = useMemo(() => {
    if (!currentUser) return false;
    const role = currentUser.role?.toLowerCase();
    const position = currentUser.position?.toLowerCase();
    return role === 'admin' || position === 'ceo' || position === 'finance';
  }, [currentUser]);

  // Stable cache key - normalize period to string
  const cacheKey = useMemo(() => 
    ['commissionDashboard', format(periodDates.start, 'yyyy-MM-dd'), format(periodDates.end, 'yyyy-MM-dd')],
    [periodDates.start, periodDates.end]
  );

  // Single aggregated query - ONLY runs if authorized
  const { data: dashboardData = { commissions: [], invoiceMap: {} }, isLoading } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      // Fetch commissions
      const allCommissions = await base44.entities.CommissionRecord.list('-calculation_date', 1000);
      
      // Filter by period (server doesn't support date range filter)
      const startTime = periodDates.start.getTime();
      const endTime = periodDates.end.getTime();
      const periodCommissions = allCommissions.filter(c => {
        const calcDate = new Date(c.calculation_date).getTime();
        return calcDate >= startTime && calcDate <= endTime;
      });

      // Extract unique invoice IDs
      const invoiceIds = [...new Set(periodCommissions.map(c => c.trigger_entity_id))];
      
      // Batch fetch invoices if needed
      let invoiceMap = {};
      if (invoiceIds.length > 0) {
        const invoices = await base44.entities.Invoice.list('', 1000);
        invoices.forEach(inv => {
          if (invoiceIds.includes(inv.id)) {
            invoiceMap[inv.id] = inv;
          }
        });
      }

      return {
        commissions: periodCommissions,
        invoiceMap
      };
    },
    enabled: isAuthorized, // SECURITY: Only fetch if authorized
    staleTime: 5 * 60 * 1000, // 5 minutes - prevent refetch loops
    gcTime: 10 * 60 * 1000, // 10 minutes cache
  });

  // Extract for backward compatibility
  const periodCommissions = dashboardData.commissions;
  const invoices = Object.values(dashboardData.invoiceMap);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = periodCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const commissionPercent = totalRevenue > 0 ? (total / totalRevenue) * 100 : 0;
    const avgPerInvoice = periodCommissions.length > 0 ? total / periodCommissions.length : 0;

    // Top 5 earners
    const earnerMap = {};
    periodCommissions.forEach(c => {
      if (!earnerMap[c.user_id]) {
        earnerMap[c.user_id] = { 
          user_id: c.user_id, 
          name: c.employee_name, 
          total: 0, 
          count: 0 
        };
      }
      earnerMap[c.user_id].total += c.commission_amount || 0;
      earnerMap[c.user_id].count += 1;
    });
    const topEarners = Object.values(earnerMap).sort((a, b) => b.total - a.total).slice(0, 5);

    // Top 5 rules
    const ruleMap = {};
    periodCommissions.forEach(c => {
      const ruleName = c.rule_snapshot?.rule_name || 'Unknown';
      if (!ruleMap[ruleName]) {
        ruleMap[ruleName] = { name: ruleName, total: 0, count: 0 };
      }
      ruleMap[ruleName].total += c.commission_amount || 0;
      ruleMap[ruleName].count += 1;
    });
    const topRules = Object.values(ruleMap).sort((a, b) => b.total - a.total).slice(0, 5);

    return { total, commissionPercent, avgPerInvoice, topEarners, topRules };
  }, [periodCommissions, invoices]);

  // Alerts
  const alerts = useMemo(() => {
    const highCommissions = periodCommissions.filter(c => {
      const profit = c.calculation_inputs?.profit || 0;
      return profit > 0 && ((c.commission_amount / profit) > 0.25);
    });

    const dominantRules = kpis.topRules.filter(rule => {
      return (rule.total / kpis.total) > 0.40;
    });

    return { highCommissions, dominantRules };
  }, [periodCommissions, kpis]);

  // Breakdown data
  const breakdowns = useMemo(() => {
    // By Employee
    const byEmployee = {};
    periodCommissions.forEach(c => {
      if (!byEmployee[c.user_id]) {
        byEmployee[c.user_id] = {
          user_id: c.user_id,
          name: c.employee_name,
          total: 0,
          pending: 0,
          approved: 0,
          paid: 0,
          count: 0
        };
      }
      byEmployee[c.user_id].total += c.commission_amount || 0;
      byEmployee[c.user_id][c.status] = (byEmployee[c.user_id][c.status] || 0) + (c.commission_amount || 0);
      byEmployee[c.user_id].count += 1;
    });

    // By Rule
    const byRule = {};
    periodCommissions.forEach(c => {
      const ruleName = c.rule_snapshot?.rule_name || 'Unknown';
      if (!byRule[ruleName]) {
        byRule[ruleName] = { name: ruleName, total: 0, count: 0, model: c.rule_snapshot?.commission_model };
      }
      byRule[ruleName].total += c.commission_amount || 0;
      byRule[ruleName].count += 1;
    });

    // By Invoice
    const byInvoice = {};
    periodCommissions.forEach(c => {
      const invNum = c.trigger_entity_number || c.trigger_entity_id;
      if (!byInvoice[invNum]) {
        byInvoice[invNum] = { invoice_number: invNum, total: 0, count: 0, records: [] };
      }
      byInvoice[invNum].total += c.commission_amount || 0;
      byInvoice[invNum].count += 1;
      byInvoice[invNum].records.push(c);
    });

    // By Period (monthly)
    const byPeriod = {};
    periodCommissions.forEach(c => {
      const month = format(new Date(c.calculation_date), 'MMM yyyy');
      if (!byPeriod[month]) {
        byPeriod[month] = { month, total: 0, count: 0 };
      }
      byPeriod[month].total += c.commission_amount || 0;
      byPeriod[month].count += 1;
    });

    return {
      byEmployee: Object.values(byEmployee).sort((a, b) => b.total - a.total),
      byRule: Object.values(byRule).sort((a, b) => b.total - a.total),
      byInvoice: Object.values(byInvoice).sort((a, b) => b.total - a.total),
      byPeriod: Object.values(byPeriod)
    };
  }, [periodCommissions]);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800'
  };

  // SECURITY: Access denied for non-admin users
  if (userLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600">
              This dashboard is only accessible to Admin, Finance, and CEO roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Commission Analytics</h1>
          <p className="text-gray-600">Executive dashboard for commission insights</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mtd">Month to Date</SelectItem>
            <SelectItem value="qtd">Quarter to Date</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts */}
      {(alerts.highCommissions.length > 0 || alerts.dominantRules.length > 0) && (
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">Alerts</h3>
                {alerts.highCommissions.length > 0 && (
                  <p className="text-sm text-amber-800 mb-1">
                    ⚠️ {alerts.highCommissions.length} commissions exceed 25% of invoice profit
                  </p>
                )}
                {alerts.dominantRules.length > 0 && (
                  <p className="text-sm text-amber-800">
                    ⚠️ {alerts.dominantRules.length} rules dominate 40%+ of total payouts
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Commissions</p>
                <p className="text-3xl font-bold text-gray-900">${kpis.total.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">{periodCommissions.length} records</p>
              </div>
              <DollarSign className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">% of Revenue</p>
                <p className="text-3xl font-bold text-gray-900">{kpis.commissionPercent.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-1">Total revenue: ${invoices.reduce((s, i) => s + (i.total || 0), 0).toFixed(0)}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg per Invoice</p>
                <p className="text-3xl font-bold text-gray-900">${kpis.avgPerInvoice.toFixed(2)}</p>
              </div>
              <FileText className="h-12 w-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              Top 5 Earners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kpis.topEarners.map((earner, idx) => (
                <div key={earner.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{earner.name}</p>
                      <p className="text-xs text-gray-600">{earner.count} commissions</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-green-600">${earner.total.toFixed(2)}</p>
                </div>
              ))}
              {kpis.topEarners.length === 0 && (
                <p className="text-center text-gray-500 py-8">No data for this period</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Top 5 Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kpis.topRules.map((rule, idx) => {
                const percentage = (rule.total / kpis.total) * 100;
                const isDominant = percentage > 40;
                
                return (
                  <div key={rule.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{rule.name}</p>
                        <p className="text-xs text-gray-600">{rule.count} commissions • {percentage.toFixed(1)}% of total</p>
                      </div>
                      {isDominant && (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-lg font-bold text-blue-600">${rule.total.toFixed(2)}</p>
                  </div>
                );
              })}
              {kpis.topRules.length === 0 && (
                <p className="text-center text-gray-500 py-8">No data for this period</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdowns */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Breakdowns</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="employee">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="employee">
                <Users className="w-4 h-4 mr-2" />
                By Employee
              </TabsTrigger>
              <TabsTrigger value="rule">
                <Target className="w-4 h-4 mr-2" />
                By Rule
              </TabsTrigger>
              <TabsTrigger value="invoice">
                <FileText className="w-4 h-4 mr-2" />
                By Invoice
              </TabsTrigger>
              <TabsTrigger value="period">
                <Calendar className="w-4 h-4 mr-2" />
                By Period
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employee">
              <div className="space-y-2">
                {breakdowns.byEmployee.map(emp => (
                  <div key={emp.user_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{emp.name}</p>
                      <div className="flex gap-2 mt-1">
                        {emp.pending > 0 && <Badge className={statusColors.pending}>${emp.pending.toFixed(0)} pending</Badge>}
                        {emp.approved > 0 && <Badge className={statusColors.approved}>${emp.approved.toFixed(0)} approved</Badge>}
                        {emp.paid > 0 && <Badge className={statusColors.paid}>${emp.paid.toFixed(0)} paid</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${emp.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">{emp.count} commissions</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rule">
              <div className="space-y-2">
                {breakdowns.byRule.map(rule => (
                  <div key={rule.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{rule.name}</p>
                      <p className="text-sm text-gray-600">Model: {rule.model}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${rule.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">{rule.count} commissions</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="invoice">
              <div className="space-y-2">
                {breakdowns.byInvoice.map(inv => (
                  <div key={inv.invoice_number} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{inv.invoice_number}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {inv.records.map(r => (
                          <Badge key={r.id} variant="outline" className="text-xs">
                            {r.employee_name}: ${r.commission_amount.toFixed(0)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${inv.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">{inv.count} commissions</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="period">
              <div className="space-y-2">
                {breakdowns.byPeriod.map(p => (
                  <div key={p.month} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{p.month}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${p.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-600">{p.count} commissions</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Read-only Notice */}
      <Card className="mt-6 bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Dashboard Mode:</strong> This is a read-only analytics view. All commission calculations are automated and immutable. 
            No data can be edited from this dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}