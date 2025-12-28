import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Plus, Receipt, Edit, ExternalLink } from 'lucide-react';
import ExpenseForm from '../components/gastos/ExpenseForm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { useLanguage } from '@/components/i18n/LanguageContext';
import AIExpenseAnalyzer from '../components/gastos/AIExpenseAnalyzer';
import EmployeePageLayout, { ModernCard } from "@/components/shared/EmployeePageLayout";

export default function MisGastos() {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['myExpenses', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Expense.filter({ employee_email: user.email }, '-date');
    },
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
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myExpenses'] });
      setShowForm(false);
      setEditingExpense(null);
    },
  });

  const handleSubmit = (data) => {
    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const pendingAmount = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.amount || 0), 0);
  const approvedAmount = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalExpenses = expenses.length;

  const statusConfig = {
    pending: { label: t('pending'), color: "bg-amber-100 text-amber-700" },
    approved: { label: t('approved'), color: "bg-emerald-100 text-emerald-700" },
    rejected: { label: t('rejected'), color: "bg-red-100 text-red-700" }
  };

  const categoryLabels = {
    travel: t('travel'), meals: t('meals'), transport: t('transport'),
    supplies: t('supplies'), client_entertainment: t('client_entertainment'),
    equipment: t('equipment'), per_diem: t('per_diem'), other: t('other')
  };

  const paymentMethodLabels = {
    personal: t('personal'),
    company_card: t('company_card')
  };

  const pageStats = [
    {
      icon: Receipt,
      value: totalExpenses.toString(),
      label: t('my_expenses'),
      iconBg: "bg-blue-100 dark:bg-blue-900/50",
      iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: Receipt,
      value: `$${pendingAmount.toFixed(0)}`,
      label: t('pending'),
      iconBg: "bg-amber-100 dark:bg-amber-900/50",
      iconColor: "text-amber-600 dark:text-amber-400"
    },
    {
      icon: Receipt,
      value: `$${approvedAmount.toFixed(0)}`,
      label: t('approved'),
      iconBg: "bg-green-100 dark:bg-green-900/50",
      iconColor: "text-green-600 dark:text-green-400"
    }
  ];

  return (
    <div className="pb-20 md:pb-0">
      <EmployeePageLayout
        title={t('my_expenses')}
        subtitle={t('track_your_expenses_and_receipts')}
        stats={pageStats}
        headerActions={
          <Button 
            onClick={() => { setEditingExpense(null); setShowForm(!showForm); }} 
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 min-h-[44px] w-full sm:w-auto"
            variant="outline"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {t('new_expense')}
          </Button>
        }
      >
      {showForm && (
        <ModernCard className="mb-6">
          <ExpenseForm
            expense={editingExpense}
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setEditingExpense(null); }}
            isProcessing={createMutation.isPending || updateMutation.isPending}
          />
        </ModernCard>
      )}

      <div className="mb-6">
        <AIExpenseAnalyzer expenses={expenses} showFullAnalysis={false} />
      </div>

      <ModernCard 
        title={t('my_expenses')} 
        icon={Receipt}
        noPadding
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                <TableHead className="text-slate-700 dark:text-slate-300">{t('date')}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('description')}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('category')}</TableHead>
                <TableHead className="text-right text-slate-700 dark:text-slate-300">{t('amount')}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('status')}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('receipt')}</TableHead>
                <TableHead className="text-slate-700 dark:text-slate-300">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-slate-500">{t('loading')}...</TableCell>
                </TableRow>
              ) : expenses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-slate-500">{t('no_expenses_found')}</TableCell>
                </TableRow>
              ) : (
                expenses?.map(expense => {
                  const config = statusConfig[expense.status] || statusConfig.pending;
                  return (
                    <TableRow key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <TableCell className="text-slate-700 dark:text-slate-300">{format(new Date(expense.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{expense.description}</TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-0">
                          {categoryLabels[expense.category] || expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                        ${expense.amount?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.color}>{config.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {expense.receipt_url ? (
                          <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            <ExternalLink className="w-4 h-4" />
                            {t('view')}
                          </a>
                        ) : (
                          <span className="text-sm text-slate-500">{t('no_receipt')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => { setEditingExpense(expense); setShowForm(true); }}>
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
      </ModernCard>
      </EmployeePageLayout>
    </div>
  );
}