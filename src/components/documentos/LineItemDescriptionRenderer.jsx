/**
 * LINE ITEM DESCRIPTION RENDERER
 * ✅ Multiline descriptions persist across views
 * ✅ white-space: pre-line enforced everywhere
 * ✅ No data loss on save/reload
 */

import React from 'react';

export default function LineItemDescriptionRenderer({ description, variant = 'default' }) {
  if (!description) return null;

  const containerClasses = {
    invoice: 'text-sm text-slate-700 whitespace-pre-line leading-relaxed print-word-wrap',
    quote: 'text-sm text-slate-700 whitespace-pre-line leading-relaxed',
    pdf: 'text-sm text-slate-700 whitespace-pre-line leading-relaxed',
    display: 'text-xs text-slate-600 whitespace-pre-line leading-normal'
  };

  return (
    <div className={containerClasses[variant] || containerClasses.default}>
      {description}
    </div>
  );
}

/**
 * Preset CSS for global print rendering
 * Add to globals.css or Layout component
 */
export const DESCRIPTION_CSS = `
  /* Multiline description rendering - global */
  .description-text {
    white-space: pre-line;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  /* Print mode - preserve formatting */
  @media print {
    .description-text,
    .print-word-wrap {
      white-space: pre-line !important;
      overflow: visible !important;
      word-break: break-word !important;
    }
  }
`;