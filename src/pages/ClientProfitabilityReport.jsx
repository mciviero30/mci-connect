import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ClientProfitabilityReport() {
  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices-all'],
    queryFn: () => base44.entities.Invoice.filter({})
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-all'],
    queryFn: () => base44.entities.Expense.filter({})
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs-all'],
    queryFn: () => base44.entities.Job.filter({})
  });

  // Calculate profitability per customer
  const customerStats = {};

  invoices.forEach(inv => {
    if (!inv.customer_name) return;
    
    if (!customerStats[inv.customer_name]) {
      customerStats[inv.customer_name] = {
        revenue: 0,
        costs: 0,
        invoiceCount: 0
      };
    }

    customerStats[inv.customer_name].revenue += inv.total || 0;
    customerStats[inv.customer_name].invoiceCount += 1;
  });

  expenses.forEach(exp => {
    const job = jobs.find(j => j.id === exp.job_id);
    if (job && job.customer_name && exp.status === 'approved') {
      if (!customerStats[job.customer_name]) {
        customerStats[job.customer_name] = {
          revenue: 0,
          costs: 0,
          invoiceCount: 0
        };
      }
      customerStats[job.customer_name].costs += exp.amount || 0;
    }
  });

  const profitabilityData = Object.entries(customerStats)
    .map(([customer, stats]) => ({
      customer,
      revenue: stats.revenue,
      costs: stats.costs,
      profit: stats.revenue - stats.costs,
      margin: stats.revenue > 0 ? ((stats.revenue - stats.costs) / stats.revenue) * 100 : 0,
      invoiceCount: stats.invoiceCount
    }))
    .sort((a, b) => b.profit - a.profit);

  const topCustomers = profitabilityData.slice(0, 10);

  const totalRevenue = profitabilityData.reduce((sum, c) => sum + c.revenue, 0);
  const totalProfit = profitabilityData.reduce((sum, c) => sum + c.profit, 0);
  const avgMargin = profitabilityData.length > 0 
    ? profitabilityData.reduce((sum, c) => sum + c.margin, 0) / profitabilityData.length
    : 0;

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Client Profitability Analysis"
        description="Revenue and margin breakdown by customer"
        icon={TrendingUp}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Avg Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{avgMargin.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Customers by Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCustomers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="customer" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                <Bar dataKey="profit" fill="#10b981" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Distribution (Top 8)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topCustomers.slice(0, 8)}
                  dataKey="revenue"
                  nameKey="customer"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.customer}: $${(entry.revenue / 1000).toFixed(0)}k`}
                >
                  {topCustomers.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers - Detailed View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-3 font-semibold">Customer</th>
                  <th className="text-right p-3 font-semibold">Revenue</th>
                  <th className="text-right p-3 font-semibold">Costs</th>
                  <th className="text-right p-3 font-semibold">Profit</th>
                  <th className="text-right p-3 font-semibold">Margin</th>
                  <th className="text-right p-3 font-semibold">Invoices</th>
                </tr>
              </thead>
              <tbody>
                {profitabilityData.map((cust, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-medium">{cust.customer}</td>
                    <td className="p-3 text-right">${cust.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right text-red-600">${cust.costs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-right font-semibold text-green-600">
                      ${cust.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-right">
                      <Badge className={
                        cust.margin < 10 ? 'bg-red-100 text-red-800' :
                        cust.margin < 20 ? 'bg-amber-100 text-amber-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {cust.margin.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="p-3 text-right">{cust.invoiceCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}