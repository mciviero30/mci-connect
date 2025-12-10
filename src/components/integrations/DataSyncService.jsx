/**
 * Data Sync Service
 * Synchronize entities between MCI Connect and external Base44 apps
 */

import { base44 } from '@/api/base44Client';
import { getExternalAppClient } from './CrossAppClient';

export class DataSyncService {
  /**
   * Sync customer to external app
   */
  static async syncCustomerToExternalApp(customerId, externalAppNumber = 1) {
    try {
      const customer = await base44.entities.Customer.get(customerId);
      const externalClient = getExternalAppClient(externalAppNumber);

      // Check if customer already exists in external app
      const existingCustomers = await externalClient.filterEntities('Customer', {
        email: customer.email
      });

      if (existingCustomers.length > 0) {
        // Update existing customer
        return await externalClient.updateEntity(
          'Customer',
          existingCustomers[0].id,
          customer
        );
      } else {
        // Create new customer
        return await externalClient.createEntity('Customer', customer);
      }
    } catch (error) {
      console.error('Failed to sync customer:', error);
      throw error;
    }
  }

  /**
   * Sync job to external app
   */
  static async syncJobToExternalApp(jobId, externalAppNumber = 1) {
    try {
      const job = await base44.entities.Job.get(jobId);
      const externalClient = getExternalAppClient(externalAppNumber);

      // Check if job already exists
      const existingJobs = await externalClient.filterEntities('Job', {
        name: job.name,
        customer_id: job.customer_id
      });

      if (existingJobs.length > 0) {
        return await externalClient.updateEntity(
          'Job',
          existingJobs[0].id,
          job
        );
      } else {
        return await externalClient.createEntity('Job', job);
      }
    } catch (error) {
      console.error('Failed to sync job:', error);
      throw error;
    }
  }

  /**
   * Sync invoice to external app
   */
  static async syncInvoiceToExternalApp(invoiceId, externalAppNumber = 1) {
    try {
      const invoice = await base44.entities.Invoice.get(invoiceId);
      const externalClient = getExternalAppClient(externalAppNumber);

      // Always create new invoice (invoices are immutable references)
      return await externalClient.createEntity('Invoice', {
        ...invoice,
        source_app: 'MCI_Connect',
        source_invoice_id: invoice.id,
        synced_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to sync invoice:', error);
      throw error;
    }
  }

  /**
   * Fetch customers from external app
   */
  static async fetchCustomersFromExternalApp(externalAppNumber = 1) {
    try {
      const externalClient = getExternalAppClient(externalAppNumber);
      return await externalClient.listEntities('Customer', 100);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      throw error;
    }
  }

  /**
   * Fetch jobs from external app
   */
  static async fetchJobsFromExternalApp(externalAppNumber = 1) {
    try {
      const externalClient = getExternalAppClient(externalAppNumber);
      return await externalClient.listEntities('Job', 100);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      throw error;
    }
  }

  /**
   * Bulk sync multiple entities
   */
  static async bulkSyncToExternalApp(entityType, entityIds, externalAppNumber = 1) {
    const results = {
      success: [],
      failed: []
    };

    for (const entityId of entityIds) {
      try {
        let result;
        if (entityType === 'Customer') {
          result = await this.syncCustomerToExternalApp(entityId, externalAppNumber);
        } else if (entityType === 'Job') {
          result = await this.syncJobToExternalApp(entityId, externalAppNumber);
        } else if (entityType === 'Invoice') {
          result = await this.syncInvoiceToExternalApp(entityId, externalAppNumber);
        }
        results.success.push({ entityId, result });
      } catch (error) {
        results.failed.push({ entityId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Two-way sync: Import entity from external app
   */
  static async importEntityFromExternalApp(entityType, externalEntityId, externalAppNumber = 1) {
    try {
      const externalClient = getExternalAppClient(externalAppNumber);
      const entity = await externalClient.getEntity(entityType, externalEntityId);

      // Remove external app metadata before importing
      delete entity.id;
      delete entity.created_date;
      delete entity.updated_date;
      delete entity.created_by;

      // Add import metadata
      entity.imported_from = `external_app_${externalAppNumber}`;
      entity.imported_at = new Date().toISOString();
      entity.external_id = externalEntityId;

      // Create in MCI Connect
      return await base44.entities[entityType].create(entity);
    } catch (error) {
      console.error('Failed to import entity:', error);
      throw error;
    }
  }
}

export default DataSyncService;