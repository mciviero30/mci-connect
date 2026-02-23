import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * AUDIT & CLEANUP FUNCTION
 * Identifies and repairs orphaned/invalid EmployeeProfile records
 * 
 * Admin-only function to:
 * 1. Find EmployeeProfile without user_id
 * 2. Find EmployeeProfile with invalid employment_status
 * 3. Find duplicate PendingEmployees
 * 4. Generate repair recommendations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only check
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const [profiles, pendings] = await Promise.all([
      base44.asServiceRole.entities.EmployeeProfile.list('-created_date'),
      base44.asServiceRole.entities.PendingEmployee.list('-created_date')
    ]);

    const issues = {
      orphaned_profiles: [],
      invalid_status: [],
      duplicate_pendings: [],
      summary: {}
    };

    // 1. Find orphaned profiles (no user_id)
    const orphaned = profiles.filter(p => !p.user_id);
    issues.orphaned_profiles = orphaned.map(p => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim(),
      hire_date: p.hire_date,
      created_date: p.created_date
    }));

    // 2. Find invalid employment_status (not in ['active', 'inactive', 'terminated', 'on_leave'])
    const validStatuses = ['active', 'inactive', 'terminated', 'on_leave'];
    const invalid = profiles.filter(p => p.employment_status && !validStatuses.includes(p.employment_status));
    issues.invalid_status = invalid.map(p => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`.trim(),
      status: p.employment_status,
      fix: 'Update to "active" or valid enum value'
    }));

    // 3. Find duplicate PendingEmployees (same email)
    const emailMap = {};
    pendings.forEach(p => {
      const key = p.email?.toLowerCase() || '';
      if (!emailMap[key]) emailMap[key] = [];
      emailMap[key].push(p);
    });

    const duplicates = Object.entries(emailMap)
      .filter(([_, items]) => items.length > 1)
      .map(([email, items]) => ({
        email,
        count: items.length,
        ids: items.map(i => i.id),
        keep_id: items[0].id,
        delete_ids: items.slice(1).map(i => i.id)
      }));
    issues.duplicate_pendings = duplicates;

    // 4. Summary statistics
    issues.summary = {
      total_profiles: profiles.length,
      orphaned_count: orphaned.length,
      invalid_status_count: invalid.length,
      duplicate_pendings_count: duplicates.length,
      recommended_actions: [
        `Delete or repair ${orphaned.length} orphaned EmployeeProfile records`,
        `Fix ${invalid.length} records with invalid employment_status`,
        `Merge/delete ${duplicates.length} duplicate PendingEmployee entries`,
        `Verify all EmployeeProfile.user_id are NOT NULL`
      ]
    };

    return Response.json(issues);

  } catch (error) {
    console.error('Cleanup audit error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});