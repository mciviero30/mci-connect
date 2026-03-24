import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CASCADE DELETE VALIDATION
 * 
 * PHASE 5: Prevent deletion of entities with active relationships
 * 
 * Validates before delete operations:
 * - Job deletion: Blocks if active invoices, quotes, or time entries exist
 * - Customer deletion: Blocks if active jobs or invoices exist
 * - Team deletion: Blocks if employees or jobs assigned
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id } = await req.json();

    if (!entity_type || !entity_id) {
      return Response.json({ 
        error: 'entity_type and entity_id required' 
      }, { status: 400 });
    }

    let blocking = [];

    // Job deletion validation
    if (entity_type === 'Job') {
      const [invoices, quotes, timeEntries, expenses] = await Promise.all([
        base44.asServiceRole.entities.Invoice.filter({ job_id: entity_id }),
        base44.asServiceRole.entities.Quote.filter({ job_id: entity_id }),
        base44.asServiceRole.entities.TimeEntry.filter({ job_id: entity_id }),
        base44.asServiceRole.entities.Expense.filter({ job_id: entity_id })
      ]);

      if (invoices.length > 0) {
        blocking.push({
          entity: 'Invoice',
          count: invoices.length,
          examples: invoices.slice(0, 3).map(i => i.invoice_number)
        });
      }

      if (quotes.length > 0) {
        blocking.push({
          entity: 'Quote',
          count: quotes.length,
          examples: quotes.slice(0, 3).map(q => q.quote_number)
        });
      }

      if (timeEntries.length > 0) {
        blocking.push({
          entity: 'TimeEntry',
          count: timeEntries.length,
          examples: timeEntries.slice(0, 3).map(t => `${t.employee_name} - ${t.date}`)
        });
      }

      if (expenses.length > 0) {
        blocking.push({
          entity: 'Expense',
          count: expenses.length,
          examples: expenses.slice(0, 3).map(e => `$${e.amount} - ${e.date}`)
        });
      }
    }

    // Customer deletion validation
    if (entity_type === 'Customer') {
      const [jobs, invoices] = await Promise.all([
        base44.asServiceRole.entities.Job.filter({ customer_id: entity_id }),
        base44.asServiceRole.entities.Invoice.filter({ customer_id: entity_id })
      ]);

      if (jobs.length > 0) {
        blocking.push({
          entity: 'Job',
          count: jobs.length,
          examples: jobs.slice(0, 3).map(j => j.name)
        });
      }

      if (invoices.length > 0) {
        blocking.push({
          entity: 'Invoice',
          count: invoices.length,
          examples: invoices.slice(0, 3).map(i => i.invoice_number)
        });
      }
    }

    // Team deletion validation
    if (entity_type === 'Team') {
      const [employees, jobs] = await Promise.all([
        base44.asServiceRole.entities.EmployeeDirectory.filter({ team_id: entity_id }),
        base44.asServiceRole.entities.Job.filter({ team_id: entity_id })
      ]);

      if (employees.length > 0) {
        blocking.push({
          entity: 'Employee',
          count: employees.length,
          examples: employees.slice(0, 3).map(e => e.full_name)
        });
      }

      if (jobs.length > 0) {
        blocking.push({
          entity: 'Job',
          count: jobs.length,
          examples: jobs.slice(0, 3).map(j => j.name)
        });
      }
    }

    // Return validation result
    const canDelete = blocking.length === 0;

    if (!canDelete) {
      console.log('[CASCADE DELETE VALIDATION] 🚫 Delete blocked', {
        entity_type,
        entity_id,
        blocking_count: blocking.length,
        blocking_entities: blocking.map(b => b.entity)
      });
    }

    return Response.json({
      can_delete: canDelete,
      blocking_relationships: blocking,
      message: canDelete 
        ? 'Safe to delete - no active relationships'
        : `Cannot delete - ${blocking.length} blocking relationship(s) found`,
      resolution: canDelete 
        ? null
        : 'Archive instead of delete, or remove relationships first'
    });

  } catch (error) {
    console.error('[CASCADE DELETE VALIDATION] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});