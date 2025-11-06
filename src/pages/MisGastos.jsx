
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, Edit } from 'lucide-react';
import ExpenseForm from '../components/gastos/ExpenseForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { useLanguage } from '@/components/i18n/LanguageContext';
import AIExpenseAnalyzer from '../components/gastos/AIExpenseAnalyzer'; // Added import

export default function MisGastos() {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['myExpenses', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Expense.filter({ employee_email: user.email }, '-date');
    },
    initialData: [],
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({
      ...data,
      employee_email: user.email,
      employee_name: user.full_name,
      status: 'pending',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myExpenses'] });
      setShowForm(false);
      setEditingExpense(null);
      alert('✅ ' + t('expense_created_pending_approval'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myExpenses'] });
      setShowForm(false);
      setEditingExpense(null);
      alert('✅ ' + t('savedSuccessfully'));
    },
  });

  const handleSubmit = (data) => {
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const statusConfig = {
    pending: { label: t('pending'), color: "bg-amber-100 text-amber-700" },
    approved: { label: t('approved'), color: "bg-emerald-100 text-emerald-700" },
    rejected: { label: t('rejected'), color: "bg-red-100 text-red-700" }
  };

  const categoryLabels = {
    travel: t('travel'),
    meals: t('meals'),
    transport: t('transport'),
    supplies: t('supplies'),
    client_entertainment: t('client_entertainment'),
    equipment: t('equipment'),
    per_diem: t('per_diem'),
    other: t('other')
  };

  const paymentMethodLabels = {
    personal: t('personal'),
    company_card: t('company_card')
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto">
        <PageHeader
          title={t('my_expenses')}
          description={t('track_your_expenses_and_receipts')}
          icon={Receipt}
          actions={
            <Button onClick={() => { setEditingExpense(null); setShowForm(!showForm); }} className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg">
              <Plus className="w-5 h-5 mr-2" />
              {t('new_expense')}
            </Button>
          }
        />

        {showForm && (
          <div className="mb-8">
            <ExpenseForm
              expense={editingExpense}
              onSubmit={handleSubmit}
              onCancel={() => { setShowForm(false); setEditingExpense(null); }}
              isProcessing={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        )}

        {/* AI Expense Analyzer - Collapsible for employee view */}
        <div className="mb-8">
          <AIExpenseAnalyzer expenses={expenses} showFullAnalysis={false} />
        </div>

        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Receipt className="w-5 h-5 text-[#3B9FF3]" />
              {t('my_expenses')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-slate-200">
                    <TableHead className="text-slate-700">{t('date')}</TableHead>
                    <TableHead className="text-slate-700">{t('description')}</TableHead>
                    <TableHead className="text-slate-700">{t('category')}</TableHead>
                    <TableHead className="text-slate-700">{t('payment_method')}</TableHead>
                    <TableHead className="text-right text-slate-700">{t('amount')}</TableHead>
                    <TableHead className="text-slate-700">{t('status')}</TableHead>
                    <TableHead className="text-slate-700">{t('receipt')}</TableHead>
                    <TableHead className="text-slate-700">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24 text-slate-500">{t('loading')}...</TableCell>
                    </TableRow>
                  ) : expenses?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center h-24 text-slate-500">
                        {t('no_expenses_found')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses?.map(expense => {
                      const config = statusConfig[expense.status] || statusConfig.pending;
                      return (
                        <TableRow key={expense.id} className="hover:bg-slate-50 border-slate-200">
                          <TableCell className="text-slate-700">{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="text-slate-700">{expense.description}</TableCell>
                          <TableCell>
                            <Badge className="bg-slate-100 text-slate-700 border-slate-300">
                              {categoryLabels[expense.category] || expense.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              expense.payment_method === 'personal' 
                                ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                                : "bg-blue-100 text-blue-700 border-blue-300"
                            }>
                              {paymentMethodLabels[expense.payment_method] || expense.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-[#3B9FF3]">
                            ${expense.amount?.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={config.color}>{config.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {expense.receipt_url ? (
                              <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-[#3B9FF3] hover:text-[#2A8FE3] flex items-center gap-1">
                                <ExternalLink className="w-4 h-4" />
                                {t('view')}
                              </a>
                            ) : (
                              <span className="text-sm text-slate-500">{t('no_receipt')}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {expense.status === 'pending' && (
                              <Button size="sm" variant="outline" onClick={() => handleEdit(expense)} className="border-slate-300 text-slate-700 hover:bg-slate-100">
                                <Edit className="w-4 h-4 mr-1" />
                                {t('edit')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
