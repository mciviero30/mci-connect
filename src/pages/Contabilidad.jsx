import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PageHeader from "../components/shared/PageHeader";
import StatsSummaryGrid from "../components/shared/StatsSummaryGrid";
import TransactionForm from "../components/contabilidad/TransactionForm";
import TransactionList from "../components/contabilidad/TransactionList";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/components/i18n/LanguageContext";

const COLORS = ['#507DB4', '#6B9DD8', '#8BB4DE', '#A5C9E8', '#BFD9EE'];

export default function Contabilidad() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date'),
    initialData: [],
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setFormOpen(false);
      setEditingTransaction(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setFormOpen(false);
      setEditingTransaction(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
  });

  const currentMonth = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const monthTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= monthStart && tDate <= monthEnd;
  });

  const totalIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
  const balance = totalIncome - totalExpenses;

  const getChartData = () => {
    let startDate = subMonths(currentMonth, 6);
    const months = [];
    let current = startDate;
    
    while (current <= currentMonth) {
      months.push({ month: format(current, 'MMM yyyy'), income: 0, expenses: 0 });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (tDate >= startDate && tDate <= currentMonth) {
        const monthKey = format(tDate, 'MMM yyyy');
        const monthData = months.find(m => m.month === monthKey);
        if (monthData) {
          if (t.type === 'income') monthData.income += t.amount;
          else monthData.expenses += t.amount;
        }
      }
    });

    return months;
  };

  const expensesByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));

  const handleSubmit = (data) => {
    if (editingTransaction) {
      updateMutation.mutate({ id: editingTransaction.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm(t('confirmDelete'))) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={t('accounting')}
          description={`${t('period')}: ${format(monthStart, 'MMMM yyyy')}`}
          icon={DollarSign}
          actions={
            <div className="flex-shrink-0">
              <Button onClick={() => setFormOpen(true)} className="h-10 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">{t('newTransaction')}</span>
                <span className="sm:hidden">{language === 'es' ? 'Nueva' : 'New'}</span>
              </Button>
            </div>
          }
        />

        <StatsSummaryGrid 
          stats={[
            { label: t('monthlyIncome'), value: `$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: TrendingUp },
            { label: t('monthlyExpenses'), value: `$${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: TrendingDown },
            { label: t('balance'), value: `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: DollarSign, valueColor: balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' }
          ]}
          loading={isLoading}
        />

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 bg-white dark:bg-slate-800 shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="text-slate-900 dark:text-white">{t('incomeVsExpenses')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)"/>
                  <XAxis dataKey="month" stroke="rgba(100,116,139,0.8)" />
                  <YAxis stroke="rgba(100,116,139,0.8)" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(226, 232, 240, 1)',
                      borderRadius: '12px',
                      color: '#0f172a'
                    }}
                    formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Bar dataKey="income" fill="#507DB4" name={t('income')} radius={[8, 8, 0, 0]} />
                  <Bar dataKey="expenses" fill="#8BB4DE" name={t('expenses')} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-[#282828] shadow-lg border-slate-200 dark:border-slate-700">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700">
              <CardTitle className="text-slate-900 dark:text-white">{t('expensesByCategory')}</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(226, 232, 240, 1)',
                      borderRadius: '12px',
                      color: '#0f172a'
                    }}
                    formatter={(value) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <TransactionList
          transactions={transactions}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={isLoading}
        />

        <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{editingTransaction ? t('edit') : t('new')} {t('transaction')}</DialogTitle>
            </DialogHeader>
            <TransactionForm
              transaction={editingTransaction}
              onSubmit={handleSubmit}
              onCancel={() => {
                setFormOpen(false);
                setEditingTransaction(null);
              }}
              isProcessing={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}