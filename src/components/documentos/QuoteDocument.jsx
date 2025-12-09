import React from 'react';
import { format } from 'date-fns';

export default function QuoteDocument({ quote }) {
    if (!quote) return null;

    return (
        <div className="bg-white p-6 print:p-6 font-sans text-[9pt] leading-tight">
            <style jsx>{`
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* Header Section - Compact Style */}
            <div className="mb-4 pb-3 border-b border-slate-300">
                <div className="flex justify-between items-center mb-3">
                    {/* LEFT: Logo Only */}
                    <div className="flex items-center">
                        <img
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png"
                            alt="Modern Components Installation"
                            className="h-8 object-contain"
                        />
                    </div>

                    {/* RIGHT: QUOTE Title and Number */}
                    <div className="text-right">
                        <h1 className="text-xl font-bold text-slate-900 mb-0">QUOTE</h1>
                        <p className="text-xs text-slate-600 font-semibold"># {quote.quote_number}</p>
                    </div>
                </div>

                {/* Company Address and Bill To */}
                <div className="grid grid-cols-2 gap-4 text-[8pt]">
                    {/* Company Info */}
                    <div>
                        <h3 className="text-[8pt] font-bold text-slate-900 mb-0.5 leading-tight">Modern Components Installation</h3>
                        <div className="text-[7pt] text-slate-700 leading-tight">
                            <p className="mb-0">2414 Meadow Isle Ln, Lawrenceville GA 30043, U.S.A</p>
                        </div>
                    </div>

                    {/* Bill To + Quote Date */}
                    <div>
                        <div className="mb-2">
                            <p className="text-[7pt] font-semibold text-slate-600 mb-0">Bill To</p>
                            <p className="text-[9pt] font-bold text-slate-900 leading-tight">{quote.customer_name}</p>
                        </div>
                        
                        <div className="text-[7pt] space-y-0.5">
                            {quote.quote_date && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Quote Date:</span>
                                    <span className="text-slate-900 font-semibold">{format(new Date(quote.quote_date), 'MM.dd.yy')}</span>
                                </div>
                            )}
                            {quote.valid_until && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Valid Until:</span>
                                    <span className="text-slate-900 font-semibold">{format(new Date(quote.valid_until), 'MM.dd.yy')}</span>
                                </div>
                            )}
                            {quote.install_date && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Install Date:</span>
                                    <span className="text-slate-900 font-semibold">{format(new Date(quote.install_date), 'MM.dd.yy')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Job Name */}
            {quote.job_name && (
                <div className="mb-2 mt-2">
                    <p className="text-[7pt] text-slate-600 uppercase font-semibold mb-0.5">Subject:</p>
                    <p className="text-[9pt] font-bold text-slate-900 leading-tight mb-0">{quote.job_name}</p>
                    {quote.job_address && (
                        <p className="text-[7pt] text-slate-600 leading-tight">{quote.job_address}</p>
                    )}
                </div>
            )}

            {/* Items Table - Compact Style */}
            <div className="mb-3 overflow-hidden border-t border-b border-slate-300 page-break-inside-avoid">
                <table className="w-full page-break-inside-avoid">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <th className="text-left px-1.5 py-1 text-slate-700 font-semibold text-[7pt] uppercase w-8">#</th>
                            <th className="text-left px-1.5 py-1 text-slate-700 font-semibold text-[7pt] uppercase">Description</th>
                            <th className="text-right px-1.5 py-1 text-slate-700 font-semibold text-[7pt] uppercase w-16">Qty</th>
                            <th className="text-right px-1.5 py-1 text-slate-700 font-semibold text-[7pt] uppercase w-20">Rate</th>
                            <th className="text-right px-1.5 py-1 text-slate-700 font-semibold text-[7pt] uppercase w-24">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {quote.items && quote.items.length > 0 ? quote.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-200 page-break-inside-avoid">
                                <td className="px-1.5 py-1 align-top">
                                    <span className="text-slate-600 text-[7pt] font-semibold">{index + 1}</span>
                                </td>
                                <td className="px-1.5 py-1 align-top">
                                   {item.item_name ? (
                                       <>
                                           <p className="font-semibold text-[8pt] text-slate-900 leading-tight mb-0">{item.item_name}</p>
                                           {item.description && (
                                               <p className="text-[7pt] text-slate-600 leading-tight mt-0">{item.description}</p>
                                           )}
                                       </>
                                   ) : (
                                       <p className="text-[8pt] text-slate-900 leading-tight">{item.description}</p>
                                   )}
                                </td>
                                <td className="px-1.5 py-1 align-top text-right">
                                    <p className="text-[8pt] font-semibold text-slate-900">
                                        {(item.quantity || 0).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
                                    </p>
                                    {item.unit && <p className="text-[6pt] text-slate-500">{item.unit}</p>}
                                </td>
                                <td className="px-1.5 py-1 align-top text-right text-[8pt] text-slate-800 font-semibold">
                                    ${(item.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="px-1.5 py-1 align-top text-right text-[9pt] font-bold text-slate-900">
                                    ${(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="5" className="p-2 text-center text-slate-500 text-[8pt]">No items</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals Section - Compact Style */}
            <div className="max-w-xs ml-auto mb-3 space-y-1 page-break-inside-avoid">
                {/* Subtotal */}
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                    <span className="text-slate-700 font-semibold text-[8pt]">Sub Total</span>
                    <span className="text-[9pt] font-bold text-slate-900">
                        ${(quote.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Tax */}
                {(quote.tax_amount || 0) > 0 && (
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200">
                        <span className="text-slate-700 font-semibold text-[8pt]">Tax ({quote.tax_rate || 0}%)</span>
                        <span className="text-[9pt] font-bold text-slate-900">
                            ${(quote.tax_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                {/* Total */}
                <div className="bg-slate-900 rounded p-2">
                    <div className="flex justify-between items-center">
                        <span className="text-white text-[8pt] font-bold uppercase">Total</span>
                        <span className="text-white text-[14pt] font-bold">
                            ${(quote.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Terms */}
            {quote.terms && (
                <div className="mb-2 pb-2 border-b border-slate-200 page-break-inside-avoid">
                    <h3 className="text-[7pt] font-bold text-slate-600 uppercase mb-0.5">Terms & Conditions</h3>
                    <p className="text-[7pt] text-slate-700 leading-tight">{quote.terms}</p>
                </div>
            )}

            {/* Notes */}
            {quote.notes && (
                <div className="mb-2 pb-2 border-b border-slate-200 page-break-inside-avoid">
                    <h3 className="text-[7pt] font-bold text-slate-600 uppercase mb-0.5">Notes</h3>
                    <p className="text-[7pt] text-slate-700 leading-tight">{quote.notes}</p>
                </div>
            )}

            {/* Footer */}
            <div className="text-center pt-2">
                <p className="text-[8pt] text-slate-800 font-semibold mb-0">Thank you for your business!</p>
                <p className="text-[7pt] text-slate-600">For questions, please contact us at projects@mci-us.com</p>
            </div>
            

        </div>
    );
}