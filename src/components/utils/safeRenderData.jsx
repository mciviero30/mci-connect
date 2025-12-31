/**
 * Safe data normalization for rendering
 * Prevents UI crashes from null/undefined legacy data
 */

/**
 * Normalize invoice for safe rendering
 */
export function safeNormalizeInvoice(invoice) {
  if (!invoice) return null;
  
  return {
    ...invoice,
    invoice_number: invoice.invoice_number || '',
    customer_name: invoice.customer_name || 'Unknown Customer',
    customer_email: invoice.customer_email || '',
    customer_phone: invoice.customer_phone || '',
    job_name: invoice.job_name || '',
    job_address: invoice.job_address || '',
    team_name: invoice.team_name || '',
    invoice_date: invoice.invoice_date || new Date().toISOString().split('T')[0],
    due_date: invoice.due_date || '',
    items: (invoice.items || []).map(item => ({
      ...item,
      item_name: item.item_name || item.name || item.description || '',
      description: item.description || '',
      quantity: parseFloat(item.quantity) || 0,
      unit: item.unit || item.uom || 'pcs',
      unit_price: parseFloat(item.unit_price) || 0,
      total: parseFloat(item.total) || 0,
    })),
    subtotal: parseFloat(invoice.subtotal) || 0,
    tax_rate: parseFloat(invoice.tax_rate) || 0,
    tax_amount: parseFloat(invoice.tax_amount) || 0,
    total: parseFloat(invoice.total) || 0,
    amount_paid: parseFloat(invoice.amount_paid) || 0,
    balance: parseFloat(invoice.balance) || parseFloat(invoice.total) || 0,
    notes: invoice.notes || '',
    terms: invoice.terms || '',
    status: invoice.status || 'draft',
  };
}

/**
 * Normalize quote for safe rendering
 */
export function safeNormalizeQuote(quote) {
  if (!quote) return null;
  
  return {
    ...quote,
    quote_number: quote.quote_number || '',
    customer_name: quote.customer_name || 'Unknown Customer',
    customer_email: quote.customer_email || '',
    customer_phone: quote.customer_phone || '',
    job_name: quote.job_name || '',
    job_address: quote.job_address || '',
    team_name: quote.team_name || '',
    quote_date: quote.quote_date || new Date().toISOString().split('T')[0],
    valid_until: quote.valid_until || '',
    items: (quote.items || []).map(item => ({
      ...item,
      item_name: item.item_name || item.name || item.description || '',
      description: item.description || '',
      quantity: parseFloat(item.quantity) || 0,
      unit: item.unit || item.uom || 'pcs',
      unit_price: parseFloat(item.unit_price) || 0,
      total: parseFloat(item.total) || 0,
    })),
    subtotal: parseFloat(quote.subtotal) || 0,
    tax_rate: parseFloat(quote.tax_rate) || 0,
    tax_amount: parseFloat(quote.tax_amount) || 0,
    total: parseFloat(quote.total) || 0,
    notes: quote.notes || '',
    terms: quote.terms || '',
    status: quote.status || 'draft',
    estimated_hours: parseFloat(quote.estimated_hours) || 0,
    estimated_cost: parseFloat(quote.estimated_cost) || 0,
    profit_margin: parseFloat(quote.profit_margin) || 0,
  };
}

/**
 * Normalize job for safe rendering
 */
export function safeNormalizeJob(job) {
  if (!job) return null;
  
  return {
    ...job,
    name: job.name || 'Unnamed Job',
    description: job.description || '',
    address: job.address || '',
    city: job.city || '',
    state: job.state || '',
    zip: job.zip || '',
    customer_name: job.customer_name || '',
    team_name: job.team_name || '',
    contract_amount: parseFloat(job.contract_amount) || 0,
    estimated_cost: parseFloat(job.estimated_cost) || 0,
    estimated_hours: parseFloat(job.estimated_hours) || 0,
    profit_margin: parseFloat(job.profit_margin) || 0,
    status: job.status || 'active',
    color: job.color || 'blue',
    latitude: parseFloat(job.latitude) || null,
    longitude: parseFloat(job.longitude) || null,
    geofence_radius: parseFloat(job.geofence_radius) || 100,
    skip_geofence: job.skip_geofence || false,
  };
}

/**
 * Normalize time entry for safe rendering
 */
export function safeNormalizeTimeEntry(entry) {
  if (!entry) return null;
  
  return {
    ...entry,
    employee_name: entry.employee_name || 'Unknown',
    employee_email: entry.employee_email || '',
    job_name: entry.job_name || '',
    date: entry.date || new Date().toISOString().split('T')[0],
    check_in: entry.check_in || '',
    check_out: entry.check_out || '',
    hours_worked: parseFloat(entry.hours_worked) || 0,
    breaks: entry.breaks || [],
    total_break_minutes: parseFloat(entry.total_break_minutes) || 0,
    hour_type: entry.hour_type || 'normal',
    work_type: entry.work_type || 'normal',
    status: entry.status || 'pending',
    task_details: entry.task_details || '',
    notes: entry.notes || '',
    geofence_validated: entry.geofence_validated || false,
    exceeds_max_hours: entry.exceeds_max_hours || false,
  };
}

/**
 * Normalize expense for safe rendering
 */
export function safeNormalizeExpense(expense) {
  if (!expense) return null;
  
  return {
    ...expense,
    employee_name: expense.employee_name || 'Unknown',
    employee_email: expense.employee_email || '',
    job_name: expense.job_name || '',
    amount: parseFloat(expense.amount) || 0,
    category: expense.category || 'other',
    description: expense.description || '',
    date: expense.date || new Date().toISOString().split('T')[0],
    receipt_url: expense.receipt_url || '',
    payment_method: expense.payment_method || 'personal',
    status: expense.status || 'pending',
    notes: expense.notes || '',
  };
}

/**
 * Normalize user for safe rendering
 */
export function safeNormalizeUser(user) {
  if (!user) return null;
  
  return {
    ...user,
    full_name: user.full_name || user.email || 'Unknown User',
    email: user.email || '',
    phone: user.phone || '',
    position: user.position || '',
    department: user.department || '',
    team_name: user.team_name || '',
    employment_status: user.employment_status || 'active',
    role: user.role || 'user',
    hourly_rate: parseFloat(user.hourly_rate) || 0,
    hourly_rate_overtime: parseFloat(user.hourly_rate_overtime) || 0,
    per_diem_amount: parseFloat(user.per_diem_amount) || 0,
  };
}

/**
 * Normalize array of items safely
 */
export function safeNormalizeArray(array, normalizeFn) {
  if (!Array.isArray(array)) return [];
  return array.map(item => normalizeFn(item)).filter(Boolean);
}