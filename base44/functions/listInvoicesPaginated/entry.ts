import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, safeJsonError } from './_auth.js';

/**
 * TRUE SERVER-SIDE PAGINATION WITH CURSOR
 * Returns only requested page (no client-side slice)
 * Cursor: { created_date, id } for stable ordering
 *
 * Security model:
 *  - Admins / CEO / administrators → see ALL invoices
 *  - Everyone else → only invoices they created OR belong to an assigned job
 *
 * Cursor logic is always wrapped inside $and so it never clobbers the
 * security $or (Bug #1 fix).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    const { limit = 50, cursor = null, filters = {} } = await req.json();

    if (limit > 200) {
      return Response.json({ error: 'limit cannot exceed 200' }, { status: 400 });
    }

    const isAdmin =
      user.role === 'admin' ||
      user.position === 'CEO' ||
      user.position === 'administrator';

    // ── 1. Start with caller-supplied filters ───────────────────────────────
    let queryFilters = { ...filters };

    // ── 2. Security filter (non-admin) ──────────────────────────────────────
    let securityClause = null;
    if (!isAdmin) {
      const userJobs = await base44.entities.Job.filter({});
      const assignedJobIds = userJobs
        .filter(job => {
          const isAssigned = job.assigned_team_field?.includes(user.email);
          const isTeamMember = job.team_id && user.team_id === job.team_id;
          return isAssigned || isTeamMember;
        })
        .map(j => j.id);

      securityClause = {
        $or: [
          { created_by: user.email },
          { job_id: { $in: assignedJobIds } },
        ],
      };
    }

    // ── 3. Cursor filter ────────────────────────────────────────────────────
    let cursorClause = null;
    if (cursor?.created_date && cursor?.id) {
      cursorClause = {
        $or: [
          { created_date: { $lt: cursor.created_date } },
          {
            $and: [
              { created_date: cursor.created_date },
              { id: { $lt: cursor.id } },
            ],
          },
        ],
      };
    }

    // ── 4. Merge everything with $and so nothing overwrites anything ────────
    const andClauses = [];
    if (securityClause) andClauses.push(securityClause);
    if (cursorClause)   andClauses.push(cursorClause);

    if (andClauses.length > 0) {
      queryFilters.$and = andClauses;
    }

    // ── 5. Fetch limit + 1 to detect next page ──────────────────────────────
    const items = await base44.asServiceRole.entities.Invoice.filter(
      queryFilters,
      '-created_date',
      limit + 1
    );

    const hasMore   = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;

    const nextCursor =
      hasMore && pageItems.length > 0
        ? {
            created_date: pageItems[pageItems.length - 1].created_date,
            id:           pageItems[pageItems.length - 1].id,
          }
        : null;

    return Response.json({
      items:  pageItems,
      nextCursor,
      hasMore,
      count:  pageItems.length,
    });

  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('[listInvoicesPaginated]', error);
    return safeJsonError('Pagination failed', 500, error.message);
  }
});
