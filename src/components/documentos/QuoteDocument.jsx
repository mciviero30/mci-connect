import React from 'react';
import { format } from 'date-fns';

export default function QuoteDocument({ quote }) {
    if (!quote) return null;

    return (
        <div className="bg-white p-8 print:p-8 font-sans">
            <style jsx>{`
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* Header Section */}
            <div className="mb-6">
                <div className="flex justify-between items-start mb-6">
                    {/* LEFT: Logo and Company Info */}
                    <div>
                        <img
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png"
                            alt="Modern Components Installation"
                            className="h-12 mb-2 object-contain"
                        />
                        <div className="text-sm">
                            <p className="font-bold mb-0.5">Modern Components Installation</p>
                            <p className="mb-0">2414 Meadow Isle Ln</p>
                            <p className="mb-0">Lawrenceville Georgia 30043</p>
                            <p className="mb-0">U.S.A</p>
                        </div>
                    </div>

                    {/* RIGHT: QUOTE Title and Number */}
                    <div className="text-right">
                        <h1 className="text-5xl font-bold text-slate-900 mb-2" style={{letterSpacing: '0.05em'}}>QUOTE</h1>
                        <p className="text-base font-semibold text-slate-700"># {quote.quote_number}</p>
                    </div>
                </div>

                {/* Bill To and Dates */}
                <div className="grid grid-cols-2 gap-8 mb-6">
                    {/* Bill To */}
                    <div>
                        <p className="text-sm mb-1">Bill To</p>
                        <p className="text-lg font-bold">{quote.customer_name}</p>
                    </div>

                    {/* Dates */}
                    <div className="text-right">
                        {quote.quote_date && (
                            <div className="flex justify-between mb-1">
                                <span className="text-sm">Quote Date :</span>
                                <span className="text-sm font-semibold">{format(new Date(quote.quote_date), 'MM.dd.yy')}</span>
                            </div>
                        )}
                        {quote.valid_until && (
                            <div className="flex justify-between mb-1">
                                <span className="text-sm">Valid Until :</span>
                                <span className="text-sm font-semibold">{format(new Date(quote.valid_until), 'MM.dd.yy')}</span>
                            </div>
                        )}
                        {quote.install_date && (
                            <div className="flex justify-between mb-1">
                                <span className="text-sm">Install Date :</span>
                                <span className="text-sm font-semibold">{format(new Date(quote.install_date), 'MM.dd.yy')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Job Details */}
                {quote.job_name && (
                    <div className="mb-6">
                        <p className="text-sm text-slate-600 mb-1">Job Details :</p>
                        <p className="text-base font-semibold mb-1">{quote.job_name}</p>
                        {quote.job_address && (
                            <p className="text-sm text-slate-700 whitespace-pre-line">{quote.job_address}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Items Table */}
            <div className="mb-6">
                <table className="w-full">
                    <thead>
                        <tr className="bg-slate-700 text-white">
                            <th className="text-left px-3 py-2 text-sm font-semibold w-12">#</th>
                            <th className="text-left px-3 py-2 text-sm font-semibold">Item & Description</th>
                            <th className="text-right px-3 py-2 text-sm font-semibold w-24">Qty</th>
                            <th className="text-right px-3 py-2 text-sm font-semibold w-28">Rate</th>
                            <th className="text-right px-3 py-2 text-sm font-semibold w-32">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {quote.items && quote.items.length > 0 ? quote.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-200 page-break-inside-avoid">
                                <td className="px-3 py-3 align-top">
                                    <span className="text-sm font-medium">{index + 1}</span>
                                </td>
                                <td className="px-3 py-3 align-top">
                                   {item.item_name ? (
                                       <>
                                           <p className="font-semibold text-sm mb-0.5">{item.item_name}</p>
                                           {item.description && (
                                               <p className="text-sm text-slate-600">{item.description}</p>
                                           )}
                                       </>
                                   ) : (
                                       <p className="text-sm">{item.description}</p>
                                   )}
                                </td>
                                <td className="px-3 py-3 align-top text-right">
                                    <p className="text-sm font-medium">
                                        {(item.quantity || 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </p>
                                    {item.unit && <p className="text-xs text-slate-500">{item.unit}</p>}
                                </td>
                                <td className="px-3 py-3 align-top text-right text-sm font-medium">
                                    {(item.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-3 py-3 align-top text-right text-sm font-semibold">
                                    {(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="p-3 text-center text-slate-500">No items</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end mb-6">
                <div className="w-80 space-y-2 page-break-inside-avoid">
                    <div className="flex justify-between py-1 text-sm">
                        <span>Sub Total</span>
                        <span className="font-semibold">{(quote.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {(quote.tax_amount || 0) > 0 && (
                        <div className="flex justify-between py-1 text-sm">
                            <span>Tax ({quote.tax_rate || 0}%)</span>
                            <span className="font-semibold">{(quote.tax_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}

                    <div className="bg-slate-100 px-4 py-2 flex justify-between items-center">
                        <span className="font-bold text-base">Total</span>
                        <span className="font-bold text-xl">${(quote.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {quote.notes && (
                <div className="mb-6 page-break-inside-avoid">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Notes</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{quote.notes}</p>
                </div>
            )}

            {/* Terms */}
            {quote.terms && (
                <div className="mb-6 page-break-inside-avoid">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Terms & Conditions</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{quote.terms}</p>
                </div>
            )}
            

        </div>
    );
}