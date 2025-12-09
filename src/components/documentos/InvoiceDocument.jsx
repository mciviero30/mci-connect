import React from 'react';
import { format } from 'date-fns';

export default function InvoiceDocument({ invoice }) {
    if (!invoice) return null;

    const isPaid = invoice.status === 'paid';
    const hasBalance = invoice.balance > 0;

    return (
        <div className="bg-white p-6 print:p-6 font-sans text-[9pt] leading-tight">
            <style jsx>{`
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* Header Section - Compact Style */}
            <div className="mb-4 pb-3 border-b border-slate-300">
                <div className="flex justify-between items-center mb-3">
                    {/* LEFT: Logo Only */}
                    <div className="flex items-center">
                        <img
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png"
                            alt="Modern Components Installation"
                            className="h-8 object-contain"
                        />
                    </div>

                    {/* RIGHT: INVOICE Title and Number */}
                    <div className="text-right">
                        <h1 className="text-xl font-bold text-slate-900 mb-0">INVOICE</h1>
                        <p className="text-xs text-slate-600 font-semibold"># {invoice.invoice_number}</p>
                        {isPaid && (
                            <div className="mt-0.5 inline-flex bg-emerald-500 px-2 py-0.5 rounded-full">
                                <span className="text-white text-[7pt] font-bold">✓ PAID</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Company Address and Bill To */}
                <div className="grid grid-cols-2 gap-4 text-[8pt]">
                    {/* Company Info */}
                    <div>
                        <h3 className="text-[8pt] font-bold text-slate-900 mb-0.5 leading-tight">Modern Components Installation</h3>
                        <div className="text-[7pt] text-slate-700 leading-tight">
                            <p className="mb-0">2414 Meadow Isle Ln, Lawrenceville GA 30043, U.S.A</p>
                        </div>
                    </div>

                    {/* Bill To + Dates */}
                    <div>
                        <div className="mb-2">
                            <p className="text-[7pt] font-semibold text-slate-600 mb-0">Bill To</p>
                            <p className="text-[9pt] font-bold text-slate-900 leading-tight">{invoice.customer_name}</p>
                        </div>
                        
                        <div className="text-[7pt] space-y-0.5">
                            {invoice.invoice_date && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Invoice Date:</span>
                                    <span className="text-slate-900 font-semibold">{format(new Date(invoice.invoice_date), 'MM.dd.yy')}</span>
                                </div>
                            )}
                            {invoice.due_date && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Due Date:</span>
                                    <span className="text-slate-900 font-semibold">{format(new Date(invoice.due_date), 'MM.dd.yy')}</span>
                                </div>
                            )}
                            {invoice.payment_date && (
                                <div className="flex justify-between">
                                    <span className="text-emerald-600">Paid Date:</span>
                                    <span className="text-emerald-900 font-semibold">{format(new Date(invoice.payment_date), 'MM.dd.yy')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Job Name */}
            {invoice.job_name && (
                <div className="mb-2 mt-2">
                    <p className="text-[7pt] text-slate-600 uppercase font-semibold mb-0.5">Subject:</p>
                    <p className="text-[9pt] font-bold text-slate-900 leading-tight mb-0">{invoice.job_name}</p>
                    {invoice.job_address && (
                        <p className="text-[7pt] text-slate-600 leading-tight">{invoice.job_address}</p>
                    )}
                </div>
            )}

            {/* Items Table - Compact Style */}
            <div className="mb-3 overflow-hidden border-t border-b border-slate-300 page-break-inside-avoid">
                <table className="w-full page-break-inside-avoid">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <th className="text-left px-1.5 py-1 text-slate-700 font-semibold text-[7pt] uppercase w-8">#</th>
                            <th className="text-left px-1.5 py-1 text-slate-700 font-semibold text-[7pt] uppercase">Description</th>
                            <th className="text-right px-1.5 py-1 text-slate-700 font-semibold text-[7pt] uppercase w-16">Qty</th>
                            <th className="text-right px-1.5 py-1 text-slate-700 font-semibold text-[7pt] uppercase w-20">Rate</th>
                            <th className="text-right px-1.5 py-1 text-slate-700 font-semibold text-[7pt] uppercase w-24">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {invoice.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-200 page-break-inside-avoid">
                                <td className="px-1.5 py-1 align-top">
                                    <span className="text-slate-600 text-[7pt] font-semibold">{index + 1}</span>
                                </td>
                                <td className="px-1.5 py-1 align-top">
                                    {item.item_name ? (
                                        <>
                                            <p className="font-semibold text-[8pt] text-slate-900 leading-tight mb-0">{item.item_name}</p>
                                            {item.description && (
                                                <p className="text-[7pt] text-slate-600 leading-tight mt-0">{item.description}</p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-[8pt] text-slate-900 leading-tight">{item.description}</p>
                                    )}
                                </td>
                                <td className="px-1.5 py-1 align-top text-right">
                                    <p className="text-[8pt] font-semibold text-slate-900">
                                        {item.quantity.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
                                    </p>
                                    {item.unit && <p className="text-[6pt] text-slate-500">{item.unit}</p>}
                                </td>
                                <td className="px-1.5 py-1 align-top text-right text-[8pt] text-slate-800 font-semibold">
                                    ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-1.5 py-1 align-top text-right text-[9pt] font-bold text-slate-900">
                                    ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section - Compact Style */}
            <div className="max-w-xs ml-auto mb-3 space-y-1 page-break-inside-avoid">
                {/* Subtotal */}
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                    <span className="text-slate-700 font-semibold text-[8pt]">Sub Total</span>
                    <span className="text-[9pt] font-bold text-slate-900">
                        ${invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Tax */}
                {invoice.tax_amount > 0 && (
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                        <span className="text-slate-700 font-semibold text-[8pt]">Tax ({invoice.tax_rate}%)</span>
                        <span className="text-[9pt] font-bold text-slate-900">
                            ${invoice.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                {/* Total */}
                <div className="bg-slate-900 rounded p-2">
                    <div className="flex justify-between items-center">
                        <span className="text-white text-[8pt] font-bold uppercase">Total</span>
                        <span className="text-white text-[14pt] font-bold">
                            ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Payment Info */}
                {invoice.amount_paid > 0 && (
                    <div className="bg-emerald-50 rounded p-1.5 border border-emerald-200 mt-1">
                        <div className="flex justify-between items-center">
                            <span className="text-emerald-800 font-semibold text-[8pt]">Amount Paid</span>
                            <span className="text-[9pt] font-bold text-emerald-800">
                                -${invoice.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}
                {hasBalance && (
                    <div className="bg-amber-50 rounded p-2 border-2 border-amber-400">
                        <div className="flex justify-between items-center">
                            <span className="text-amber-900 font-bold uppercase text-[8pt]">Balance Due</span>
                            <span className="text-[12pt] font-bold text-amber-900">
                                ${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Terms */}
            {invoice.terms && (
                <div className="mb-2 pb-2 border-b border-slate-200 page-break-inside-avoid">
                    <h3 className="text-[7pt] font-bold text-slate-600 uppercase mb-0.5">Payment Terms</h3>
                    <p className="text-[7pt] text-slate-700 leading-tight">{invoice.terms}</p>
                </div>
            )}

            {/* Notes */}
            {invoice.notes && (
                <div className="mb-2 pb-2 border-b border-slate-200 page-break-inside-avoid">
                    <h3 className="text-[7pt] font-bold text-slate-600 uppercase mb-0.5">Notes</h3>
                    <p className="text-[7pt] text-slate-700 leading-tight">{invoice.notes}</p>
                </div>
            )}

            {/* Footer */}
            <div className="text-center pt-2">
                <p className="text-[8pt] text-slate-800 font-semibold mb-0">Thank you for your business!</p>
                <p className="text-[7pt] text-slate-600">For questions, please contact us at projects@mci-us.com</p>
            </div>
            

        </div>
    );
}