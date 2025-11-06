import React from 'react';
import { format } from 'date-fns';

export default function InvoiceDocument({ invoice }) {
    if (!invoice) return null;

    const isPaid = invoice.status === 'paid';
    const hasBalance = invoice.balance > 0;

    return (
        <div className="bg-white p-8 md:p-12 print:p-0 font-sans">
            {/* Header with logo and INVOICE title */}
            <div className="flex justify-between items-start mb-12 pb-6 border-b-2 border-slate-800">
                <div className="w-2/3">
                    <div className="flex items-center gap-4 mb-4">
                        <img
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png"
                            alt="MCI Logo"
                            className="w-16 h-16 rounded-lg"
                        />
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">MODERN COMPONENTS</h2>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">INSTALLATION</h2>
                        </div>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                        <p className="font-medium">2414 Meadow Isle Ln</p>
                        <p>Lawrenceville, Georgia 30043</p>
                        <p>United States of America</p>
                    </div>
                </div>

                <div className="text-right">
                    <h1 className="text-5xl font-bold text-slate-800 mb-2 tracking-tight">INVOICE</h1>
                    <div className="bg-slate-800 text-white px-4 py-2 rounded-lg inline-block">
                        <p className="text-lg font-bold">{invoice.invoice_number}</p>
                    </div>
                    {isPaid && (
                        <div className="mt-3">
                            <span className="bg-emerald-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                                PAID
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bill To & Dates Grid */}
            <div className="grid grid-cols-3 gap-8 mb-10">
                <div className="col-span-2">
                    <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-2">Bill To</p>
                    <p className="font-bold text-xl text-slate-900 mb-1">{invoice.customer_name}</p>
                    {invoice.job_address && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                            {invoice.job_address}
                        </p>
                    )}
                </div>
                <div className="text-right space-y-4">
                    <div>
                        <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-1">Invoice Date</p>
                        <p className="text-base font-semibold text-slate-900">
                            {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-1">Due Date</p>
                        <p className="text-base font-semibold text-slate-900">
                            {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                        </p>
                    </div>
                    {invoice.payment_date && (
                        <div>
                            <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-1">Paid Date</p>
                            <p className="text-base font-semibold text-emerald-600">
                                {format(new Date(invoice.payment_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Subject */}
            <div className="mb-10 pb-6 border-b border-gray-200">
                <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-2">Subject</p>
                <p className="text-lg font-semibold text-slate-900">{invoice.job_name}</p>
            </div>

            {/* Items Table */}
            <div className="mb-8">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-800">
                            <th className="text-left p-4 text-white font-bold text-sm w-12 rounded-tl-lg">#</th>
                            <th className="text-left p-4 text-white font-bold text-sm">Item & Description</th>
                            <th className="text-right p-4 text-white font-bold text-sm w-24">Qty</th>
                            <th className="text-right p-4 text-white font-bold text-sm w-28">Rate</th>
                            <th className="text-right p-4 text-white font-bold text-sm w-32 rounded-tr-lg">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-50">
                        {invoice.items.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200 last:border-0">
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
                                <td className="p-4 align-top text-right text-sm font-bold text-slate-900">
                                    ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-10">
                <div className="w-96">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-3 border-b border-gray-200">
                            <span className="text-sm font-semibold text-gray-700">Subtotal</span>
                            <span className="text-lg font-bold text-slate-900">
                                ${invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        {invoice.tax_amount > 0 && (
                            <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                <span className="text-sm font-semibold text-gray-700">Tax ({invoice.tax_rate}%)</span>
                                <span className="text-lg font-bold text-slate-900">
                                    ${invoice.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center py-4 px-6 bg-slate-800 text-white rounded-lg mt-4">
                            <span className="text-lg font-bold">TOTAL</span>
                            <span className="text-3xl font-bold">
                                ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Payment Information */}
                        {(invoice.amount_paid > 0 || hasBalance) && (
                            <div className="mt-6 space-y-3 bg-gray-50 p-4 rounded-lg">
                                {invoice.amount_paid > 0 && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-emerald-700">Amount Paid</span>
                                        <span className="text-lg font-bold text-emerald-700">
                                            -${invoice.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                {hasBalance && (
                                    <div className="flex justify-between items-center pt-3 border-t-2 border-amber-200">
                                        <span className="text-base font-bold text-amber-700">Balance Due</span>
                                        <span className="text-2xl font-bold text-amber-700">
                                            ${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Terms & Conditions */}
            {invoice.terms && (
                <div className="border-t-2 border-gray-200 pt-8 mt-12">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Payment Terms</h3>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{invoice.terms}</p>
                </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">
                    Thank you for your business! For questions, please contact us at the address above.
                </p>
            </div>
        </div>
    );
}