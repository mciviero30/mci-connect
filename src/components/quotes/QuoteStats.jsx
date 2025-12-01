import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { 
  TrendingUp, TrendingDown, Clock, CheckCircle, 
  XCircle, FileCheck, DollarSign, BarChart3 
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export default function QuoteStats({ quotes }) {
  const { language } = useLanguage();

  // Calculate stats
  const totalQuotes = quotes.length;
  const totalValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
  
  const statusCounts = {
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    approved: quotes.filter(q => q.status === 'approved').length,
    rejected: quotes.filter(q => q.status === 'rejected').length,
    converted: quotes.filter(q => q.status === 'converted_to_invoice').length,
  };

  // Conversion rate
  const decidedQuotes = statusCounts.approved + statusCounts.rejected + statusCounts.converted;
  const successfulQuotes = statusCounts.approved + statusCounts.converted;
  const conversionRate = decidedQuotes > 0 ? (successfulQuotes / decidedQuotes * 100) : 0;

  // Average time to convert
  const convertedQuotes = quotes.filter(q => q.status === 'converted_to_invoice' && q.created_date);
  const avgDaysToConvert = convertedQuotes.length > 0
    ? convertedQuotes.reduce((sum, q) => sum + differenceInDays(new Date(q.updated_date), new Date(q.created_date)), 0) / convertedQuotes.length
    : 0;

  // Quotes by month (last 6 months)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i));
    const monthEnd = endOfMonth(subMonths(new Date(), i));
    const monthQuotes = quotes.filter(q => {
      const date = new Date(q.quote_date);
      return date >= monthStart && date <= monthEnd;
    });
    monthlyData.push({
      month: format(monthStart, 'MMM', { locale: language === 'es' ? es : undefined }),
      count: monthQuotes.length,
      value: monthQuotes.reduce((sum, q) => sum + (q.total || 0), 0)
    });
  }

  // By team
  const teamStats = {};
  quotes.forEach(q => {
    const team = q.team_name || 'Sin equipo';
    if (!teamStats[team]) {
      teamStats[team] = { count: 0, value: 0, converted: 0 };
    }
    teamStats[team].count++;
    teamStats[team].value += q.total || 0;
    if (q.status === 'converted_to_invoice') teamStats[team].converted++;
  });

  const teamData = Object.entries(teamStats)
    .map(([name, data]) => ({
      name: name.length > 12 ? name.substring(0, 12) + '...' : name,
      fullName: name,
      ...data,
      rate: data.count > 0 ? (data.converted / data.count * 100) : 0
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Pie chart data
  const pieData = [
    { name: language === 'es' ? 'Borrador' : 'Draft', value: statusCounts.draft, color: '#94a3b8' },
    { name: language === 'es' ? 'Enviado' : 'Sent', value: statusCounts.sent, color: '#3b82f6' },
    { name: language === 'es' ? 'Aprobado' : 'Approved', value: statusCounts.approved, color: '#22c55e' },
    { name: language === 'es' ? 'Rechazado' : 'Rejected', value: statusCounts.rejected, color: '#ef4444' },
    { name: language === 'es' ? 'Convertido' : 'Converted', value: statusCounts.converted, color: '#a855f7' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 border-0">
          <CardContent className="p-4 text-white">
            <DollarSign className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-2xl font-bold">${(totalValue / 1000).toFixed(0)}K</p>
            <p className="text-sm opacity-80">{language === 'es' ? 'Valor Total' : 'Total Value'}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
          <CardContent className="p-4 text-white">
            <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{conversionRate.toFixed(0)}%</p>
            <p className="text-sm opacity-80">{language === 'es' ? 'Tasa Conversión' : 'Conversion Rate'}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-0">
          <CardContent className="p-4 text-white">
            <FileCheck className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{statusCounts.converted}</p>
            <p className="text-sm opacity-80">{language === 'es' ? 'Convertidos' : 'Converted'}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0">
          <CardContent className="p-4 text-white">
            <Clock className="w-8 h-8 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{avgDaysToConvert.toFixed(0)}d</p>
            <p className="text-sm opacity-80">{language === 'es' ? 'Prom. Conversión' : 'Avg. to Convert'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-500" />
              {language === 'es' ? 'Estimados por Mes' : 'Quotes by Month'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value, name) => [
                    name === 'count' ? value : `$${value.toLocaleString()}`,
                    name === 'count' ? (language === 'es' ? 'Cantidad' : 'Count') : (language === 'es' ? 'Valor' : 'Value')
                  ]}
                />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900 dark:text-white">
              {language === 'es' ? 'Distribución por Estado' : 'Status Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {pieData.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      {teamData.length > 0 && (
        <Card className="bg-white dark:bg-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-900 dark:text-white">
              {language === 'es' ? 'Rendimiento por Equipo' : 'Team Performance'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamData.map((team, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white" title={team.fullName}>
                      {team.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {team.count} {language === 'es' ? 'estimados' : 'quotes'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-cyan-600">${(team.value / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-green-600">{team.rate.toFixed(0)}% {language === 'es' ? 'conv.' : 'conv.'}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}