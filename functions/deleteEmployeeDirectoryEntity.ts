import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 2: Delete EmployeeDirectory entity completely
 * Also removes all sync/rebuild functions
 * Admin-only
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const results = {
      status: 'pending',
      actions: [],
      errors: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Delete all EmployeeDirectory records first
      const allDir = await base44.entities.EmployeeDirectory.list();
      let dirCount = 0;
      for (const dir of allDir) {
        await base44.entities.EmployeeDirectory.delete(dir.id);
        dirCount++;
      }
      results.actions.push(`Deleted ${dirCount} EmployeeDirectory records`);

      // Note: Entity schema deletion must be done via dashboard
      // This function handles data cleanup only
      results.actions.push('✅ EmployeeDirectory data cleared');
      results.actions.push('⚠️ Schema deletion requires dashboard entity management');
      results.actions.push('📝 Manual Step: Delete EmployeeDirectory entity via Base44 dashboard');

      results.actions.push('Functions to delete (manual via codebase):');
      results.actions.push('- syncUserToEmployeeDirectory');
      results.actions.push('- autoSyncEmployeeDirectory');
      results.actions.push('- rebuildEmployeeDirectory');
      results.actions.push('- backfillEmployeeDirectoryUserIds');

      results.status = 'success';
      console.log('✅ Phase 2 Complete:', results);
      return Response.json(results);

    } catch (err) {
      results.status = 'failed';
      results.error = err.message;
      results.errors.push(err.message);
      console.error('❌ Phase 2 Failed:', err);
      return Response.json(results, { status: 500 });
    }

  } catch (err) {
    console.error('Auth error:', err);
    return Response.json({ error: 'Authentication failed' }, { status: 401 });
  }
});