/**
 * Client-Side Data Encryption for Sensitive Fields
 * IMPORTANT: This is additional layer - backend should also encrypt at rest
 */

/**
 * Mask sensitive data for display
 */
export const maskSSN = (ssn) => {
  if (!ssn) return '';
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length !== 9) return ssn;
  return `***-**-${cleaned.slice(-4)}`;
};

export const maskPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 10) return phone;
  return `(***)*****${cleaned.slice(-4)}`;
};

export const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 2) return email;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
};

export const maskCreditCard = (card) => {
  if (!card) return '';
  const cleaned = card.replace(/\D/g, '');
  if (cleaned.length < 13) return card;
  return `**** **** **** ${cleaned.slice(-4)}`;
};

/**
 * Validate sensitive field formats
 */
export const validateSSN = (ssn) => {
  if (!ssn) return { valid: false, error: 'SSN is required' };
  const cleaned = ssn.replace(/\D/g, '');
  if (cleaned.length !== 9) {
    return { valid: false, error: 'SSN must be 9 digits' };
  }
  return { valid: true };
};

export const validateCreditCard = (card) => {
  if (!card) return { valid: false, error: 'Card number is required' };
  const cleaned = card.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) {
    return { valid: false, error: 'Invalid card number' };
  }
  return { valid: true };
};

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate file upload (prevent malicious files)
 */
export const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  } = options;

  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
  }

  return { valid: true };
};

/**
 * Generate secure random token (client-side)
 */
export const generateSecureToken = (length = 32) => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};