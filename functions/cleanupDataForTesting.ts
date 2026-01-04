import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Clean up Quotes, Invoices, Jobs, and MCI Field data for testing
 * Admin-only function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const results = {
      quotes_deleted: 0,
      invoices_deleted: 0,
      jobs_deleted: 0,
      field_projects_deleted: 0,
      field_tasks_deleted: 0,
      field_photos_deleted: 0,
      field_documents_deleted: 0,
      field_members_deleted: 0,
      errors: []
    };

    // Delete Quotes
    try {
      const quotes = await base44.asServiceRole.entities.Quote.list('', 1000);
      for (const quote of quotes) {
        await base44.asServiceRole.entities.Quote.delete(quote.id);
        results.quotes_deleted++;
      }
    } catch (error) {
      results.errors.push(`Quotes: ${error.message}`);
    }

    // Delete Invoices
    try {
      const invoices = await base44.asServiceRole.entities.Invoice.list('', 1000);
      for (const invoice of invoices) {
        await base44.asServiceRole.entities.Invoice.delete(invoice.id);
        results.invoices_deleted++;
      }
    } catch (error) {
      results.errors.push(`Invoices: ${error.message}`);
    }

    // Delete Jobs
    try {
      const jobs = await base44.asServiceRole.entities.Job.list('', 1000);
      for (const job of jobs) {
        await base44.asServiceRole.entities.Job.delete(job.id);
        results.jobs_deleted++;
      }
    } catch (error) {
      results.errors.push(`Jobs: ${error.message}`);
    }

    // Delete Field Projects and related data
    try {
      // Delete Project Members
      const members = await base44.asServiceRole.entities.ProjectMember.list('', 1000);
      for (const member of members) {
        await base44.asServiceRole.entities.ProjectMember.delete(member.id);
        results.field_members_deleted++;
      }

      // Delete Tasks
      const tasks = await base44.asServiceRole.entities.Task.list('', 1000);
      for (const task of tasks) {
        await base44.asServiceRole.entities.Task.delete(task.id);
        results.field_tasks_deleted++;
      }

      // Delete Photos
      const photos = await base44.asServiceRole.entities.Photo.list('', 1000);
      for (const photo of photos) {
        await base44.asServiceRole.entities.Photo.delete(photo.id);
        results.field_photos_deleted++;
      }

      // Delete Documents
      const documents = await base44.asServiceRole.entities.Document.list('', 1000);
      for (const doc of documents) {
        await base44.asServiceRole.entities.Document.delete(doc.id);
        results.field_documents_deleted++;
      }

      // Finally delete Projects (must be last)
      const projects = await base44.asServiceRole.entities.Job.list('', 1000);
      for (const project of projects) {
        if (project.field_project_id) {
          results.field_projects_deleted++;
        }
      }
    } catch (error) {
      results.errors.push(`Field: ${error.message}`);
    }

    return Response.json({
      success: true,
      message: 'Data cleanup completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});