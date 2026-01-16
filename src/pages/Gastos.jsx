import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePaginatedEntityList } from "@/components/hooks/usePaginatedEntityList";
import { Receipt, CheckCircle, XCircle, Plus, AlertTriangle } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import StatsCard from "../components/shared/StatsCard";
import ExpenseList from "../components/gastos/ExpenseList";
import ExpenseForm from "../components/gastos/ExpenseForm";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AIExpenseAnalyzer from "../components/gastos/AIExpenseAnalyzer";
import SmartExpenseApproval from "../components/gastos/SmartExpenseApproval";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadMoreButton from "@/components/shared/LoadMoreButton";

export default function Gastos() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });

  const { data: employees, isLoading: loadingEmployees, error: employeesError } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        const users = await base44.entities.User.list();
        return users || [];
      } catch (error) {
        console.error('Error loading employees:', error);
        throw error;
      }
    },
    initialData: [],
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000, // Cache for 30 seconds
  });

  const { 
    items: expenses = [], 
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    totalLoaded
  } = usePaginatedEntityList({
    queryKey: 'expenses',
    fetchFn: async ({ skip, limit }) => {
      const allExpenses = await base44.entities.Expense.list('-date', limit + skip);
      return allExpenses.slice(skip, skip + limit);
    },
    pageSize: 50,
    staleTime: 5 * 60 * 1000,
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
      employee_email: selectedEmployee.email,
      employee_name: selectedEmployee.full_name || `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setShowExpenseForm(false);
      setShowCreateDialog(false);
      setSelectedEmployee(null);
      toast({
        title: t('success'),
        variant: 'success'
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }) => base44.entities.Expense.update(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast({
        title: t('expenseUpdated'),
        variant: 'success'
      });
    }
  });

  const handleApprove = (expense) => {
    updateStatusMutation.mutate({ id: expense.id, status: 'approved', notes: '' });
  };

  const handleReject = (expense, notes) => {
    updateStatusMutation.mutate({ id: expense.id, status: 'rejected', notes });
  };

  const handleSelectEmployee = () => {
    if (selectedEmployee) {
      setShowExpenseForm(true);
    }
  };

  const activeEmployees = useMemo(() => 
    employees.filter(e => 
      !e.employment_status || 
      e.employment_status === 'active' || 
      e.employment_status === 'invited'
    ),
    [employees]
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title="Expenses"
          description={t('reviewAndApproveExpenses')}
          icon={Receipt}
          actions={
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md min-h-[44px] w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              New Expense
            </Button>
          }
        />

        {/* Show error alert if employees failed to load */}
        {employeesError && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {t('error')}: {employeesError.message || 'Failed to load employees'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <StatsCard title={t('pending')} value={pendingExpenses.length} icon={Receipt} gradient="linear-gradient(135deg, #EBF5FF 0%, #D6E9FF 100%)" loading={isLoading} />
          <StatsCard title={t('totalPending')} value={`$${totalPending.toFixed(2)}`} icon={Receipt} gradient="linear-gradient(135deg, #EBF5FF 0%, #D6E9FF 100%)" loading={isLoading} />
          <StatsCard title={t('approved')} value={approvedExpenses.length} icon={CheckCircle} gradient="linear-gradient(135deg, #EBF5FF 0%, #D6E9FF 100%)" loading={isLoading} />
          <StatsCard title={t('totalApproved')} value={`$${totalApproved.toFixed(2)}`} icon={CheckCircle} gradient="linear-gradient(135deg, #EBF5FF 0%, #D6E9FF 100%)" loading={isLoading} />
        </div>

        {/* AI Expense Analyzer */}
        <div className="mb-8">
          <AIExpenseAnalyzer expenses={expenses} showFullAnalysis={true} />
        </div>

        <ExpenseList 
          expenses={expenses} 
          isAdmin={user?.role === 'admin'} 
          loading={isLoading}
          showActions={true}
          onApprove={handleApprove}
          onReject={handleReject}
          renderSmartApproval={(expense) => (
            <SmartExpenseApproval expense={expense} onAction={() => {}} />
          )}
        />

        {hasNextPage && (
          <LoadMoreButton 
            onLoadMore={loadMore}
            hasMore={hasNextPage}
            isLoading={isFetchingNextPage}
            totalLoaded={totalLoaded}
            language={t('language')}
          />
        )}

        {/* Select Employee Dialog */}
        <Dialog open={showCreateDialog && !showExpenseForm} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setSelectedEmployee(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">{t('selectEmployee')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {loadingEmployees ? (
                <div className="text-center py-4 text-slate-600 dark:text-slate-400">
                  {t('loading')}...
                </div>
              ) : employeesError ? (
                <Alert className="bg-red-50 border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-700">
                    {t('error')}: {employeesError.message}
                  </AlertDescription>
                </Alert>
              ) : activeEmployees.length === 0 ? (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-700">
                    {t('noActiveEmployeesFound')}
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 mb-2 block">{t('employee')}</Label>
                    <Select value={selectedEmployee?.id} onValueChange={(id) => {
                      const emp = activeEmployees.find(e => e.id === id);
                      setSelectedEmployee(emp);
                    }}>
                      <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                        <SelectValue placeholder={t('selectEmployee')} />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                        {activeEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                            {emp.full_name || `${emp.first_name} ${emp.last_name}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleSelectEmployee} 
                    disabled={!selectedEmployee}
                    className="w-full bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md"
                  >
                    {t('next')}
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Expense Form Dialog */}
        <Dialog open={showExpenseForm} onOpenChange={(open) => {
          if (!open) {
            setShowExpenseForm(false);
            setShowCreateDialog(false);
            setSelectedEmployee(null);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-slate-900 dark:text-white">
                {t('newExpense')} - {selectedEmployee?.full_name || `${selectedEmployee?.first_name} ${selectedEmployee?.last_name}`}
              </DialogTitle>
            </DialogHeader>
            <ExpenseForm
              isPerDiem={false}
              onSubmit={(data) => createExpenseMutation.mutate(data)}
              onCancel={() => {
                setShowExpenseForm(false);
                setShowCreateDialog(false);
                setSelectedEmployee(null);
              }}
              isProcessing={createExpenseMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}