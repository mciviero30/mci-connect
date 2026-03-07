import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { type, start_date, end_date } = await req.json();

    if (type === 'invoices') {
      // Export invoices to QuickBooks format
      const invoices = await base44.asServiceRole.entities.Invoice.filter({
        invoice_date: start_date ? { $gte: start_date } : undefined,
        deleted_at: null
      });

      const qboInvoices = invoices.map(inv => ({
        'Invoice No.': inv.invoice_number,
        'Customer': inv.customer_name,
        'Email': inv.customer_email,
        'Invoice Date': inv.invoice_date,
        'Due Date': inv.due_date,
        'Terms': inv.payment_terms || 'Net 30',
        'Item(Description)': inv.items?.map(i => i.item_name).join('; ') || '',
        'Quantity': inv.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0,
        'Rate': '',
        'Amount': inv.subtotal,
        'Tax': inv.tax_amount,
        'Total': inv.total,
        'Balance Due': inv.balance,
        'Status': inv.status,
        'Memo': inv.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(qboInvoices);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=QuickBooks_Invoices_${new Date().toISOString().split('T')[0]}.xlsx`
        }
      });
    }

    if (type === 'customers') {
      // Export customers
      const customers = await base44.asServiceRole.entities.Customer.list('name');

      const qboCustomers = customers.map(c => ({
        'Customer Name': c.name,
        'Company Name': c.company || c.name,
        'First Name': c.first_name || '',
        'Last Name': c.last_name || '',
        'Email': c.email,
        'Phone': c.phone,
        'Mobile': c.mobile || '',
        'Billing Address': c.billing_address || c.address || '',
        'Billing City': c.billing_city || c.city || '',
        'Billing State': c.billing_state || c.state || '',
        'Billing ZIP': c.billing_zip || c.zip || '',
        'Shipping Address': c.shipping_address || '',
        'Shipping City': c.shipping_city || '',
        'Shipping State': c.shipping_state || '',
        'Shipping ZIP': c.shipping_zip || '',
        'Payment Terms': c.payment_terms || 'Net 30',
        'Tax ID': c.company_tax_id || '',
        'Status': c.status
      }));

      const ws = XLSX.utils.json_to_sheet(qboCustomers);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=QuickBooks_Customers_${new Date().toISOString().split('T')[0]}.xlsx`
        }
      });
    }

    if (type === 'expenses') {
      // Export expenses
      const expenses = await base44.asServiceRole.entities.Expense.filter({
        date: start_date ? { $gte: start_date } : undefined,
        status: 'approved'
      });

      const qboExpenses = expenses.map(exp => ({
        'Date': exp.date,
        'Account': exp.account_category || exp.category,
        'Vendor/Payee': exp.employee_name,
        'Description': exp.description,
        'Category': exp.category,
        'Amount': exp.amount,
        'Payment Method': exp.payment_method,
        'Job': exp.job_name || '',
        'Receipt': exp.receipt_url || '',
        'Notes': exp.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(qboExpenses);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=QuickBooks_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`
        }
      });
    }

    if (type === 'all') {
      // Export everything in one workbook
      const [invoices, customers, expenses] = await Promise.all([
        base44.asServiceRole.entities.Invoice.filter({ deleted_at: null }),
        base44.asServiceRole.entities.Customer.list('name'),
        base44.asServiceRole.entities.Expense.filter({ status: 'approved' })
      ]);

      const wb = XLSX.utils.book_new();

      // Invoices sheet
      const qboInvoices = invoices.map(inv => ({
        'Invoice No.': inv.invoice_number,
        'Customer': inv.customer_name,
        'Email': inv.customer_email,
        'Invoice Date': inv.invoice_date,
        'Due Date': inv.due_date,
        'Terms': inv.payment_terms || 'Net 30',
        'Amount': inv.subtotal,
        'Tax': inv.tax_amount,
        'Total': inv.total,
        'Balance Due': inv.balance,
        'Status': inv.status
      }));
      const wsInv = XLSX.utils.json_to_sheet(qboInvoices);
      XLSX.utils.book_append_sheet(wb, wsInv, 'Invoices');

      // Customers sheet
      const qboCustomers = customers.map(c => ({
        'Customer Name': c.name,
        'Company': c.company || c.name,
        'Email': c.email,
        'Phone': c.phone,
        'Address': c.billing_address || c.address || '',
        'City': c.billing_city || c.city || '',
        'State': c.billing_state || c.state || '',
        'ZIP': c.billing_zip || c.zip || '',
        'Payment Terms': c.payment_terms || 'Net 30'
      }));
      const wsCust = XLSX.utils.json_to_sheet(qboCustomers);
      XLSX.utils.book_append_sheet(wb, wsCust, 'Customers');

      // Expenses sheet
      const qboExpenses = expenses.map(exp => ({
        'Date': exp.date,
        'Account': exp.account_category || exp.category,
        'Vendor': exp.employee_name,
        'Description': exp.description,
        'Amount': exp.amount,
        'Payment Method': exp.payment_method,
        'Job': exp.job_name || ''
      }));
      const wsExp = XLSX.utils.json_to_sheet(qboExpenses);
      XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=QuickBooks_Export_${new Date().toISOString().split('T')[0]}.xlsx`
        }
      });
    }

    return Response.json({ error: 'Invalid export type' }, { status: 400 });

  } catch (error) {
    console.error('QuickBooks export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});