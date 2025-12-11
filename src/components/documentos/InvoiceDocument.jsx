import React from 'react';
import { format } from 'date-fns';

export default function InvoiceDocument({ invoice }) {
    if (!invoice) return null;

    const isPaid = invoice.status === 'paid';
    const hasBalance = invoice.balance > 0;

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

            {/* Dark Header Banner */}
            <div className="bg-black text-white px-10 py-6 -mx-10 -mt-10 mb-6 flex items-center justify-between">
                <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png"
                    alt="Modern Components Installation"
                    className="h-14 object-contain"
                />
                <div className="text-right">
                    <h1 className="text-5xl font-bold tracking-wider">INVOICE</h1>
                    {hasBalance && (
                        <p className="text-base font-bold mt-1">
                            BALANCE DUE <span className="text-2xl ml-2">${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                    )}
                    {isPaid && (
                        <p className="text-xl font-bold text-emerald-400 mt-1">✓ PAID</p>
                    )}
                </div>
            </div>

            {/* Company Info */}
            <div className="mb-6">
                <div className="text-sm leading-relaxed">
                    <p className="font-bold mb-0">Modern Components Installation</p>
                    <p className="mb-0">2414 Meadow Isle Ln</p>
                    <p className="mb-0">Lawrenceville Georgia 30043</p>
                    <p className="mb-0">U.S.A</p>
                    <p className="mb-0">Phone: 470-209-3783</p>
                </div>
            </div>

            {/* Bill To and Invoice Info */}
            <div className="grid grid-cols-2 gap-12 mb-8">
                {/* Bill To */}
                <div>
                    <p className="text-xl font-bold text-slate-900">{invoice.customer_name}</p>
                </div>

                {/* Invoice Info */}
                <div className="text-right text-sm space-y-1">
                    <div className="flex justify-between">
                        <span className="text-slate-600">Invoice#</span>
                        <span className="font-semibold text-slate-900">{invoice.invoice_number}</span>
                    </div>
                    {invoice.invoice_date && (
                        <div className="flex justify-between">
                            <span className="text-slate-600">Invoice Date</span>
                            <span className="font-semibold text-slate-900">{format(new Date(invoice.invoice_date), 'MM.dd.yy')}</span>
                        </div>
                    )}
                    {invoice.due_date && (
                        <div className="flex justify-between">
                            <span className="text-slate-600">Due Date</span>
                            <span className="font-semibold text-slate-900">{format(new Date(invoice.due_date), 'MM.dd.yy')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Job Details */}
            {invoice.job_name && (
                <div className="mb-8">
                    <p className="text-sm text-slate-600 mb-1">Job Details :</p>
                    <p className="text-base font-bold text-slate-900 mb-1">{invoice.job_name}</p>
                    {invoice.job_address && (
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{invoice.job_address}</p>
                    )}
                </div>
            )}

            {/* Items Table */}
            <div className="mb-8">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-700 text-white">
                            <th className="text-left px-4 py-3 text-sm font-semibold w-12">#</th>
                            <th className="text-left px-4 py-3 text-sm font-semibold">ITEM & DESCRIPTION</th>
                            <th className="text-right px-4 py-3 text-sm font-semibold w-32">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {invoice.items.map((item, index) => (
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
                                           {item.quantity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                                           {item.unit && ` ${item.unit}`} × {item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                       </p>
                                   )}
                                </td>
                                <td className="px-4 py-4 align-top text-right text-base font-semibold text-slate-900">
                                    ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Notes Section */}
            {invoice.notes && (
                <div className="mb-8 page-break-inside-avoid">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Notes</h3>
                    <div className="bg-slate-50 p-5 rounded">
                        <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{invoice.notes}</p>
                    </div>
                </div>
            )}

            {/* Totals Section */}
            <div className="flex justify-end">
                <div className="w-96 page-break-inside-avoid">
                    <div className="space-y-1 mb-3">
                        <div className="flex justify-between py-2 text-sm">
                            <span className="text-slate-700">Sub Total</span>
                            <span className="font-semibold text-slate-900">{invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        {invoice.tax_amount > 0 && (
                            <div className="flex justify-between py-2 text-sm">
                                <span className="text-slate-700">Tax ({invoice.tax_rate}%)</span>
                                <span className="font-semibold text-slate-900">{invoice.tax_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                    </div>

                    <div className="bg-slate-100 px-6 py-3 rounded flex justify-between items-center mb-3">
                        <span className="font-bold text-lg text-slate-900">Total</span>
                        <span className="font-bold text-2xl text-slate-900">${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {invoice.amount_paid > 0 && (
                        <div className="bg-emerald-50 px-6 py-3 rounded flex justify-between items-center border border-emerald-200 mb-3">
                            <span className="font-semibold text-emerald-800">Amount Paid</span>
                            <span className="font-bold text-emerald-800 text-lg">-${invoice.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}

                    {hasBalance && (
                        <div className="bg-slate-900 px-6 py-3 rounded flex justify-between items-center">
                            <span className="font-bold text-white text-base">Balance Due</span>
                            <span className="font-bold text-white text-2xl">${invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Terms at Bottom */}
            <div className="mt-8 page-break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-900 mb-2">Terms & Conditions</h3>
                <div className="text-sm text-slate-700 leading-relaxed space-y-2">
                    <p><strong>Payment Terms:</strong> Invoices are due 30 days from the invoice date, unless specified otherwise by contract.</p>
                    <p><strong>Late Payment:</strong> Payments are subject to a late interest charge of 1.5% per month on the outstanding balance, calculated from the due date.</p>
                    <p><strong>Collection Costs:</strong> The client is responsible for all collection costs, including reasonable attorney fees, incurred by MCI to recover overdue balances.</p>
                    <p><strong>Disputes:</strong> Any discrepancies must be reported to MCI in writing within 5 days of the invoice date. Failure to report constitutes full acceptance of the amount due.</p>
                    <p><strong>Scope:</strong> The final cost reflects the estimated scope and all approved Change Orders. The undisputed portion of any invoice must be paid by the due date.</p>
                </div>
            </div>
        </div>
    );
}