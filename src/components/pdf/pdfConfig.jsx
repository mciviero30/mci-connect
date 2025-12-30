/**
 * PDF CONFIGURATION - MCI CONNECT
 * Branding, colors, and assets for professional PDF generation
 */

// MCI Connect Brand Colors (HEX values - no CSS variables)
export const COLORS = {
  // Primary Brand
  primary: '#000000',      // Black
  secondary: '#4a4a4a',    // Gray
  accent: '#FFB800',       // Yellow/Gold
  
  // Document Colors
  text: {
    primary: '#000000',
    secondary: '#4a4a4a',
    light: '#6b7280',
  },
  
  // Backgrounds
  bg: {
    header: '#000000',
    tableHeader: '#1e293b',
    row: '#f8fafc',
    total: '#e2e8f0',
  },
  
  // Status Colors
  status: {
    paid: '#10b981',
    pending: '#f59e0b',
    overdue: '#ef4444',
    draft: '#6b7280',
  }
};

// Typography
export const FONTS = {
  regular: 'helvetica',
  bold: 'helvetica-bold',
  sizes: {
    title: 24,
    subtitle: 16,
    heading: 14,
    body: 10,
    small: 8,
  }
};

// Layout
export const LAYOUT = {
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
  pageWidth: 210, // A4
  pageHeight: 297, // A4
  lineHeight: 1.5,
};

// Company Information
export const COMPANY_INFO = {
  name: 'Modern Components Installation',
  address: '2414 Meadow Isle Ln',
  city: 'Lawrenceville',
  state: 'GA',
  zip: '30043',
  phone: '470-209-3783',
  email: 'info@mci-us.com',
};

// MCI Logo - Base64 PNG (fallback to text if needed)
export const MCI_LOGO_BASE64 = null; // Will render text logo if null

/**
 * Add gradient to PDF
 */
export function addGradient(doc, x, y, width, height) {
  // Simulate gradient with rectangles (jsPDF doesn't support real gradients)
  doc.setFillColor(COLORS.primary);
  doc.rect(x, y, width * 0.4, height, 'F');
  doc.setFillColor(COLORS.secondary);
  doc.rect(x + width * 0.4, y, width * 0.6, height, 'F');
}

/**
 * Format currency
 */
export function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

/**
 * Format date
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: '2-digit' 
    });
  } catch {
    return dateString;
  }
}