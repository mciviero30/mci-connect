/**
 * Cross-App Actions
 * Trigger actions and workflows across Base44 apps
 */

import { base44 } from '@/api/base44Client';
import { getExternalAppClient } from './CrossAppClient';

export class CrossAppActions {
  /**
   * Create invoice in external app from MCI Connect quote
   */
  static async createExternalInvoiceFromQuote(quoteId, externalAppNumber = 1) {
    try {
      const quote = await base44.entities.Quote.get(quoteId);
      const externalClient = getExternalAppClient(externalAppNumber);

      // Fetch next invoice number from external app
      const existingInvoices = await externalClient.listEntities('Invoice', 10);
      const invoiceNumbers = existingInvoices
        .map(inv => inv.invoice_number)
        .filter(n => n?.startsWith('INV-'))
        .map(n => parseInt(n.replace('INV-', '')))
        .filter(n => !isNaN(n));

      const nextNumber = invoiceNumbers.length > 0 ? Math.max(...invoiceNumbers) + 1 : 1;
      const invoice_number = `INV-${String(nextNumber).padStart(5, '0')}`;

      // Create invoice in external app
      const invoiceData = {
        invoice_number,
        source_quote_id: quote.id,
        source_app: 'MCI_Connect',
        customer_name: quote.customer_name,
        customer_email: quote.customer_email,
        customer_phone: quote.customer_phone,
        job_name: quote.job_name,
        job_address: quote.job_address,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: quote.items,
        subtotal: quote.subtotal,
        tax_rate: quote.tax_rate,
        tax_amount: quote.tax_amount,
        total: quote.total,
        amount_paid: 0,
        balance: quote.total,
        notes: quote.notes,
        terms: quote.terms,
        status: 'draft'
      };

      const newInvoice = await externalClient.createEntity('Invoice', invoiceData);

      // Update quote status in MCI Connect
      await base44.entities.Quote.update(quoteId, {
        status: 'converted_to_invoice',
        external_invoice_id: newInvoice.id,
        external_app: externalAppNumber
      });

      return newInvoice;
    } catch (error) {
      console.error('Failed to create external invoice:', error);
      throw error;
    }
  }

  /**
   * Create job in external app from MCI Connect
   */
  static async createExternalJob(jobData, externalAppNumber = 1) {
    try {
      const externalClient = getExternalAppClient(externalAppNumber);
      
      const newJob = await externalClient.createEntity('Job', {
        ...jobData,
        source_app: 'MCI_Connect',
        created_from_mci: true,
        synced_at: new Date().toISOString()
      });

      return newJob;
    } catch (error) {
      console.error('Failed to create external job:', error);
      throw error;
    }
  }

  /**
   * Update customer across all connected apps
   */
  static async updateCustomerEverywhere(customerId) {
    try {
      const customer = await base44.entities.Customer.get(customerId);
      const results = [];

      // Update in external app 1 if configured
      try {
        const client1 = getExternalAppClient(1);
        const existing1 = await client1.filterEntities('Customer', { email: customer.email });
        if (existing1.length > 0) {
          const result1 = await client1.updateEntity('Customer', existing1[0].id, customer);
          results.push({ app: 1, success: true, result: result1 });
        }
      } catch (error) {
        results.push({ app: 1, success: false, error: error.message });
      }

      // Update in external app 2 if configured
      try {
        const client2 = getExternalAppClient(2);
        const existing2 = await client2.filterEntities('Customer', { email: customer.email });
        if (existing2.length > 0) {
          const result2 = await client2.updateEntity('Customer', existing2[0].id, customer);
          results.push({ app: 2, success: true, result: result2 });
        }
      } catch (error) {
        results.push({ app: 2, success: false, error: error.message });
      }

      return results;
    } catch (error) {
      console.error('Failed to update customer everywhere:', error);
      throw error;
    }
  }

  /**
   * Send notification to external app
   */
  static async sendNotificationToExternalApp(notificationData, externalAppNumber = 1) {
    try {
      const externalClient = getExternalAppClient(externalAppNumber);
      
      return await externalClient.createEntity('Notification', {
        ...notificationData,
        source_app: 'MCI_Connect',
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  /**
   * Execute integration in external app (e.g., send email, generate PDF)
   */
  static async executeExternalIntegration(integrationPackage, integrationName, params, externalAppNumber = 1) {
    try {
      const externalClient = getExternalAppClient(externalAppNumber);
      
      return await externalClient.executeIntegration(
        integrationPackage,
        integrationName,
        params
      );
    } catch (error) {
      console.error('Failed to execute external integration:', error);
      throw error;
    }
  }

  /**
   * Trigger workflow in external app
   */
  static async triggerExternalWorkflow(workflowName, workflowData, externalAppNumber = 1) {
    try {
      const externalClient = getExternalAppClient(externalAppNumber);
      
      return await externalClient.createEntity('WorkflowExecution', {
        workflow_name: workflowName,
        data: workflowData,
        triggered_by: 'MCI_Connect',
        triggered_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      throw error;
    }
  }
}

export default CrossAppActions;