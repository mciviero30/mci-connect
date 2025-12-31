import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin, safeJsonError } from './_auth.js';

/**
 * ADMIN-ONLY: Initialize counters from existing data
 * Run this ONCE to migrate from old number generation system
 * Safe to run multiple times (idempotent)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAdmin(base44);

    const results = {};

    // ========================================
    // INVOICE COUNTER INITIALIZATION
    // ========================================
    
    // Check if invoice counter exists
    const invoiceCounters = await base44.asServiceRole.entities.Counter.filter({ 
      counter_key: 'invoice_number' 
    });

    if (invoiceCounters.length === 0) {
      // Find max invoice number from existing invoices
      const invoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 2000);
      
      const existingNumbers = invoices
        .map(inv => inv.invoice_number)
        .filter(num => num && num.startsWith('INV-'))
        .map(num => parseInt(num.replace('INV-', '')))
        .filter(num => !isNaN(num));

      const maxInvoiceNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;

      // Create counter starting from max existing number
      await base44.asServiceRole.entities.Counter.create({
        counter_key: 'invoice_number',
        current_value: maxInvoiceNumber,
        last_increment_date: new Date().toISOString()
      });

      results.invoice_counter = {
        status: 'created',
        initialized_at: maxInvoiceNumber,
        existing_invoices: invoices.length
      };
    } else {
      results.invoice_counter = {
        status: 'already_exists',
        current_value: invoiceCounters[0].current_value
      };
    }

    // ========================================
    // QUOTE COUNTER INITIALIZATION
    // ========================================
    
    const quoteCounters = await base44.asServiceRole.entities.Counter.filter({ 
      counter_key: 'quote_number' 
    });

    if (quoteCounters.length === 0) {
      // Find max quote number from existing quotes
      const quotes = await base44.asServiceRole.entities.Quote.list('-created_date', 2000);
      
      const existingNumbers = quotes
        .map(q => q.quote_number)
        .filter(num => num && num.startsWith('EST-'))
        .map(num => parseInt(num.replace('EST-', '')))
        .filter(num => !isNaN(num));

      const maxQuoteNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;

      // Create counter starting from max existing number
      await base44.asServiceRole.entities.Counter.create({
        counter_key: 'quote_number',
        current_value: maxQuoteNumber,
        last_increment_date: new Date().toISOString()
      });

      results.quote_counter = {
        status: 'created',
        initialized_at: maxQuoteNumber,
        existing_quotes: quotes.length
      };
    } else {
      results.quote_counter = {
        status: 'already_exists',
        current_value: quoteCounters[0].current_value
      };
    }

    // ========================================
    // VERIFICATION
    // ========================================
    
    // Verify counters are working
    const allCounters = await base44.asServiceRole.entities.Counter.list();
    
    return Response.json({
      success: true,
      message: 'Counters initialized successfully',
      results,
      all_counters: allCounters.map(c => ({
        key: c.counter_key,
        value: c.current_value,
        last_updated: c.last_increment_date
      }))
    });

  } catch (error) {
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('❌ Error initializing counters:', error);
    }
    return safeJsonError('Initialization failed', 500, error.message);
  }
});