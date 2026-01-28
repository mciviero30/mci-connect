import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { job_id, start_date, end_date } = await req.json();

    if (!job_id || !start_date || !end_date) {
      return Response.json({ error: 'Missing required fields: job_id, start_date, end_date' }, { status: 400 });
    }

    // 1. Fetch Job
    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    if (jobs.length === 0) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }
    const job = jobs[0];

    if (!job.authorization_id) {
      return Response.json({ error: 'Job has no WorkAuthorization' }, { status: 400 });
    }

    // 2. Fetch WorkAuthorization
    const auths = await base44.asServiceRole.entities.WorkAuthorization.filter({ id: job.authorization_id });
    if (auths.length === 0) {
      return Response.json({ error: 'WorkAuthorization not found' }, { status: 404 });
    }
    const auth = auths[0];

    // 3. ELIGIBILITY CHECK: Must be T&M authorization
    if (auth.authorization_type !== 'time_materials') {
      return Response.json({ 
        error: 'T&M invoicing not allowed: Authorization type is not time_materials',
        authorization_type: auth.authorization_type
      }, { status: 400 });
    }

    // 4. Fetch unbilled TimeEntries
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.filter({ job_id });
    const unbilledTimeEntries = allTimeEntries.filter(entry => 
      !entry.billed_at &&
      entry.billable !== false &&
      entry.date >= start_date &&
      entry.date <= end_date &&
      entry.status === 'approved'
    );

    // 5. Fetch unbilled Expenses
    const allExpenses = await base44.asServiceRole.entities.Expense.filter({ job_id });
    const unbilledExpenses = allExpenses.filter(expense =>
      !expense.billed_at &&
      expense.billable === true &&
      expense.date >= start_date &&
      expense.date <= end_date &&
      expense.status === 'approved'
    );

    if (unbilledTimeEntries.length === 0 && unbilledExpenses.length === 0) {
      return Response.json({ error: 'No unbilled time or expenses in date range' }, { status: 400 });
    }

    // 6. Calculate totals
    let laborTotal = 0;
    let totalHours = 0;
    const laborItems = [];

    for (const entry of unbilledTimeEntries) {
      const hours = entry.hours_worked || 0;
      const rate = entry.rate_snapshot || job.regular_hourly_rate || 60;
      const lineCost = hours * rate;
      
      totalHours += hours;
      laborTotal += lineCost;

      laborItems.push({
        item_name: `Labor - ${entry.employee_name}`,
        description: `${entry.date} - ${hours}hrs @ $${rate}/hr`,
        quantity: hours,
        unit: 'hours',
        unit_price: rate,
        total: lineCost,
        account_category: 'revenue_service'
      });
    }

    let expensesTotal = 0;
    let expensesWithMarkup = 0;
    const expenseItems = [];

    for (const expense of unbilledExpenses) {
      const amount = expense.amount || 0;
      const markup = expense.markup || 0;
      const markedUpAmount = amount * (1 + markup / 100);
      
      expensesTotal += amount;
      expensesWithMarkup += markedUpAmount;

      expenseItems.push({
        item_name: `Expense - ${expense.category}`,
        description: expense.description || expense.category,
        quantity: 1,
        unit: 'item',
        unit_price: markedUpAmount,
        total: markedUpAmount,
        account_category: 'revenue_materials'
      });
    }

    const subtotal = laborTotal + expensesWithMarkup;
    const tax_rate = 0; // T&M invoices typically don't have tax, or configure as needed
    const tax_amount = subtotal * tax_rate;
    const total = subtotal + tax_amount;

    // 7. Generate invoice number
    const invoiceNumber = await base44.asServiceRole.functions.invoke('generateInvoiceNumber', {});

    // 8. Create Invoice
    const invoiceData = {
      invoice_number: invoiceNumber.invoice_number,
      customer_id: job.customer_id,
      customer_name: job.customer_name,
      job_id: job.id,
      job_name: job.name,
      job_address: job.address,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [...laborItems, ...expenseItems],
      subtotal,
      tax_rate,
      tax_amount,
      total,
      balance: total,
      billing_type: 'time_materials',
      time_entries_summary: {
        total_hours: totalHours,
        total_labor_cost: laborTotal
      },
      expenses_summary: {
        total_expenses: expensesTotal,
        total_with_markup: expensesWithMarkup
      },
      billed_time_entry_ids: unbilledTimeEntries.map(e => e.id),
      notes: `T&M Invoice for period ${start_date} to ${end_date}`,
      created_by_user_id: user.id
    };

    const invoice = await base44.asServiceRole.entities.Invoice.create(invoiceData);

    // 9. Mark TimeEntries as billed (LOCK)
    const now = new Date().toISOString();
    for (const entry of unbilledTimeEntries) {
      await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
        billed_at: now,
        invoice_id: invoice.id
      });
    }

    // 10. Mark Expenses as billed (LOCK)
    for (const expense of unbilledExpenses) {
      await base44.asServiceRole.entities.Expense.update(expense.id, {
        billed_at: now,
        invoice_id: invoice.id
      });
    }

    return Response.json({
      success: true,
      invoice,
      summary: {
        time_entries: unbilledTimeEntries.length,
        expenses: unbilledExpenses.length,
        total_hours: totalHours,
        labor_total: laborTotal,
        expenses_total: expensesWithMarkup,
        invoice_total: total
      }
    });

  } catch (error) {
    console.error('[createTMInvoice] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});