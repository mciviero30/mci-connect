import React from 'react';
import { format } from 'date-fns';

export default function QuoteDocument({ quote }) {
    if (!quote) return null;

    return (
        <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-8 md:p-12 print:p-8 font-sans min-h-screen">
            {/* Modern Header Card */}
            <div className="bg-white rounded-3xl shadow-2xl mb-8 overflow-hidden">
                {/* Top Bar */}
                <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Quote</p>
                            <p className="text-white text-xl font-bold">{quote.quote_number}</p>
                        </div>
                    </div>
                </div>

                {/* Company Info & Customer Info - Side by Side */}
                <div className="grid md:grid-cols-2 gap-8 p-8">
                    {/* Company Info */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <img
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/6d6129877_Gemini_Generated_Image_qrppo5qrppo5qrpp.png"
                                alt="MCI Logo"
                                className="w-20 h-20 rounded-2xl shadow-lg"
                            />
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 leading-tight">MODERN COMPONENTS</h2>
                                <h2 className="text-xl font-bold text-slate-900 leading-tight">INSTALLATION</h2>
                            </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 pl-1">
                            <p className="font-semibold text-slate-800">2414 Meadow Isle Ln</p>
                            <p>Lawrenceville, Georgia 30043</p>
                            <p>United States of America</p>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 border border-slate-200">
                        <p className="text-xs text-slate-700 uppercase font-bold tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-slate-700 rounded-full"></span>
                            Bill To
                        </p>
                        <p className="font-bold text-2xl text-slate-900 mb-1">{quote.customer_name}</p>
                    </div>
                </div>

                {/* Dates Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-8 pb-8">
                    {quote.quote_date && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Quote Date</p>
                            <p className="text-sm font-bold text-slate-900">
                                {format(new Date(quote.quote_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                    {quote.valid_until && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Valid Until</p>
                            <p className="text-sm font-bold text-slate-900">
                                {format(new Date(quote.valid_until), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                    {quote.install_date && (
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <p className="text-xs text-blue-600 uppercase font-semibold mb-1">Install Date</p>
                            <p className="text-sm font-bold text-blue-700">
                                {format(new Date(quote.install_date), 'MMM dd, yyyy')}
                            </p>
                        </div>
                    )}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Amount</p>
                        <p className="text-lg font-bold text-slate-700">
                            ${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Job Name Card */}
            {quote.job_name && (
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1">Job Name</p>
                            <p className="text-xl font-bold text-slate-900 mb-1">{quote.job_name}</p>
                            {quote.job_address && (
                                <p className="text-sm text-gray-600 leading-relaxed">{quote.job_address}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Items Table - Modern Card */}
            <div className="bg-white rounded-2xl shadow-lg mb-8 overflow-hidden border border-slate-200">
                <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
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
                            <tr className="bg-slate-50 border-b-2 border-slate-200">
                                <th className="text-left p-4 text-slate-700 font-bold text-xs uppercase tracking-wider w-12">#</th>
                                <th className="text-left p-4 text-slate-700 font-bold text-xs uppercase tracking-wider">Description</th>
                                <th className="text-right p-4 text-slate-700 font-bold text-xs uppercase tracking-wider w-24">Qty</th>
                                <th className="text-right p-4 text-slate-700 font-bold text-xs uppercase tracking-wider w-28">Rate</th>
                                <th className="text-right p-4 text-slate-700 font-bold text-xs uppercase tracking-wider w-32">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quote.items.map((item, index) => (
                                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 align-top">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                            <span className="text-slate-700 font-bold text-sm">{index + 1}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 align-top">
                                        <p className="font-semibold text-slate-900 mb-1">{item.item_name || item.description}</p>
                                        {item.description && item.item_name && (
                                            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                                        )}
                                    </td>
                                    <td className="p-4 align-top text-right">
                                        <p className="text-sm font-bold text-slate-900">
                                            {item.quantity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                        </p>
                                        {item.unit && <p className="text-xs text-gray-500 mt-1">{item.unit}</p>}
                                    </td>
                                    <td className="p-4 align-top text-right text-sm text-gray-700 font-semibold">
                                        ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-4 align-top text-right text-base font-bold text-slate-700">
                                        ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Totals Card - Modern Layout */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-200">
                <div className="max-w-md ml-auto space-y-4">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                        <span className="text-slate-600 font-semibold">Subtotal</span>
                        <span className="text-xl font-bold text-slate-900">
                            ${quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    {/* Tax */}
                    {quote.tax_amount > 0 && (
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                            <span className="text-slate-600 font-semibold">Tax ({quote.tax_rate}%)</span>
                            <span className="text-xl font-bold text-slate-900">
                                ${quote.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    {/* Total */}
                    <div className="bg-gradient-to-r from-slate-700 to-slate-900 rounded-2xl p-6 shadow-xl">
                        <div className="flex justify-between items-center">
                            <span className="text-white text-lg font-bold">TOTAL</span>
                            <span className="text-white text-4xl font-bold">
                                ${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms Card */}
            {quote.terms && (
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-slate-200">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">Terms & Conditions</h3>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{quote.terms}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                <p className="text-lg text-slate-700 font-semibold mb-1">Thank you for your business!</p>
                <p className="text-sm text-gray-500">For questions, please contact us at the address above.</p>
            </div>
        </div>
    );
}