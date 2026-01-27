import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/components/utils/defensiveFormatting';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function JobProfitabilityTable({ jobs, language = 'en' }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredJobs = jobs.filter(job => {
    const search = searchTerm.toLowerCase();
    return !searchTerm ||
      job.job_name?.toLowerCase().includes(search) ||
      job.customer_name?.toLowerCase().includes(search) ||
      job.job_number?.toLowerCase().includes(search);
  });

  const getMarginBadge = (margin) => {
    if (margin < 0) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 font-bold">
        <TrendingDown className="w-3 h-3 mr-1" />
        {margin.toFixed(1)}%
      </Badge>;
    }
    if (margin < 10) {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-semibold">
        {margin.toFixed(1)}%
      </Badge>;
    }
    if (margin < 20) {
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
        {margin.toFixed(1)}%
      </Badge>;
    }
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
      <TrendingUp className="w-3 h-3 mr-1" />
      {margin.toFixed(1)}%
    </Badge>;
  };

  const getRiskLevel = (job) => {
    const alerts = [];
    if (job.margin < 0) alerts.push('critical');
    if (job.margin >= 0 && job.margin < 10) alerts.push('high');
    if (job.commissions > (job.profit * 0.3) && job.profit > 0) alerts.push('high');
    if (job.estimated_cost > 0 && job.totalCost > job.estimated_cost) alerts.push('medium');
    
    if (alerts.includes('critical')) return 'critical';
    if (alerts.includes('high')) return 'high';
    if (alerts.includes('medium')) return 'medium';
    return 'healthy';
  };

  const getDriftIndicator = (job) => {
    if (job.drift === null || job.drift === undefined) {
      return {
        badge: <span className="text-xs text-slate-400">—</span>,
        tooltip: language === 'es' ? 'Sin estimado base' : 'No baseline estimate'
      };
    }

    const drift = job.drift;
    const isFinal = job.status === 'completed' || job.status === 'archived';

    if (drift > 2) {
      return {
        badge: (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-semibold">
            <TrendingUp className="w-3 h-3 mr-1" />
            +{drift.toFixed(1)}%
          </Badge>
        ),
        tooltip: language === 'es' 
          ? `Margen actual (${job.margin.toFixed(1)}%) supera el estimado (${job.estimated_margin.toFixed(1)}%)${isFinal ? ' · Final' : ''}`
          : `Current margin (${job.margin.toFixed(1)}%) exceeds estimate (${job.estimated_margin.toFixed(1)}%)${isFinal ? ' · Final' : ''}`
      };
    }

    if (drift >= -2 && drift <= 2) {
      return {
        badge: (
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <ArrowRight className="w-3 h-3 mr-1" />
            {drift >= 0 ? '+' : ''}{drift.toFixed(1)}%
          </Badge>
        ),
        tooltip: language === 'es' 
          ? `Margen en línea con estimado (±2%)${isFinal ? ' · Final' : ''}`
          : `Margin in line with estimate (±2%)${isFinal ? ' · Final' : ''}`
      };
    }

    return {
      badge: (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 font-bold">
          <TrendingDown className="w-3 h-3 mr-1" />
          {drift.toFixed(1)}%
        </Badge>
      ),
      tooltip: language === 'es' 
        ? `Costos exceden estimado por ${Math.abs(drift).toFixed(1)}% · Actual: ${job.margin.toFixed(1)}% vs Estimado: ${job.estimated_margin.toFixed(1)}%${isFinal ? ' · Final' : ''}`
        : `Costs exceed estimate by ${Math.abs(drift).toFixed(1)}% · Current: ${job.margin.toFixed(1)}% vs Estimated: ${job.estimated_margin.toFixed(1)}%${isFinal ? ' · Final' : ''}`
    };
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-white">
          {language === 'es' ? 'Rentabilidad por Trabajo' : 'Job Profitability'}
        </CardTitle>
        <Input
          placeholder={language === 'es' ? 'Buscar trabajos...' : 'Search jobs...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'es' ? 'Trabajo' : 'Job'}
                </th>
                <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'es' ? 'Cliente' : 'Client'}
                </th>
                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'es' ? 'Ingresos' : 'Revenue'}
                </th>
                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'es' ? 'Costos' : 'Costs'}
                </th>
                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'es' ? 'Comisión' : 'Commission'}
                </th>
                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'es' ? 'Utilidad' : 'Profit'}
                </th>
                <th className="text-center p-3 font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'es' ? 'Margen' : 'Margin'}
                </th>
                <th className="text-center p-3 font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'es' ? 'Desviación' : 'Drift'}
                </th>
                <th className="text-center p-3 font-semibold text-slate-700 dark:text-slate-300">
                  {language === 'es' ? 'Alertas' : 'Alerts'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, idx) => {
                const riskLevel = getRiskLevel(job);
                const rowClass = riskLevel === 'critical' ? 'bg-red-50/50 dark:bg-red-900/10' : '';
                
                return (
                  <tr key={idx} className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${rowClass}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {riskLevel === 'critical' && (
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        )}
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {job.job_name || 'N/A'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {job.job_number || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {job.customer_name || 'N/A'}
                    </td>
                    <td className="p-3 text-right font-medium text-slate-900 dark:text-white">
                      {formatCurrency(job.revenue)}
                    </td>
                    <td className="p-3 text-right text-slate-700 dark:text-slate-300">
                      {formatCurrency(job.totalCost)}
                    </td>
                    <td className="p-3 text-right text-orange-600 dark:text-orange-400">
                      {formatCurrency(job.commissions)}
                    </td>
                    <td className={`p-3 text-right font-semibold ${job.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(job.profit)}
                    </td>
                    <td className="p-3 text-center">
                      {getMarginBadge(job.margin)}
                    </td>
                    <td className="p-3 text-center">
                      <Tooltip>
                        <TooltipTrigger>
                          {getDriftIndicator(job).badge}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{getDriftIndicator(job).tooltip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-3 text-center">
                      <TooltipProvider>
                        <div className="flex justify-center gap-1">
                          {job.margin < 0 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-semibold text-red-600">
                                  {language === 'es' ? '🔴 CRÍTICO: Margen negativo' : '🔴 CRITICAL: Negative margin'}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {language === 'es' 
                                    ? `Pérdida de ${formatCurrency(Math.abs(job.profit))}` 
                                    : `Loss of ${formatCurrency(Math.abs(job.profit))}`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {job.margin >= 0 && job.margin < 10 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-semibold text-amber-600">
                                  {language === 'es' ? '🟠 Alto Riesgo: Margen bajo' : '🟠 High Risk: Low margin'}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {language === 'es' 
                                    ? `Margen del ${job.margin.toFixed(1)}% está por debajo del 10%` 
                                    : `Margin of ${job.margin.toFixed(1)}% is below 10%`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {job.commissions > (job.profit * 0.3) && job.profit > 0 && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-semibold text-orange-600">
                                  {language === 'es' ? '⚠️ Comisión elevada' : '⚠️ High commission'}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {language === 'es' 
                                    ? `Comisión representa ${((job.commissions / job.profit) * 100).toFixed(0)}% de la utilidad` 
                                    : `Commission represents ${((job.commissions / job.profit) * 100).toFixed(0)}% of profit`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {job.estimated_cost > 0 && job.totalCost > job.estimated_cost && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-purple-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-semibold text-purple-600">
                                  {language === 'es' ? '📊 Sobrecosto detectado' : '📊 Cost overrun detected'}
                                </p>
                                <p className="text-xs text-slate-600">
                                  {language === 'es' 
                                    ? `Costo real ${formatCurrency(job.totalCost)} vs estimado ${formatCurrency(job.estimated_cost)}` 
                                    : `Actual ${formatCurrency(job.totalCost)} vs estimated ${formatCurrency(job.estimated_cost)}`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {job.margin < 0 || (job.margin >= 0 && job.margin < 10) || (job.commissions > (job.profit * 0.3) && job.profit > 0) || (job.estimated_cost > 0 && job.totalCost > job.estimated_cost) ? null : (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              {language === 'es' ? '✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </TooltipProvider>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredJobs.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {language === 'es' ? 'No se encontraron trabajos' : 'No jobs found'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}