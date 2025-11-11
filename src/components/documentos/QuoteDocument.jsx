import React from 'react';
import { format } from 'date-fns';

export default function QuoteDocument({ quote }) {
    if (!quote) return null;

    return (
        <div className="bg-white p-8 md:p-12 print:p-0 font-sans">
            {/* Header with logo and QUOTE title */}
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
                    <h1 className="text-5xl font-bold text-slate-800 mb-2 tracking-tight">QUOTE</h1>
                    <div className="bg-slate-800 text-white px-4 py-2 rounded-lg inline-block">
                        <p className="text-lg font-bold">{quote.quote_number}</p>
                    </div>
                </div>
            </div>

            {/* Bill To & Dates Grid */}
            <div className="grid grid-cols-3 gap-8 mb-10">
                <div className="col-span-2">
                    <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-2">Bill To</p>
                    <p className="font-bold text-xl text-slate-900 mb-1">{quote.customer_name}</p>
                </div>
                <div className="text-right space-y-4">
                    {quote.quote_date && (
                        <div>
                            <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-1">Quote Date</p>
                            <p className="text-base font-semibold text-slate-900">
                                {format(new Date(quote.quote_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                    {quote.valid_until && (
                        <div>
                            <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-1">Valid Until</p>
                            <p className="text-base font-semibold text-slate-900">
                                {format(new Date(quote.valid_until), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Job Name & Install Date */}
            <div className="mb-10 pb-6 border-b border-gray-200">
                <div className="grid grid-cols-3 gap-8">
                    <div className="col-span-2">
                        <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-2">Job Name</p>
                        <p className="text-lg font-semibold text-slate-900 mb-2">{quote.job_name}</p>
                        {quote.job_address && (
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {quote.job_address}
                            </p>
                        )}
                    </div>
                    {quote.install_date && (
                        <div className="text-right">
                            <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-1">Install Date</p>
                            <p className="text-base font-semibold text-slate-900">
                                {format(new Date(quote.install_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                </div>
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
                        {quote.items.map((item, index) => (
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
                                ${quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        {quote.tax_amount > 0 && (
                            <div className="flex justify-between items-center py-3 border-b border-gray-200">
                                <span className="text-sm font-semibold text-gray-700">Tax ({quote.tax_rate}%)</span>
                                <span className="text-lg font-bold text-slate-900">
                                    ${quote.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center py-4 px-6 bg-slate-800 text-white rounded-lg mt-4">
                            <span className="text-lg font-bold">TOTAL</span>
                            <span className="text-3xl font-bold">
                                ${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms & Conditions */}
            {quote.terms && (
                <div className="border-t-2 border-gray-200 pt-8 mt-12">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Terms & Conditions</h3>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{quote.terms}</p>
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