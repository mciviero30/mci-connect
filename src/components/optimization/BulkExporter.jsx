import { base44 } from '@/api/base44Client';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

/**
 * Optimized Bulk Export Engine
 * Handles large datasets efficiently with chunking and progress tracking
 */

// Export invoices in batches
export async function exportInvoicesBulk(filters = {}, onProgress) {
  const batchSize = 100;
  let allInvoices = [];
  let offset = 0;
  let hasMore = true;

  try {
    onProgress?.(0, 'Fetching invoices...');

    // Fetch all data in batches
    while (hasMore) {
      const batch = await base44.entities.Invoice.filter(
        filters,
        '-invoice_date',
        batchSize
      );

      if (batch.length === 0) break;
      
      allInvoices = [...allInvoices, ...batch];
      offset += batchSize;
      hasMore = batch.length === batchSize;

      onProgress?.(allInvoices.length, `Loaded ${allInvoices.length} invoices...`);
    }

    onProgress?.(allInvoices.length, 'Generating Excel...');

    // Generate Excel workbook
    const ws = XLSX.utils.json_to_sheet(allInvoices.map(inv => ({
      'Invoice #': inv.invoice_number || '',
      'Customer': inv.customer_name || '',
      'Job': inv.job_name || '',
      'Date': inv.invoice_date || '',
      'Due Date': inv.due_date || '',
      'Status': inv.status || '',
      'Subtotal': inv.subtotal || 0,
      'Tax': inv.tax_amount || 0,
      'Total': inv.total || 0,
      'Paid': inv.amount_paid || 0,
      'Balance': inv.balance || 0,
      'Payment Date': inv.payment_date || '',
      'Notes': inv.notes || '',
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

    // Auto-size columns
    const maxWidth = 50;
    const wscols = [
      { wch: 15 }, // Invoice #
      { wch: 25 }, // Customer
      { wch: 25 }, // Job
      { wch: 12 }, // Date
      { wch: 12 }, // Due Date
      { wch: 10 }, // Status
      { wch: 12 }, // Subtotal
      { wch: 10 }, // Tax
      { wch: 12 }, // Total
      { wch: 12 }, // Paid
      { wch: 12 }, // Balance
      { wch: 12 }, // Payment Date
      { wch: maxWidth }, // Notes
    ];
    ws['!cols'] = wscols;

    // Download file
    XLSX.writeFile(wb, `MCI_Invoices_${new Date().toISOString().split('T')[0]}.xlsx`);

    onProgress?.(allInvoices.length, 'Complete!');
    toast.success(`Exported ${allInvoices.length} invoices successfully`);

    return allInvoices.length;
  } catch (error) {
    console.error('Bulk export failed:', error);
    toast.error('Export failed: ' + error.message);
    throw error;
  }
}

// Export quotes in batches
export async function exportQuotesBulk(filters = {}, onProgress) {
  const batchSize = 100;
  let allQuotes = [];
  let hasMore = true;

  try {
    onProgress?.(0, 'Fetching quotes...');

    while (hasMore) {
      const batch = await base44.entities.Quote.filter(
        filters,
        '-quote_date',
        batchSize
      );

      if (batch.length === 0) break;
      
      allQuotes = [...allQuotes, ...batch];
      hasMore = batch.length === batchSize;

      onProgress?.(allQuotes.length, `Loaded ${allQuotes.length} quotes...`);
    }

    onProgress?.(allQuotes.length, 'Generating Excel...');

    const ws = XLSX.utils.json_to_sheet(allQuotes.map(q => ({
      'Quote #': q.quote_number || '',
      'Customer': q.customer_name || '',
      'Job': q.job_name || '',
      'Date': q.quote_date || '',
      'Valid Until': q.valid_until || '',
      'Status': q.status || '',
      'Subtotal': q.subtotal || 0,
      'Tax': q.tax_amount || 0,
      'Total': q.total || 0,
      'Estimated Hours': q.estimated_hours || 0,
      'Estimated Cost': q.estimated_cost || 0,
      'Profit Margin': q.profit_margin || 0,
      'Assigned To': q.assigned_to_name || '',
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quotes');

    const wscols = [
      { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `MCI_Quotes_${new Date().toISOString().split('T')[0]}.xlsx`);

    onProgress?.(allQuotes.length, 'Complete!');
    toast.success(`Exported ${allQuotes.length} quotes successfully`);

    return allQuotes.length;
  } catch (error) {
    console.error('Bulk export failed:', error);
    toast.error('Export failed: ' + error.message);
    throw error;
  }
}

// Export time entries in batches
export async function exportTimeEntriesBulk(filters = {}, onProgress) {
  const batchSize = 200;
  let allEntries = [];
  let hasMore = true;

  try {
    onProgress?.(0, 'Fetching time entries...');

    while (hasMore) {
      const batch = await base44.entities.TimeEntry.filter(
        filters,
        '-date',
        batchSize
      );

      if (batch.length === 0) break;
      
      allEntries = [...allEntries, ...batch];
      hasMore = batch.length === batchSize;

      onProgress?.(allEntries.length, `Loaded ${allEntries.length} entries...`);
    }

    onProgress?.(allEntries.length, 'Generating Excel...');

    const ws = XLSX.utils.json_to_sheet(allEntries.map(entry => ({
      'Employee': entry.employee_name || '',
      'Job': entry.job_name || '',
      'Date': entry.date || '',
      'Check In': entry.check_in || '',
      'Check Out': entry.check_out || '',
      'Hours': entry.hours_worked || 0,
      'Type': entry.hour_type || 'normal',
      'Status': entry.status || '',
      'Task Details': entry.task_details || '',
      'Notes': entry.notes || '',
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Time Entries');

    const wscols = [
      { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 10 },
      { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
      { wch: 40 }, { wch: 40 },
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `MCI_TimeEntries_${new Date().toISOString().split('T')[0]}.xlsx`);

    onProgress?.(allEntries.length, 'Complete!');
    toast.success(`Exported ${allEntries.length} time entries successfully`);

    return allEntries.length;
  } catch (error) {
    console.error('Bulk export failed:', error);
    toast.error('Export failed: ' + error.message);
    throw error;
  }
}