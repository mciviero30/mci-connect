import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, safeJsonError } from './_auth.js';

/**
 * TRUE SERVER-SIDE PAGINATION WITH CURSOR
 * Returns only requested page (no client-side slice)
 * Cursor: { created_date, id } for stable ordering
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    const { limit = 50, cursor = null, filters = {} } = await req.json();

    if (limit > 200) {
      return Response.json({ error: 'limit cannot exceed 200' }, { status: 400 });
    }

    const isAdmin = user.role === 'admin' || user.position === 'CEO' || user.position === 'administrator';

    // Build query filters
    let queryFilters = { ...filters };

    // Security: Non-admin users only see their own invoices or invoices for jobs they're assigned to
    if (!isAdmin) {
      // Get user's assigned jobs
      const userJobs = await base44.entities.Job.filter({});
      const assignedJobIds = userJobs
        .filter(job => {
          const isAssigned = job.assigned_team_field?.includes(user.email);
          const isTeamMember = job.team_id && user.team_id === job.team_id;
          return isAssigned || isTeamMember;
        })
        .map(j => j.id);

      // Filter: created by user OR job_id in assigned jobs
      queryFilters.$or = [
        { created_by: user.email },
        { job_id: { $in: assignedJobIds } }
      ];
    }

    // Cursor-based filtering
    if (cursor?.created_date && cursor?.id) {
      // For descending order: created_date < cursor OR (created_date = cursor AND id < cursor.id)
      queryFilters.$or = [
        { created_date: { $lt: cursor.created_date } },
        {
          $and: [
            { created_date: cursor.created_date },
            { id: { $lt: cursor.id } }
          ]
        }
      ];
      
      // Merge with security filters if non-admin
      if (!isAdmin) {
        const securityOr = queryFilters.$or;
        delete queryFilters.$or;
        
        queryFilters.$and = [
          {
            $or: [
              { created_by: user.email },
              { job_id: { $in: assignedJobIds } }
            ]
          },
          {
            $or: [
              { created_date: { $lt: cursor.created_date } },
              {
                $and: [
                  { created_date: cursor.created_date },
                  { id: { $lt: cursor.id } }
                ]
              }
            ]
          }
        ];
      }
    }

    // Fetch limit + 1 to check if more exist
    const items = await base44.asServiceRole.entities.Invoice.filter(
      queryFilters,
      '-created_date',
      limit + 1
    );

    // Determine if more pages exist
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;

    // Generate next cursor from last item
    const nextCursor = hasMore && pageItems.length > 0
      ? {
          created_date: pageItems[pageItems.length - 1].created_date,
          id: pageItems[pageItems.length - 1].id
        }
      : null;

    return Response.json({
      items: pageItems,
      nextCursor,
      hasMore,
      count: pageItems.length
    });

  } catch (error) {
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('Error in listInvoicesPaginated:', error);
    }
    return safeJsonError('Pagination failed', 500, error.message);
  }
});