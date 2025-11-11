import React from 'react';
import { format } from 'date-fns';

export default function InvoiceDocument({ invoice }) {
    if (!invoice) return null;

    const isPaid = invoice.status === 'paid';
    const hasBalance = invoice.balance > 0;

    return (
        <div className="bg-white p-8 md:p-12 print:p-0 font-sans">
            {/* Header with logo and INVOICE title */}
            <div className="flex justify-between items-start mb-12 pb-8 border-b-2 border-gradient-to-r from-blue-600 to-indigo-600" style={{borderImage: 'linear-gradient(to right, rgb(37, 99, 235), rgb(79, 70, 229)) 1'}}>
                <div className="w-2/3">
                    <div className="flex items-center gap-4 mb-4">
                        <img
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png"
                            alt="MCI Logo"
                            className="w-16 h-16 rounded-xl shadow-md"
                        />
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">MODERN COMPONENTS</h2>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">INSTALLATION</h2>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1 ml-1">
                        <p className="font-medium text-slate-800">2414 Meadow Isle Ln</p>
                        <p>Lawrenceville, Georgia 30043</p>
                        <p>United States of America</p>
                    </div>
                </div>

                <div className="text-right">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3 tracking-tight">INVOICE</h1>
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-xl inline-block shadow-lg">
                        <p className="text-lg font-bold tracking-wide">{invoice.invoice_number}</p>
                    </div>
                    {isPaid && (
                        <div className="mt-4">
                            <span className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-5 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                                ✓ PAID
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bill To & Dates Grid - Modern Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {/* Bill To Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
                    <p className="text-xs text-blue-600 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                        Bill To
                    </p>
                    <p className="font-bold text-2xl text-slate-900 mb-1">{invoice.customer_name}</p>
                </div>

                {/* Dates Card */}
                <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl p-6 border border-indigo-100 shadow-sm space-y-4">
                    {invoice.invoice_date && (
                        <div>
                            <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Invoice Date</p>
                            <p className="text-base font-semibold text-slate-900">
                                {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                    {invoice.due_date && (
                        <div>
                            <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Due Date</p>
                            <p className="text-base font-semibold text-slate-900">
                                {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                    {invoice.payment_date && (
                        <div className="pt-3 border-t border-emerald-200">
                            <p className="text-xs text-emerald-600 uppercase font-bold tracking-wider mb-1">Paid Date</p>
                            <p className="text-base font-semibold text-emerald-600">
                                {format(new Date(invoice.payment_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Job Name Section - Modern Card */}
            {invoice.job_name && (
                <div className="mb-10 bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-slate-600 rounded-full"></span>
                        Job Name
                    </p>
                    <p className="text-xl font-semibold text-slate-900 mb-2">{invoice.job_name}</p>
                    {invoice.job_address && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {invoice.job_address}
                        </p>
                    )}
                </div>
            )}

            {/* Items Table - Modern Design */}
            <div className="mb-8 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                            <th className="text-left p-4 text-white font-bold text-sm w-12">#</th>
                            <th className="text-left p-4 text-white font-bold text-sm">Item & Description</th>
                            <th className="text-right p-4 text-white font-bold text-sm w-24">Qty</th>
                            <th className="text-right p-4 text-white font-bold text-sm w-28">Rate</th>
                            <th className="text-right p-4 text-white font-bold text-sm w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {invoice.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="p-4 align-top text-sm text-gray-700 font-medium">{index + 1}</td>
                                <td className="p-4 align-top">
                                    <p className="font-semibold text-slate-900 mb-1">{item.item_name || item.description}</p>
                                    {item.description && item.item_name && (
                                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                                    )}
                                </td>
                                <td className="p-4 align-top text-right">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {item.quantity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </p>
                                    {item.unit && <p className="text-xs text-gray-500 mt-1">{item.unit}</p>}
                                </td>
                                <td className="p-4 align-top text-right text-sm text-gray-700 font-medium">
                                    ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 align-top text-right text-base font-bold text-slate-900">
                                    ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section - Modern Cards */}
            <div className="flex justify-end mb-10">
                <div className="w-full md:w-96">
                    <div className="space-y-3">
                        {/* Subtotal */}
                        <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg">
                            <span className="text-sm font-semibold text-gray-700">Subtotal</span>
                            <span className="text-lg font-bold text-slate-900">
                                ${invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Tax */}
                        {invoice.tax_amount > 0 && (
                            <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg">
                                <span className="text-sm font-semibold text-gray-700">Tax ({invoice.tax_rate}%)</span>
                                <span className="text-lg font-bold text-slate-900">
                                    ${invoice.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between items-center py-5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-lg mt-4">
                            <span className="text-lg font-bold tracking-wide">TOTAL</span>
                            <span className="text-3xl font-bold">
                                ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Payment Information - Modern Cards */}
                        {(invoice.amount_paid > 0 || hasBalance) && (
                            <div className="mt-6 space-y-3">
                                {invoice.amount_paid > 0 && (
                                    <div className="flex justify-between items-center py-4 px-5 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                                        <span className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                                            Amount Paid
                                        </span>
                                        <span className="text-xl font-bold text-emerald-700">
                                            -${invoice.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                {hasBalance && (
                                    <div className="flex justify-between items-center py-5 px-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300 shadow-md">
                                        <span className="text-base font-bold text-amber-800 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></span>
                                            Balance Due
                                        </span>
                                        <span className="text-3xl font-bold text-amber-700">
                                            ${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Terms & Conditions - Modern Card */}
            {invoice.terms && (
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 border border-slate-200 shadow-sm mt-12">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-slate-600 rounded-full"></span>
                        Payment Terms
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{invoice.terms}</p>
                </div>
            )}

            {/* Footer - Modern */}
            <div className="mt-12 pt-6 border-t-2 border-slate-200 text-center">
                <p className="text-sm text-gray-600 font-medium">
                    Thank you for your business! 🙏
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    For questions, please contact us at the address above.
                </p>
            </div>
        </div>
    );
}