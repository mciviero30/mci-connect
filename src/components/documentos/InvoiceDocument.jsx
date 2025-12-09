import React from 'react';
import { format } from 'date-fns';

export default function InvoiceDocument({ invoice }) {
    if (!invoice) return null;

    const isPaid = invoice.status === 'paid';
    const hasBalance = invoice.balance > 0;

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

                    {/* RIGHT: INVOICE Title, Number and Balance Due */}
                    <div className="text-right">
                        <h1 className="text-5xl font-bold text-slate-900 mb-2" style={{letterSpacing: '0.05em'}}>INVOICE</h1>
                        {hasBalance && (
                            <p className="text-lg font-bold mb-3">BALANCE DUE <span className="text-2xl">${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                        )}
                        {isPaid && (
                            <p className="text-lg font-bold text-emerald-600 mb-3">✓ PAID</p>
                        )}
                    </div>
                </div>

                {/* Bill To and Dates */}
                <div className="grid grid-cols-2 gap-8 mb-6">
                    {/* Bill To */}
                    <div>
                        <p className="text-lg font-bold">{invoice.customer_name}</p>
                    </div>

                    {/* Dates and Info */}
                    <div className="text-right text-sm space-y-1">
                        <div className="flex justify-between">
                            <span>Invoice#</span>
                            <span className="font-semibold">{invoice.invoice_number}</span>
                        </div>
                        {invoice.invoice_date && (
                            <div className="flex justify-between">
                                <span>Invoice Date</span>
                                <span className="font-semibold">{format(new Date(invoice.invoice_date), 'MM.dd.yy')}</span>
                            </div>
                        )}
                        {invoice.terms && (
                            <div className="flex justify-between">
                                <span>Terms</span>
                                <span className="font-semibold">{invoice.terms}</span>
                            </div>
                        )}
                        {invoice.due_date && (
                            <div className="flex justify-between">
                                <span>Due Date</span>
                                <span className="font-semibold">{format(new Date(invoice.due_date), 'MM.dd.yy')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Job Details */}
                {invoice.job_name && (
                    <div className="mb-6">
                        <p className="text-sm text-slate-600 mb-1">Job Details :</p>
                        <p className="text-base font-semibold mb-1">{invoice.job_name}</p>
                        {invoice.job_address && (
                            <p className="text-sm text-slate-700 whitespace-pre-line">{invoice.job_address}</p>
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
                            <th className="text-left px-3 py-2 text-sm font-semibold">ITEM & DESCRIPTION</th>
                            <th className="text-right px-3 py-2 text-sm font-semibold w-32">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {invoice.items.map((item, index) => (
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
                                   {item.quantity && item.unit_price && (
                                       <p className="text-xs text-slate-500 mt-1">
                                           {item.quantity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                                           {item.unit && ` ${item.unit}`} × {item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                       </p>
                                   )}
                                </td>
                                <td className="px-3 py-3 align-top text-right text-base font-semibold">
                                    ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Notes Section */}
            {invoice.notes && (
                <div className="mb-6 page-break-inside-avoid">
                    <div className="bg-slate-50 p-4 rounded">
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{invoice.notes}</p>
                    </div>
                </div>
            )}

            {/* Totals Section */}
            <div className="flex justify-end mb-6">
                <div className="w-80 space-y-2 page-break-inside-avoid">
                    <div className="flex justify-between py-1 text-sm">
                        <span>Sub Total</span>
                        <span className="font-semibold">{invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {invoice.tax_amount > 0 && (
                        <div className="flex justify-between py-1 text-sm">
                            <span>Tax ({invoice.tax_rate}%)</span>
                            <span className="font-semibold">{invoice.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}

                    <div className="bg-slate-100 px-4 py-2 flex justify-between items-center">
                        <span className="font-bold text-base">Total</span>
                        <span className="font-bold text-xl">${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {invoice.amount_paid > 0 && (
                        <div className="bg-emerald-50 px-4 py-2 flex justify-between items-center border border-emerald-200">
                            <span className="font-semibold text-emerald-800">Amount Paid</span>
                            <span className="font-bold text-emerald-800">-${invoice.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}

                    {hasBalance && (
                        <div className="bg-slate-900 px-4 py-2 flex justify-between items-center">
                            <span className="font-bold text-white">Balance Due</span>
                            <span className="font-bold text-white text-xl">${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                </div>
            </div>


            

        </div>
    );
}