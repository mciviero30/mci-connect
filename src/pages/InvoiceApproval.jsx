import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";

/**
 * Public page — no login required.
 * Customer clicks the approval link from email and lands here.
 */
export default function InvoiceApproval() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const invoiceId = urlParams.get('id');

  const [status, setStatus] = useState('idle'); // idle | loading | success | already_approved | error
  const [invoiceData, setInvoiceData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleApprove = async () => {
    setStatus('loading');
    try {
      const res = await base44.functions.invoke('approveInvoiceByToken', { token, invoiceId });
      if (res?.already_approved) {
        setStatus('already_approved');
      } else {
        setStatus('success');
      }
      setInvoiceData(res);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err?.message || 'Something went wrong. Please contact us.');
    }
  };

  // Auto-load invoice preview (public, just for display)
  useEffect(() => {
    if (!invoiceId) return;
    base44.entities.Invoice.get(invoiceId).then(inv => {
      if (inv) setInvoiceData(inv);
    }).catch(() => {});
  }, [invoiceId]);

  if (!token || !invoiceId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h1>
          <p className="text-slate-600">This approval link is invalid or incomplete. Please check your email for the correct link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-black p-6 text-white text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/32dbac073_Screenshot2025-12-19at23750PM.png"
            alt="MCI"
            className="h-10 mx-auto mb-3 object-contain"
          />
          <p className="text-slate-400 text-sm">Modern Components Installation</p>
        </div>

        <div className="p-8">
          {/* Invoice Summary */}
          {invoiceData && status === 'idle' && (
            <div className="mb-6">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Invoice Approval</h1>
                <p className="text-slate-500 mt-1">Please review and approve your invoice</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-600">Invoice #</span>
                  <span className="font-bold text-slate-900">{invoiceData.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Customer</span>
                  <span className="font-semibold text-slate-900">{invoiceData.customer_name}</span>
                </div>
                {invoiceData.job_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Job</span>
                    <span className="font-semibold text-slate-900">{invoiceData.job_name}</span>
                  </div>
                )}
                {invoiceData.due_date && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Due Date</span>
                    <span className="font-semibold text-slate-900">{invoiceData.due_date}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-lg">Total</span>
                  <span className="font-bold text-2xl text-green-600">
                    ${(invoiceData.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {(invoiceData.balance > 0 && invoiceData.balance !== invoiceData.total) && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Balance Due</span>
                    <span className="font-bold text-red-600">
                      ${(invoiceData.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleApprove}
                className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg"
              >
                <CheckCircle2 className="w-6 h-6 mr-2" />
                Approve Invoice
              </Button>

              <p className="text-center text-xs text-slate-400 mt-4">
                By clicking "Approve Invoice", you confirm that you have reviewed and accept the invoice.
              </p>
            </div>
          )}

          {/* Loading */}
          {status === 'loading' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Processing...</h2>
              <p className="text-slate-500">Please wait while we process your approval.</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-14 h-14 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Invoice Approved!</h2>
              <p className="text-slate-600 mb-4">
                Thank you, <strong>{invoiceData?.customer_name}</strong>! Your approval has been recorded.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
                <p className="text-sm text-green-800">
                  Invoice <strong>{invoiceData?.invoice_number}</strong> for{' '}
                  <strong>${(invoiceData?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>{' '}
                  has been approved. Our team will be in touch with next steps.
                </p>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Modern Components Installation — 470-209-3783
              </p>
            </div>
          )}

          {/* Already Approved */}
          {status === 'already_approved' && (
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-14 h-14 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Already Approved</h2>
              <p className="text-slate-600">
                Invoice <strong>{invoiceData?.invoice_number}</strong> has already been approved. No action needed.
              </p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="text-center py-8">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-14 h-14 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Unable to Approve</h2>
              <p className="text-slate-600 mb-4">{errorMsg}</p>
              <p className="text-sm text-slate-500">
                Please contact us at <a href="tel:470-209-3783" className="text-blue-600 font-semibold">470-209-3783</a> for assistance.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}