import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const auditResults = {
      timestamp: new Date().toISOString(),
      sections: {}
    };

    // 1. DATA INTEGRITY AUDIT
    console.log('🔍 Starting Data Integrity Audit...');
    const dataIntegrity = {
      quotes: {},
      invoices: {},
      jobs: {},
      customers: {},
      employees: {},
      timeEntries: {},
      expenses: {}
    };

    // Check Quotes
    const quotes = await base44.asServiceRole.entities.Quote.filter({}, '', 1000);
    dataIntegrity.quotes.total = quotes.length;
    dataIntegrity.quotes.withoutNumber = quotes.filter(q => !q.quote_number).length;
    dataIntegrity.quotes.withoutCustomer = quotes.filter(q => !q.customer_name && !q.customer_id).length;
    dataIntegrity.quotes.withoutItems = quotes.filter(q => !q.items || q.items.length === 0).length;
    dataIntegrity.quotes.invalidTotals = quotes.filter(q => {
      if (!q.items || q.items.length === 0) return false;
      const calculatedSubtotal = q.items.reduce((sum, item) => sum + (item.total || 0), 0);
      return Math.abs(calculatedSubtotal - (q.subtotal || 0)) > 0.01;
    }).length;
    dataIntegrity.quotes.deletedCount = quotes.filter(q => q.deleted_at).length;
    dataIntegrity.quotes.duplicateNumbers = findDuplicates(quotes.map(q => q.quote_number).filter(Boolean));

    // Check Invoices
    const invoices = await base44.asServiceRole.entities.Invoice.filter({}, '', 1000);
    dataIntegrity.invoices.total = invoices.length;
    dataIntegrity.invoices.withoutNumber = invoices.filter(i => !i.invoice_number).length;
    dataIntegrity.invoices.withoutCustomer = invoices.filter(i => !i.customer_name && !i.customer_id).length;
    dataIntegrity.invoices.withoutItems = invoices.filter(i => !i.items || i.items.length === 0).length;
    dataIntegrity.invoices.invalidTotals = invoices.filter(i => {
      if (!i.items || i.items.length === 0) return false;
      const calculatedSubtotal = i.items.reduce((sum, item) => sum + (item.total || 0), 0);
      return Math.abs(calculatedSubtotal - (i.subtotal || 0)) > 0.01;
    }).length;
    dataIntegrity.invoices.deletedCount = invoices.filter(i => i.deleted_at).length;
    dataIntegrity.invoices.duplicateNumbers = findDuplicates(invoices.map(i => i.invoice_number).filter(Boolean));

    // Check Jobs
    const jobs = await base44.asServiceRole.entities.Job.filter({}, '', 1000);
    dataIntegrity.jobs.total = jobs.length;
    dataIntegrity.jobs.withoutNumber = jobs.filter(j => !j.job_number).length;
    dataIntegrity.jobs.withoutAuthorization = jobs.filter(j => !j.authorization_id).length;
    dataIntegrity.jobs.withoutCustomer = jobs.filter(j => !j.customer_name && !j.customer_id).length;
    dataIntegrity.jobs.withoutAddress = jobs.filter(j => !j.address && !j.latitude).length;
    dataIntegrity.jobs.deletedCount = jobs.filter(j => j.deleted_at).length;
    dataIntegrity.jobs.duplicateNumbers = findDuplicates(jobs.map(j => j.job_number).filter(Boolean));

    // Check Customers
    const customers = await base44.asServiceRole.entities.Customer.filter({}, '', 1000);
    dataIntegrity.customers.total = customers.length;
    dataIntegrity.customers.withoutName = customers.filter(c => !c.name).length;
    dataIntegrity.customers.withoutContact = customers.filter(c => !c.email && !c.phone).length;

    // Check Employees/Users
    const users = await base44.asServiceRole.entities.User.filter({}, '', 1000);
    const pendingEmployees = await base44.asServiceRole.entities.PendingEmployee.filter({}, '', 1000);
    const employeeDirectory = await base44.asServiceRole.entities.EmployeeDirectory.filter({}, '', 1000);
    
    dataIntegrity.employees.totalUsers = users.length;
    dataIntegrity.employees.adminUsers = users.filter(u => u.role === 'admin').length;
    dataIntegrity.employees.regularUsers = users.filter(u => u.role === 'user').length;
    dataIntegrity.employees.demoUsers = users.filter(u => u.role === 'demo').length;
    dataIntegrity.employees.pendingEmployees = pendingEmployees.length;
    dataIntegrity.employees.employeeDirectory = employeeDirectory.length;
    dataIntegrity.employees.usersWithoutDirectory = users.filter(u => {
      return !employeeDirectory.some(ed => ed.user_id === u.id);
    }).length;
    dataIntegrity.employees.deletedEmployees = users.filter(u => u.employment_status === 'deleted').length;

    // Check Time Entries
    const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({}, '', 1000);
    dataIntegrity.timeEntries.total = timeEntries.length;
    dataIntegrity.timeEntries.withoutEmployee = timeEntries.filter(te => !te.employee_email && !te.user_id).length;
    dataIntegrity.timeEntries.withoutJob = timeEntries.filter(te => !te.job_id && !te.job_name).length;
    dataIntegrity.timeEntries.withoutCheckIn = timeEntries.filter(te => !te.check_in).length;
    dataIntegrity.timeEntries.activeEntries = timeEntries.filter(te => !te.check_out).length;
    dataIntegrity.timeEntries.pendingApproval = timeEntries.filter(te => te.status === 'pending').length;
    dataIntegrity.timeEntries.invalidHours = timeEntries.filter(te => {
      return te.hours_worked && (te.hours_worked < 0 || te.hours_worked > 24);
    }).length;

    // Check Expenses
    const expenses = await base44.asServiceRole.entities.Expense.filter({}, '', 1000);
    dataIntegrity.expenses.total = expenses.length;
    dataIntegrity.expenses.withoutEmployee = expenses.filter(e => !e.employee_email && !e.user_id).length;
    dataIntegrity.expenses.withoutReceipt = expenses.filter(e => !e.receipt_url).length;
    dataIntegrity.expenses.withoutCategory = expenses.filter(e => !e.category).length;
    dataIntegrity.expenses.pendingApproval = expenses.filter(e => e.status === 'pending').length;
    dataIntegrity.expenses.invalidAmounts = expenses.filter(e => {
      return e.amount && (e.amount < 0 || e.amount > 100000);
    }).length;

    auditResults.sections.dataIntegrity = dataIntegrity;

    // 2. COUNTER SYSTEM AUDIT
    console.log('🔍 Checking Counter System...');
    const counters = await base44.asServiceRole.entities.Counter.filter({}, '', 100);
    const counterAudit = {
      totalCounters: counters.length,
      counters: counters.map(c => ({
        key: c.counter_key,
        value: c.current_value,
        lastIncrement: c.last_increment_date
      })),
      missingCounters: []
    };

    const expectedCounters = ['quote_number', 'invoice_number', 'job_number'];
    for (const key of expectedCounters) {
      if (!counters.find(c => c.counter_key === key)) {
        counterAudit.missingCounters.push(key);
      }
    }

    // Check for gaps in numbering
    const quoteNumbers = quotes
      .map(q => q.quote_number)
      .filter(Boolean)
      .map(n => parseInt(n.split('-')[1]))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    const invoiceNumbers = invoices
      .map(i => i.invoice_number)
      .filter(Boolean)
      .map(n => parseInt(n.split('-')[1]))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    counterAudit.quoteNumberGaps = findGaps(quoteNumbers);
    counterAudit.invoiceNumberGaps = findGaps(invoiceNumbers);

    auditResults.sections.counterSystem = counterAudit;

    // 3. RELATIONAL INTEGRITY AUDIT
    console.log('🔍 Checking Relational Integrity...');
    const relationalIntegrity = {
      orphanedQuotes: [],
      orphanedInvoices: [],
      orphanedTimeEntries: [],
      orphanedExpenses: [],
      missingJobReferences: []
    };

    // Check for quotes without valid customer references
    for (const quote of quotes.slice(0, 100)) {
      if (quote.customer_id) {
        const customerExists = customers.some(c => c.id === quote.customer_id);
        if (!customerExists) {
          relationalIntegrity.orphanedQuotes.push({
            id: quote.id,
            quote_number: quote.quote_number,
            customer_id: quote.customer_id
          });
        }
      }
    }

    // Check for invoices without valid customer references
    for (const invoice of invoices.slice(0, 100)) {
      if (invoice.customer_id) {
        const customerExists = customers.some(c => c.id === invoice.customer_id);
        if (!customerExists) {
          relationalIntegrity.orphanedInvoices.push({
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            customer_id: invoice.customer_id
          });
        }
      }
    }

    // Check for time entries without valid job references
    for (const te of timeEntries.slice(0, 100)) {
      if (te.job_id) {
        const jobExists = jobs.some(j => j.id === te.job_id);
        if (!jobExists) {
          relationalIntegrity.orphanedTimeEntries.push({
            id: te.id,
            job_id: te.job_id,
            employee_email: te.employee_email
          });
        }
      }
    }

    auditResults.sections.relationalIntegrity = relationalIntegrity;

    // 4. SECURITY AUDIT
    console.log('🔍 Checking Security...');
    const securityAudit = {
      usersWithoutEmail: users.filter(u => !u.email).length,
      usersWithoutRole: users.filter(u => !u.role).length,
      pendingWithoutStatus: pendingEmployees.filter(p => !p.status).length,
      timeEntriesWithoutGeofenceValidation: timeEntries.filter(te => 
        te.geofence_validated === undefined || te.geofence_validated_backend === undefined
      ).length,
      expensesWithoutReceipt: expenses.filter(e => !e.receipt_url).length
    };

    auditResults.sections.security = securityAudit;

    // 5. PERFORMANCE INDICATORS
    console.log('🔍 Checking Performance Indicators...');
    const performanceIndicators = {
      largeQuotes: quotes.filter(q => q.items && q.items.length > 50).length,
      largeInvoices: invoices.filter(i => i.items && i.items.length > 50).length,
      activeTimeEntriesCount: timeEntries.filter(te => !te.check_out).length,
      oldPendingApprovals: {
        timeEntries: timeEntries.filter(te => {
          if (te.status !== 'pending') return false;
          const entryDate = new Date(te.date);
          const daysSince = (Date.now() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 7;
        }).length,
        expenses: expenses.filter(e => {
          if (e.status !== 'pending') return false;
          const expenseDate = new Date(e.date);
          const daysSince = (Date.now() - expenseDate.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 7;
        }).length
      }
    };

    auditResults.sections.performance = performanceIndicators;

    // 6. BUSINESS LOGIC VALIDATION
    console.log('🔍 Validating Business Logic...');
    const businessLogic = {
      quotesWithInvalidStatus: quotes.filter(q => {
        const validStatuses = ['draft', 'sent', 'approved', 'rejected', 'converted_to_invoice'];
        return q.status && !validStatuses.includes(q.status);
      }).length,
      invoicesWithInvalidStatus: invoices.filter(i => {
        const validStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'];
        return i.status && !validStatuses.includes(i.status);
      }).length,
      jobsWithInvalidStatus: jobs.filter(j => {
        const validStatuses = ['active', 'completed', 'archived', 'on_hold'];
        return j.status && !validStatuses.includes(j.status);
      }).length,
      convertedQuotesWithoutInvoice: quotes.filter(q => {
        if (q.status !== 'converted_to_invoice') return false;
        if (!q.invoice_id) return true;
        return !invoices.some(i => i.id === q.invoice_id);
      }).length
    };

    auditResults.sections.businessLogic = businessLogic;

    // 7. SUMMARY AND RECOMMENDATIONS
    console.log('📊 Generating Summary...');
    const criticalIssues = [];
    const warnings = [];
    const info = [];

    // Critical Issues
    if (dataIntegrity.quotes.duplicateNumbers.length > 0) {
      criticalIssues.push(`CRITICAL: ${dataIntegrity.quotes.duplicateNumbers.length} duplicate quote numbers found`);
    }
    if (dataIntegrity.invoices.duplicateNumbers.length > 0) {
      criticalIssues.push(`CRITICAL: ${dataIntegrity.invoices.duplicateNumbers.length} duplicate invoice numbers found`);
    }
    if (dataIntegrity.jobs.withoutAuthorization > 0) {
      criticalIssues.push(`CRITICAL: ${dataIntegrity.jobs.withoutAuthorization} jobs without work authorization`);
    }
    if (counterAudit.missingCounters.length > 0) {
      criticalIssues.push(`CRITICAL: Missing counters: ${counterAudit.missingCounters.join(', ')}`);
    }

    // Warnings
    if (dataIntegrity.quotes.invalidTotals > 0) {
      warnings.push(`WARNING: ${dataIntegrity.quotes.invalidTotals} quotes with invalid totals`);
    }
    if (dataIntegrity.invoices.invalidTotals > 0) {
      warnings.push(`WARNING: ${dataIntegrity.invoices.invalidTotals} invoices with invalid totals`);
    }
    if (dataIntegrity.timeEntries.invalidHours > 0) {
      warnings.push(`WARNING: ${dataIntegrity.timeEntries.invalidHours} time entries with invalid hours`);
    }
    if (relationalIntegrity.orphanedQuotes.length > 0) {
      warnings.push(`WARNING: ${relationalIntegrity.orphanedQuotes.length} orphaned quotes`);
    }
    if (performanceIndicators.oldPendingApprovals.timeEntries > 0) {
      warnings.push(`WARNING: ${performanceIndicators.oldPendingApprovals.timeEntries} time entries pending approval for >7 days`);
    }

    // Info
    info.push(`Total Quotes: ${dataIntegrity.quotes.total}`);
    info.push(`Total Invoices: ${dataIntegrity.invoices.total}`);
    info.push(`Total Jobs: ${dataIntegrity.jobs.total}`);
    info.push(`Total Users: ${dataIntegrity.employees.totalUsers}`);
    info.push(`Active Time Entries: ${dataIntegrity.timeEntries.activeEntries}`);

    auditResults.summary = {
      criticalIssues,
      warnings,
      info,
      overallHealth: criticalIssues.length === 0 ? 'GOOD' : 'NEEDS_ATTENTION'
    };

    console.log('✅ Audit Complete');

    return Response.json(auditResults);

  } catch (error) {
    console.error('Audit error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

// Helper functions
function findDuplicates(arr) {
  const counts = {};
  const duplicates = [];
  
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
  }
  
  for (const [item, count] of Object.entries(counts)) {
    if (count > 1) {
      duplicates.push({ value: item, count });
    }
  }
  
  return duplicates;
}

function findGaps(numbers) {
  if (numbers.length === 0) return [];
  
  const gaps = [];
  for (let i = 1; i < numbers.length; i++) {
    const diff = numbers[i] - numbers[i-1];
    if (diff > 1) {
      for (let j = numbers[i-1] + 1; j < numbers[i]; j++) {
        gaps.push(j);
      }
    }
  }
  
  return gaps.slice(0, 20); // Limit to first 20 gaps
}