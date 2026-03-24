import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAdmin(base44);

    // Fetch all main entities
    const [jobs, employees, invoices, quotes, expenses, timeEntries, customers, teams] = await Promise.all([
      base44.asServiceRole.entities.Job.list(),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Invoice.list(),
      base44.asServiceRole.entities.Quote.list(),
      base44.asServiceRole.entities.Expense.list(),
      base44.asServiceRole.entities.TimeEntry.list(),
      base44.asServiceRole.entities.Customer.list(),
      base44.asServiceRole.entities.Team.list()
    ]);

    // Log export activity
    await base44.asServiceRole.entities.ActivityFeed.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'system_export',
      entity_type: 'system',
      description: `${user.full_name} exported system backup`,
      metadata: { exportedAt: new Date().toISOString() }
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: user.email,
      data: {
        jobs,
        employees,
        invoices,
        quotes,
        expenses,
        timeEntries,
        customers,
        teams
      },
      counts: {
        jobs: jobs.length,
        employees: employees.length,
        invoices: invoices.length,
        quotes: quotes.length,
        expenses: expenses.length,
        timeEntries: timeEntries.length,
        customers: customers.length,
        teams: teams.length
      }
    };

    return Response.json(exportData);
  } catch (error) {
    if (error instanceof Response) throw error;
    return safeJsonError('Export failed', 500, error.message);
  }
});