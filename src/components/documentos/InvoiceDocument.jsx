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

            {/* Modern Header Card */}
            <div className="bg-white rounded-lg shadow-sm mb-8 border border-slate-200 print:border print:border-slate-300">
                {/* Top Bar with Logo and Invoice Number */}
                <div className="bg-black px-8 py-6 flex justify-between items-center print:bg-black rounded-t-lg">
                    {/* LEFT: Company Logo */}
                    <div className="flex items-center gap-4">
                        <img
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/051e3017c_Gemini_Generated_Image_suzuhgsuzuhgsuzu.png"
                            alt="MCI Logo"
                            className="h-16 object-contain print:h-14"
                        />
                    </div>

                    {/* RIGHT: Invoice Label and Number */}
                    <div className="text-right">
                        <p className="text-white text-opacity-80 text-xs font-semibold uppercase tracking-wider mb-1">Invoice</p>
                        <p className="text-white text-3xl font-bold">{invoice.invoice_number}</p>
                        {isPaid && (
                            <div className="mt-2 inline-flex bg-emerald-500 px-4 py-1 rounded-full">
                                <span className="text-white text-xs font-bold">✓ PAID</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Company Info & Customer Info - Side by Side */}
                <div className="grid md:grid-cols-2 gap-8 p-8 print:gap-6 print:p-6">
                    {/* Company Info */}
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight print:text-lg">MODERN COMPONENTS</h2>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight print:text-lg">INSTALLATION</h2>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1 print:text-gray-900">
                            <p className="font-semibold text-slate-800 print:text-slate-900">2414 Meadow Isle Ln</p>
                            <p>Lawrenceville, Georgia 30043</p>
                            <p>United States of America</p>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 print:bg-blue-50 print:border print:border-blue-300">
                        <p className="text-xs text-blue-700 uppercase font-bold tracking-wider mb-3 flex items-center gap-2 print:text-blue-900">
                            <span className="w-2 h-2 bg-blue-600 rounded-full print:bg-blue-900"></span>
                            Bill To
                        </p>
                        <p className="font-bold text-2xl text-slate-900 mb-1 print:text-xl">{invoice.customer_name}</p>
                    </div>
                </div>

                {/* Dates Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-8 pb-8 print:gap-3 print:px-6 print:pb-6">
                    {invoice.invoice_date && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 print:bg-slate-100 print:border print:border-slate-300 print:p-3">
                            <p className="text-xs text-slate-600 uppercase font-semibold mb-1 print:text-slate-900">Invoice Date</p>
                            <p className="text-sm font-bold text-slate-900">
                                {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                    {invoice.due_date && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 print:bg-slate-100 print:border print:border-slate-300 print:p-3">
                            <p className="text-xs text-slate-600 uppercase font-semibold mb-1 print:text-slate-900">Due Date</p>
                            <p className="text-sm font-bold text-slate-900">
                                {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                    {invoice.payment_date && (
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 print:bg-emerald-100 print:border print:border-emerald-300 print:p-3">
                            <p className="text-xs text-emerald-700 uppercase font-semibold mb-1 print:text-emerald-900">Paid Date</p>
                            <p className="text-sm font-bold text-emerald-800">
                                {format(new Date(invoice.payment_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 print:bg-blue-100 print:border print:border-blue-300 print:p-3">
                        <p className="text-xs text-blue-700 uppercase font-semibold mb-1 print:text-blue-900">Total Amount</p>
                        <p className="text-lg font-bold text-blue-800 print:text-blue-900">
                            ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Job Name Card */}
            {invoice.job_name && (
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-slate-200 print:shadow-none print:border print:border-slate-300 print:mb-6">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 print:bg-blue-200">
                            <svg className="w-5 h-5 text-blue-700 print:text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider mb-1 print:text-slate-900">Job Name</p>
                            <p className="text-xl font-bold text-slate-900 mb-1 print:text-lg">{invoice.job_name}</p>
                            {invoice.job_address && (
                                <p className="text-sm text-gray-700 leading-relaxed print:text-gray-900">{invoice.job_address}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Items Table - Modern Card */}
            <div className="bg-white rounded-2xl shadow-sm mb-8 overflow-hidden border border-slate-200 print:shadow-none print:border print:border-slate-300 print:mb-6">
                <div className="bg-slate-800 px-6 py-4 print:bg-slate-700">
                    <p className="text-white font-bold text-lg flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Items & Services
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-100 border-b-2 border-slate-300 print:bg-slate-200">
                                <th className="text-left p-4 text-slate-800 font-bold text-xs uppercase tracking-wider w-12 print:p-3 print:text-slate-900">#</th>
                                <th className="text-left p-4 text-slate-800 font-bold text-xs uppercase tracking-wider print:p-3 print:text-slate-900">Description</th>
                                <th className="text-right p-4 text-slate-800 font-bold text-xs uppercase tracking-wider w-24 print:p-3 print:text-slate-900">Qty</th>
                                <th className="text-right p-4 text-slate-800 font-bold text-xs uppercase tracking-wider w-28 print:p-3 print:text-slate-900">Rate</th>
                                <th className="text-right p-4 text-slate-800 font-bold text-xs uppercase tracking-wider w-32 print:p-3 print:text-slate-900">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item, index) => (
                                <tr key={index} className="border-b border-slate-200 print:border-slate-300">
                                    <td className="p-4 align-top print:p-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center print:bg-blue-200">
                                            <span className="text-blue-800 font-bold text-sm print:text-blue-900">{index + 1}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top print:p-3">
                                        <p className="font-semibold text-slate-900 mb-1">{item.item_name || item.description}</p>
                                        {item.description && item.item_name && (
                                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap print:text-gray-900">{item.description}</p>
                                        )}
                                    </td>
                                    <td className="p-4 align-top text-right print:p-3">
                                        <p className="text-sm font-bold text-slate-900">
                                            {item.quantity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </p>
                                        {item.unit && <p className="text-xs text-gray-600 mt-1 print:text-gray-900">{item.unit}</p>}
                                    </td>
                                    <td className="p-4 align-top text-right text-sm text-gray-800 font-semibold print:p-3 print:text-gray-900">
                                        ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 align-top text-right text-base font-bold text-blue-800 print:p-3 print:text-blue-900">
                                        ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Totals Card - Modern Layout */}
            <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-slate-200 print:shadow-none print:border print:border-slate-300 print:p-6 print:mb-6">
                <div className="max-w-md ml-auto space-y-4 print:space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center pb-3 border-b border-slate-300">
                        <span className="text-slate-700 font-semibold print:text-slate-900">Subtotal</span>
                        <span className="text-xl font-bold text-slate-900">
                            ${invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Tax */}
                    {invoice.tax_amount > 0 && (
                        <div className="flex justify-between items-center pb-3 border-b border-slate-300">
                            <span className="text-slate-700 font-semibold print:text-slate-900">Tax ({invoice.tax_rate}%)</span>
                            <span className="text-xl font-bold text-slate-900">
                                ${invoice.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    {/* Total */}
                    <div className="bg-black rounded-2xl p-6 shadow-lg print:shadow-none print:bg-black print:p-5">
                        <div className="flex justify-between items-center">
                            <span className="text-white text-lg font-bold">TOTAL</span>
                            <span className="text-white text-4xl font-bold print:text-3xl">
                                ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Payment Info */}
                    {(invoice.amount_paid > 0 || hasBalance) && (
                        <div className="space-y-3 pt-4 print:space-y-2">
                            {invoice.amount_paid > 0 && (
                                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-300 print:bg-emerald-100 print:border print:border-emerald-400 print:p-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-emerald-800 font-bold flex items-center gap-2 print:text-emerald-900">
                                            <span className="w-2 h-2 bg-emerald-700 rounded-full print:bg-emerald-900"></span>
                                            Amount Paid
                                        </span>
                                        <span className="text-2xl font-bold text-emerald-800 print:text-xl print:text-emerald-900">
                                            -${invoice.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {hasBalance && (
                                <div className="bg-amber-50 rounded-xl p-5 border-2 border-amber-400 shadow-lg print:shadow-none print:bg-amber-100 print:border print:border-amber-500 print:p-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-amber-900 font-bold flex items-center gap-2">
                                            <span className="w-3 h-3 bg-amber-700 rounded-full print:bg-amber-900"></span>
                                            Balance Due
                                        </span>
                                        <span className="text-3xl font-bold text-amber-800 print:text-2xl print:text-amber-900">
                                            ${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Terms Card */}
            {invoice.terms && (
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-slate-200 print:shadow-none print:border print:border-slate-300 print:mb-6">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 print:bg-slate-200">
                            <svg className="w-5 h-5 text-slate-700 print:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 print:text-slate-900">Payment Terms</h3>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap print:text-gray-900">{invoice.terms}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Notes */}
            {invoice.notes && (
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-slate-200 print:shadow-none print:border print:border-slate-300 print:mb-6">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 print:bg-slate-200">
                            <svg className="w-5 h-5 text-slate-700 print:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 print:text-slate-900">Notes</h3>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap print:text-gray-900">{invoice.notes}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center bg-white rounded-2xl shadow-sm p-6 border border-slate-200 print:shadow-none print:border print:border-slate-300">
                <p className="text-lg text-slate-800 font-semibold mb-1 print:text-slate-900">Thank you for your business!</p>
                <p className="text-sm text-gray-600 print:text-gray-900">For questions, please contact us at the address above.</p>
            </div>
        </div>
    );
}