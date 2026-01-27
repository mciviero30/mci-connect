import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/components/utils/defensiveFormatting';

export default function MarginSimulator({ 
  originalData, 
  isActive, 
  onToggle, 
  onSimulationChange,
  language = 'en' 
}) {
  const [costAdjustment, setCostAdjustment] = React.useState(0);
  const [commissionAdjustment, setCommissionAdjustment] = React.useState(0);
  const [flatCostDelta, setFlatCostDelta] = React.useState(0);
  const [scope, setScope] = React.useState('global');
  const [selectedJobId, setSelectedJobId] = React.useState('');

  const simulatedData = useMemo(() => {
    if (!isActive || !originalData) return null;

    const clonedJobs = originalData.jobs.map(job => {
      const shouldSimulate = scope === 'global' || job.job_id === selectedJobId;
      
      if (!shouldSimulate) return job;

      // Clone and adjust (UI only, no side effects)
      const adjustedCost = job.totalCost * (1 + costAdjustment / 100) + flatCostDelta;
      const adjustedCommissions = job.commissions * (1 + commissionAdjustment / 100);
      const newTotalCost = adjustedCost - job.commissions + adjustedCommissions;
      const newProfit = job.revenue - newTotalCost;
      const newMargin = job.revenue > 0 ? (newProfit / job.revenue) * 100 : 0;

      return {
        ...job,
        totalCost: newTotalCost,
        commissions: adjustedCommissions,
        profit: newProfit,
        margin: newMargin,
        simulated: true,
        costDelta: newTotalCost - job.totalCost,
        profitDelta: newProfit - job.profit,
        marginDelta: newMargin - job.margin
      };
    });

    const totalRevenue = clonedJobs.reduce((sum, j) => sum + j.revenue, 0);
    const totalCost = clonedJobs.reduce((sum, j) => sum + j.totalCost, 0);
    const totalCommissions = clonedJobs.reduce((sum, j) => sum + j.commissions, 0);
    const netProfit = totalRevenue - totalCost;
    const avgMargin = clonedJobs.length > 0 ? clonedJobs.reduce((sum, j) => sum + j.margin, 0) / clonedJobs.length : 0;

    return {
      jobs: clonedJobs,
      kpis: {
        totalRevenue,
        totalCost,
        totalCommissions,
        netProfit,
        avgMargin,
        costDelta: totalCost - originalData.kpis.totalCost,
        profitDelta: netProfit - originalData.kpis.netProfit,
        marginDelta: avgMargin - originalData.kpis.avgMargin
      }
    };
  }, [isActive, originalData, costAdjustment, commissionAdjustment, flatCostDelta, scope, selectedJobId]);

  React.useEffect(() => {
    onSimulationChange(simulatedData);
  }, [simulatedData, onSimulationChange]);

  const handleReset = () => {
    setCostAdjustment(0);
    setCommissionAdjustment(0);
    setFlatCostDelta(0);
    setScope('global');
    setSelectedJobId('');
  };

  if (!isActive) {
    return (
      <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700 mb-6">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {language === 'es' ? 'Simulador What-If' : 'What-If Simulator'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {language === 'es' 
                    ? 'Simula cambios en costos y comisiones sin modificar datos reales' 
                    : 'Simulate cost and commission changes without modifying real data'}
                </p>
              </div>
            </div>
            <Switch checked={false} onCheckedChange={onToggle} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-500 dark:border-blue-600 mb-6 bg-blue-50/30 dark:bg-blue-900/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-slate-900 dark:text-white">
                {language === 'es' ? 'Simulador What-If Activo' : 'What-If Simulator Active'}
              </CardTitle>
              <Badge className="mt-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {language === 'es' 
                  ? 'Solo simulación – ningún dato es guardado o recalculado' 
                  : 'Simulation only – no data is saved or recalculated'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Reiniciar' : 'Reset'}
            </Button>
            <Switch checked={true} onCheckedChange={onToggle} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cost Adjustment */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Ajuste de Costos (%)' : 'Cost Adjustment (%)'}
            </label>
            <div className="flex items-center gap-4">
              <Slider
                value={[costAdjustment]}
                onValueChange={(val) => setCostAdjustment(val[0])}
                min={-50}
                max={50}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-slate-900 dark:text-white w-16 text-right">
                {costAdjustment > 0 ? '+' : ''}{costAdjustment}%
              </span>
            </div>
          </div>

          {/* Commission Adjustment */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Ajuste de Comisión (%)' : 'Commission Adjustment (%)'}
            </label>
            <div className="flex items-center gap-4">
              <Slider
                value={[commissionAdjustment]}
                onValueChange={(val) => setCommissionAdjustment(val[0])}
                min={-50}
                max={50}
                step={1}
                className="flex-1"
              />
              <span className="text-sm font-semibold text-slate-900 dark:text-white w-16 text-right">
                {commissionAdjustment > 0 ? '+' : ''}{commissionAdjustment}%
              </span>
            </div>
          </div>

          {/* Flat Cost Delta */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Delta de Costo Fijo ($)' : 'Flat Cost Delta ($)'}
            </label>
            <Input
              type="number"
              value={flatCostDelta}
              onChange={(e) => setFlatCostDelta(Number(e.target.value) || 0)}
              className="w-full"
              placeholder="0"
            />
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Alcance' : 'Scope'}
            </label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">
                  {language === 'es' ? 'Global (todos los trabajos)' : 'Global (all jobs)'}
                </SelectItem>
                <SelectItem value="job">
                  {language === 'es' ? 'Trabajo específico' : 'Specific job'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {scope === 'job' && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {language === 'es' ? 'Seleccionar Trabajo' : 'Select Job'}
            </label>
            <Select value={selectedJobId} onValueChange={setSelectedJobId}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'es' ? 'Elegir trabajo' : 'Choose job'} />
              </SelectTrigger>
              <SelectContent>
                {originalData?.jobs.map(job => (
                  <SelectItem key={job.job_id} value={job.job_id}>
                    {job.job_name} - {job.customer_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Simulation Impact Preview */}
        {simulatedData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                {language === 'es' ? 'Costo Total' : 'Total Cost'}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(simulatedData.kpis.totalCost)}
              </p>
              <p className={`text-xs font-semibold ${simulatedData.kpis.costDelta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {simulatedData.kpis.costDelta > 0 ? '+' : ''}{formatCurrency(simulatedData.kpis.costDelta)}
              </p>
            </div>

            <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                {language === 'es' ? 'Utilidad Neta' : 'Net Profit'}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {formatCurrency(simulatedData.kpis.netProfit)}
              </p>
              <p className={`text-xs font-semibold ${simulatedData.kpis.profitDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {simulatedData.kpis.profitDelta > 0 ? '+' : ''}{formatCurrency(simulatedData.kpis.profitDelta)}
              </p>
            </div>

            <div className="text-center p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
                {language === 'es' ? 'Margen Promedio' : 'Avg Margin'}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {simulatedData.kpis.avgMargin.toFixed(1)}%
              </p>
              <p className={`text-xs font-semibold ${simulatedData.kpis.marginDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {simulatedData.kpis.marginDelta > 0 ? '+' : ''}{simulatedData.kpis.marginDelta.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}