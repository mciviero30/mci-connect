import React from 'react';
import { format } from 'date-fns';

export default function InvoiceDocument({ invoice }) {
    if (!invoice) return null;

    const isPaid = invoice.status === 'paid';
    const hasBalance = invoice.balance > 0;

    return (
        <div className="bg-white p-8 md:p-12 print:p-8 font-sans">
            <style jsx>{`
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* Header Section - Clean Style */}
            <div className="mb-8 pb-6 border-b-2 border-slate-200">
                <div className="flex justify-between items-start mb-8">
                    {/* LEFT: Logo + Company Name */}
                    <div className="flex items-center gap-3">
                        <img
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/051e3017c_Gemini_Generated_Image_suzuhgsuzuhgsuzu.png"
                            alt="MCI Logo"
                            className="h-20 object-contain print:h-18"
                        />
                        <div className="border-l-2 border-slate-300 pl-3">
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">ModernComponents</h2>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">Installation</h2>
                        </div>
                    </div>

                    {/* RIGHT: INVOICE Title and Number */}
                    <div className="text-right">
                        <h1 className="text-5xl font-bold text-slate-900 mb-2">INVOICE</h1>
                        <p className="text-lg text-slate-600 font-semibold"># {invoice.invoice_number}</p>
                        {isPaid && (
                            <div className="mt-2 inline-flex bg-emerald-500 px-4 py-1 rounded-full">
                                <span className="text-white text-xs font-bold">✓ PAID</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Company Address and Bill To */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Company Info */}
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-2">Modern Components Installation</h3>
                        <div className="text-sm text-slate-700 space-y-0.5">
                            <p>2414 Meadow Isle Ln</p>
                            <p>Lawrenceville Georgia 30043</p>
                            <p>U.S.A</p>
                        </div>
                    </div>

                    {/* Bill To + Dates */}
                    <div>
                        <div className="mb-6">
                            <p className="text-sm font-semibold text-slate-600 mb-2">Bill To</p>
                            <p className="text-lg font-bold text-slate-900">{invoice.customer_name}</p>
                        </div>
                        
                        {invoice.invoice_date && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600 font-semibold">Invoice Date :</span>
                                <span className="text-slate-900 font-bold">{format(new Date(invoice.invoice_date), 'MM.dd.yy')}</span>
                            </div>
                        )}
                        {invoice.due_date && (
                            <div className="flex justify-between items-center text-sm mt-2">
                                <span className="text-slate-600 font-semibold">Due Date :</span>
                                <span className="text-slate-900 font-bold">{format(new Date(invoice.due_date), 'MM.dd.yy')}</span>
                            </div>
                        )}
                        {invoice.payment_date && (
                            <div className="flex justify-between items-center text-sm mt-2">
                                <span className="text-emerald-600 font-semibold">Paid Date :</span>
                                <span className="text-emerald-900 font-bold">{format(new Date(invoice.payment_date), 'MM.dd.yy')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Job Name */}
            {invoice.job_name && (
                <div className="mb-6">
                    <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider mb-2">Project</p>
                    <p className="text-xl font-bold text-slate-900 mb-1">{invoice.job_name}</p>
                    {invoice.job_address && (
                        <p className="text-sm text-slate-600">{invoice.job_address}</p>
                    )}
                </div>
            )}

            {/* Items Table - Clean Style */}
            <div className="mb-8 overflow-hidden border-t border-b border-slate-300">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <th className="text-left p-3 text-slate-700 font-semibold text-xs uppercase tracking-wider w-12">#</th>
                            <th className="text-left p-3 text-slate-700 font-semibold text-xs uppercase tracking-wider">Description</th>
                            <th className="text-right p-3 text-slate-700 font-semibold text-xs uppercase tracking-wider w-24">Qty</th>
                            <th className="text-right p-3 text-slate-700 font-semibold text-xs uppercase tracking-wider w-28">Rate</th>
                            <th className="text-right p-3 text-slate-700 font-semibold text-xs uppercase tracking-wider w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {invoice.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-200">
                                <td className="p-3 align-top">
                                    <span className="text-slate-600 font-semibold">{index + 1}</span>
                                </td>
                                <td className="p-3 align-top">
                                    <p className="font-semibold text-slate-900">{item.item_name || item.description}</p>
                                    {item.description && item.item_name && (
                                        <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                                    )}
                                </td>
                                <td className="p-3 align-top text-right">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {item.quantity.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
                                    </p>
                                    {item.unit && <p className="text-xs text-slate-500 mt-1">{item.unit}</p>}
                                </td>
                                <td className="p-3 align-top text-right text-sm text-slate-800 font-semibold">
                                    ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 align-top text-right text-base font-bold text-slate-900">
                                    ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section - Clean Style */}
            <div className="max-w-md ml-auto mb-8 space-y-3">
                {/* Subtotal */}
                <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-700 font-semibold">Subtotal</span>
                    <span className="text-lg font-bold text-slate-900">
                        ${invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Tax */}
                {invoice.tax_amount > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                        <span className="text-slate-700 font-semibold">Tax ({invoice.tax_rate}%)</span>
                        <span className="text-lg font-bold text-slate-900">
                            ${invoice.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                {/* Total */}
                <div className="bg-slate-900 rounded-lg p-5 shadow-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-white text-base font-bold uppercase">Total</span>
                        <span className="text-white text-3xl font-bold">
                            ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Payment Info */}
                {invoice.amount_paid > 0 && (
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200 mt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-emerald-800 font-semibold">Amount Paid</span>
                            <span className="text-lg font-bold text-emerald-800">
                                -${invoice.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}
                {hasBalance && (
                    <div className="bg-amber-50 rounded-lg p-5 border-2 border-amber-400">
                        <div className="flex justify-between items-center">
                            <span className="text-amber-900 font-bold uppercase text-sm">Balance Due</span>
                            <span className="text-2xl font-bold text-amber-900">
                                ${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Terms */}
            {invoice.terms && (
                <div className="mb-6 pb-6 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Payment Terms</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{invoice.terms}</p>
                </div>
            )}

            {/* Notes */}
            {invoice.notes && (
                <div className="mb-6 pb-6 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Notes</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
                </div>
            )}

            {/* Footer */}
            <div className="text-center pt-6">
                <p className="text-base text-slate-800 font-semibold mb-1">Thank you for your business!</p>
                <p className="text-sm text-slate-600">For questions, please contact us at the address above.</p>
            </div>
        </div>
    );
}