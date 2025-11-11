import React from 'react';
import { format } from 'date-fns';

export default function QuoteDocument({ quote }) {
    if (!quote) return null;

    return (
        <div className="bg-white p-8 md:p-12 print:p-0 font-sans">
            {/* Header with logo and QUOTE title */}
            <div className="flex justify-between items-start mb-12 pb-8 border-b-2 border-gradient-to-r from-purple-600 to-indigo-600" style={{borderImage: 'linear-gradient(to right, rgb(147, 51, 234), rgb(79, 70, 229)) 1'}}>
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
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3 tracking-tight">QUOTE</h1>
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-2 rounded-xl inline-block shadow-lg">
                        <p className="text-lg font-bold tracking-wide">{quote.quote_number}</p>
                    </div>
                </div>
            </div>

            {/* Bill To & Dates Grid - Modern Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {/* Bill To Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-slate-50 to-purple-50 rounded-2xl p-6 border border-purple-100 shadow-sm">
                    <p className="text-xs text-purple-600 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                        Bill To
                    </p>
                    <p className="font-bold text-2xl text-slate-900 mb-1">{quote.customer_name}</p>
                </div>

                {/* Dates Card */}
                <div className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-2xl p-6 border border-indigo-100 shadow-sm space-y-4">
                    {quote.quote_date && (
                        <div>
                            <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Quote Date</p>
                            <p className="text-base font-semibold text-slate-900">
                                {format(new Date(quote.quote_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                    {quote.valid_until && (
                        <div>
                            <p className="text-xs text-indigo-600 uppercase font-bold tracking-wider mb-1">Valid Until</p>
                            <p className="text-base font-semibold text-slate-900">
                                {format(new Date(quote.valid_until), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Job Name & Install Date - Modern Card */}
            <div className="mb-10 bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 border border-slate-200 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-slate-600 rounded-full"></span>
                            Job Name
                        </p>
                        <p className="text-xl font-semibold text-slate-900 mb-2">{quote.job_name}</p>
                        {quote.job_address && (
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {quote.job_address}
                            </p>
                        )}
                    </div>
                    {quote.install_date && (
                        <div className="flex flex-col justify-center items-end bg-white rounded-xl p-4 border border-slate-200">
                            <p className="text-xs text-slate-600 uppercase font-bold tracking-wider mb-1">Install Date</p>
                            <p className="text-base font-semibold text-slate-900">
                                {format(new Date(quote.install_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

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
                        {quote.items.map((item, index) => (
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
                                ${quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        {/* Tax */}
                        {quote.tax_amount > 0 && (
                            <div className="flex justify-between items-center py-3 px-4 bg-slate-50 rounded-lg">
                                <span className="text-sm font-semibold text-gray-700">Tax ({quote.tax_rate}%)</span>
                                <span className="text-lg font-bold text-slate-900">
                                    ${quote.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}

                        {/* Total */}
                        <div className="flex justify-between items-center py-5 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg mt-4">
                            <span className="text-lg font-bold tracking-wide">TOTAL</span>
                            <span className="text-3xl font-bold">
                                ${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms & Conditions - Modern Card */}
            {quote.terms && (
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 border border-slate-200 shadow-sm mt-12">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-slate-600 rounded-full"></span>
                        Terms & Conditions
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{quote.terms}</p>
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