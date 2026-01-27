import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/components/utils/defensiveFormatting';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ProfitabilityKPIs({ kpis, language = 'en' }) {
  const { totalRevenue, totalCost, totalCommissions, netProfit, avgMargin, negativeMarginCount, jobsOffTrack } = kpis;

  const cards = [
    {
      title: language === 'es' ? 'Ingresos Totales' : 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: language === 'es' ? 'Costos Totales' : 'Total Costs',
      value: formatCurrency(totalCost),
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    },
    {
      title: language === 'es' ? 'Comisiones' : 'Commissions',
      value: formatCurrency(totalCommissions),
      icon: DollarSign,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    {
      title: language === 'es' ? 'Utilidad Neta' : 'Net Profit',
      value: formatCurrency(netProfit),
      icon: netProfit >= 0 ? TrendingUp : TrendingDown,
      color: netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
      bgColor: netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
    },
    {
      title: language === 'es' ? 'Margen Promedio' : 'Avg Margin',
      value: `${(avgMargin || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
    },
    {
      title: language === 'es' ? 'Alertas de Margen' : 'Margin Alerts',
      value: negativeMarginCount,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20'
    },
    {
      title: language === 'es' ? 'Trabajos Fuera de Meta' : 'Jobs Off Track',
      value: jobsOffTrack || 0,
      icon: TrendingDown,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    }
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map((card, idx) => {
          const showAlert = (idx === 5 && negativeMarginCount > 0) || (idx === 3 && netProfit < 0) || (idx === 6 && jobsOffTrack > 0);
          
          return (
            <Card key={idx} className={`border-slate-200 dark:border-slate-700 ${showAlert ? 'ring-2 ring-amber-400 dark:ring-amber-600' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {card.title}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <card.icon className={`w-4 h-4 ${card.color}`} />
                    </div>
                  </TooltipTrigger>
                  {idx === 5 && negativeMarginCount > 0 && (
                    <TooltipContent>
                      <p className="text-xs font-semibold text-amber-600">
                        {language === 'es' 
                          ? `⚠️ ${negativeMarginCount} trabajos con margen negativo o bajo` 
                          : `⚠️ ${negativeMarginCount} jobs with negative or low margin`}
                      </p>
                    </TooltipContent>
                  )}
                  {idx === 3 && netProfit < 0 && (
                    <TooltipContent>
                      <p className="text-xs font-semibold text-red-600">
                        {language === 'es' 
                          ? '🔴 Pérdida neta - costos exceden ingresos' 
                          : '🔴 Net loss - costs exceed revenue'}
                      </p>
                    </TooltipContent>
                  )}
                  {idx === 6 && jobsOffTrack > 0 && (
                    <TooltipContent>
                      <p className="text-xs font-semibold text-red-600">
                        {language === 'es' 
                          ? `🔴 ${jobsOffTrack} trabajos con margen por debajo del estimado` 
                          : `🔴 ${jobsOffTrack} jobs tracking below estimated margin`}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.color}`}>
                  {card.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}