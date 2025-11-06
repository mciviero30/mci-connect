import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Users, Briefcase, ChevronRight, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/components/i18n/LanguageContext';

const COLORS = ['#3B9FF3', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export default function ClientProfitabilityReport({ 
  customers, 
  jobs,
  invoices,
  expenses,
  timeEntries,
  dateRange 
}) {
  const { language } = useLanguage();
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filter data by date range
  const filteredInvoices = invoices.filter(inv => {
    const invDate = new Date(inv.invoice_date);
    return invDate >= dateRange.start && invDate <= dateRange.end;
  });

  const filteredJobs = jobs.filter(job => {
    const jobDate = new Date(job.created_date);
    return jobDate >= dateRange.start && jobDate <= dateRange.end;
  });

  // Calculate profitability per client
  const clientMetrics = customers.map(customer => {
    const customerName = `${customer.first_name} ${customer.last_name}`;
    
    // Revenue from invoices
    const clientInvoices = filteredInvoices.filter(inv => 
      inv.customer_name === customerName || inv.customer_id === customer.id
    );
    const revenue = clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    // Jobs for this client
    const clientJobs = filteredJobs.filter(job => 
      job.customer_name === customerName || job.customer_id === customer.id
    );
    
    // Calculate costs (labor + expenses)
    let laborCost = 0;
    let jobExpenses = 0;
    
    clientJobs.forEach(job => {
      const jobTimeEntries = timeEntries.filter(e => e.job_id === job.id && e.status === 'approved');
      const jobHours = jobTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
      laborCost += jobHours * 25; // Average hourly rate
      
      const jobExpenseList = expenses.filter(e => e.job_id === job.id && e.status === 'approved');
      jobExpenses += jobExpenseList.reduce((sum, e) => sum + (e.amount || 0), 0);
    });
    
    const totalCost = laborCost + jobExpenses;
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return {
      ...customer,
      customerName,
      revenue,
      laborCost,
      jobExpenses,
      totalCost,
      profit,
      profitMargin,
      jobCount: clientJobs.length,
      invoiceCount: clientInvoices.length
    };
  }).filter(c => c.revenue > 0 || c.jobCount > 0);

  const sortedClients = clientMetrics.sort((a, b) => b.profit - a.profit);

  const chartData = sortedClients.slice(0, 10).map(c => ({
    name: c.customerName.split(' ').slice(0, 2).join(' '),
    revenue: c.revenue,
    cost: c.totalCost,
    profit: c.profit
  }));

  const pieData = sortedClients.slice(0, 7).map(c => ({
    name: c.customerName,
    value: c.revenue
  }));

  const handleClientClick = (client) => {
    setSelectedClient(client);
    setShowDetails(true);
  };

  const totalRevenue = clientMetrics.reduce((sum, c) => sum + c.revenue, 0);
  const totalCost = clientMetrics.reduce((sum, c) => sum + c.totalCost, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-white/90">
              {language === 'es' ? 'Ingresos Totales' : 'Total Revenue'}
            </CardTitle>
            <DollarSign className="w-5 h-5 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-white/90">
              {language === 'es' ? 'Costos Totales' : 'Total Costs'}
            </CardTitle>
            <TrendingDown className="w-5 h-5 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalCost.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-white/90">
              {language === 'es' ? 'Ganancia Neta' : 'Net Profit'}
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalProfit.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-white/90">
              {language === 'es' ? 'Margen Promedio' : 'Avg Margin'}
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue vs Cost Chart */}
        <Card className="bg-white shadow-lg border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-slate-900">
              {language === 'es' ? 'Ingresos vs Costos por Cliente' : 'Revenue vs Cost by Client'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                <XAxis dataKey="name" stroke="rgba(100,116,139,0.8)" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="rgba(100,116,139,0.8)" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(226, 232, 240, 1)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3B9FF3" name={language === 'es' ? 'Ingresos' : 'Revenue'} radius={[8, 8, 0, 0]} />
                <Bar dataKey="cost" fill="#64748b" name={language === 'es' ? 'Costos' : 'Costs'} radius={[8, 8, 0, 0]} />
                <Bar dataKey="profit" fill="#10b981" name={language === 'es' ? 'Ganancia' : 'Profit'} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Distribution */}
        <Card className="bg-white shadow-lg border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-slate-900">
              {language === 'es' ? 'Distribución de Ingresos' : 'Revenue Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.split(' ').slice(0, 1).join(' ')}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(data) => {
                    const client = sortedClients.find(c => c.customerName === data.name);
                    if (client) handleClientClick(client);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid rgba(226, 232, 240, 1)',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Client Details Table */}
      <Card className="bg-white shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-slate-900">
            {language === 'es' ? 'Rentabilidad por Cliente' : 'Client Profitability'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-slate-700 font-semibold">
                    {language === 'es' ? 'Cliente' : 'Client'}
                  </TableHead>
                  <TableHead className="text-right text-slate-700 font-semibold">
                    {language === 'es' ? 'Ingresos' : 'Revenue'}
                  </TableHead>
                  <TableHead className="text-right text-slate-700 font-semibold">
                    {language === 'es' ? 'Costos' : 'Costs'}
                  </TableHead>
                  <TableHead className="text-right text-slate-700 font-semibold">
                    {language === 'es' ? 'Ganancia' : 'Profit'}
                  </TableHead>
                  <TableHead className="text-right text-slate-700 font-semibold">
                    {language === 'es' ? 'Margen' : 'Margin'}
                  </TableHead>
                  <TableHead className="text-center text-slate-700 font-semibold">
                    {language === 'es' ? 'Trabajos' : 'Jobs'}
                  </TableHead>
                  <TableHead className="text-slate-700 font-semibold">
                    {language === 'es' ? 'Acciones' : 'Actions'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map(client => (
                  <TableRow 
                    key={client.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => handleClientClick(client)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{client.customerName}</p>
                        {client.company && (
                          <p className="text-xs text-slate-500">{client.company}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      ${client.revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-slate-700">
                      ${client.totalCost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={client.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${client.profit.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={
                        client.profitMargin >= 30 ? 'bg-green-100 text-green-700 border-green-300' :
                        client.profitMargin >= 20 ? 'bg-blue-100 text-blue-700 border-blue-300' :
                        client.profitMargin >= 10 ? 'bg-amber-100 text-amber-700 border-amber-300' :
                        'bg-red-100 text-red-700 border-red-300'
                      }>
                        {client.profitMargin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-slate-300 text-slate-700">
                        {client.jobCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClientClick(client);
                        }}
                        className="text-[#3B9FF3] hover:bg-blue-50"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Client Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl bg-white border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-900">
              {language === 'es' ? 'Detalles del Cliente' : 'Client Details'}: {selectedClient?.customerName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600 mb-1">
                    {language === 'es' ? 'Ingresos' : 'Revenue'}
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    ${selectedClient.revenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-red-600 mb-1">
                    {language === 'es' ? 'Costos' : 'Costs'}
                  </p>
                  <p className="text-2xl font-bold text-red-700">
                    ${selectedClient.totalCost.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">
                    {language === 'es' ? 'Ganancia' : 'Profit'}
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    ${selectedClient.profit.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-purple-600 mb-1">
                    {language === 'es' ? 'Margen' : 'Margin'}
                  </p>
                  <p className="text-2xl font-bold text-purple-700">
                    {selectedClient.profitMargin.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {language === 'es' ? 'Costo Laboral' : 'Labor Cost'}
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    ${selectedClient.laborCost.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {((selectedClient.laborCost / selectedClient.totalCost) * 100).toFixed(1)}% {language === 'es' ? 'del costo total' : 'of total cost'}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    {language === 'es' ? 'Gastos del Trabajo' : 'Job Expenses'}
                  </p>
                  <p className="text-xl font-bold text-slate-900">
                    ${selectedClient.jobExpenses.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {((selectedClient.jobExpenses / selectedClient.totalCost) * 100).toFixed(1)}% {language === 'es' ? 'del costo total' : 'of total cost'}
                  </p>
                </div>
              </div>

              {/* Job & Invoice Count */}
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Briefcase className="w-4 h-4" />
                  <span>{selectedClient.jobCount} {language === 'es' ? 'trabajos' : 'jobs'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="w-4 h-4" />
                  <span>{selectedClient.invoiceCount} {language === 'es' ? 'facturas' : 'invoices'}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}