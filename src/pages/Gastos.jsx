import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSmartPagination, PaginationControls } from "@/components/hooks/useSmartPagination";
import { useErrorHandler } from "@/components/shared/UnifiedErrorHandler";
import { Receipt, CheckCircle, XCircle, Plus, AlertTriangle } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import StatsSummaryGrid from "../components/shared/StatsSummaryGrid";
import ExpenseList from "../components/gastos/ExpenseList";
import ExpenseForm from "../components/gastos/ExpenseForm";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AIExpenseAnalyzer from "../components/gastos/AIExpenseAnalyzer";
import SmartExpenseApproval from "../components/gastos/SmartExpenseApproval";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadMoreButton from "@/components/shared/LoadMoreButton";
import { updateExpenseSafely } from "@/functions/updateExpenseSafely";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { hasFullAccess, isCEOOrAdmin } from "@/components/core/roleRules";
import { useEffect, useState, useMemo } from "react";

export default function Gastos() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const { data: user } = useQuery({ 
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    gcTime: Infinity
  });

  // SECURITY: Non-admin users should only see their own expenses via MisGastos
  useEffect(() => {
    if (user && !hasFullAccess(user)) {
      navigate(createPageUrl('MisGastos'), { replace: true });
    }
  }, [user]);

  const { handleError } = useErrorHandler();

  // Smart pagination for expenses - admin only
  const {
    items: expenses,
    isLoading,
    page,
    hasMore,
    hasPrevious,
    nextPage,
    prevPage,
    resetPagination
  } = useSmartPagination({
    entityName: 'Expense',
    sortBy: '-date',
    pageSize: 20,
    enabled: !!user && hasFullAccess(user)
  });

  // Memoize expensive filters
  const { pendingExpenses, approvedExpenses, rejectedExpenses, totalPending, totalApproved } = useMemo(() => {
    const pending = expenses.filter(e => e.status === 'pending');
    const approved = expenses.filter(e => e.status === 'approved');
    const rejected = expenses.filter(e => e.status === 'rejected');
    return {
      pendingExpenses: pending,
      approvedExpenses: approved,
      rejectedExpenses: rejected,
      totalPending: pending.reduce((sum, e) => sum + (e.amount || 0), 0),
      totalApproved: approved.reduce((sum, e) => sum + (e.amount || 0), 0)
    };
  }, [expenses]);

  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create({
      ...data,
      user_id: user?.id,
      employee_email: user?.email || 'company@mci-us.com',
      employee_name: user?.full_name || 'Company Expense',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowExpenseForm(false);
      toast({
        title: t('success'),
        variant: 'success'
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }) => {
      const response = await updateExpenseSafely({ 
        entity_id: id, 
        update_data: { status, notes } 
      });
      if (!response.data.success) {
        throw new Error(response.data.error || 'Update failed');
      }
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: t('expenseUpdated'),
        variant: 'success'
      });
    }
  });

  const handleApprove = async (expense) => {
    if (!isCEOOrAdmin(user)) return;
    updateStatusMutation.mutate({ id: expense.id, status: 'approved', notes: '' });
    
    // Send notification to employee
    try {
      await base44.functions.invoke('createNotification', {
        recipientEmail: expense.employee_email,
        recipientName: expense.employee_name,
        type: 'expense_approved',
        category: 'finance',
        priority: 'medium',
        title: 'Gasto aprobado',
        message: `Tu gasto de $${expense.amount} fue aprobado`,
        actionUrl: 'MisGastos',
        relatedEntityType: 'expense',
        relatedEntityId: expense.id
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  const handleReject = async (expense, notes) => {
    if (!isCEOOrAdmin(user)) return;
    updateStatusMutation.mutate({ id: expense.id, status: 'rejected', notes });
    
    // Send notification to employee
    try {
      await base44.functions.invoke('createNotification', {
        recipientEmail: expense.employee_email,
        recipientName: expense.employee_name,
        type: 'expense_rejected',
        category: 'finance',
        priority: 'high',
        title: 'Gasto rechazado',
        message: `Tu gasto de $${expense.amount} fue rechazado${notes ? `. Razón: ${notes}` : ''}`,
        actionUrl: 'MisGastos',
        relatedEntityType: 'expense',
        relatedEntityId: expense.id
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };



  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-900 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={language === 'es' ? 'Gastos' : 'Expenses'}
          description={t('reviewAndApproveExpenses')}
          icon={Receipt}
          actions={
            <Button 
              onClick={() => setShowExpenseForm(true)}
              className="h-10 bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              {t('new_expense')}
            </Button>
          }
        />



        <StatsSummaryGrid 
          stats={[
            { label: t('pending'), value: pendingExpenses.length, icon: Receipt },
            { label: t('totalPending'), value: `$${totalPending.toFixed(2)}`, icon: Receipt },
            { label: t('approved'), value: approvedExpenses.length, icon: CheckCircle },
            { label: t('totalApproved'), value: `$${totalApproved.toFixed(2)}`, icon: CheckCircle }
          ]}
          loading={isLoading}
        />

        {/* AI Expense Analyzer */}
        <div className="mb-8">
          <AIExpenseAnalyzer expenses={expenses} showFullAnalysis={true} />
        </div>

        <ExpenseList 
          expenses={expenses} 
          isAdmin={isCEOOrAdmin(user)} 
          loading={isLoading}
          showActions={true}
          onApprove={handleApprove}
          onReject={handleReject}
        />

        <PaginationControls
          page={page}
          hasMore={hasMore}
          hasPrevious={hasPrevious}
          onNext={nextPage}
          onPrevious={prevPage}
          isLoading={isLoading}
          language={language}
        />

        {/* Expense Form Dialog */}
        <Dialog open={showExpenseForm} onOpenChange={setShowExpenseForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {t('newExpense')} - Company Expense
              </DialogTitle>
            </DialogHeader>
            <ExpenseForm
              isPerDiem={false}
              onSubmit={(data) => createExpenseMutation.mutate(data)}
              onCancel={() => setShowExpenseForm(false)}
              isProcessing={createExpenseMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}