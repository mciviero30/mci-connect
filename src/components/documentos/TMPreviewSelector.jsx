import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Clock, Receipt, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { format } from 'date-fns';

export default function TMPreviewSelector({ preview, onConfirm, loading }) {
  const { language } = useLanguage();
  const [selectedTimeEntries, setSelectedTimeEntries] = useState(
    new Set(preview?.time_entries?.map(e => e.id) || [])
  );
  const [selectedExpenses, setSelectedExpenses] = useState(
    new Set(preview?.expenses?.map(e => e.id) || [])
  );

  const selectedTime = useMemo(() => {
    return preview?.time_entries?.filter(e => selectedTimeEntries.has(e.id)) || [];
  }, [selectedTimeEntries, preview?.time_entries]);

  const selectedExpensesList = useMemo(() => {
    return preview?.expenses?.filter(e => selectedExpenses.has(e.id)) || [];
  }, [selectedExpenses, preview?.expenses]);

  const laborTotal = useMemo(() => {
    return selectedTime.reduce((sum, e) => sum + ((e.hours_worked || 0) * (e.rate_snapshot || 60)), 0);
  }, [selectedTime]);

  const expensesTotal = useMemo(() => {
    return selectedExpensesList.reduce((sum, e) => {
      const markup = e.markup || 0;
      return sum + ((e.amount || 0) * (1 + markup / 100));
    }, 0);
  }, [selectedExpensesList]);

  const total = laborTotal + expensesTotal;

  const handleConfirm = () => {
    onConfirm({
      selectedTimeEntryIds: Array.from(selectedTimeEntries),
      selectedExpenseIds: Array.from(selectedExpenses),
      total
    });
  };

  const toggleTimeEntry = (id) => {
    const newSet = new Set(selectedTimeEntries);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTimeEntries(newSet);
  };

  const toggleExpense = (id) => {
    const newSet = new Set(selectedExpenses);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedExpenses(newSet);
  };

  const selectAllTime = () => {
    if (selectedTime.length === preview?.time_entries?.length) {
      setSelectedTimeEntries(new Set());
    } else {
      setSelectedTimeEntries(new Set(preview?.time_entries?.map(e => e.id) || []));
    }
  };

  const selectAllExpenses = () => {
    if (selectedExpensesList.length === preview?.expenses?.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(preview?.expenses?.map(e => e.id) || []));
    }
  };

  return (
    <div className="space-y-4">
      {/* Time Entries Section */}
      <Card className="glass-card shadow-xl border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {language === 'es' ? 'Horas' : 'Time Entries'}
              <span className="text-sm font-normal text-slate-500">({selectedTime.length}/{preview?.time_entries?.length || 0})</span>
            </CardTitle>
            {preview?.time_entries && preview.time_entries.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={selectAllTime}
                className="text-xs"
              >
                {selectedTime.length === preview.time_entries.length 
                  ? (language === 'es' ? 'Deseleccionar Todo' : 'Deselect All')
                  : (language === 'es' ? 'Seleccionar Todo' : 'Select All')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {preview?.time_entries?.length === 0 ? (
            <p className="text-sm text-slate-500">{language === 'es' ? 'Sin horas sin facturar' : 'No unbilled time entries'}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {preview.time_entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-200"
                >
                  <Checkbox
                    checked={selectedTimeEntries.has(entry.id)}
                    onCheckedChange={() => toggleTimeEntry(entry.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-sm font-bold text-emerald-600">
                        {entry.hours_worked || 0}h @ ${(entry.rate_snapshot || 60).toFixed(0)}/h
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{entry.task_details || 'No details'}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">
                    ${((entry.hours_worked || 0) * (entry.rate_snapshot || 60)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
          {preview?.time_entries && preview.time_entries.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">{language === 'es' ? 'Labor Total' : 'Labor Total'}:</span>
              <span className="text-lg font-bold text-blue-700">${laborTotal.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Section */}
      <Card className="glass-card shadow-xl border-slate-200">
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              {language === 'es' ? 'Gastos' : 'Expenses'}
              <span className="text-sm font-normal text-slate-500">({selectedExpensesList.length}/{preview?.expenses?.length || 0})</span>
            </CardTitle>
            {preview?.expenses && preview.expenses.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={selectAllExpenses}
                className="text-xs"
              >
                {selectedExpensesList.length === preview.expenses.length
                  ? (language === 'es' ? 'Deseleccionar Todo' : 'Deselect All')
                  : (language === 'es' ? 'Seleccionar Todo' : 'Select All')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {preview?.expenses?.length === 0 ? (
            <p className="text-sm text-slate-500">{language === 'es' ? 'Sin gastos sin facturar' : 'No unbilled expenses'}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {preview.expenses.map((expense) => {
                const withMarkup = (expense.amount || 0) * (1 + (expense.markup || 0) / 100);
                return (
                  <div
                    key={expense.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-200"
                  >
                    <Checkbox
                      checked={selectedExpenses.has(expense.id)}
                      onCheckedChange={() => toggleExpense(expense.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {expense.category} - {format(new Date(expense.date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm font-bold text-emerald-600">
                          ${(expense.amount || 0).toFixed(2)}
                          {expense.markup ? ` (+${expense.markup}%)` : ''}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">{expense.description}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">
                      ${withMarkup.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          {preview?.expenses && preview.expenses.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-green-900">{language === 'es' ? 'Gastos Total' : 'Expenses Total'}:</span>
              <span className="text-lg font-bold text-green-700">${expensesTotal.toFixed(2)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Bar */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <p className="text-sm opacity-90">{language === 'es' ? 'Total Factura' : 'Invoice Total'}</p>
              <p className="text-4xl font-bold">${total.toFixed(2)}</p>
            </div>
            <Button
              onClick={handleConfirm}
              disabled={loading || (selectedTime.length === 0 && selectedExpensesList.length === 0)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {loading
                ? (language === 'es' ? 'Creando...' : 'Creating...')
                : (language === 'es' ? 'Crear Factura' : 'Create Invoice')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}