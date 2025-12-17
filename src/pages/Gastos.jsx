import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function Gastos() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

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

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
    initialData: [],
  });

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
      toast.success(t('success'));
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }) => base44.entities.Expense.update(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(t('expenseUpdated'));
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

  const activeEmployees = employees.filter(e => !e.employment_status || e.employment_status === 'active');

  const pendingExpenses = expenses.filter(e => e.status === 'pending');
  const approvedExpenses = expenses.filter(e => e.status === 'approved');
  const rejectedExpenses = expenses.filter(e => e.status === 'rejected');

  const totalPending = pendingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalApproved = approvedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Expenses"
          description={t('reviewAndApproveExpenses')}
          icon={Receipt}
          actions={
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              {t('newExpense')}
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

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard title={t('pending')} value={pendingExpenses.length} icon={Receipt} color="from-slate-500 to-slate-600" loading={isLoading} />
          <StatsCard title={t('totalPending')} value={`$${totalPending.toFixed(2)}`} icon={Receipt} color="from-slate-500 to-slate-600" loading={isLoading} />
          <StatsCard title={t('approved')} value={approvedExpenses.length} icon={CheckCircle} color="from-[#3B9FF3] to-[#2A8FE3]" loading={isLoading} />
          <StatsCard title={t('totalApproved')} value={`$${totalApproved.toFixed(2)}`} icon={CheckCircle} color="from-[#3B9FF3] to-[#2A8FE3]" loading={isLoading} />
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

        {/* Select Employee Dialog */}
        <Dialog open={showCreateDialog && !showExpenseForm} onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setSelectedEmployee(null);
          }
        }}>
          <DialogContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
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
                    className="w-full bg-gradient-to-r from-[#3B9FF3] to-[#2A8FE3] text-white"
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