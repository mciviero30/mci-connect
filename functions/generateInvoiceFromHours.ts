import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { job_id } = await req.json();

    if (!job_id) {
      return Response.json({ error: 'job_id is required' }, { status: 400 });
    }

    // Get job details
    const job = await base44.asServiceRole.entities.Job.filter({ id: job_id }).then(r => r[0]);
    
    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get all invoices for this job to find already billed time entries
    const existingInvoices = await base44.asServiceRole.entities.Invoice.filter({
      job_id: job_id
    });

    // Extract all time entry IDs that have been billed
    const billedTimeEntryIds = new Set();
    existingInvoices.forEach(invoice => {
      if (invoice.billed_time_entry_ids) {
        invoice.billed_time_entry_ids.forEach(id => billedTimeEntryIds.add(id));
      }
    });

    // Get all approved time entries for this job
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.filter({
      job_id: job_id,
      status: 'approved'
    });

    // Filter out already billed entries
    const timeEntries = allTimeEntries.filter(entry => !billedTimeEntryIds.has(entry.id));

    if (timeEntries.length === 0) {
      return Response.json({ 
        error: 'No unbilled approved time entries found for this job',
        details: billedTimeEntryIds.size > 0 
          ? 'All approved hours have already been invoiced. Create new time entries for additional work.'
          : 'Make sure time entries are approved before generating invoice'
      }, { status: 400 });
    }

    // Get approved expenses for this job
    const expenses = await base44.asServiceRole.entities.Expense.filter({
      job_id: job_id,
      status: 'approved'
    });

    // Group time entries by employee and hour type
    const timeByEmployee = {};
    
    timeEntries.forEach(entry => {
      const key = `${entry.employee_name}`;
      if (!timeByEmployee[key]) {
        timeByEmployee[key] = {
          employee_name: entry.employee_name,
          regular_hours: 0,
          overtime_hours: 0
        };
      }
      
      if (entry.hour_type === 'overtime') {
        timeByEmployee[key].overtime_hours += entry.hours_worked || 0;
      } else {
        timeByEmployee[key].regular_hours += entry.hours_worked || 0;
      }
    });

    // Get rates from job or use defaults
    const regularRate = job.regular_hourly_rate || 60;
    const overtimeRate = job.overtime_hourly_rate || 90;

    // Build invoice items
    const items = [];

    // Add labor items
    Object.values(timeByEmployee).forEach(({ employee_name, regular_hours, overtime_hours }) => {
      if (regular_hours > 0) {
        items.push({
          item_name: `Labor - ${employee_name}`,
          description: `Regular hours worked by ${employee_name}`,
          quantity: parseFloat(regular_hours.toFixed(2)),
          unit: 'hrs',
          unit_price: regularRate,
          total: parseFloat((regular_hours * regularRate).toFixed(2)),
          account_category: 'revenue_service'
        });
      }

      if (overtime_hours > 0) {
        items.push({
          item_name: `Labor - ${employee_name} (OT)`,
          description: `Overtime hours worked by ${employee_name}`,
          quantity: parseFloat(overtime_hours.toFixed(2)),
          unit: 'hrs',
          unit_price: overtimeRate,
          total: parseFloat((overtime_hours * overtimeRate).toFixed(2)),
          account_category: 'revenue_service'
        });
      }
    });

    // Add materials/expenses
    expenses.forEach(expense => {
      items.push({
        item_name: expense.category === 'supplies' ? 'Materials' : expense.category,
        description: expense.description || `${expense.category} expense`,
        quantity: 1,
        unit: 'ea',
        unit_price: expense.amount,
        total: expense.amount,
        account_category: 'revenue_materials'
      });
    });

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax_rate = 0; // Can be set manually later
    const tax_amount = 0;
    const total = subtotal + tax_amount;

    // Prepare invoice data
    const billedEntryIds = timeEntries.map(e => e.id);
    
    const invoiceData = {
      customer_id: job.customer_id || '',
      customer_name: job.customer_name || '',
      customer_email: '',
      customer_phone: '',
      job_name: job.name,
      job_id: job.id,
      job_address: job.address || '',
      team_id: job.team_id || '',
      team_name: job.team_name || '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: items,
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax_rate: tax_rate,
      tax_amount: parseFloat(tax_amount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      notes: `Time & Materials invoice for ${job.name}. Based on ${timeEntries.length} approved time entries.`,
      terms: '• Payment: Due 30 days from invoice date (unless otherwise specified).\n• Late Fee: 1.5% monthly interest on overdue balance.\n• Collection: Client responsible for all collection costs including attorney fees.\n• Disputes: Report discrepancies within 5 days in writing. Undisputed amounts due by due date.\n• Scope: Final cost includes all approved time and materials.',
      status: 'draft',
      billed_time_entry_ids: billedEntryIds
    };

    // Summary for response
    const summary = {
      total_hours: Object.values(timeByEmployee).reduce((sum, emp) => 
        sum + emp.regular_hours + emp.overtime_hours, 0
      ),
      total_regular_hours: Object.values(timeByEmployee).reduce((sum, emp) => 
        sum + emp.regular_hours, 0
      ),
      total_overtime_hours: Object.values(timeByEmployee).reduce((sum, emp) => 
        sum + emp.overtime_hours, 0
      ),
      employees_count: Object.keys(timeByEmployee).length,
      time_entries_count: timeEntries.length,
      expenses_count: expenses.length,
      labor_cost: items.filter(i => i.account_category === 'revenue_service')
        .reduce((sum, i) => sum + i.total, 0),
      materials_cost: items.filter(i => i.account_category === 'revenue_materials')
        .reduce((sum, i) => sum + i.total, 0)
    };

    return Response.json({
      success: true,
      invoice_data: invoiceData,
      summary: summary
    });

  } catch (error) {
    console.error('❌ Error generating invoice from hours:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate invoice from hours',
      details: error.toString()
    }, { status: 500 });
  }
});