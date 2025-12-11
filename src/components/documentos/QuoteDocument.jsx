import React from 'react';
import { format } from 'date-fns';

export default function QuoteDocument({ quote }) {
    if (!quote) return null;

    return (
        <div className="bg-white p-10 print:p-8 font-sans">
            <style jsx>{`
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* Black Header Bar */}
            <div className="bg-black px-10 py-5 -mx-10 -mt-10 mb-8 flex items-center justify-between">
                <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png"
                    alt="Modern Components Installation"
                    className="h-16 object-contain"
                />
                <h1 className="text-5xl font-bold text-white" style={{letterSpacing: '0.05em'}}>QUOTE</h1>
            </div>

            {/* Company Info and Quote Details */}
            <div className="flex justify-between items-start mb-8">
                <div className="text-sm leading-relaxed">
                    <p className="font-bold mb-0">Modern Components Installation</p>
                    <p className="mb-0">2414 Meadow Isle Ln</p>
                    <p className="mb-0">Lawrenceville Georgia 30043</p>
                    <p className="mb-0">U.S.A</p>
                    <p className="mb-0">Phone: 470-209-3783</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-semibold text-slate-700"># {quote.quote_number}</p>
                </div>
            </div>

            {/* Bill To and Dates */}
            <div className="grid grid-cols-2 gap-12 mb-8">
                {/* Bill To */}
                <div>
                    <p className="text-sm text-slate-600 mb-1">Bill To</p>
                    <p className="text-xl font-bold text-slate-900">{quote.customer_name}</p>
                </div>

                {/* Dates */}
                <div className="text-right text-sm space-y-1">
                    {quote.quote_date && (
                        <div className="flex justify-between">
                            <span className="text-slate-600">Quote Date :</span>
                            <span className="font-semibold text-slate-900">{format(new Date(quote.quote_date), 'MM.dd.yy')}</span>
                        </div>
                    )}
                    {quote.valid_until && (
                        <div className="flex justify-between">
                            <span className="text-slate-600">Valid Until :</span>
                            <span className="font-semibold text-slate-900">{format(new Date(quote.valid_until), 'MM.dd.yy')}</span>
                        </div>
                    )}
                    {quote.install_date && (
                        <div className="flex justify-between">
                            <span className="text-slate-600">Install Date :</span>
                            <span className="font-semibold text-slate-900">{format(new Date(quote.install_date), 'MM.dd.yy')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Job Details */}
            {quote.job_name && (
                <div className="mb-8">
                    <p className="text-sm text-slate-600 mb-1">Job Details :</p>
                    <p className="text-base font-bold text-slate-900 mb-1">{quote.job_name}</p>
                    {quote.job_address && (
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{quote.job_address}</p>
                    )}
                </div>
            )}

            {/* Items Table */}
            <div className="mb-8">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-700 text-white">
                            <th className="text-left px-4 py-3 text-sm font-semibold w-12">#</th>
                            <th className="text-left px-4 py-3 text-sm font-semibold">Item & Description</th>
                            <th className="text-right px-4 py-3 text-sm font-semibold w-24">Qty</th>
                            <th className="text-right px-4 py-3 text-sm font-semibold w-28">Rate</th>
                            <th className="text-right px-4 py-3 text-sm font-semibold w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {quote.items && quote.items.length > 0 ? quote.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-200 page-break-inside-avoid">
                                <td className="px-4 py-4 align-top">
                                    <span className="text-sm font-medium text-slate-700">{index + 1}</span>
                                </td>
                                <td className="px-4 py-4 align-top">
                                   {item.item_name ? (
                                       <>
                                           <p className="font-semibold text-sm text-slate-900 mb-1 leading-relaxed">{item.item_name}</p>
                                           {item.description && (
                                               <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
                                           )}
                                       </>
                                   ) : (
                                       <p className="text-sm text-slate-900 leading-relaxed">{item.description}</p>
                                   )}
                                   {item.quantity && item.unit_price && (
                                       <p className="text-xs text-slate-500 mt-1">
                                           {(item.quantity || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                                           {item.unit && ` ${item.unit}`} × {(item.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                       </p>
                                   )}
                                </td>
                                <td className="px-4 py-4 align-top text-right">
                                    <p className="text-sm font-medium text-slate-900">
                                        {(item.quantity || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </p>
                                    {item.unit && <p className="text-xs text-slate-500 mt-0.5">{item.unit}</p>}
                                </td>
                                <td className="px-4 py-4 align-top text-right text-sm font-medium text-slate-900">
                                    {(item.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-4 align-top text-right text-base font-semibold text-slate-900">
                                    {(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="p-4 text-center text-slate-500">No items</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Notes Section */}
            {quote.notes && (
                <div className="mb-8 page-break-inside-avoid">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Notes</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{quote.notes}</p>
                </div>
            )}

            {/* Totals Section */}
            <div className="flex justify-end">
                <div className="w-96 page-break-inside-avoid">
                    <div className="space-y-1 mb-3">
                        <div className="flex justify-between py-2 text-sm">
                            <span className="text-slate-700">Sub Total</span>
                            <span className="font-semibold text-slate-900">{(quote.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {(quote.tax_amount || 0) > 0 && (
                            <div className="flex justify-between py-2 text-sm">
                                <span className="text-slate-700">Tax ({quote.tax_rate || 0}%)</span>
                                <span className="font-semibold text-slate-900">{(quote.tax_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-100 px-6 py-3 rounded flex justify-between items-center">
                        <span className="font-bold text-lg text-slate-900">Total</span>
                        <span className="font-bold text-2xl text-slate-900">${(quote.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Terms */}
            {quote.terms && (
                <div className="mt-8 page-break-inside-avoid">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Terms & Conditions</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{quote.terms}</p>
                </div>
            )}
        </div>
    );
}