import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  MapPin,
  FileText,
  Shield,
  User,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

/**
 * COMPLIANCE REVIEW HUB - FASE 8
 * 
 * Central hub for reviewing backend-detected exceptions:
 * - Time & Geofence discrepancies
 * - Payroll calculation mismatches
 * - Quote/Invoice financial discrepancies
 * 
 * Principles:
 * - NO blocking existing flows
 * - Audit trail for all decisions
 * - Admin/Manager access only
 */

export default function ComplianceReviewHub() {
  const [activeTab, setActiveTab] = useState("time");
  const [reviewDialog, setReviewDialog] = useState(null);
  const [reviewReason, setReviewReason] = useState("");
  const queryClient = useQueryClient();

  // User auth
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  const isAuthorized = user?.role === 'admin' || user?.position === 'CEO' || user?.position === 'manager';

  // Time & Geofence exceptions
  const { data: timeExceptions = [], isLoading: loadingTime } = useQuery({
    queryKey: ['time-exceptions'],
    queryFn: async () => {
      const entries = await base44.entities.TimeEntry.filter({
        $or: [
          { geofence_discrepancy: true },
          { requires_location_review: true },
          { breaks_require_review: true }
        ],
        reviewed_at: { $exists: false }
      }, '-created_date', 100);
      return entries;
    },
    enabled: isAuthorized,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
  });

  // Payroll exceptions
  const { data: payrollExceptions = [], isLoading: loadingPayroll } = useQuery({
    queryKey: ['payroll-exceptions'],
    queryFn: async () => {
      const payrolls = await base44.entities.WeeklyPayroll.filter({
        payroll_discrepancy: true,
        reviewed_at: { $exists: false }
      }, '-created_date', 100);
      return payrolls;
    },
    enabled: isAuthorized,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Quote exceptions
  const { data: quoteExceptions = [], isLoading: loadingQuotes } = useQuery({
    queryKey: ['quote-exceptions'],
    queryFn: async () => {
      const quotes = await base44.entities.Quote.filter({
        financial_discrepancy: true,
        reviewed_at: { $exists: false }
      }, '-created_date', 100);
      return quotes;
    },
    enabled: isAuthorized,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Invoice exceptions
  const { data: invoiceExceptions = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoice-exceptions'],
    queryFn: async () => {
      const invoices = await base44.entities.Invoice.filter({
        financial_discrepancy: true,
        reviewed_at: { $exists: false }
      }, '-created_date', 100);
      return invoices;
    },
    enabled: isAuthorized,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ entityType, itemId, action, reason }) => {
      const updateData = {
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.email,
        review_action: action,
        review_reason: reason || null,
      };

      if (entityType === 'TimeEntry') {
        await base44.entities.TimeEntry.update(itemId, updateData);
      } else if (entityType === 'WeeklyPayroll') {
        await base44.entities.WeeklyPayroll.update(itemId, updateData);
      } else if (entityType === 'Quote') {
        await base44.entities.Quote.update(itemId, updateData);
      } else if (entityType === 'Invoice') {
        await base44.entities.Invoice.update(itemId, updateData);
      }

      // Log telemetry
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['quote-exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-exceptions'] });
      setReviewDialog(null);
      setReviewReason("");
    },
  });

  const handleReview = (item, entityType, action) => {
    if (action === 'overridden') {
      setReviewDialog({ item, entityType, action });
    } else {
      reviewMutation.mutate({ entityType, itemId: item.id, action, reason: null });
    }
  };

  const handleOverrideSubmit = () => {
    if (!reviewReason.trim()) return;
    reviewMutation.mutate({
      entityType: reviewDialog.entityType,
      itemId: reviewDialog.item.id,
      action: reviewDialog.action,
      reason: reviewReason,
    });
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="text-slate-600 dark:text-slate-400">
              This area is only accessible to Admin, CEO, and Manager roles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalExceptions = 
    timeExceptions.length + 
    payrollExceptions.length + 
    quoteExceptions.length + 
    invoiceExceptions.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold">Compliance Review Hub</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Review backend-detected exceptions and approve or override with reason.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Pending</p>
                  <p className="text-2xl font-bold">{totalExceptions}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Time & Location</p>
                  <p className="text-2xl font-bold">{timeExceptions.length}</p>
                </div>
                <MapPin className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Payroll</p>
                  <p className="text-2xl font-bold">{payrollExceptions.length}</p>
                </div>
                <Clock className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Financial</p>
                  <p className="text-2xl font-bold">{quoteExceptions.length + invoiceExceptions.length}</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="time">
              Time & Geofence
              {timeExceptions.length > 0 && (
                <Badge variant="destructive" className="ml-2">{timeExceptions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payroll">
              Payroll
              {payrollExceptions.length > 0 && (
                <Badge variant="destructive" className="ml-2">{payrollExceptions.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="financial">
              Financial
              {(quoteExceptions.length + invoiceExceptions.length) > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {quoteExceptions.length + invoiceExceptions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Time & Geofence Tab */}
          <TabsContent value="time" className="space-y-4">
            {loadingTime ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : timeExceptions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold mb-2">No Pending Reviews</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    All time entries are within compliance 🎉
                  </p>
                </CardContent>
              </Card>
            ) : (
              timeExceptions.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {entry.employee_name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(entry.date), 'MMM dd, yyyy')}
                          <span>•</span>
                          {entry.job_name}
                        </div>
                      </div>
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Requires Review
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Discrepancy Details */}
                    {entry.geofence_discrepancy && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                        <p className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-1">
                          Geofence Validation Mismatch
                        </p>
                        <div className="text-xs space-y-1 text-orange-800 dark:text-orange-300">
                          <div className="flex justify-between">
                            <span>Frontend:</span>
                            <span>{entry.geofence_distance_meters?.toFixed(1)}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Backend (Authority):</span>
                            <span className="font-semibold">
                              In: {entry.geofence_distance_backend_meters_checkin?.toFixed(1)}m,
                              Out: {entry.geofence_distance_backend_meters_checkout?.toFixed(1)}m
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {entry.breaks_require_review && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-1">
                          Break Location Issues
                        </p>
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          One or more breaks were outside geofence or location unavailable.
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReview(entry, 'TimeEntry', 'approved')}
                        disabled={reviewMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(entry, 'TimeEntry', 'overridden')}
                        disabled={reviewMutation.isPending}
                      >
                        Override with Reason
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="space-y-4">
            {loadingPayroll ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : payrollExceptions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold mb-2">No Pending Reviews</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    All payroll calculations match backend validation 🎉
                  </p>
                </CardContent>
              </Card>
            ) : (
              payrollExceptions.map((payroll) => (
                <Card key={payroll.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {payroll.employee_name}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-1">
                          <Calendar className="w-4 h-4" />
                          Week of {format(new Date(payroll.week_start_date), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Calculation Mismatch
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Discrepancy Details */}
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
                        {payroll.payroll_discrepancy_reason}
                      </p>
                      {payroll.payroll_backend_totals && (
                        <div className="text-xs space-y-1 text-red-800 dark:text-red-300">
                          <div className="flex justify-between">
                            <span>Frontend Total Hours:</span>
                            <span>{payroll.total_hours?.toFixed(2)}h</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Backend Total Hours:</span>
                            <span>{payroll.payroll_backend_totals.total_hours?.toFixed(2)}h</span>
                          </div>
                          <div className="border-t border-red-300 dark:border-red-700 my-2" />
                          <div className="flex justify-between">
                            <span>Frontend Total Pay:</span>
                            <span>${payroll.total_pay?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Backend Total Pay:</span>
                            <span>${payroll.payroll_backend_totals.total_pay?.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReview(payroll, 'WeeklyPayroll', 'approved')}
                        disabled={reviewMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReview(payroll, 'WeeklyPayroll', 'overridden')}
                        disabled={reviewMutation.isPending}
                      >
                        Override with Reason
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4">
            {loadingQuotes || loadingInvoices ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : quoteExceptions.length === 0 && invoiceExceptions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-semibold mb-2">No Pending Reviews</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    All financial documents match backend calculations 🎉
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Quotes */}
                {quoteExceptions.map((quote) => (
                  <Card key={quote.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Quote #{quote.quote_number}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-1">
                            <User className="w-4 h-4" />
                            {quote.customer_name}
                            <span>•</span>
                            {quote.job_name}
                          </div>
                        </div>
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Financial Mismatch
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">
                          {quote.financial_discrepancy_reason}
                        </p>
                        {quote.backend_totals && (
                          <div className="text-xs space-y-1 text-purple-800 dark:text-purple-300">
                            <div className="flex justify-between">
                              <span>Frontend Total:</span>
                              <span>${quote.total?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>Backend Total (Authority):</span>
                              <span>${quote.backend_totals.total?.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleReview(quote, 'Quote', 'approved')}
                          disabled={reviewMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(quote, 'Quote', 'overridden')}
                          disabled={reviewMutation.isPending}
                        >
                          Override with Reason
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Invoices */}
                {invoiceExceptions.map((invoice) => (
                  <Card key={invoice.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Invoice #{invoice.invoice_number}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mt-1">
                            <User className="w-4 h-4" />
                            {invoice.customer_name}
                            <span>•</span>
                            {invoice.job_name}
                          </div>
                        </div>
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Financial Mismatch
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                        <p className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">
                          {invoice.financial_discrepancy_reason}
                        </p>
                        {invoice.backend_totals && (
                          <div className="text-xs space-y-1 text-purple-800 dark:text-purple-300">
                            <div className="flex justify-between">
                              <span>Frontend Total:</span>
                              <span>${invoice.total?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>Backend Total (Authority):</span>
                              <span>${invoice.backend_totals.total?.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleReview(invoice, 'Invoice', 'approved')}
                          disabled={reviewMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(invoice, 'Invoice', 'overridden')}
                          disabled={reviewMutation.isPending}
                        >
                          Override with Reason
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Override Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override with Reason</DialogTitle>
            <DialogDescription>
              This action requires a reason for audit trail compliance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Reason for Override</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this exception is being overridden..."
                value={reviewReason}
                onChange={(e) => setReviewReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleOverrideSubmit}
              disabled={!reviewReason.trim() || reviewMutation.isPending}
            >
              Confirm Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}