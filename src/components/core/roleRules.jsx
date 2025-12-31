/**
 * ROLE-BASED PERMISSIONS SYSTEM
 * Central source of truth for approval workflow rules
 */

/**
 * Check if user can create financial documents (quotes, invoices, jobs)
 * @param {object} user - Current user object
 * @returns {boolean} - True if user can create
 */
export function canCreateFinancialDocs(user) {
  const pos = (user?.position || '').toLowerCase();
  const role = (user?.role || '').toLowerCase();
  return role === 'admin' || pos === 'ceo' || pos === 'administrator' || pos === 'manager';
}

/**
 * Check if user's creations need approval
 * @param {object} user - Current user object
 * @returns {boolean} - True if needs approval (manager without admin role)
 */
export function needsApproval(user) {
  const pos = (user?.position || '').toLowerCase();
  const role = (user?.role || '').toLowerCase();
  return pos === 'manager' && role !== 'admin';
}

/**
 * Check if user can approve/reject documents
 * @param {object} user - Current user object
 * @returns {boolean} - True if can approve (CEO, Admin, Administrator)
 */
export function canApprove(user) {
  const pos = (user?.position || '').toLowerCase();
  const role = (user?.role || '').toLowerCase();
  return role === 'admin' || pos === 'ceo' || pos === 'administrator';
}

/**
 * Get effective approval status (handles legacy records)
 * @param {object} document - Quote, Invoice, or Job
 * @returns {string} - 'approved', 'pending_approval', or 'rejected'
 */
export function getEffectiveApprovalStatus(document) {
  // Legacy: missing approval_status treated as approved
  if (!document?.approval_status) return 'approved';
  return document.approval_status;
}

/**
 * Check if document can be sent (approved and not rejected)
 * @param {object} document - Quote or Invoice
 * @returns {boolean} - True if can send
 */
export function canSendDocument(document) {
  const status = getEffectiveApprovalStatus(document);
  return status === 'approved';
}

/**
 * Check if document can trigger provisioning
 * @param {object} document - Invoice
 * @returns {boolean} - True if can provision
 */
export function canProvisionDocument(document) {
  const status = getEffectiveApprovalStatus(document);
  return status === 'approved';
}