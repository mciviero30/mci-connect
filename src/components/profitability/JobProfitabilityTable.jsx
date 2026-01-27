import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/components/utils/defensiveFormatting';
import { Input } from '@/components/ui/input';

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
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
        <TrendingDown className="w-3 h-3 mr-1" />
        {margin.toFixed(1)}%
      </Badge>;
    }
    if (margin < 10) {
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
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
                  {language === 'es' ? 'Alertas' : 'Alerts'}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {job.job_name || 'N/A'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {job.job_number || '—'}
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
                    <div className="flex justify-center gap-1">
                      {job.margin < 0 && (
                        <AlertTriangle className="w-4 h-4 text-red-500" title={language === 'es' ? 'Margen negativo' : 'Negative margin'} />
                      )}
                      {job.commissions > (job.profit * 0.3) && job.profit > 0 && (
                        <AlertTriangle className="w-4 h-4 text-amber-500" title={language === 'es' ? 'Comisión alta' : 'High commission'} />
                      )}
                      {job.estimated_cost > 0 && job.totalCost > job.estimated_cost && (
                        <AlertTriangle className="w-4 h-4 text-orange-500" title={language === 'es' ? 'Costo excedió estimado' : 'Cost exceeded estimate'} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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