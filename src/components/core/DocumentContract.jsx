/**
 * DOCUMENT CONTRACT
 * 
 * Contrato unificado para Quote e Invoice.
 * Define estructura compartida, campos comunes, y reglas de negocio.
 * 
 * Quote e Invoice son DOS FASES del mismo concepto financiero:
 * - Quote: propuesta (draft → sent → approved/rejected)
 * - Invoice: factura (draft → sent → partial/paid)
 * 
 * NUNCA cambiar este contrato sin actualizar AMBOS tipos de documento.
 */

// ============================================
// LINE ITEM CONTRACT
// ============================================

/**
 * Estructura estándar de un LineItem (item de cotización/factura)
 */
export const LINE_ITEM_SCHEMA = {
  // IDENTIFICACIÓN
  item_name: '',        // Título/nombre del item (del catálogo)
  description: '',      // Descripción detallada/custom
  
  // UNIDADES
  quantity: 0,          // Cantidad (number)
  unit: 'pcs',          // Unidad de medida (string)
  
  // FINANCIERO
  unit_price: 0,        // Precio unitario (number)
  total: 0,             // Total = quantity × unit_price (number)
  
  // CONTABILIDAD (opcional - solo para reporting)
  account_category: undefined, // 'revenue_service' | 'revenue_materials' | etc
};

/**
 * Campos REQUERIDOS para un LineItem válido
 */
export const LINE_ITEM_REQUIRED_FIELDS = ['quantity', 'unit_price'];

/**
 * Normaliza un LineItem al contrato estándar
 * GARANTIZA que todos los campos existen con tipos correctos
 */
export function normalizeLineItem(item) {
  return {
    // CRÍTICO: Preservar TODOS los campos con spread primero
    ...item,
    
    // Normalizar tipos numéricos
    quantity: parseFloat(item.quantity) || 0,
    unit_price: parseFloat(item.unit_price) || 0,
    total: parseFloat(item.total) || (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0),
    
    // Normalizar strings (preservar valores existentes)
    item_name: item.item_name ?? item.catalog_name ?? item.name ?? '',
    description: item.description || '',
    unit: item.unit || item.uom || 'pcs',
    
    // Preservar account_category si existe
    account_category: item.account_category || undefined,
  };
}

/**
 * Valida si un LineItem es válido para guardado
 */
export function isValidLineItem(item) {
  // Item válido requiere:
  // 1. Cantidad > 0
  // 2. Al menos description O item_name con contenido
  return (
    item.quantity > 0 &&
    (item.description?.trim() || item.item_name?.trim())
  );
}

// ============================================
// DOCUMENT CONTRACT
// ============================================

/**
 * Estructura estándar de un Financial Document (Quote o Invoice)
 */
export const DOCUMENT_SCHEMA = {
  // CUSTOMER INFORMATION
  customer_id: '',
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  
  // JOB INFORMATION
  job_id: '',
  job_name: '',
  job_address: '',
  
  // TEAM INFORMATION (Quote soporta multi-team, Invoice single-team)
  team_id: '',
  team_name: '',
  team_ids: [],        // Solo Quote
  team_names: [],      // Solo Quote
  
  // DATES
  // quote_date / invoice_date - manejado por cada tipo
  // valid_until - solo Quote
  // due_date - solo Invoice
  // install_date - solo Quote
  
  // ITEMS (LineItem[])
  items: [],
  
  // FINANCIAL TOTALS (calculados por calculateDocumentTotals)
  subtotal: 0,
  tax_rate: 0,
  tax_amount: 0,
  total: 0,
  
  // ESTIMATION (solo Quote, pero Invoice puede heredar)
  estimated_hours: 0,
  estimated_cost: 0,
  profit_margin: 0,
  
  // PAYMENT (solo Invoice)
  amount_paid: 0,      // Solo Invoice
  balance: 0,          // Solo Invoice
  payment_date: '',    // Solo Invoice
  
  // TEXT FIELDS
  notes: '',
  terms: '',
  
  // STATUS (valores distintos por tipo)
  status: 'draft',
};

/**
 * Campos REQUERIDOS para cualquier documento financiero
 */
export const DOCUMENT_REQUIRED_FIELDS = [
  'customer_name',
  'job_name',
  'items',
  'total'
];

/**
 * Calcula totales financieros de un documento
 * ÚNICA fuente de verdad para cálculos
 * 
 * @param {Array} items - Array de LineItems normalizados
 * @param {number} tax_rate - Tax rate (0-100)
 * @param {number} amount_paid - Amount paid (solo para Invoice)
 * @returns {Object} Totales calculados
 */
export function calculateDocumentTotals(items, tax_rate = 0, amount_paid = 0) {
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const tax_amount = subtotal * (parseFloat(tax_rate) / 100);
  const total = subtotal + tax_amount;
  
  // Cálculos de estimación (solo relevante para Quote, pero universal)
  const estimated_hours = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const time = parseFloat(item.installation_time) || 0;
    return sum + (qty * time);
  }, 0);
  
  const estimated_cost = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const cost = parseFloat(item.cost_per_unit) || 0;
    return sum + (qty * cost);
  }, 0);
  
  const profit_margin = total > 0 && estimated_cost > 0
    ? ((total - estimated_cost) / total) * 100
    : 0;
  
  // Cálculos de pago (solo relevante para Invoice)
  const paid = parseFloat(amount_paid) || 0;
  const balance = total - paid;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax_amount: parseFloat(tax_amount.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    estimated_hours: parseFloat(estimated_hours.toFixed(2)),
    estimated_cost: parseFloat(estimated_cost.toFixed(2)),
    profit_margin: parseFloat(profit_margin.toFixed(2)),
    amount_paid: parseFloat(paid.toFixed(2)),
    balance: parseFloat(balance.toFixed(2)),
  };
}

/**
 * Normaliza un documento financiero al contrato estándar
 * 
 * @param {Object} documentData - Raw document data
 * @param {string} documentType - 'quote' | 'invoice'
 * @returns {Object} Normalized document
 */
export function normalizeDocument(documentData, documentType) {
  // 1. Normalizar items PRIMERO
  const normalizedItems = (documentData.items || [])
    .map(item => normalizeLineItem(item))
    .filter(item => isValidLineItem(item));
  
  if (normalizedItems.length === 0) {
    throw new Error(`${documentType} must have at least one valid item`);
  }
  
  // 2. Calcular totales desde items normalizados
  const totals = calculateDocumentTotals(
    normalizedItems,
    documentData.tax_rate || 0,
    documentData.amount_paid || 0
  );
  
  // 3. Build base document structure
  const normalized = {
    // CUSTOMER
    customer_id: documentData.customer_id || '',
    customer_name: (documentData.customer_name || '').trim(),
    customer_email: (documentData.customer_email || '').trim(),
    customer_phone: (documentData.customer_phone || '').trim(),
    
    // JOB
    job_id: documentData.job_id || '',
    job_name: (documentData.job_name || '').trim(),
    job_address: (documentData.job_address || '').trim(),
    
    // ITEMS (normalizados)
    items: normalizedItems,
    
    // TOTALS (calculados)
    ...totals,
    tax_rate: parseFloat(documentData.tax_rate) || 0,
    
    // TEXT
    notes: documentData.notes || '',
    terms: documentData.terms || '',
    
    // STATUS (preservado del input)
    status: documentData.status || 'draft',
  };
  
  // 4. Type-specific fields
  if (documentType === 'quote') {
    // Quote-specific: teams (support multi-team)
    normalized.team_ids = documentData.team_ids || [];
    normalized.team_names = documentData.team_names || [];
    normalized.team_id = documentData.team_ids?.[0] || documentData.team_id || '';
    normalized.team_name = documentData.team_names?.[0] || documentData.team_name || '';
    
    // Quote-specific: dates
    normalized.quote_date = documentData.quote_date || new Date().toISOString().split('T')[0];
    normalized.valid_until = documentData.valid_until || '';
    normalized.install_date = documentData.install_date || '';
    
    // Quote-specific: versioning
    normalized.version = documentData.version || 1;
    normalized.parent_quote_id = documentData.parent_quote_id || '';
    normalized.assigned_to = documentData.assigned_to || '';
    normalized.assigned_to_name = documentData.assigned_to_name || '';
    normalized.out_of_area = documentData.out_of_area || false;
    
  } else if (documentType === 'invoice') {
    // Invoice-specific: single team only
    normalized.team_id = documentData.team_id || '';
    normalized.team_name = documentData.team_name || '';
    
    // Invoice-specific: dates
    normalized.invoice_date = documentData.invoice_date || new Date().toISOString().split('T')[0];
    normalized.due_date = documentData.due_date || '';
    normalized.payment_date = documentData.payment_date || '';
    
    // Invoice-specific: payment tracking
    normalized.transaction_id = documentData.transaction_id || '';
    
    // Invoice-specific: quote reference
    normalized.quote_id = documentData.quote_id || '';
  }
  
  return normalized;
}

/**
 * Valida documento antes de guardado
 */
export function validateDocument(document, documentType) {
  const errors = [];
  
  // Validar campos requeridos
  if (!document.customer_name?.trim()) {
    errors.push('Customer name is required');
  }
  
  if (!document.job_name?.trim()) {
    errors.push('Job name is required');
  }
  
  if (!document.items || document.items.length === 0) {
    errors.push(`${documentType} must have at least one item`);
  }
  
  if (!document.total || document.total <= 0) {
    errors.push(`${documentType} total must be greater than 0`);
  }
  
  // Validaciones específicas por tipo
  if (documentType === 'invoice') {
    if (document.amount_paid < 0) {
      errors.push('Amount paid cannot be negative');
    }
    
    if (document.amount_paid > document.total) {
      errors.push('Amount paid cannot exceed total');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
  
  return true;
}

/**
 * Valida documento antes de enviar al cliente
 */
export function validateForSend(document, documentType) {
  validateDocument(document, documentType);
  
  if (!document.customer_email || !document.customer_email.includes('@')) {
    throw new Error('Valid customer email is required to send');
  }
  
  if (documentType === 'invoice' && !document.invoice_number) {
    throw new Error('Invoice number is required');
  }
  
  if (documentType === 'quote' && !document.quote_number) {
    throw new Error('Quote number is required');
  }
  
  return true;
}

// ============================================
// CONVERSION HELPERS
// ============================================

/**
 * Convierte Quote a Invoice manteniendo el contrato
 */
export function quoteToInvoice(quote, invoiceNumber) {
  // Heredar TODOS los campos del contrato
  return {
    // Quote reference
    quote_id: quote.id,
    
    // Customer (heredado)
    customer_id: quote.customer_id || '',
    customer_name: quote.customer_name,
    customer_email: quote.customer_email,
    customer_phone: quote.customer_phone,
    
    // Job (heredado)
    job_id: quote.job_id || '',
    job_name: quote.job_name,
    job_address: quote.job_address,
    
    // Team (single team de Quote)
    team_id: quote.team_id || quote.team_ids?.[0] || '',
    team_name: quote.team_name || quote.team_names?.[0] || '',
    
    // Items (heredados SIN modificar)
    items: quote.items,
    
    // Totals (heredados)
    subtotal: quote.subtotal,
    tax_rate: quote.tax_rate,
    tax_amount: quote.tax_amount,
    total: quote.total,
    
    // Notes (heredados)
    notes: quote.notes || '',
    terms: quote.terms || '',
    
    // Invoice-specific
    invoice_number: invoiceNumber,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount_paid: 0,
    balance: quote.total,
    status: 'draft',
  };
}

// ============================================
// FIELD NAME MAPPING (para migración futura)
// ============================================

/**
 * Mapeo de nombres de campos equivalentes
 * Útil para identificar campos que significan lo mismo
 */
export const FIELD_ALIASES = {
  // Item names
  'item_name': ['name', 'catalog_name', 'title'],
  'description': ['desc', 'details'],
  'unit': ['uom', 'unit_of_measure'],
  
  // Document names
  'customer_name': ['client_name', 'buyer_name'],
  'job_name': ['project_name', 'work_name'],
  'job_address': ['project_address', 'site_address'],
};

/**
 * Obtiene valor de un campo respetando aliases
 */
export function getFieldValue(obj, fieldName) {
  if (obj[fieldName] !== undefined) return obj[fieldName];
  
  const aliases = FIELD_ALIASES[fieldName] || [];
  for (const alias of aliases) {
    if (obj[alias] !== undefined) return obj[alias];
  }
  
  return undefined;
}