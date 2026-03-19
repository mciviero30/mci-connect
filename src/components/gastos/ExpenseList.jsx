import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ExternalLink, Sparkles, AlertTriangle, TrendingUp, Receipt } from "lucide-react";
import SwipeableListItem from '@/components/shared/SwipeableListItem';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { notifyExpenseStatus } from '../notifications/notificationHelpers';
import { haptic } from '@/components/feedback/HapticFeedback';
import { microToast } from '@/components/feedback/MicroToast';

export default function ExpenseList({ expenses, onApprove, onReject, showEmployeeName = false, isAdmin = false, loading, showActions = true, renderSmartApproval = null }) {
  const { t } = useLanguage();
  const [rejectDialog, setRejectDialog] = useState({ open: false, expense: null });
  const [rejectNotes, setRejectNotes] = useState('');

  // Prevent double approval/rejection (local state)
  const [processingExpenses, setProcessingExpenses] = React.useState(new Set());

  // Wrapper function for onApprove with feedback
  const handleApprove = async (expense) => {
    // Prevent double tap
    if (processingExpenses.has(expense.id)) {
      microToast.info('Already processing', 1000);
      return;
    }

    setProcessingExpenses(prev => new Set(prev).add(expense.id));
    haptic.success();
    microToast.success('Expense approved', 1500);
    
    try {
      await onApprove(expense);
      await notifyExpenseStatus(expense, 'approved', null);
    } catch (error) {
      console.error('Failed to approve:', error);
      haptic.error();
      microToast.error("Couldn't approve — try again", 2000);
    } finally {
      setProcessingExpenses(prev => {
        const next = new Set(prev);
        next.delete(expense.id);
        return next;
      });
    }
  };

  // Wrapper function for onReject with feedback
  const handleReject = async (expense, reason) => {
    // Prevent double tap
    if (processingExpenses.has(expense.id)) {
      microToast.info('Already processing', 1000);
      return;
    }

    setProcessingExpenses(prev => new Set(prev).add(expense.id));
    haptic.medium();
    
    try {
      await onReject(expense, reason);
      await notifyExpenseStatus(expense, 'rejected', reason);
      microToast.success('Expense rejected', 1500);
    } catch (error) {
      console.error('Failed to reject:', error);
      haptic.error();
      microToast.error("Couldn't reject — try again", 2000);
    } finally {
      setProcessingExpenses(prev => {
        const next = new Set(prev);
        next.delete(expense.id);
        return next;
      });
    }
  };

  // This function is triggered by the reject dialog's confirm button
  // It now calls the new 'handleReject' wrapper function.
  const _handleRejectDialogConfirm = () => { // Renamed from original 'handleReject' to avoid conflict
    if (rejectDialog.expense && onReject) {
      handleReject(rejectDialog.expense, rejectNotes); // Calls the new wrapper handleReject
      setRejectDialog({ open: false, expense: null });
      setRejectNotes('');
    }
  };

  // IMPROVED: Better contrast for status badges
  const statusConfig = {
    pending: { label: t('pending'), color: "bg-amber-100 text-amber-800 border-amber-300" },
    approved: { label: t('approved'), color: "bg-green-100 text-green-800 border-green-300" },
    rejected: { label: t('rejected'), color: "bg-red-100 text-red-800 border-red-300" }
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

  const getConfidenceBadge = (expense) => {
    if (!expense.ai_analyzed || expense.ai_confidence === null || expense.ai_confidence === undefined) return null;
    
    const confidence = expense.ai_confidence;
    let colorClass = '';
    let icon = <Sparkles className="w-3 h-3" />;
    
    // IMPROVED: Better contrast colors
    if (confidence >= 80) {
      colorClass = 'bg-green-100 text-green-800 border-green-300';
      icon = <TrendingUp className="w-3 h-3" />;
    } else if (confidence >= 60) {
      colorClass = 'bg-blue-100 text-blue-800 border-blue-300';
      icon = <Sparkles className="w-3 h-3" />;
    } else {
      colorClass = 'bg-amber-100 text-amber-800 border-amber-300';
      icon = <AlertTriangle className="w-3 h-3" />;
    }

    return (
      <Badge className={`${colorClass} text-xs h-auto py-0.5 px-2 flex items-center justify-center`}>
        {icon}
        <span className="ml-1">AI {confidence}%</span>
        {expense.user_corrected_ai && <span className="ml-1">✓</span>}
      </Badge>
    );
  };

  const shouldFlagForReview = (expense) => {
    return expense.ai_analyzed && expense.ai_confidence !== null && expense.ai_confidence < 60 && expense.status === 'pending';
  };

  return (
    <Card className="bg-white shadow-xl border-slate-200">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="flex items-center gap-2 text-slate-900">
          <Receipt className="w-5 h-5 text-[#3B9FF3]" />
          {t('expenses')}
          
          {isAdmin && expenses && expenses.filter(shouldFlagForReview).length > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 ml-2">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {expenses.filter(shouldFlagForReview).length} {t('needsReview')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full overflow-x-auto">
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow className="bg-slate-50 border-slate-200">
                <TableHead className="text-slate-700 font-semibold" style={{width: '110px'}}>{t('date')}</TableHead>
                <TableHead className="text-slate-700 font-semibold" style={{width: '200px'}}>{t('description')}</TableHead>
                <TableHead className="text-slate-700 font-semibold" style={{width: '130px'}}>{t('category')}</TableHead>
                <TableHead className="text-slate-700 font-semibold" style={{width: '180px'}}>{t('job')}</TableHead>
                <TableHead className="text-slate-700 font-semibold" style={{width: '140px'}}>{t('payment_method')}</TableHead>
                <TableHead className="text-right text-slate-700 font-semibold" style={{width: '110px'}}>{t('amount')}</TableHead>
                <TableHead className="text-slate-700 font-semibold" style={{width: '110px'}}>{t('status')}</TableHead>
                {showActions && <TableHead className="text-right text-slate-700 font-semibold" style={{width: '220px'}}>{t('actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell style={{width: '110px'}}><div className="h-4 w-20 bg-slate-200 rounded animate-pulse" /></TableCell>
                    <TableCell style={{width: '200px'}}><div className="h-4 w-32 bg-slate-200 rounded animate-pulse" /></TableCell>
                    <TableCell style={{width: '130px'}}><div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" /></TableCell>
                    <TableCell style={{width: '180px'}}><div className="h-4 w-24 bg-slate-200 rounded animate-pulse" /></TableCell>
                    <TableCell style={{width: '140px'}}><div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse" /></TableCell>
                    <TableCell className="text-right" style={{width: '110px'}}><div className="h-4 w-16 bg-slate-200 rounded ml-auto animate-pulse" /></TableCell>
                    <TableCell style={{width: '110px'}}><div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" /></TableCell>
                    {showActions && <TableCell className="text-right" style={{width: '220px'}}><div className="h-8 w-32 bg-slate-200 rounded ml-auto animate-pulse" /></TableCell>}
                  </TableRow>
                ))
              ) : expenses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showActions ? 8 : 7} className="text-center h-24 text-slate-500">
                    {t('no_expenses_found')}
                  </TableCell>
                </TableRow>
              ) : (
                expenses?.map(expense => {
                  const config = statusConfig[expense.status] || statusConfig.pending;
                  const needsReview = shouldFlagForReview(expense);

                  return (
                    <SwipeableListItem
                      key={expense.id}
                      id={expense.id}
                      onEdit={() => {}}
                      onDelete={() => {}}
                    >
                      <TableRow 
                        className={`hover:bg-slate-50 border-slate-200 ${needsReview ? 'bg-amber-50' : ''}`}
                      >
                      <TableCell className="text-slate-700 whitespace-nowrap" style={{width: '110px'}}>
                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-slate-900" style={{width: '200px'}}>
                        <div className="truncate" title={expense.description}>
                          {expense.description}
                        </div>
                        {getConfidenceBadge(expense) && (
                          <div className="mt-1">
                            {getConfidenceBadge(expense)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell style={{width: '130px'}}>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                          {categoryLabels[expense.category] || expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell style={{width: '180px'}}>
                        {expense.job_name ? (
                          <span className="text-sm text-slate-700 truncate block" title={expense.job_name}>
                            {expense.job_name}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell style={{width: '140px'}}>
                        <Badge className={
                          expense.payment_method === 'personal' 
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-xs"
                            : "bg-indigo-100 text-indigo-800 border-indigo-300 text-xs"
                        }>
                          {paymentMethodLabels[expense.payment_method] || expense.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#3B9FF3] whitespace-nowrap" style={{width: '110px'}}>
                        ${expense.amount?.toFixed(2)}
                      </TableCell>
                      <TableCell style={{width: '110px'}}>
                        <Badge className={`${config.color} text-xs`}>{config.label}</Badge>
                      </TableCell>
                      {showActions && (
                        <TableCell className="text-right" style={{width: '220px'}}>
                          {expense.status === 'pending' && (
                            renderSmartApproval ? renderSmartApproval(expense) : (
                              <div className="flex justify-end gap-2">
                                <Button
                                 size="sm"
                                 onClick={() => handleApprove(expense)}
                                 disabled={processingExpenses.has(expense.id)}
                                 className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-70"
                                >
                                 <CheckCircle className="w-4 h-4 mr-1" />
                                 {processingExpenses.has(expense.id) ? '...' : t('approve')}
                                </Button>
                                <Button
                                 size="sm"
                                 onClick={() => {
                                   haptic.light();
                                   setRejectDialog({ open: true, expense });
                                 }}
                                 variant="outline"
                                 className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                >
                                 <XCircle className="w-4 h-4 mr-1" />
                                 {t('reject')}
                                </Button>
                              </div>
                            )
                          )}
                        </TableCell>
                      )}
                      </TableRow>
                      </SwipeableListItem>
                      );
                      })
                      )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent className="bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{t('reject_expense')} - {rejectDialog.expense?.employee_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-700">{t('reason_for_rejection')}</Label>
              <Textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder={t('explain_rejection_reason')}
                className="bg-white border-slate-300 text-slate-900 mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, expense: null })} className="bg-white border-slate-300 text-slate-700">
              {t('cancel')}
            </Button>
            <Button 
              onClick={_handleRejectDialogConfirm} // MODIFIED: calls the dialog confirm handler
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!rejectNotes}
            >
              {t('reject_expense')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}