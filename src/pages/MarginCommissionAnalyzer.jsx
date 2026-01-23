import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingUp, DollarSign, Percent, Users, FileText } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { hasFullAccess } from "@/components/core/roleRules";
import moment from "moment";

export default function MarginCommissionAnalyzer() {
  const { t } = useLanguage();
  const [period, setPeriod] = useState("mtd");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = moment();
    let start, end;

    switch (period) {
      case "mtd":
        start = now.clone().startOf('month');
        end = now.clone().endOf('day');
        break;
      case "qtd":
        start = now.clone().startOf('quarter');
        end = now.clone().endOf('day');
        break;
      case "ytd":
        start = now.clone().startOf('year');
        end = now.clone().endOf('day');
        break;
      case "custom":
        start = customStart ? moment(customStart) : now.clone().subtract(30, 'days');
        end = customEnd ? moment(customEnd) : now.clone();
        break;
      default:
        start = now.clone().startOf('month');
        end = now.clone().endOf('day');
    }

    return {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD')
    };
  }, [period, customStart, customEnd]);

  // STRICT Authorization: Admin / Finance / CEO ONLY
  const isAuthorized = useMemo(() => {
    if (!user) return false;
    
    // Explicit whitelist - no exceptions
    const allowedRoles = ['admin', 'finance', 'ceo'];
    const isRoleAuthorized = allowedRoles.includes(user.role);
    const isCEOPosition = user.position === 'CEO';
    
    return isRoleAuthorized || isCEOPosition;
  }, [user]);

  // Fetch data - stable cache keys, no unused queries
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['marginCommissionAnalyzer', 'invoices', startDate, endDate],
    queryFn: async () => {
      const allInvoices = await base44.entities.Invoice.filter({
        status: { $in: ['paid', 'partial'] },
        payment_date: { $gte: startDate, $lte: endDate }
      }, '-payment_date', 200);
      return allInvoices;
    },
    enabled: isAuthorized && !!startDate && !!endDate,
    staleTime: 600000, // 10 min cache
    gcTime: 1200000, // 20 min garbage collection
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: commissions = [], isLoading: loadingCommissions } = useQuery({
    queryKey: ['marginCommissionAnalyzer', 'commissions', startDate, endDate],
    queryFn: async () => {
      const allCommissions = await base44.entities.CommissionRecord.filter({
        status: { $in: ['paid', 'approved'] },
        calculation_date: { $gte: startDate, $lte: endDate }
      }, '-calculation_date', 500);
      return allCommissions;
    },
    enabled: isAuthorized && !!startDate && !!endDate,
    staleTime: 600000,
    gcTime: 1200000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // KPIs - memoized separately for stability
  const kpis = useMemo(() => {
    if (!invoices.length) return null;

    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalCommissions = commissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);

    // Job costs from calculation_inputs
    const jobCosts = new Map();
    commissions.forEach(c => {
      const jobId = c.trigger_entity_id;
      const inputs = c.calculation_inputs || {};
      const totalCost = (inputs.labor_cost || 0) + (inputs.material_cost || 0) + (inputs.other_expenses || 0);
      if (!jobCosts.has(jobId)) {
        jobCosts.set(jobId, totalCost);
      }
    });

    const totalJobCost = Array.from(jobCosts.values()).reduce((sum, cost) => sum + cost, 0);
    const grossProfit = totalRevenue - totalJobCost;
    const netMargin = grossProfit - totalCommissions;
    const commissionPctOfRevenue = totalRevenue > 0 ? (totalCommissions / totalRevenue) * 100 : 0;
    const commissionPctOfProfit = grossProfit > 0 ? (totalCommissions / grossProfit) * 100 : 0;

    return {
      totalRevenue,
      totalJobCost,
      totalCommissions,
      grossProfit,
      netMargin,
      commissionPctOfRevenue,
      commissionPctOfProfit,
      jobCosts
    };
  }, [invoices, commissions]);

  // By Invoice - memoized separately
  const byInvoice = useMemo(() => {
    if (!kpis) return [];
    
    return invoices.map(inv => {
      const invCommissions = commissions.filter(c => c.trigger_entity_id === inv.job_id);
      const commissionTotal = invCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
      const jobCost = kpis.jobCosts.get(inv.job_id) || 0;
      const profit = (inv.total || 0) - jobCost;
      const netMarginAfterComm = profit - commissionTotal;
      const commPctOfProfit = profit > 0 ? (commissionTotal / profit) * 100 : 0;

      return {
        invoice_number: inv.invoice_number,
        job_id: inv.job_id,
        revenue: inv.total || 0,
        jobCost,
        commissionTotal,
        profit,
        netMargin: netMarginAfterComm,
        commPctOfProfit,
        isHighCommission: commPctOfProfit > 30,
        isNegativeMargin: netMarginAfterComm < 0
      };
    });
  }, [invoices, commissions, kpis]);

  // By Employee - memoized separately
  const byEmployee = useMemo(() => {
    if (!kpis) return [];
    
    const employeeMap = new Map();
    commissions.forEach(c => {
      const userId = c.user_id || c.employee_email;
      const name = c.employee_name || userId;
      if (!employeeMap.has(userId)) {
        employeeMap.set(userId, { name, totalCommission: 0, invoiceCount: 0, revenueInfluenced: 0 });
      }
      const emp = employeeMap.get(userId);
      emp.totalCommission += c.commission_amount || 0;
      emp.invoiceCount += 1;
      
      const relatedInvoice = invoices.find(inv => inv.job_id === c.trigger_entity_id);
      if (relatedInvoice) {
        emp.revenueInfluenced += relatedInvoice.total || 0;
      }
    });
    return Array.from(employeeMap.values()).map(e => ({
      ...e,
      avgPerInvoice: e.invoiceCount > 0 ? e.totalCommission / e.invoiceCount : 0
    })).sort((a, b) => b.totalCommission - a.totalCommission);
  }, [commissions, invoices, kpis]);

  // By Rule - memoized separately
  const byRule = useMemo(() => {
    if (!kpis) return [];
    
    const ruleMap = new Map();
    commissions.forEach(c => {
      const ruleId = c.rule_id;
      const ruleName = c.rule_snapshot?.rule_name || ruleId;
      if (!ruleMap.has(ruleId)) {
        ruleMap.set(ruleId, { ruleName, totalCommission: 0, count: 0 });
      }
      const rule = ruleMap.get(ruleId);
      rule.totalCommission += c.commission_amount || 0;
      rule.count += 1;
    });
    return Array.from(ruleMap.values()).map(r => ({
      ...r,
      pctOfTotal: kpis.totalCommissions > 0 ? (r.totalCommission / kpis.totalCommissions) * 100 : 0,
      avgPerInvoice: r.count > 0 ? r.totalCommission / r.count : 0,
      isDominant: kpis.totalCommissions > 0 && (r.totalCommission / kpis.totalCommissions) > 0.4
    })).sort((a, b) => b.totalCommission - a.totalCommission);
  }, [commissions, kpis]);

  // By Period - memoized separately
  const byPeriod = useMemo(() => {
    if (!kpis) return [];
    
    const weekMap = new Map();
    invoices.forEach(inv => {
      const weekStart = moment(inv.payment_date).startOf('week').format('YYYY-MM-DD');
      if (!weekMap.has(weekStart)) {
        weekMap.set(weekStart, { week: weekStart, revenue: 0, commission: 0, jobCost: 0 });
      }
      const week = weekMap.get(weekStart);
      week.revenue += inv.total || 0;
      
      const jobCost = kpis.jobCosts.get(inv.job_id) || 0;
      week.jobCost += jobCost;
      
      const invCommissions = commissions.filter(c => c.trigger_entity_id === inv.job_id);
      week.commission += invCommissions.reduce((sum, c) => sum + (c.commission_amount || 0), 0);
    });
    return Array.from(weekMap.values()).map(w => ({
      ...w,
      profit: w.revenue - w.jobCost,
      netMargin: w.revenue - w.jobCost - w.commission
    })).sort((a, b) => moment(a.week).valueOf() - moment(b.week).valueOf());
  }, [invoices, commissions, kpis]);

  const isLoading = loadingInvoices || loadingCommissions;

  // SECURITY GATE: Block unauthorized users immediately
  if (!user) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
        <p className="text-slate-600">Please log in to continue.</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-600 mb-2">This financial dashboard is restricted to:</p>
        <ul className="text-sm text-slate-500 list-disc list-inside">
          <li>Admin</li>
          <li>Finance</li>
          <li>CEO</li>
        </ul>
        <p className="text-xs text-slate-400 mt-4">Your role: {user.role || 'Unknown'}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="p-8">
        <PageHeader title="Margin vs Commission Analyzer" icon={TrendingUp} />
        <Card className="mt-6">
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">No data available for the selected period.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <PageHeader 
        title="Margin vs Commission Analyzer" 
        icon={TrendingUp}
        description="Read-only financial analysis: How commissions impact margins"
      />

      {/* Filters */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtd">Month to Date</SelectItem>
                  <SelectItem value="qtd">Quarter to Date</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                />
              </>
            )}

            <Badge variant="outline" className="text-xs">
              READ ONLY
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Job Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.totalJobCost.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Labor + Materials + Expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${kpis.totalCommissions.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">
              {kpis.commissionPctOfRevenue.toFixed(1)}% of revenue
            </p>
          </CardContent>
        </Card>

        <Card className={kpis.netMargin < 0 ? 'border-red-500' : 'border-green-500'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Net Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.netMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${kpis.netMargin.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              After commissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Summary */}
      <Card className="mt-6 border-amber-500 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Commission Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-semibold">Commission % of Profit</div>
              <div className="text-2xl font-bold text-amber-600">
                {kpis.commissionPctOfProfit.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="font-semibold">High Commission Invoices</div>
              <div className="text-2xl font-bold">
                {byInvoice.filter(i => i.isHighCommission).length}
              </div>
              <div className="text-xs text-slate-600">&gt;30% of profit</div>
            </div>
            <div>
              <div className="font-semibold">Negative Margin</div>
              <div className="text-2xl font-bold text-red-600">
                {byInvoice.filter(i => i.isNegativeMargin).length}
              </div>
              <div className="text-xs text-slate-600">After commissions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="invoice" className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="invoice">By Invoice</TabsTrigger>
          <TabsTrigger value="employee">By Employee</TabsTrigger>
          <TabsTrigger value="rule">By Rule</TabsTrigger>
          <TabsTrigger value="period">By Period</TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-semibold">Invoice</th>
                      <th className="pb-2 font-semibold text-right">Revenue</th>
                      <th className="pb-2 font-semibold text-right">Job Cost</th>
                      <th className="pb-2 font-semibold text-right">Commission</th>
                      <th className="pb-2 font-semibold text-right">Net Margin</th>
                      <th className="pb-2 font-semibold text-right">Comm %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byInvoice.map((inv, idx) => (
                      <tr key={idx} className={`border-b ${inv.isNegativeMargin ? 'bg-red-50' : inv.isHighCommission ? 'bg-amber-50' : ''}`}>
                        <td className="py-2">{inv.invoice_number}</td>
                        <td className="py-2 text-right">${inv.revenue.toLocaleString()}</td>
                        <td className="py-2 text-right">${inv.jobCost.toLocaleString()}</td>
                        <td className="py-2 text-right text-orange-600">${inv.commissionTotal.toLocaleString()}</td>
                        <td className={`py-2 text-right font-semibold ${inv.netMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${inv.netMargin.toLocaleString()}
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant={inv.isHighCommission ? 'destructive' : 'outline'}>
                            {inv.commPctOfProfit.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Employee Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-semibold">Employee</th>
                      <th className="pb-2 font-semibold text-right">Total Commission</th>
                      <th className="pb-2 font-semibold text-right">Revenue Influenced</th>
                      <th className="pb-2 font-semibold text-right">Avg per Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byEmployee.map((emp, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{emp.name}</td>
                        <td className="py-2 text-right font-semibold text-orange-600">${emp.totalCommission.toLocaleString()}</td>
                        <td className="py-2 text-right">${emp.revenueInfluenced.toLocaleString()}</td>
                        <td className="py-2 text-right">${emp.avgPerInvoice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rule" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Commission Rule Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-semibold">Rule Name</th>
                      <th className="pb-2 font-semibold text-right">Total Paid</th>
                      <th className="pb-2 font-semibold text-right">% of Total</th>
                      <th className="pb-2 font-semibold text-right">Avg per Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byRule.map((rule, idx) => (
                      <tr key={idx} className={`border-b ${rule.isDominant ? 'bg-amber-50' : ''}`}>
                        <td className="py-2">
                          {rule.ruleName}
                          {rule.isDominant && (
                            <Badge variant="destructive" className="ml-2 text-xs">Dominant</Badge>
                          )}
                        </td>
                        <td className="py-2 text-right font-semibold text-orange-600">${rule.totalCommission.toLocaleString()}</td>
                        <td className="py-2 text-right">{rule.pctOfTotal.toFixed(1)}%</td>
                        <td className="py-2 text-right">${rule.avgPerInvoice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="period" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Weekly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-2 font-semibold">Week Starting</th>
                      <th className="pb-2 font-semibold text-right">Revenue</th>
                      <th className="pb-2 font-semibold text-right">Profit</th>
                      <th className="pb-2 font-semibold text-right">Commission</th>
                      <th className="pb-2 font-semibold text-right">Net Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPeriod.map((week, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{moment(week.week).format('MMM D, YYYY')}</td>
                        <td className="py-2 text-right">${week.revenue.toLocaleString()}</td>
                        <td className="py-2 text-right">${week.profit.toLocaleString()}</td>
                        <td className="py-2 text-right text-orange-600">${week.commission.toLocaleString()}</td>
                        <td className={`py-2 text-right font-semibold ${week.netMargin < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${week.netMargin.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}