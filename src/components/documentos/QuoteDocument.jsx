import React from 'react';
import { format } from 'date-fns';

export default function QuoteDocument({ quote }) {
    if (!quote) return null;

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
                            className="h-16 object-contain print:h-14"
                        />
                        <div className="border-l-2 border-slate-300 pl-3">
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">ModernComponents</h2>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Installation</h2>
                        </div>
                    </div>

                    {/* RIGHT: QUOTE Title and Number */}
                    <div className="text-right">
                        <h1 className="text-5xl font-bold text-slate-900 mb-2">QUOTE</h1>
                        <p className="text-lg text-slate-600 font-semibold"># {quote.quote_number}</p>
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

                    {/* Bill To + Quote Date */}
                    <div>
                        <div className="mb-6">
                            <p className="text-sm font-semibold text-slate-600 mb-2">Bill To</p>
                            <p className="text-lg font-bold text-slate-900">{quote.customer_name}</p>
                        </div>
                        
                        {quote.quote_date && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600 font-semibold">Quote Date :</span>
                                <span className="text-slate-900 font-bold">{format(new Date(quote.quote_date), 'MM.dd.yy')}</span>
                            </div>
                        )}
                        {quote.valid_until && (
                            <div className="flex justify-between items-center text-sm mt-2">
                                <span className="text-slate-600 font-semibold">Valid Until :</span>
                                <span className="text-slate-900 font-bold">{format(new Date(quote.valid_until), 'MM.dd.yy')}</span>
                            </div>
                        )}
                        {quote.install_date && (
                            <div className="flex justify-between items-center text-sm mt-2">
                                <span className="text-slate-600 font-semibold">Install Date :</span>
                                <span className="text-slate-900 font-bold">{format(new Date(quote.install_date), 'MM.dd.yy')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Job Name */}
            {quote.job_name && (
                <div className="mb-6">
                    <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider mb-2">Project</p>
                    <p className="text-xl font-bold text-slate-900 mb-1">{quote.job_name}</p>
                    {quote.job_address && (
                        <p className="text-sm text-slate-600">{quote.job_address}</p>
                    )}
                </div>
            )}

            {/* Header Section - Clean Style */}
            <div className="mb-8 pb-6 border-b-2 border-slate-200">
                <div className="flex justify-between items-start mb-8">
                    {/* LEFT: Logo + Company Name */}
                    <div className="flex items-center gap-3">
                        <img
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/051e3017c_Gemini_Generated_Image_suzuhgsuzuhgsuzu.png"
                            alt="MCI Logo"
                            className="h-16 object-contain print:h-14"
                        />
                        <div className="border-l-2 border-slate-300 pl-3">
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">ModernComponents</h2>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">Installation</h2>
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

            {/* Items Table - Clean Style */}
            <div className="mb-8 overflow-hidden border-t border-b border-slate-300">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <th className="text-left p-4 text-slate-800 font-bold text-xs uppercase tracking-wider w-12 print:p-3 print:text-slate-900">#</th>
                            <th className="text-left p-4 text-slate-800 font-bold text-xs uppercase tracking-wider print:p-3 print:text-slate-900">Description</th>
                            <th className="text-right p-4 text-slate-800 font-bold text-xs uppercase tracking-wider w-24 print:p-3 print:text-slate-900">Qty</th>
                            <th className="text-right p-4 text-slate-800 font-bold text-xs uppercase tracking-wider w-28 print:p-3 print:text-slate-900">Rate</th>
                            <th className="text-right p-4 text-slate-800 font-bold text-xs uppercase tracking-wider w-32 print:p-3 print:text-slate-900">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {invoice.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-200">
                                <td className="p-4 align-top print:p-3">
                                    <span className="text-slate-600 font-semibold text-sm">{index + 1}</span>
                                </td>
                                <td className="p-4 align-top print:p-3">
                                    <p className="font-semibold text-slate-900 mb-1">{item.item_name || item.description}</p>
                                    {item.description && item.item_name && (
                                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                                    )}
                                </td>
                                <td className="p-4 align-top text-right print:p-3">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {item.quantity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </p>
                                    {item.unit && <p className="text-xs text-slate-500 mt-1">{item.unit}</p>}
                                </td>
                                <td className="p-4 align-top text-right text-sm text-slate-800 font-semibold print:p-3">
                                    ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 align-top text-right text-base font-bold text-slate-900 print:p-3">
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
                        ${quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Tax */}
                {quote.tax_amount > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-slate-200">
                        <span className="text-slate-700 font-semibold">Tax ({quote.tax_rate}%)</span>
                        <span className="text-lg font-bold text-slate-900">
                            ${quote.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                {/* Total */}
                <div className="bg-slate-900 rounded-lg p-5 shadow-lg">
                    <div className="flex justify-between items-center">
                        <span className="text-white text-base font-bold uppercase">Total</span>
                        <span className="text-white text-3xl font-bold">
                            ${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Terms */}
            {quote.terms && (
                <div className="mb-6 pb-6 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Terms & Conditions</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{quote.terms}</p>
                </div>
            )}

            {/* Notes */}
            {quote.notes && (
                <div className="mb-6 pb-6 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Notes</h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{quote.notes}</p>
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