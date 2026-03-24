import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Cleanup duplicate PendingEmployee records by email
 * Keeps the most recent record for each unique email
 * Admin-only function
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const pending = await base44.asServiceRole.entities.PendingEmployee.list('-created_date', 100);
    
    const results = {
      duplicates_deleted: 0,
      deleted_records: [],
      kept_records: [],
      errors: []
    };

    // Group by normalized email
    const emailGroups = {};
    pending.forEach(p => {
      const normalized = p.email?.toLowerCase().trim() || 'no-email';
      if (!emailGroups[normalized]) {
        emailGroups[normalized] = [];
      }
      emailGroups[normalized].push(p);
    });

    // Process each email group
    for (const [email, group] of Object.entries(emailGroups)) {
      if (group.length <= 1) {
        // No duplicates
        results.kept_records.push({
          email,
          count: 1,
          full_name: group[0].full_name || `${group[0].first_name} ${group[0].last_name}`
        });
        continue;
      }

      // Sort by created_date DESC (most recent first)
      const sorted = group.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );

      // Keep first (most recent), delete rest
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);

      results.kept_records.push({
        email,
        count: group.length,
        kept: toKeep.id,
        full_name: toKeep.full_name || `${toKeep.first_name} ${toKeep.last_name}`
      });

      for (const p of toDelete) {
        try {
          await base44.asServiceRole.entities.PendingEmployee.delete(p.id);
          results.duplicates_deleted++;
          results.deleted_records.push({
            email: p.email,
            full_name: p.full_name || `${p.first_name} ${p.last_name}`,
            id: p.id
          });
        } catch (error) {
          results.errors.push(`Failed to delete ${p.email}: ${error.message}`);
        }
      }
    }

    return Response.json({
      success: true,
      message: `Cleaned up ${results.duplicates_deleted} duplicate pending employees`,
      total_unique_emails: Object.keys(emailGroups).length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});