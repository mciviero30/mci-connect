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
                    {/* LEFT: Logo Only */}
                    <div className="flex items-center">
                        <img
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png"
                            alt="Modern Components Installation"
                            className="h-12 object-contain print:h-10"
                        />
                    </div>

                    {/* RIGHT: QUOTE Title and Number */}
                    <div className="text-right">
                        <h1 className="text-3xl font-bold text-slate-900 mb-1">QUOTE</h1>
                        <p className="text-base text-slate-600 font-semibold"># {quote.quote_number}</p>
                    </div>
                </div>

                {/* Company Address and Bill To */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Company Info */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-900 mb-1">Modern Components Installation</h3>
                        <div className="text-xs text-slate-700 space-y-0.5">
                            <p>2414 Meadow Isle Ln</p>
                            <p>Lawrenceville Georgia 30043</p>
                            <p>U.S.A</p>
                        </div>
                    </div>

                    {/* Bill To + Quote Date */}
                    <div>
                        <div className="mb-4">
                            <p className="text-xs font-semibold text-slate-600 mb-1">Bill To</p>
                            <p className="text-base font-bold text-slate-900">{quote.customer_name}</p>
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
                <div className="mb-4">
                    <p className="text-xs text-slate-600 uppercase font-semibold tracking-wider mb-1">Subject :</p>
                    <p className="text-base font-bold text-slate-900 mb-0.5">{quote.job_name}</p>
                    {quote.job_address && (
                        <p className="text-xs text-slate-600 whitespace-pre-wrap">{quote.job_address}</p>
                    )}
                </div>
            )}

            {/* Items Table - Clean Style */}
            <div className="mb-8 overflow-hidden border-t border-b border-slate-300 page-break-inside-avoid">
                <table className="w-full page-break-inside-avoid">
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
                        {quote.items && quote.items.length > 0 ? quote.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-200">
                                <td className="p-3 align-top">
                                    <span className="text-slate-600 font-semibold">{index + 1}</span>
                                </td>
                                <td className="p-3 align-top">
                                   {item.item_name ? (
                                       <>
                                           <p className="font-semibold text-sm text-slate-900">{item.item_name}</p>
                                           {item.description && (
                                               <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{item.description}</p>
                                           )}
                                       </>
                                   ) : (
                                       <p className="text-sm text-slate-900">{item.description}</p>
                                   )}
                                </td>
                                <td className="p-3 align-top text-right">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {(item.quantity || 0).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
                                    </p>
                                    {item.unit && <p className="text-xs text-slate-500 mt-1">{item.unit}</p>}
                                </td>
                                <td className="p-3 align-top text-right text-sm text-slate-800 font-semibold">
                                    ${(item.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 align-top text-right text-base font-bold text-slate-900">
                                    ${(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

            {/* Totals Section - Clean Style */}
            <div className="max-w-md ml-auto mb-6 space-y-2 page-break-inside-avoid">
                {/* Subtotal */}
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                    <span className="text-slate-700 font-semibold text-sm">Sub Total</span>
                    <span className="text-base font-bold text-slate-900">
                        ${(quote.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Tax */}
                {(quote.tax_amount || 0) > 0 && (
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-200">
                        <span className="text-slate-700 font-semibold text-sm">Tax ({quote.tax_rate || 0}%)</span>
                        <span className="text-base font-bold text-slate-900">
                            ${(quote.tax_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                {/* Total */}
                <div className="bg-slate-900 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                        <span className="text-white text-sm font-bold uppercase">Total</span>
                        <span className="text-white text-2xl font-bold">
                            ${(quote.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Terms */}
            {quote.terms && (
                <div className="mb-4 pb-4 border-b border-slate-200 page-break-inside-avoid">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Terms & Conditions</h3>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{quote.terms}</p>
                </div>
            )}

            {/* Notes */}
            {quote.notes && (
                <div className="mb-4 pb-4 border-b border-slate-200 page-break-inside-avoid">
                    <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Notes</h3>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{quote.notes}</p>
                </div>
            )}

            {/* Footer */}
            <div className="text-center pt-4">
                <p className="text-sm text-slate-800 font-semibold mb-1">Thank you for your business!</p>
                <p className="text-xs text-slate-600">For questions, please contact us at projects@mci-us.com</p>
            </div>
            

        </div>
    );
}