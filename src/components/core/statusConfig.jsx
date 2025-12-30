/**
 * STATUS CONFIGURATION - Single source of truth for Quote and Invoice status
 * 
 * Centralizes status labels, badge classes, and dot colors to ensure
 * consistency across the entire application.
 */

/**
 * Quote Status Metadata
 * Contains labels, badge classes, and dot colors for each status
 */
export const QUOTE_STATUS_META = {
  draft: {
    label_en: 'Draft',
    label_es: 'Borrador',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    cardBadgeClass: 'soft-slate-gradient',
    dotClass: 'bg-slate-500'
  },
  sent: {
    label_en: 'Sent',
    label_es: 'Enviado',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    cardBadgeClass: 'soft-blue-gradient',
    dotClass: 'bg-blue-500'
  },
  approved: {
    label_en: 'Approved',
    label_es: 'Aprobado',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    cardBadgeClass: 'soft-green-gradient',
    dotClass: 'bg-green-500'
  },
  rejected: {
    label_en: 'Rejected',
    label_es: 'Rechazado',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    cardBadgeClass: 'soft-red-gradient',
    dotClass: 'bg-red-500'
  },
  converted_to_invoice: {
    label_en: 'Converted',
    label_es: 'Convertido',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    cardBadgeClass: 'soft-purple-gradient',
    dotClass: 'bg-[#507DB4]'
  }
};

/**
 * Invoice Status Metadata
 * Contains labels, badge classes, and dot colors for each status
 */
export const INVOICE_STATUS_META = {
  draft: {
    label_en: 'Draft',
    label_es: 'Borrador',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    cardBadgeClass: 'soft-slate-gradient',
    dotClass: 'bg-slate-500'
  },
  sent: {
    label_en: 'Sent',
    label_es: 'Enviado',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    cardBadgeClass: 'soft-blue-gradient',
    dotClass: 'bg-blue-500'
  },
  paid: {
    label_en: 'Paid',
    label_es: 'Pagado',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    cardBadgeClass: 'soft-green-gradient',
    dotClass: 'bg-green-500'
  },
  partial: {
    label_en: 'Partial',
    label_es: 'Parcial',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    cardBadgeClass: 'soft-amber-gradient',
    dotClass: 'bg-amber-500'
  },
  overdue: {
    label_en: 'Overdue',
    label_es: 'Vencido',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    cardBadgeClass: 'soft-red-gradient',
    dotClass: 'bg-red-500'
  },
  cancelled: {
    label_en: 'Cancelled',
    label_es: 'Cancelado',
    badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
    cardBadgeClass: 'soft-slate-gradient',
    dotClass: 'bg-slate-400'
  }
};

/**
 * Get Quote status metadata with localized label
 * 
 * @param {string} status - Quote status
 * @param {string} lang - Language code ('en' or 'es')
 * @returns {Object} Status metadata with label, badgeClass, cardBadgeClass, dotClass
 */
export function getQuoteStatusMeta(status, lang = 'en') {
  const s = status || 'draft';
  const meta = QUOTE_STATUS_META[s] || QUOTE_STATUS_META.draft;
  return {
    ...meta,
    label: lang === 'es' ? meta.label_es : meta.label_en
  };
}

/**
 * Get Invoice status metadata with localized label
 * 
 * @param {string} status - Invoice status
 * @param {string} lang - Language code ('en' or 'es')
 * @returns {Object} Status metadata with label, badgeClass, cardBadgeClass, dotClass
 */
export function getInvoiceStatusMeta(status, lang = 'en') {
  const s = status || 'draft';
  const meta = INVOICE_STATUS_META[s] || INVOICE_STATUS_META.draft;
  return {
    ...meta,
    label: lang === 'es' ? meta.label_es : meta.label_en
  };
}