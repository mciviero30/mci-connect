/**
 * PDF CONFIGURATION - MCI CONNECT
 * Centralized config for PDF generation (colors, fonts, layout)
 * NO CSS, NO Tailwind, NO remote resources
 */

// PAGE LAYOUT (A4 Portrait)
export const PAGE = {
  width: 210,  // mm
  height: 297, // mm
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  }
};

// BRAND COLORS (HEX fixed values)
export const COLORS = {
  // Primary
  black: '#000000',
  darkGray: '#4a4a4a',
  lightGray: '#e5e7eb',
  white: '#ffffff',
  
  // Text
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  
  // Backgrounds
  headerBg: '#000000',
  tableBg: '#f9fafb',
  tableHeaderBg: '#f3f4f6',
  totalsBg: '#e5e7eb',
  
  // Accent
  accent: '#FFB800',
  
  // Status
  green: '#10b981',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6'
};

// FONTS (jsPDF built-in)
export const FONTS = {
  regular: 'helvetica',
  bold: 'helvetica-bold',
  sizes: {
    title: 20,
    subtitle: 14,
    heading: 12,
    body: 10,
    small: 8
  }
};

// COMPANY INFORMATION
export const COMPANY_INFO = {
  name: 'Modern Components Installation',
  shortName: 'MCI',
  address: '2414 Meadow Isle Ln',
  city: 'Lawrenceville',
  state: 'GA',
  zip: '30043',
  phone: '470-209-3783',
  email: 'info@mci-us.com'
};

// DEFAULT DIMENSIONS
export const DEFAULTS = {
  rowHeight: 8,
  headerHeight: 35,
  footerHeight: 40,
  lineSpacing: 5,
  tablePadding: 3
};

/**
 * FORMAT CURRENCY
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  return `$${parseFloat(amount).toFixed(2)}`;
}

/**
 * FORMAT DATE
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * CALCULATE CONTENT WIDTH
 */
export function getContentWidth() {
  return PAGE.width - PAGE.margin.left - PAGE.margin.right;
}

/**
 * CALCULATE MAX Y POSITION
 */
export function getMaxY() {
  return PAGE.height - PAGE.margin.bottom;
}