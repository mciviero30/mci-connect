import React from 'react';
import { format } from 'date-fns';

export default function QuoteDocument({ quote }) {
    if (!quote) return null;

    return (
        <div className="bg-white p-10 max-w-4xl mx-auto shadow-lg print:shadow-none print:rounded-none print:mx-0 print:p-0 print:w-full font-sans">
            <style jsx global>{`
                @page {
                    size: A4 portrait;
                    margin: 1cm;
                }
                @media print {
                    body, html {
                        background-color: #fff !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .print-word-wrap {
                        overflow: visible !important;
                        white-space: pre-wrap !important;
                        word-break: break-word !important;
                    }
                }
            `}</style>

            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-blue-700 text-white px-10 py-6 -mx-10 -mt-10 mb-6 flex items-center justify-between">
                <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/17c220d4f_Screenshot2025-12-19at10354AM.png"
                    alt="MCI Logo"
                    className="h-16 object-contain"
                    style={{ filter: 'brightness(0) saturate(100%) invert(87%) sepia(11%) saturate(965%) hue-rotate(179deg) brightness(101%) contrast(97%)' }}
                />
                <h1 className="text-5xl font-bold tracking-wider bg-gradient-to-r from-slate-300 via-blue-400 to-blue-500 bg-clip-text text-transparent">QUOTE</h1>
            </div>

            {/* Info de la Empresa y Cliente */}
            <div className="grid grid-cols-2 gap-12 mb-8">
                <div className="text-sm">
                    <p className="font-bold text-slate-900">Modern Components Installation</p>
                    <p>2414 Meadow Isle Ln, Lawrenceville GA 30043</p>
                    <p>Phone: 470-209-3783</p>
                    <div className="mt-4">
                        <p className="text-xs text-slate-500 uppercase font-bold">Bill To:</p>
                        <p className="text-lg font-bold text-slate-900">{quote.customer_name}</p>
                    </div>
                </div>

                <div className="text-right text-sm space-y-1">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Quote#</span>
                        <span className="font-bold">{quote.quote_number}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Date</span>
                        <span className="font-bold">{quote.quote_date ? format(new Date(quote.quote_date), 'MM.dd.yy') : ''}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                        <span className="text-slate-500">Valid Until</span>
                        <span className="font-bold">{quote.valid_until ? format(new Date(quote.valid_until), 'MM.dd.yy') : ''}</span>
                    </div>
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

            {/* Tabla con Alineación Superior (CRÍTICO) */}
            <table className="w-full border-collapse mb-8">
                <thead>
                    <tr className="bg-gradient-to-r from-slate-600 via-slate-500 to-blue-600 text-white text-xs uppercase">
                        <th className="text-left px-3 py-2 w-10">#</th>
                        <th className="text-left px-3 py-2">Item & Description</th>
                        <th className="text-right px-3 py-2 w-20">Qty</th>
                        <th className="text-right px-3 py-2 w-24">Rate</th>
                        <th className="text-right px-3 py-2 w-28">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {quote.items && quote.items.length > 0 ? quote.items.map((item, index) => (
                        <tr key={index} className="border-b border-slate-200">
                            {/* align-top asegura que el número y precios no floten si hay mucho texto */}
                            <td className="px-3 py-4 align-top text-sm text-slate-400">{index + 1}</td>
                            <td className="px-3 py-4 align-top">
                                <div className="font-bold text-slate-900 text-sm">{item.item_name || item.description}</div>
                                {item.item_name && item.description && (
                                    <div className="text-xs text-slate-600 print-word-wrap mt-1 leading-normal">
                                        {item.description}
                                    </div>
                                )}
                            </td>
                            <td className="px-3 py-4 align-top text-right text-sm">{item.quantity} {item.unit}</td>
                            <td className="px-3 py-4 align-top text-right text-sm">${item.unit_price.toFixed(2)}</td>
                            <td className="px-3 py-4 align-top text-right text-sm font-bold text-slate-900">
                                ${item.total.toFixed(2)}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="5" className="p-4 text-center text-slate-500">No items</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Notes Section */}
            {quote.notes && (
                <div className="mb-8 page-break-inside-avoid">
                    <h3 className="text-sm font-bold text-slate-900 mb-2">Notes</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{quote.notes}</p>
                </div>
            )}

            {/* Sección de Totales */}
            <div className="flex justify-end pt-4">
                <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm px-2">
                        <span className="text-slate-500">Sub Total</span>
                        <span className="font-bold">${(quote.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {(quote.tax_amount || 0) > 0 && (
                        <div className="flex justify-between text-sm px-2">
                            <span className="text-slate-500">Tax ({quote.tax_rate || 0}%)</span>
                            <span className="font-bold">${(quote.tax_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="bg-gradient-to-r from-slate-600 via-slate-500 to-blue-600 px-4 py-3 rounded flex justify-between items-center">
                        <span className="font-bold text-white">TOTAL</span>
                        <span className="font-bold text-xl text-white">${(quote.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Terms */}
            <div className="mt-8 page-break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-900 mb-2">Terms & Conditions</h3>
                <div className="text-sm text-slate-700 leading-relaxed space-y-1.5">
                    <p><strong>Approval:</strong> PO required to schedule work.</p>
                    <p><strong>Offload:</strong> Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment (forklift or lull). Site access issues may require revised quote.</p>
                    <p><strong>Hours:</strong> Regular hours only. OT/after-hours billed separately via Change Order unless otherwise specified.</p>
                </div>
            </div>
        </div>
    );
}